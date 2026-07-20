/**
 * e2e (Playwright/Chromium) — Ronda 31: diagnóstico de logros de racha (§31.3.2) y visibilidad
 * de ritmo/pincel (§31.3.5, sumado en tareas posteriores de esta misma ronda). Corre con el
 * resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);
const A36 = achievementsData.find((a) => a.cond.type === 'digStreakAtLeast' && a.cond.value === 10);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

test.describe('Dumpster Empire — ronda 31 (fix logros de racha)', () => {
  test('1: a36 ("Racha de Diez") se auto-reclama en el décimo escarbado manual exitoso', async ({ page }) => {
    const seeded = baseState();
    // Todo desbloqueado MENOS a36 — así el escarbado del test no dispara una cascada de otros
    // logros ya cumplidos por defecto (itemsFoundCount, totalMoneyEarned, etc.) antes de a36.
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS.filter((id) => id !== A36.id);
    seeded.digStreak = 9;
    seeded.bestDigStreak = 9;
    seeded.money = 10000;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    const money = page.locator('#money');
    const moneyBefore = await money.textContent();

    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 1);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    for (const pos of positions) await rascarObjeto(page, box, pos);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });

    // El modal de celebración de logro debe aparecer con el nombre de a36 ANTES de cerrarlo.
    const celebrationName = page.locator('.celebration-name');
    await expect(celebrationName).toHaveText(A36.name, { timeout: 5000 });
    await cerrarCelebraciones(page);

    await page.locator('[data-tab="logros"]').click();
    await cerrarCelebraciones(page);
    await expect(page.locator('.achievement-card', { hasText: A36.name })).toBeVisible();

    await expect.poll(async () => money.textContent(), { timeout: 5000 }).not.toBe(moneyBefore);
  });
});
