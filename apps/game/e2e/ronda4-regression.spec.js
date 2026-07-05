/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 4 (PUNTOS_A_MEJORAR_4.md):
 *
 * P1 — canvas de escarbado: la capa de suciedad tiene que ser 100% opaca antes de rascar
 *   (nunca se ve el objeto), el borrado nunca deja mugre semi-transparente ("damero fantasma",
 *   causado por destination-out con globalAlpha parcial cuando digRate < 1), y al completar
 *   (ronda 5: todos los objetos revelados) la capa se limpia ENTERA (sin bandas arriba/abajo)
 *   con un "momento de revelado" antes de volver al picker.
 * P2 — nav: guard estructural del fix tipográfico (Plus Jakarta Sans con weight >= 600 a
 *   <= 14.4px fusiona el punto de la 'i' en Windows; el nav queda en 500).
 * P3 — árbol de prestigio: su grilla se decide por el ancho del PANEL (@container), así que
 *   nunca desborda `#tab-content` (en desktop es el sidebar de 320px).
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto } from './helpers/dig.js';

/** Cuenta píxeles del top canvas por franja de alpha: opacos, intermedios y borrados. */
async function alphaHistogram(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.dig-canvas-top');
    const ctx = el.getContext('2d');
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let opaque = 0;
    let semi = 0;
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] >= 250) opaque++;
      else if (data[i] >= 40) semi++;
      else cleared++;
    }
    return { opaque, semi, cleared, total: data.length / 4 };
  });
}

/** Entra al juego y arranca el escarbado del contenedor pedido. */
async function iniciarEscarbado(page, containerId) {
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#title-play-btn').click();
  await page.locator(`[data-start-dig="${containerId}"]`).click();
  await expect(page.locator('#dig-active')).toBeVisible();
  await expect(page.locator('.dig-canvas-top')).toBeVisible();
}

