/**
 * e2e (Playwright/Chromium) de la Ronda 24: misiones diarias de Chispa (PLAN.md §4.30/§4.31).
 * Corre con el resto: `npm run test:e2e`.
 *
 * R24.4 (roadmap): el ciclo día/noche cambia Suerte/probabilidad de trampa reales — todo spec
 * de esta ronda fija la hora a las 12:00 (día neutro) con `page.clock.install({ time })` para no
 * volverse flaky según la hora real en que corra CI.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

const NOON_TODAY = new Date();
NOON_TODAY.setHours(12, 0, 0, 0);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.ownedContainers.tachoVereda = 1;
  return seeded;
}

async function abrirLogros(page) {
  await cerrarCelebraciones(page);
  await page.locator('[data-tab="logros"]').click();
  await cerrarCelebraciones(page);
}

test.describe('Dumpster Empire — ronda 24 (misiones diarias de Chispa)', () => {
  test('1: una misión sembrada muestra progreso real tras escarbar (delta contra snapshot)', async ({ page }) => {
    await page.clock.install({ time: NOON_TODAY });
    const seeded = baseState();
    seeded.missionsRolledAt = NOON_TODAY.getTime();
    seeded.dailyMissions = [
      {
        id: 'mission-test-find',
        type: 'findCategoryCount',
        difficulty: 'easy',
        params: { categoria: 'common' },
        target: 1,
        progress: 0,
        claimed: false,
        snapshot: 0,
        reward: { type: 'money', amount: 100 },
      },
    ];
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await abrirLogros(page);
    await expect(page.locator('.mission-card-progress')).toHaveText('0/1');

    // Volver a escarbar (tachoVereda, categoría única "common") para mover el contador real.
    await page.locator('[data-tab="escarbar"]').click();
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 1);
    const box = await canvas.boundingBox();
    for (const pos of positions) await rascarObjeto(page, box, pos);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });

    await abrirLogros(page);
    await expect(page.locator('.mission-card-progress')).toHaveText('1/1');
  });

  test('2: reclamar una misión ya cumplida paga la recompensa (polling de #money)', async ({ page }) => {
    await page.clock.install({ time: NOON_TODAY });
    const seeded = baseState();
    seeded.missionsRolledAt = NOON_TODAY.getTime();
    seeded.dailyMissions = [
      {
        id: 'mission-test-claim',
        type: 'streakReach',
        difficulty: 'medium',
        params: {},
        target: 3,
        progress: 3,
        claimed: false,
        snapshot: 0,
        reward: { type: 'money', amount: 12345 },
      },
    ];
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirLogros(page);

    const claimBtn = page.locator('[data-action="claim-mission"]');
    await expect(claimBtn).toBeEnabled();
    await claimBtn.click();

    await expect
      .poll(async () => page.evaluate(() => document.getElementById('money-value')?.textContent))
      .not.toBe('$0');
    await expect(page.locator('.mission-card--claimed')).toBeVisible();
    await expect(claimBtn).toHaveCount(0);
  });

  test('3: missionsRolledAt de ayer → al bootear hay misiones nuevas (reroll diario)', async ({ page }) => {
    await page.clock.install({ time: NOON_TODAY });
    const seeded = baseState();
    const ayer = new Date(NOON_TODAY);
    ayer.setDate(ayer.getDate() - 1);
    seeded.missionsRolledAt = ayer.getTime();
    seeded.dailyMissions = []; // como si el reroll de ayer nunca hubiese llegado a persistirse
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await abrirLogros(page);
    await expect(page.locator('.mission-card')).not.toHaveCount(0);
  });

  test('4: missionsRolledAt de hoy → NO rerollea (la misión sembrada se conserva intacta)', async ({ page }) => {
    await page.clock.install({ time: NOON_TODAY });
    const seeded = baseState();
    seeded.missionsRolledAt = NOON_TODAY.getTime();
    seeded.dailyMissions = [
      {
        id: 'mission-test-persist',
        type: 'findCategoryCount',
        difficulty: 'easy',
        params: { categoria: 'common' },
        target: 987654,
        progress: 0,
        claimed: false,
        snapshot: 0,
        reward: { type: 'money', amount: 1 },
      },
    ];
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await abrirLogros(page);
    // Un target tan inusual (987654) solo puede venir del seed: si hubiera rerolleado, el
    // engine jamás generaría este número exacto (roadmap §4.31: sale de V del contenedor).
    await expect(page.locator('.mission-card-progress')).toHaveText('0/987654');
  });
});
