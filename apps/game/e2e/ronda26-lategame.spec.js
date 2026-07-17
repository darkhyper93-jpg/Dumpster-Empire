/**
 * e2e (Playwright/Chromium) de la Ronda 26.C: Mudanza de Galaxia (§4.34-§4.36) y contenedores
 * procedurales post-Big Bang (§4.37/§4.39). Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, cerrarCelebraciones } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

async function leerSave(page) {
  const raw = await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'));
  return JSON.parse(raw);
}

async function abrirPrestigio(page) {
  await cerrarCelebraciones(page);
  await page.locator('[data-tab="prestigio"]').click();
  await cerrarCelebraciones(page);
}

test.describe('Dumpster Empire — ronda 26.C (Mudanza de Galaxia + tiers procedurales)', () => {
  test('1: con prestigio 10, mudarse de galaxia resetea llaves/prestigio y CONSERVA logros', async ({ page }) => {
    const seeded = freshState();
    seeded.tutorialStep = 99;
    // Umbral de la Mudanza (PLAN.md §4.34): prestigeCount >= 10.
    seeded.prestigeCount = 10;
    seeded.prestigeKeys = 500;
    seeded.totalKeysEarnedRun = 300;
    // Coherencia (auditoría 26.D): run <= total en todo save legítimo — sin esto el seed se rechaza.
    seeded.totalKeysEarned = 300;
    // Dinero alto: al cargar, runAchievements() desbloquea varios logros de dinero — sirven de
    // prueba real de "se conserva" (no un array vacío que trivializaría el assert).
    seeded.money = 2_000_000_000;
    seeded.totalMoneyEarned = 2_000_000_000;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    // Los logros de dinero se desbloquean en memoria al bootear (runAchievements(), store.js),
    // pero recién se PERSISTEN a localStorage con la próxima acción real — un toggle de sonido
    // ida y vuelta fuerza ese persist() sin efecto de juego, para poder leer el "antes" real.
    await page.locator('#settings-btn').click();
    await cerrarCelebraciones(page);
    await page.locator('[data-action="toggle-sound"]').click();
    await page.locator('[data-action="toggle-sound"]').click();

    const before = await leerSave(page);
    expect(before.achievementsUnlocked.length).toBeGreaterThan(0);
    // >= 500: algunos de los logros de dinero recién desbloqueados otorgan Llaves como recompensa.
    expect(before.prestigeKeys).toBeGreaterThanOrEqual(500);

    await abrirPrestigio(page);
    await expect(page.locator('[data-action="open-galaxy-move"]')).toBeEnabled();
    await page.locator('[data-action="open-galaxy-move"]').click();
    await expect(page.locator('[data-action="confirm-galaxy-move"]')).toBeVisible();
    await page.locator('[data-action="confirm-galaxy-move"]').click();
    // "Primera Mudanza" (a56) se desbloquea acá, más la viñeta del Intendente (story.json).
    await cerrarCelebraciones(page);

    const after = await leerSave(page);
    // No exactamente 0: "Primera Mudanza" (a56) se desbloquea DESPUÉS del reset y su recompensa
    // (Llaves) se suma sobre el 0 recién puesto — se compara contra las Llaves que había ANTES,
    // no contra el literal 0.
    expect(after.prestigeKeys).toBeLessThan(before.prestigeKeys);
    expect(after.prestigeCount).toBe(0);
    expect(after.totalKeysEarnedRun).toBe(0);
    expect(after.galaxyMoveCount).toBe(1);
    expect(after.deeds).toBeGreaterThan(0);
    // CONSERVA: todos los logros de antes siguen desbloqueados (más "Primera Mudanza").
    for (const id of before.achievementsUnlocked) {
      expect(after.achievementsUnlocked).toContain(id);
    }
    expect(after.achievementsUnlocked).toContain('a56');

    await abrirPrestigio(page);
    await expect(page.locator('.prestige-galaxy-move')).toContainText('1');
  });

  test('2: con Eco del Big Bang comprado, el tier Eco 1 aparece en Escarbar y es comprable con money alto', async ({
    page,
  }) => {
    const seeded = freshState();
    seeded.tutorialStep = 99;
    seeded.deedsTreeLevels = { ecoDelBigBang: 1 };
    seeded.money = 1e25;
    seeded.totalMoneyEarned = 1e25;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="escarbar"]').click();
    await cerrarCelebraciones(page);
    const tierCard = page.locator('[data-start-dig="bigbangPlus1"]');
    await expect(tierCard).toBeVisible();
    await expect(tierCard).toBeEnabled();

    await tierCard.click();
    await expect(page.locator('#dig-active')).toBeVisible();

    const save = await leerSave(page);
    expect(save.ownedContainers.bigbangPlus1).toBe(1);
  });

  test('3: un costo procedural >= 1e21 se muestra con sufijo, nunca "e+"', async ({ page }) => {
    const seeded = freshState();
    seeded.tutorialStep = 99;
    seeded.deedsTreeLevels = { ecoDelBigBang: 1 };
    // bigbangPlus3 cuesta 1e18 × 15^3 ≈ 3.375e21 (≥ 1e21) — poseer los dos tiers anteriores lo
    // desbloquea como "próximo tier" (nextProceduralTier).
    seeded.ownedContainers = { bigbangPlus1: 1, bigbangPlus2: 1 };
    seeded.money = 1e30;
    seeded.totalMoneyEarned = 1e30;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="tienda"]').click();
    await cerrarCelebraciones(page);
    const shopGrid = page.locator('.shop-grid');
    await expect(shopGrid).toContainText('Eco 3');
    const shopText = await shopGrid.textContent();
    expect(shopText).not.toMatch(/e\+/i);

    await page.locator('[data-tab="escarbar"]').click();
    await cerrarCelebraciones(page);
    const tierCard = page.locator('[data-start-dig="bigbangPlus3"]');
    await expect(tierCard).toBeVisible();
    const cardText = await tierCard.textContent();
    expect(cardText).not.toMatch(/e\+/i);
  });
});
