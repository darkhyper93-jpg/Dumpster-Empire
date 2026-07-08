/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 11 (contenedores de prestigio, PLAN.md §2.6
 * ampliado):
 *
 * 1. La Tienda distingue "bloqueado por prestigio" de "bloqueado por progresión".
 * 2. Al alcanzar el prestigio requerido, el Convoy Fantasma se desbloquea (picker + Tienda) y
 *    la Cripta del Coleccionista sigue bloqueada por el prestigio siguiente.
 * 3. El Índice lista el Convoy Fantasma entre sus pestañas de contenedor.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save con prestigio 2, Red de Drones comprada y los 8 contenedores viejos en 1 (patrón ronda 7). */
function prestigioDosSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 1_000_000_000_000;
  seeded.prestigeCount = 2;
  seeded.automationOwned.redDrones = true;
  seeded.ownedContainers = {
    tachoVereda: 1,
    contenedorBarrio: 1,
    containerIndustrial: 1,
    depositoAbandonado: 1,
    mudanzaMansion: 1,
    galeriaLiquidacion: 1,
    bovedaPerdida: 1,
    containerExtradimensional: 1,
  };
  return serializeState(seeded);
}

test.describe('Dumpster Empire — regresión ronda 11 (contenedores de prestigio)', () => {
  test('1: la Tienda dice con qué prestigio se desbloquea el Convoy Fantasma', async ({ page }) => {
    await entrarAlJuego(page);
    await page.locator('[data-tab="tienda"]').click();
    const cards = page.locator('.shop-card');
    const convoy = cards.filter({ hasText: 'Convoy Fantasma' });
    await expect(convoy).toContainText('Se desbloquea con el Prestigio 2');

    const barrio = cards.filter({ hasText: 'Contenedor de Barrio' });
    await expect(barrio).not.toContainText('Se desbloquea con el Prestigio');
  });

  test('2: con prestigio 2 el Convoy aparece en el picker y en la Tienda; la Cripta sigue bloqueada', async ({
    page,
  }) => {
    await seed(page, prestigioDosSave());
    await entrarAlJuego(page);
    await expect(page.locator('[data-start-dig="convoyFantasma"]')).toBeVisible();

    await page.locator('[data-tab="tienda"]').click();
    const cards = page.locator('.shop-card');
    const convoy = cards.filter({ hasText: 'Convoy Fantasma' });
    await expect(convoy).toContainText('Suerte recomendada: 340');

    const cripta = cards.filter({ hasText: 'Cripta del Coleccionista' });
    await expect(cripta).toContainText('Se desbloquea con el Prestigio 3');
  });

  test('3: el Índice lista el Convoy Fantasma entre las pestañas de contenedor', async ({ page }) => {
    await seed(page, prestigioDosSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="index"]').click();
    await expect(page.locator('[data-select-container="convoyFantasma"]')).toBeVisible();
  });
});
