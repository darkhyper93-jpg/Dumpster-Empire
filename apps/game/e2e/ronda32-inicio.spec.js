/**
 * e2e (Playwright/Chromium) de la Ronda 32: pantalla de inicio full-bleed
 * (ROADMAPv4.md §32.4). Verifica en el navegador real:
 *   1. `#title-screen` cubre el viewport COMPLETO tanto a 375x667 (celular) como a 1920x1080
 *      (desktop ancho) — su bounding box iguala `window.innerWidth x innerHeight`. En 1920 el
 *      ancho tiene que ser 1920, NO 720: eso prueba que se rompió la cota de `#app`
 *      (ROADMAPv4.md §32.0, la causa raíz de los bordes vacíos).
 *   2. JUGAR es visible y clickeable → transiciona al juego (`.game-shell` visible,
 *      `#title-screen` queda `[hidden]`).
 *   3. El engranaje es visible y clickeable → abre Ajustes.
 *   4. El arte carga (`naturalWidth > 0`); con la ruta saboteada cae al respaldo y JUGAR sigue
 *      funcionando.
 * Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';

async function boot(page, { width, height }) {
  await page.setViewportSize({ width, height });
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#title-screen')).toBeVisible();
}

test.describe('Dumpster Empire — ronda 32 (pantalla de inicio full-bleed)', () => {
  test('1: #title-screen cubre el viewport completo a 375x667 y a 1920x1080 (sin bordes vacíos)', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 1920, height: 1080 },
    ]) {
      await boot(page, viewport);
      const rect = await page.locator('#title-screen').evaluate((el) => el.getBoundingClientRect());
      expect(Math.round(rect.width)).toBe(viewport.width);
      expect(Math.round(rect.height)).toBe(viewport.height);
      expect(Math.round(rect.x)).toBe(0);
      expect(Math.round(rect.y)).toBe(0);
    }
  });

  test('2: JUGAR visible y clickeable entra al juego (.game-shell visible, #title-screen oculto)', async ({
    page,
  }) => {
    await boot(page, { width: 375, height: 667 });
    const playBtn = page.locator('#title-play-btn');
    await expect(playBtn).toBeVisible();
    await expect(page.locator('.game-shell')).toBeHidden();

    await playBtn.click();

    await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('#title-screen')).toBeHidden();
  });

  test('3: el engranaje visible y clickeable abre Ajustes', async ({ page }) => {
    await boot(page, { width: 1280, height: 800 });
    const settingsBtn = page.locator('#title-settings-btn');
    await expect(settingsBtn).toBeVisible();

    await settingsBtn.click();

    await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('.settings-block').first()).toBeVisible();
  });

  test('4: el arte de fondo carga (naturalWidth > 0)', async ({ page }) => {
    await boot(page, { width: 1440, height: 900 });
    await expect
      .poll(async () => page.locator('.title-bg').evaluate((img) => img.naturalWidth), { timeout: 10000 })
      .toBeGreaterThan(0);
    await expect(page.locator('#title-screen')).toHaveAttribute('data-bg', 'ready');
  });

  test('5: con la ruta del arte saboteada, cae al respaldo y JUGAR sigue funcionando', async ({ page }) => {
    await page.route('**/assets/title-bg.webp', (route) => route.fulfill({ status: 404, body: '' }));
    await boot(page, { width: 375, height: 667 });

    await expect(page.locator('#title-screen')).toHaveAttribute('data-bg', 'error', { timeout: 10000 });
    const playBtn = page.locator('#title-play-btn');
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    await expect(page.locator('.game-shell')).toBeVisible();
  });
});