test.describe('Dumpster Empire — regresión ronda 4', () => {
  test('P1: la capa de suciedad recién iniciada es 100% opaca (no se ve el objeto)', async ({ page }) => {
    await iniciarEscarbado(page, 'tachoVereda');
    const fresh = await alphaHistogram(page);
    expect(fresh.opaque).toBe(fresh.total);
    expect(fresh.semi).toBe(0);
    expect(fresh.cleared).toBe(0);
  });

  test('P1: rascar con ritmo < 1 (Resistencia > Fuerza) no deja mugre semi-transparente', async ({ page }) => {
    // Guardado sembrado: dinero para comprar containerIndustrial (resistencia 1.4 -> digRate
    // ~0.71 con Fuerza base) y la cadena de unlock (cada contenedor exige haber comprado el
    // anterior, packages/engine/src/systems/containers.js).
    const seeded = freshState();
    seeded.money = 500;
    seeded.ownedContainers = { tachoVereda: 1, contenedorBarrio: 1 };
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      ['dumpsterEmpireSave', serializeState(seeded)]
    );
    await iniciarEscarbado(page, 'containerIndustrial');

    const box = await page.locator('.dig-canvas-top').boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    // Tres pasadas horizontales reales: borrado suficiente para medir, sin apuntar a objetos.
    await page.mouse.move(box.x + 20, box.y + box.height * 0.3);
    await page.mouse.down();
    for (const yFrac of [0.3, 0.5, 0.7]) {
      await page.mouse.move(box.x + 20, box.y + box.height * yFrac, { steps: 3 });
      await page.mouse.move(box.x + box.width - 20, box.y + box.height * yFrac, { steps: 25 });
    }
    await page.mouse.up();

    const after = await alphaHistogram(page);
    // Tiene que haber borrado real...
    expect(after.cleared).toBeGreaterThan(5000);
    // ...y nada de mugre intermedia más allá del fleco de antialias del borde del pincel
    // (medido: ~3.4k píxeles = borde de ~1.5px a lo largo de las 3 pasadas). El código viejo,
    // con globalAlpha ~0.81 por digRate, dejaba TODA la franja rascada semi-transparente
    // (~55k píxeles a alpha ~47) y además `cleared` quedaba en ~0.
    expect(after.semi).toBeLessThan(8000);
  });

  test('P1: al completar el último objeto la capa se limpia entera (sin parches) y se ve el revelado', async ({ page }) => {
    await entrarAlJuego(page);
    // Ronda 5: se completa al destapar TODOS los objetos — se rasca encima de cada posición
    // (aleatorias, expuestas por el hook de debug) y recién el último revela el 100%.
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    for (const pos of positions.slice(0, -1)) {
      await rascarObjeto(page, box, pos);
    }
    // El assert del "momento de revelado" tiene que ganarle al hold (650ms) que arranca al
    // revelar el último objeto. Un roundtrip del test puede llegar tarde con la máquina
    // cargada, así que la foto la saca la propia página: un rAF que espera la barra al 100%
    // y en ese mismo frame mide si el panel sigue montado y cuánta suciedad queda.
    await page.evaluate(() => {
      window.__revealSnap = null;
      const fill = document.querySelector('#dig-progress-fill');
      const tick = () => {
        if (fill.style.width !== '100%') {
          requestAnimationFrame(tick);
          return;
        }
        const active = !document.querySelector('#dig-active').hidden;
        const el = document.querySelector('.dig-canvas-top');
        const { data } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
        let dirty = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] >= 40) dirty++;
        window.__revealSnap = { active, dirty };
      };
      requestAnimationFrame(tick);
    });
    await rascarObjeto(page, box, positions[positions.length - 1]);

    // Momento de revelado: el panel sigue montado y NO queda ni un píxel de suciedad
    // (ni bandas arriba/abajo ni parches a medias).
    await page.waitForFunction(() => window.__revealSnap !== null);
    const revealed = await page.evaluate(() => window.__revealSnap);
    expect(revealed.active).toBe(true);
    expect(revealed.dirty).toBe(0);
    // Y al terminar el hold, el flujo sigue solo hacia el picker.
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
  });

  for (const viewport of [
    { name: 'steam-deck-1280x800', width: 1280, height: 800 },
    { name: 'mobile-375', width: 375, height: 812 },
  ]) {
    test(`P3: el árbol de prestigio no desborda su panel en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/apps/game/');
      await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
      await page.locator('#title-play-btn').click();
      await page.locator('[data-tab="prestigio"]').click();
      await expect(page.locator('.prestige-tree')).toBeVisible();

      const layout = await page.evaluate(() => {
        const panel = document.querySelector('#tab-content');
        const tree = document.querySelector('.prestige-tree');
        const first = document.querySelector('.prestige-node');
        const panelRect = panel.getBoundingClientRect();
        const firstRect = first.getBoundingClientRect();
        return {
          treeDisplay: getComputedStyle(tree).display,
          treeScrollWidth: tree.scrollWidth,
          panelClientWidth: panel.clientWidth,
          firstTitle: first.querySelector('h3').textContent,
          firstLeft: firstRect.left,
          firstRight: firstRect.right,
          panelLeft: panelRect.left,
          panelRight: panelRect.right,
        };
      });
      // El panel es angosto en ambos casos (sidebar de 320px en desktop, 375px en mobile):
      // el árbol tiene que caer a la lista vertical, sin scroll horizontal interno y con el
      // nodo raíz visible dentro del panel, no clipeado a la derecha.
      expect(layout.treeDisplay).toBe('flex');
      expect(layout.treeScrollWidth).toBeLessThanOrEqual(layout.panelClientWidth);
      expect(layout.firstTitle).toContain('Capital Inicial');
      expect(layout.firstLeft).toBeGreaterThanOrEqual(layout.panelLeft);
      expect(layout.firstRight).toBeLessThanOrEqual(layout.panelRight + 1);
    });

    test(`P2: el nav usa weight 500 (la 'i' no pierde el punto) en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/apps/game/');
      await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
      await page.locator('#title-play-btn').click();

      const nav = await page.evaluate(() => {
        const span = document.querySelector('#tabbar [data-tab="prestigio"] span');
        const cs = getComputedStyle(span);
        return { text: span.textContent, weight: cs.fontWeight, transform: cs.textTransform };
      });
      expect(nav.text).toBe('Prestigio');
      expect(nav.weight).toBe('500');
      expect(nav.transform).toBe('none');
    });
  }
});
