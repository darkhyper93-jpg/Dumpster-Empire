/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 10 (dificultad exponencial, PLAN.md §11.2
 * ampliado):
 *
 * 1. Las metas de Fuerza y Búsqueda recomendadas son visibles en la Tienda.
 * 2. Las nuevas metas de Suerte (recalibradas, ~×1.6 por tier) son visibles en la Tienda.
 * 3. Con Fuerza corta, el hint "Ritmo de escarbado:" se siente en contenedores duros y no en
 *    los que ya se dominan con la Fuerza base.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado } from './helpers/dig.js';

/** Save con contenedores comprados hasta el depósito (patrón de ronda7-regression.spec.js). */
function hastaDepositoSave() {
  const seeded = freshState();
  seeded.money = 50000;
  seeded.tutorialStep = 99;
  seeded.upgradeLevels = { luck: 18, digPower: 5, area: 47, capacity: 0 };
  seeded.ownedContainers = { tachoVereda: 85, contenedorBarrio: 30, containerIndustrial: 15, depositoAbandonado: 7 };
  return serializeState(seeded);
}

/** Save con Fuerza base (nivel 0) y el barrio ya comprado, con plata para probarlo. */
function fuerzaBaseConBarrioSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 100;
  seeded.ownedContainers = { tachoVereda: 1 };
  return serializeState(seeded);
}

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save con el tacho comprado (desbloquea el barrio en la tarjeta de Tienda). */
function tachoCompradoSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.ownedContainers = { tachoVereda: 1 };
  return serializeState(seeded);
}

test.describe('Dumpster Empire — regresión ronda 10 (dificultad exponencial)', () => {
  test('1: metas de Fuerza y Búsqueda recomendadas visibles en la Tienda', async ({ page }) => {
    await seed(page, tachoCompradoSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="tienda"]').click();
    const cards = page.locator('.shop-card');
    const tacho = cards.nth(0);
    await expect(tacho).toContainText('Fuerza recomendada: ×1');
    await expect(tacho).toContainText('Búsqueda recomendada: ×1');
    await expect(tacho.locator('.shop-card-luck--reached')).toHaveCount(3);

    const barrio = cards.nth(1);
    await expect(barrio).toContainText('Fuerza recomendada: ×1.35');
    await expect(barrio).not.toContainText('Fuerza recomendada: ×1.35 (alcanzada)');
  });

  test('2: metas de Suerte nuevas visibles en la Tienda', async ({ page }) => {
    await seed(page, hastaDepositoSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="tienda"]').click();
    const luckLines = await page
      .locator('.shop-card-luck')
      .filter({ hasText: 'Suerte recomendada' })
      .allTextContents();
    expect(luckLines.some((t) => t.includes('Suerte recomendada: 8 '))).toBe(true);
    expect(luckLines.some((t) => t.includes('Suerte recomendada: 20 '))).toBe(true);
    expect(luckLines.some((t) => t.includes('Suerte recomendada: 40 '))).toBe(true);
  });

  test('3: la penalización se siente — el hint de ritmo aparece solo en contenedores duros', async ({ page }) => {
    await entrarAlJuego(page);
    // Fuerza base (nivel 0, mult 1) vs resistencia 1.0 del tacho: ritmo 1.0, sin hint.
    await iniciarEscarbado(page, 'tachoVereda');
    await expect(page.locator('#dig-trap-hint')).not.toContainText('Ritmo de escarbado');
    await page.locator('#dig-abandon-btn').click();
    await expect(page.locator('#dig-empty')).toBeVisible();

    // Fuerza base vs resistencia 1.35 del barrio: ritmo 1/1.35 ≈ 74%, con hint.
    await seed(page, fuerzaBaseConBarrioSave());
    await entrarAlJuego(page);
    await iniciarEscarbado(page, 'contenedorBarrio');
    await expect(page.locator('#dig-trap-hint')).toContainText('Ritmo de escarbado: 74%');
  });
});
