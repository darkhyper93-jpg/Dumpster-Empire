/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 9 (niveles de contenedor con valor y
 * visibles + automatización explicada, PLAN.md §11.3):
 *
 * 1. La tarjeta de la Tienda muestra nivel, bonus de valor y progreso al siguiente nivel.
 * 2. El picker de escarbado muestra el badge "Nv. X".
 * 3. Subir de nivel por escarbado manual dispara un toast.
 * 4. Automatización sin robot: callout de cola inactiva (no una cola muerta "0/2").
 * 5. Automatización con robot: cola real visible, sin callout.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado, getDigPositions, rascarObjeto } from './helpers/dig.js';

/** Save con el tacho a nivel 7 y 3 escarbados de progreso (7→8 pide 31 = ceil(5·1.35^6)). */
function nivelesSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.containerLevels = { tachoVereda: 7 };
  seeded.containerLevelProgress = { tachoVereda: 3 };
  return serializeState(seeded);
}

/** Save a 1 escarbado de subir el tacho a nivel 2 (nivel 1 pide 5). */
function casiLevelUpSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.containerLevelProgress = { tachoVereda: 4 };
  return serializeState(seeded);
}

/** Save con el Robot Clasificador ya comprado (la cola trabaja sola). */
function conRobotSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.automationOwned = { robotClasificador: true };
  return serializeState(seeded);
}

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

test.describe('Dumpster Empire — regresión ronda 9 (niveles visibles y automatización explicada)', () => {
  test('1: la tarjeta de la Tienda muestra nivel, bonus y progreso', async ({ page }) => {
    await seed(page, nivelesSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="tienda"]').click();
    const levelLine = page.locator('.shop-card-level').first();
    await expect(levelLine).toContainText('Nivel 7/10 (+30% valor)');
    await expect(levelLine).toContainText('3/31 escarbados para el nivel 8');
  });

  test('2: el picker de escarbado muestra el badge "Nv. X"', async ({ page }) => {
    await seed(page, nivelesSave());
    await entrarAlJuego(page);
    await expect(
      page.locator('[data-start-dig="tachoVereda"] .dig-picker-card-level')
    ).toHaveText('Nv. 7');
  });

  test('3: completar un escarbado manual que sube de nivel muestra el toast', async ({ page }) => {
    await seed(page, casiLevelUpSave());
    await entrarAlJuego(page);
    // Da igual si el roll salió trampa: el escarbado cuenta para el nivel igual (§11.3), y
    // en ambos casos completar es rascar todas las posiciones de __digDebug.
    const canvas = await iniciarEscarbado(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    const positions = await getDigPositions(page);
    for (const pos of positions) await rascarObjeto(page, box, pos);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('subió a nivel 2');
  });

  test('4: automatización SIN robot muestra el callout de cola inactiva, no una cola muerta', async ({ page }) => {
    await entrarAlJuego(page);
    await page.locator('[data-tab="automatizacion"]').click();
    const callout = page.locator('.automation-callout');
    await expect(callout).toBeVisible();
    await expect(callout).toContainText('Robot Clasificador');
    await expect(page.locator('.automation-status')).not.toContainText('Cola:');
  });

  test('5: automatización CON robot muestra la cola real, sin callout', async ({ page }) => {
    await seed(page, conRobotSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="automatizacion"]').click();
    // El tacho es gratis, así que el robot encola solo apenas corre el tick: se asserta
    // "Cola: N / max" por regex, no el 0 literal (sería flaky por diseño del juego).
    await expect(page.locator('.automation-status')).toContainText(/Cola: \d+ \/ \d+/);
    await expect(page.locator('.automation-status')).toContainText('Slots simultáneos: 1');
    await expect(page.locator('.automation-callout')).toHaveCount(0);
  });
});
