/**
 * e2e (Playwright/Chromium) de la Ronda 19 (quick wins): racha de escarbado visible,
 * pantalla de Estadísticas, logros ocultos ("???" hasta desbloquear) y % de completitud.
 * Corre con el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);
// Racha 25 (oculto) — derivado de la data, nunca un id hardcodeado a mano (regla heredada §0).
const HIDDEN_STREAK_ACHIEVEMENT = achievementsData.find((a) => a.cond.type === 'digStreakAtLeast' && a.cond.value === 25);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save base: tutorial saltado. */
function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

test.describe('Dumpster Empire — ronda 19 (racha, estadísticas, logros ocultos, completitud)', () => {
  test('1: la racha aparece desde 2 escarbados manuales sin trampa', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const streakPill = page.locator('#dig-streak-pill');
    await expect(streakPill).toBeHidden();

    for (let i = 0; i < 2; i++) {
      const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 1);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
      for (const pos of positions) await rascarObjeto(page, box, pos);
      await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
      await cerrarCelebraciones(page);
    }

    await expect(streakPill).toBeVisible();
    await expect(streakPill).toHaveText('Racha: 2');
  });

  test('2: la vista de Estadísticas (Ajustes) muestra los valores del seed', async ({ page }) => {
    const seeded = baseState();
    seeded.itemsFoundCount = 321;
    seeded.trapsHit = 12;
    seeded.totalMoneyEarned = 555000;
    seeded.autoProcessedCount = 44;
    seeded.bestDigStreak = 17;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('#settings-btn').click();
    await cerrarCelebraciones(page);

    const stats = page.locator('.settings-stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('321');
    await expect(stats).toContainText('12');
    await expect(stats).toContainText('44');
    await expect(stats).toContainText('17');
  });

  test('3: un logro oculto muestra "???" antes de desbloquearse', async ({ page }) => {
    const seeded = baseState();
    // Todo desbloqueado MENOS el logro oculto de racha 25 — así no hay ruido de otros logros
    // ocultos ya revelados por el seed.
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS.filter((id) => id !== HIDDEN_STREAK_ACHIEVEMENT.id);
    seeded.bestDigStreak = 24;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="logros"]').click();
    await cerrarCelebraciones(page);

    const cards = page.locator('.achievement-card');
    const hiddenCards = cards.filter({ hasText: '???' });
    await expect(hiddenCards).toHaveCount(1);
    await expect(page.locator('.achievement-card', { hasText: HIDDEN_STREAK_ACHIEVEMENT.name })).toHaveCount(0);
  });

  test('4: el mismo logro oculto muestra su nombre real una vez desbloqueado', async ({ page }) => {
    const seeded = baseState();
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS; // incluye el oculto de racha 25.
    seeded.bestDigStreak = 25;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="logros"]').click();
    await cerrarCelebraciones(page);

    await expect(page.locator('.achievement-card', { hasText: HIDDEN_STREAK_ACHIEVEMENT.name })).toBeVisible();
  });
});
