/**
 * e2e (Playwright/Chromium) de la Ronda 25: prestigio profundo — especializaciones (§4.31) y
 * desafíos (§4.32). Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function primedState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 2_000_000_000;
  seeded.totalMoneyEarned = 2_000_000_000;
  return seeded;
}

async function abrirPrestigio(page) {
  await cerrarCelebraciones(page);
  await page.locator('[data-tab="prestigio"]').click();
  await cerrarCelebraciones(page);
}

test.describe('Dumpster Empire — ronda 25 (prestigio profundo)', () => {
  test('1: prestigiar eligiendo la especialización Chatarrero sube el sellMult de "common" (precio del Puesto)', async ({
    page,
  }) => {
    const seeded = primedState();
    // Puesto ya comprado y en captura agresiva (§2.9/§4.27): cualquier ítem con valor >= 0.01
    // se guarda en vez de venderse instantáneo. Fluctuación fija en 1 para que el precio del
    // Puesto sea predecible (no se refresca dentro de los 60s del test).
    seeded.stallLevel = 1;
    seeded.keepThreshold = 0.01;
    seeded.marketFluctuation = 1;
    seeded.marketFluctuationAt = Date.now();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await abrirPrestigio(page);
    await page.locator('[data-action="do-prestige"]').click();
    await expect(page.locator('.prestige-choice-panel')).toBeVisible();
    await page.locator('[data-choice-id="chatarrero"]').click();
    await page.locator('[data-action="confirm-prestige"]').click();
    await cerrarCelebraciones(page); // "Primer Prestigio" (a22) se desbloquea acá.

    await abrirPrestigio(page);
    await expect(page.locator('.prestige-active-badge')).toContainText('Chatarrero');

    // tachoVereda es gratis (costoInicial 0) y su único pool es 100% categoría "common" — una
    // de las bonificadas ×1.5 de Chatarrero. Todos sus ítems tienen valorBase 2.2, rareza ×1,
    // sin Suerte (post-prestigio en 0): sin bonus el baseValue capturado NUNCA puede superar
    // 2.2×1.15 = 2.53; CON el ×1.5 de Chatarrero el piso es 2.2×0.85×1.5 = 2.805. Se lee el
    // baseValue crudo del save (no el precio ya redondeado a entero por formatMoney, que
    // ocultaría la diferencia) para una aserción determinística contra el sellMult real.
    await page.locator('[data-tab="escarbar"]').click();
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 1);
    const box = await canvas.boundingBox();
    for (const pos of positions) await rascarObjeto(page, box, pos);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });

    const save = await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'));
    const inventory = JSON.parse(save).inventory;
    expect(inventory.length).toBeGreaterThan(0);
    for (const item of inventory) {
      expect(item.baseValue).toBeGreaterThan(2.6);
    }
  });

  test('2: el desafío activo Manos Vacías bloquea la compra de máquinas con su tooltip', async ({ page }) => {
    const seeded = primedState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await abrirPrestigio(page);
    await page.locator('[data-action="do-prestige"]').click();
    await expect(page.locator('.prestige-choice-panel')).toBeVisible();
    await page.locator('[data-choice-id="manosVacias"]').click();
    await page.locator('[data-action="confirm-prestige"]').click();
    await cerrarCelebraciones(page);

    await abrirPrestigio(page);
    await expect(page.locator('.prestige-active-badge')).toContainText('Manos Vacías');

    await page.locator('[data-tab="automatizacion"]').click();
    await cerrarCelebraciones(page);
    const buyBtn = page.locator('[data-action="buy-automation"]').first();
    await expect(buyBtn).toBeDisabled();
    await expect(buyBtn).toHaveAttribute('title', 'El desafío activo no permite comprar máquinas.');
  });
});
