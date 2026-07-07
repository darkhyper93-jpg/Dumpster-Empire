/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 6:
 *
 * Bug del Índice — AutomationView, CollectionView y PrestigeView comparten `#tab-content`
 * y las tres usaban la MISMA marca `dataset.boundClick` para bindear su listener delegado
 * "una sola vez": la primera vista visitada robaba la marca y las siguientes nunca
 * bindeaban el suyo (los tabs del Índice no respondían; Automatización/Prestigio tenían el
 * mismo bug latente según el orden de visita). Se cubren los DOS órdenes.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego } from './helpers/dig.js';

test.describe('Dumpster Empire — regresión ronda 6 (listeners de vistas en #tab-content)', () => {
  test('Índice responde aunque otra vista de #tab-content se haya renderizado antes', async ({ page }) => {
    await entrarAlJuego(page);

    // Automatización primero: con el bug, esta vista robaba la marca compartida.
    await page.locator('[data-tab="automatizacion"]').click();
    await expect(page.locator('[data-action="buy-automation"]').first()).toBeVisible();

    await page.locator('[data-tab="index"]').click();
    const tabs = page.locator('.index-container-tab');
    await expect(tabs.first()).toBeVisible();
    await expect(tabs.first()).toHaveClass(/is-active/);

    // Alternar al segundo contenedor: el tab pasa a activo y el grid re-renderiza para él.
    const second = tabs.nth(1);
    await second.click();
    await expect(second).toHaveClass(/is-active/);
    await expect(tabs.first()).not.toHaveClass(/is-active/);

    // Y de vuelta al primero (alternancia real, no un cambio único).
    await tabs.first().click();
    await expect(tabs.first()).toHaveClass(/is-active/);
    await expect(second).not.toHaveClass(/is-active/);
  });

  test('Automatización responde aunque el Índice se haya renderizado antes (orden inverso)', async ({ page }) => {
    // Save sembrado: dinero de sobra para comprar la automatización más barata (guantes, $50).
    const seeded = freshState();
    seeded.money = 500;
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      ['dumpsterEmpireSave', serializeState(seeded)]
    );
    await entrarAlJuego(page);

    // Índice primero: con el bug, robaba la marca y Automatización quedaba muerta.
    await page.locator('[data-tab="index"]').click();
    await expect(page.locator('.index-container-tab').first()).toBeVisible();

    await page.locator('[data-tab="automatizacion"]').click();
    const buyBtn = page.locator('[data-action="buy-automation"][data-id="guantes"]');
    await expect(buyBtn).toBeEnabled();
    await buyBtn.click();

    // La compra pasó por el store: el botón se reemplaza por el badge "Activo".
    await expect(page.locator('[data-action="buy-automation"][data-id="guantes"]')).toHaveCount(0);
  });
});
