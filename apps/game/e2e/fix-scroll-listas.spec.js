/**
 * Regresión del scroll de la lista de Herramientas de escarbado (reportado por el usuario tras la
 * auditoría de release 3): al scrollear la lista y soltar, volvía sola al principio y solo se
 * podían ver las 4 primeras herramientas de las 8.
 *
 * CAUSA RAÍZ: `ToolsSection.render` reescribe `container.innerHTML` ENTERO en cada render, y el
 * elemento que scrollea (`.settings-tools-list`) nace adentro de ese HTML — o sea que se DESTRUYE
 * y se recrea, con `scrollTop = 0`, en cada pasada. El resto de los scrollers del juego
 * (`#tab-content`, `#quick-upgrades`, `#tabbar`) son elementos estáticos de `index.html` a los que
 * solo se les reemplaza el contenido, y por eso conservan su posición. Con automatización o Puesto
 * activos el store notifica una vez por segundo (`tickAutomation`), así que el reset llegaba solo,
 * sin que el jugador tocara nada: exactamente el "vuelve al principio al soltar" del reporte.
 *
 * SEGUNDA MITAD DEL PEDIDO: esa lista era el único scroller del juego sin la barra "The Workshop"
 * (thumb `--bg-surface-highest` sobre track transparente, components.css) — mostraba la barra
 * gris por defecto del sistema, que no pega con el panel.
 *
 * HALLAZGO DE LA AUDITORÍA (misma clase de bug, medido en vivo): la tira de pestañas del ÍNDICE
 * (`.index-container-tabs`, ~4900px de ancho con todos los contenedores) también nace adentro del
 * `innerHTML` que CollectionView reescribe entero, así que volvía a `scrollLeft = 0` en cada
 * render — incluso al tocar una pestaña de la propia tira. Se cubre acá porque es el mismo fix.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego } from './helpers/dig.js';

const LISTA = '.settings-tools-list';

/**
 * Estado sembrado con el Puesto comprado: es la forma más barata de que `tickAutomation` notifique
 * (y por lo tanto re-renderice) una vez por segundo sin depender de comprar automatización, que es
 * la condición real en la que el usuario vio el bug.
 */
function estadoConTickActivo() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.stallLevel = 1;
  seeded.marketFluctuation = 1;
  seeded.marketFluctuationAt = Date.now();
  return seeded;
}

async function entrarAEscarbar(page, save) {
  if (save) {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
  }
  await entrarAlJuego(page);
  await page.locator('[data-tab="escarbar"]').click();
  await expect(page.locator(LISTA)).toBeVisible();
}

test.describe('fix: las listas scrolleables conservan su posición y usan la barra del taller', () => {
  test('mobile 375: scrollear al fondo sobrevive al tick del store (se llega a la última herramienta)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await entrarAEscarbar(page, serializeState(estadoConTickActivo()));

    const lista = page.locator(LISTA);
    // La lista tiene que desbordar de verdad (8 herramientas contra un max-height de ~4 filas):
    // sin desborde el test sería un falso verde permanente.
    const desborde = await lista.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(desborde, 'la lista de herramientas no desborda: el test no probaría nada').toBeGreaterThan(0);

    // Gesto real de rueda sobre la lista (no `el.scrollTop = ...`): es lo que hace el jugador.
    await lista.hover();
    await page.mouse.wheel(0, 600);
    const trasElGesto = await lista.evaluate((el) => el.scrollTop);
    expect(trasElGesto).toBeGreaterThan(0);

    // Con el bug, el render del tick siguiente (1s) recreaba la lista y la devolvía a 0.
    await page.waitForTimeout(1500);
    expect(await lista.evaluate((el) => el.scrollTop), 'el tick del store reseteó el scroll').toBe(trasElGesto);

    // Y la última herramienta tiene que quedar DENTRO de la caja visible tras scrollear al fondo.
    await lista.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(1500);
    const ultimaVisible = await lista.evaluate((el) => {
      const filas = el.querySelectorAll('.tool-row');
      const ultima = filas[filas.length - 1].getBoundingClientRect();
      const caja = el.getBoundingClientRect();
      return ultima.bottom <= caja.bottom + 1 && ultima.top >= caja.top - 1;
    });
    expect(ultimaVisible, 'no se llega a la última herramienta de la lista').toBe(true);
  });

  test('desktop 1280: comprar/equipar re-renderiza sin perder la posición de scroll', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const seeded = estadoConTickActivo();
    // Dinero de sobra para que los botones estén habilitados (el monto exacto no importa: no se
    // asertan costos, solo que la acción re-renderiza).
    seeded.money = Number.MAX_SAFE_INTEGER;
    await entrarAEscarbar(page, serializeState(seeded));

    const lista = page.locator(LISTA);
    await lista.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const antes = await lista.evaluate((el) => el.scrollTop);
    expect(antes).toBeGreaterThan(0);

    // Comprar la última herramienta visible dispara `notify()` → render completo de la sección.
    await lista.locator('[data-action="buy-tool"]').last().click();
    await expect(lista.locator('[data-action="equip-tool"]')).not.toHaveCount(0);
    expect(await lista.evaluate((el) => el.scrollTop), 'comprar una herramienta reseteó el scroll').toBe(antes);
  });

  test('la barra de scroll de la lista es la misma que la del resto del juego', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrarAEscarbar(page, null);

    const barras = await page.evaluate(() => {
      const lectura = (sel) => {
        const cs = getComputedStyle(document.querySelector(sel));
        return { width: cs.scrollbarWidth, color: cs.scrollbarColor };
      };
      return { lista: lectura('.settings-tools-list'), referencia: lectura('#tab-content') };
    });

    // "Como todas las demás": mismos valores computados que el scroller de referencia
    // (`#tab-content`, el de Automatización), nunca el `auto` del sistema.
    expect(barras.lista.color).not.toBe('auto');
    expect(barras.lista).toEqual(barras.referencia);
  });

  test('Índice: elegir un contenedor no devuelve la tira de pestañas al principio', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await entrarAEscarbar(page, null);
    await page.locator('[data-tab="index"]').click();

    const tira = page.locator('.index-container-tabs');
    await expect(tira).toBeVisible();
    const desborde = await tira.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(desborde, 'la tira de contenedores no desborda: el test no probaría nada').toBeGreaterThan(0);

    await tira.evaluate((el) => {
      el.scrollLeft = 300;
    });
    const antes = await tira.evaluate((el) => el.scrollLeft);
    expect(antes).toBeGreaterThan(0);

    // Tocar una pestaña re-renderiza la vista entera. Con el bug la tira saltaba a 0 y la pestaña
    // recién elegida quedaba fuera de pantalla. No se asierta un valor EXACTO: a 375px ninguna
    // pestaña entra entera, así que el propio Playwright corre la tira unos px para traer a
    // viewport la que va a clickear. Lo que se exige es lo que el jugador ve — que no vuelva al
    // principio y que la elegida quede a la vista.
    await tira.locator('.index-container-tab').nth(2).click();
    await expect(tira.locator('.index-container-tab.is-active')).toHaveCount(1);
    const despues = await tira.evaluate((el) => el.scrollLeft);
    expect(despues, 'la tira volvió al principio').toBeGreaterThan(0);
    const activaALaVista = await tira.evaluate((el) => {
      const caja = el.getBoundingClientRect();
      const activa = el.querySelector('.index-container-tab.is-active').getBoundingClientRect();
      return activa.right > caja.left && activa.left < caja.right;
    });
    expect(activaALaVista, 'la pestaña elegida quedó fuera de la tira').toBe(true);
  });
});
