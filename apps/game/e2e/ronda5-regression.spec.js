/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 5 (PUNTOS_A_MEJORAR_5.md) — mecánica de
 * escarbado REHECHA a revelado por-objeto (digRevealModel.js):
 *
 * 1. Idle: la suciedad tapa TODO antes del primer gesto (ningún objeto visible).
 * 2. Todo objeto revelado muestra su nombre, siempre (el revelado destapa la huella
 *    completa, círculo + etiqueta).
 * 3. El escarbado se completa SOLO al destapar todos los objetos, nunca por % de área.
 * 4. La barra de progreso mide objetos revelados / total.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import {
  DIG_W,
  DIG_H,
  entrarAlJuego,
  iniciarEscarbado,
  iniciarEscarbadoSinTrampa,
  rascarObjeto,
} from './helpers/dig.js';

/** Histograma de alpha de la capa de suciedad (canvas top). */
async function alphaHistogram(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.dig-canvas-top');
    const { data } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
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

/**
 * Mide la franja de la etiqueta de un objeto (nombre a +44px del centro, DigCanvas.js):
 * píxeles color texto (#f4ede1) en la capa de abajo y píxeles destapados en la de arriba.
 */
async function labelRegion(page, pos) {
  return page.evaluate(
    ({ x, y }) => {
      // Clamp a los bordes: getImageData fuera del canvas devolvería alpha 0 y falsearía
      // el conteo de "destapado" en la medición previa al rascado.
      const rect = {
        left: Math.min(Math.max(0, Math.round(x - 50)), 600 - 100),
        top: Math.min(Math.max(0, Math.round(y + 34)), 330 - 20),
        width: 100,
        height: 20,
      };
      const read = (selector) => {
        const el = document.querySelector(selector);
        return el.getContext('2d').getImageData(rect.left, rect.top, rect.width, rect.height).data;
      };
      const bottom = read('.dig-canvas-layer:not(.dig-canvas-top)');
      let textPixels = 0;
      for (let i = 0; i < bottom.length; i += 4) {
        if (bottom[i] > 200 && bottom[i + 1] > 195 && bottom[i + 2] > 180) textPixels++;
      }
      const top = read('.dig-canvas-top');
      let topCleared = 0;
      for (let i = 3; i < top.length; i += 4) if (top[i] < 40) topCleared++;
      return { textPixels, topCleared, totalPixels: rect.width * rect.height };
    },
    { x: pos.x, y: pos.y }
  );
}

test.describe('Dumpster Empire — regresión ronda 5 (revelado por-objeto)', () => {
  test('1: en idle (antes de cualquier gesto) la suciedad tapa el 100%, incluso tras mover el mouse sin click', async ({ page }) => {
    await entrarAlJuego(page);
    const canvas = await iniciarEscarbado(page, 'tachoVereda');

    const idle = await alphaHistogram(page);
    expect(idle.opaque).toBe(idle.total);

    // Hover sin botón sobre el canvas: tampoco puede destapar nada.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 10 });
    const afterHover = await alphaHistogram(page);
    expect(afterHover.opaque).toBe(afterHover.total);
  });

  test('2: un objeto revelado muestra SIEMPRE su nombre (etiqueta destapada junto con el círculo)', async ({ page }) => {
    await entrarAlJuego(page);
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    const pos = positions[0];

    // Antes de rascar: el nombre existe en la capa de abajo pero la suciedad lo tapa.
    const before = await labelRegion(page, pos);
    expect(before.textPixels).toBeGreaterThan(15);
    expect(before.topCleared).toBe(0);

    await rascarObjeto(page, box, pos);

    // Revelado: la franja de la etiqueta quedó destapada (punch-out completo de la huella),
    // así el nombre pintado abajo se ve sí o sí — causa raíz del P2 de ronda 5 (el círculo
    // quedaba rascado pero la franja del texto seguía bajo la suciedad).
    const after = await labelRegion(page, pos);
    expect(after.textPixels).toBeGreaterThan(15);
    expect(after.topCleared / after.totalPixels).toBeGreaterThan(0.9);

    // Y el escarbado sigue activo (falta revelar el resto).
    await expect(page.locator('#dig-active')).toBeVisible();
  });

  test('3+4: completa SOLO con todos los objetos y la barra mide revelados/total', async ({ page }) => {
    await entrarAlJuego(page);
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    const total = positions.length;
    const fill = page.locator('#dig-progress-fill');
    const moneyBefore = await page.locator('#money').textContent();

    // Revela todos menos el último: la barra avanza en pasos discretos revelados/total y
    // el escarbado NO se completa aunque ya se haya rascado un montón de superficie.
    for (let i = 0; i < total - 1; i++) {
      await rascarObjeto(page, box, positions[i]);
      const expected = `${Math.round(((i + 1) / total) * 100)}%`;
      expect(await fill.evaluate((el) => el.style.width)).toBe(expected);
    }
    // Más que el hold de revelado (650ms): si el completado dependiera del % de área ya
    // habría cerrado. Tiene que seguir activo y sin cobrar.
    await page.waitForTimeout(900);
    await expect(page.locator('#dig-active')).toBeVisible();
    expect(await page.locator('#money').textContent()).toEqual(moneyBefore);

    // El último objeto completa: barra al 100%, momento de revelado y vuelta al picker.
    await rascarObjeto(page, box, positions[total - 1]);
    expect(await fill.evaluate((el) => el.style.width)).toBe('100%');
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    expect(await page.locator('#money').textContent()).not.toEqual(moneyBefore);
  });

  test('3 (trampa implícita): rascar fuera de los objetos nunca completa por área', async ({ page }) => {
    await entrarAlJuego(page);
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    // Rasca un montón de superficie SIN pasar por encima de ningún objeto: toques de pincel
    // (pointerdown/up sintéticos, mismo camino de input que ronda 3) en una grilla de puntos a
    // >80px internos de todo centro (pincel ~20 + huella 28 → imposible limpiar un solo punto
    // de muestreo). Antes de ronda 5 esta superficie completaba por % de área; ahora no puede.
    const scratched = await page.evaluate(
      ({ positions, digW, digH }) => {
        const el = document.querySelector('.dig-canvas-top');
        const rect = el.getBoundingClientRect();
        let dots = 0;
        let pointerId = 100;
        for (let x = 20; x <= digW - 20; x += 30) {
          for (let y = 20; y <= digH - 20; y += 30) {
            if (positions.some((p) => Math.hypot(p.x - x, p.y - y) <= 80)) continue;
            const clientX = rect.left + (x / digW) * rect.width;
            const clientY = rect.top + (y / digH) * rect.height;
            for (const type of ['pointerdown', 'pointerup']) {
              el.dispatchEvent(
                new PointerEvent(type, {
                  pointerId,
                  isPrimary: true,
                  button: 0,
                  buttons: type === 'pointerdown' ? 1 : 0,
                  clientX,
                  clientY,
                  bubbles: true,
                })
              );
            }
            pointerId++;
            dots++;
          }
        }
        const { data } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
        let cleared = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] < 40) cleared++;
        return { dots, cleared, total: data.length / 4 };
      },
      { positions, digW: DIG_W, digH: DIG_H }
    );
    // Sanity: hubo borrado real y abundante (los toques efectivamente rascaron).
    expect(scratched.dots).toBeGreaterThan(30);
    expect(scratched.cleared / scratched.total).toBeGreaterThan(0.1);

    await page.waitForTimeout(900);
    await expect(page.locator('#dig-active')).toBeVisible();
    expect(await page.locator('#dig-progress-fill').evaluate((el) => el.style.width)).toBe('0%');
  });
});
