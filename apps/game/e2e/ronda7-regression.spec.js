/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 7 (balance de riesgo y gesto):
 *
 * 1. La Suerte recomendada es una META FIJA por contenedor: en una partida avanzada
 *    (niveles de contenedor, Fuerza, Área altos) NO colapsa a "0 (alcanzada)" — el bug
 *    reportado jugando el build de escritorio.
 * 2. El pincel del gesto depende de Fuerza vs resistencia y el Área no lo trivializa:
 *    un mismo toque limpia bastante más en un contenedor blando (sobre-Fuerza, tope 1.5×
 *    objeto) que en uno duro (Fuerza corta), incluso con Área nivel 47.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado, puntoLejano } from './helpers/dig.js';

/** Partida avanzada tipo playtest real: Área 47, Fuerza 5, cadena hasta depósito, plata. */
function advancedSave() {
  const seeded = freshState();
  seeded.money = 50000;
  seeded.tutorialStep = 99;
  seeded.upgradeLevels = { luck: 18, digPower: 5, area: 47, capacity: 0 };
  seeded.ownedContainers = { tachoVereda: 85, contenedorBarrio: 30, containerIndustrial: 15, depositoAbandonado: 7 };
  seeded.containerLevels = { tachoVereda: 7, contenedorBarrio: 4, containerIndustrial: 3, depositoAbandonado: 2 };
  return serializeState(seeded);
}

/** Píxeles borrados (alpha < 40) de la capa de suciedad. */
async function clearedPixels(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.dig-canvas-top');
    const { data } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
    let cleared = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 40) cleared++;
    return cleared;
  });
}

test.describe('Dumpster Empire — regresión ronda 7 (riesgo y gesto en partidas avanzadas)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      ['dumpsterEmpireSave', advancedSave()]
    );
    await entrarAlJuego(page);
  });

  test('la Suerte recomendada NO colapsa a 0 con partida avanzada (meta fija por contenedor)', async ({ page }) => {
    await page.locator('[data-tab="tienda"]').click();
    // AJUSTE (ronda 10): .shop-card-luck ahora también contiene las líneas de Fuerza/Búsqueda
    // recomendadas (10.7) — se filtra por texto para quedarse solo con las líneas de Suerte.
    const luckLines = await page
      .locator('.shop-card-luck')
      .filter({ hasText: 'Suerte recomendada' })
      .allTextContents();
    // Los contenedores pagos desbloqueados (barrio/industrial/depósito) muestran su meta > 0.
    const values = luckLines.map((t) => Number((t.match(/Suerte recomendada:\s*(\d+)/) || [])[1]));
    expect(values.length).toBeGreaterThanOrEqual(4);
    const paid = values.slice(1); // el tacho (gratis) legítimamente recomienda 0
    for (const v of paid) expect(v).toBeGreaterThan(0);
    // Y crecen por tier (la meta de progresión se mantiene visible aunque avances).
    for (let i = 1; i < paid.length; i++) expect(paid[i]).toBeGreaterThan(paid[i - 1]);
  });

  test('un mismo toque limpia mucho más en un contenedor blando que en uno duro (Fuerza vs resistencia, Área con tope)', async ({ page }) => {
    const CANVAS_AREA = 600 * 330;
    const tap = async (containerId) => {
      const canvas = await iniciarEscarbado(page, containerId);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('No se pudo medir el canvas.');
      const far = await puntoLejano(page, box);
      await page.mouse.click(far.x, far.y);
      const cleared = await clearedPixels(page);
      await page.locator('#dig-abandon-btn').click();
      await expect(page.locator('#dig-empty')).toBeVisible();
      return cleared;
    };

    // Con Área 3.35 y Fuerza 1.44: tacho (resist 1.0) va al tope (42px); depósito (resist 1.8)
    // queda en ~29px. La huella de un toque debe diferir claramente (~2x en área).
    const clearedSoft = await tap('tachoVereda');
    const clearedHard = await tap('depositoAbandonado');
    expect(clearedSoft).toBeGreaterThan(clearedHard * 1.5);
    // Y el tope funciona: ni el build de Área 47 limpia más del 2% del canvas por toque
    // (radio 42px → π·42² ≈ 5.5k px ≈ 2.8%... margen: < 4%).
    expect(clearedSoft / CANVAS_AREA).toBeLessThan(0.04);
  });
});
