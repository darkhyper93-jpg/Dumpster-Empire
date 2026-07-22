/**
 * e2e (Playwright/Chromium) de la Ronda 32: pantalla de inicio full-bleed calcada sobre el arte
 * real (reference/ui/Fondorenovadoinicio.png → assets/title-bg.png, ROADMAPv4.md §32). Verifica:
 *   1. `#title-screen` cubre el viewport COMPLETO a 375x667 y a 1920x1080 (sin bordes vacíos;
 *      en 1920 el ancho es 1920, NO 720 — la cota de `#app` quedó rota, §32.0).
 *   2. JUGAR entra al juego y, con el arte listo, NO dibuja una segunda placa encima de la
 *      horneada: fondo del botón transparente, sin borde ni sombra (solo el texto vive en DOM).
 *   3. Geometría del calco (medida por pixel-scan sobre el arte de 1672x941): la placa vacía es
 *      el rect 568-1090 x 607-744 (522x137, offset -7,+205 del centro) y la ruedita un aro de
 *      Ø125 centrado en 1562,831 (offset +726,+360.5). El botón y el hitbox replican eso con
 *      --title-art-scale = max(vw/1672, vh/941) (la matemática de object-fit: cover).
 *   4. El hitbox de la ruedita NO sobresale del aro horneado (Ø125, no más) y abre Ajustes.
 *   5. En proporciones donde el cover recorta la ruedita horneada fuera de pantalla (portrait
 *      375x667), Ajustes NO queda inalcanzable: aparece el botón circular visible de respaldo
 *      abajo a la derecha, DENTRO del viewport, y abre Ajustes.
 *   6. El arte carga (naturalWidth 1672, title-bg.png); saboteado cae a `error` y JUGAR sigue.
 * Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';

/** Réplica de la matemática de object-fit:cover del calco (layout.css). */
const artScale = (w, h) => Math.max(w / 1672, h / 941);

async function boot(page, { width, height }) {
  await page.setViewportSize({ width, height });
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#title-screen')).toBeVisible();
}

async function waitArtReady(page) {
  await expect(page.locator('#title-screen')).toHaveAttribute('data-bg', 'ready', {
    timeout: 10000,
  });
}

test.describe('Dumpster Empire — ronda 32 (pantalla de inicio calcada al arte)', () => {
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

  test('2: con el arte listo JUGAR no dibuja una segunda placa (transparente, solo texto) y entra al juego', async ({
    page,
  }) => {
    await boot(page, { width: 1280, height: 720 });
    await waitArtReady(page);
    const playBtn = page.locator('#title-play-btn');
    await expect(playBtn).toBeVisible();

    // AJUSTE (auditoría de release 2, napkin #11): esto era un `evaluate` + `toBe` — un assert
    // SIN auto-retry sobre estilos que el navegador está TRANSICIONANDO. Al pasar a `data-bg
    // ='ready'` la regla del calco apaga placa/borde/sombras, pero `.title-play-btn` tiene
    // `transition`, así que `getComputedStyle` devuelve el valor INTERMEDIO de la animación
    // mientras corre: bajo carga (varios workers) la lectura caía ahí y `boxShadow` no era 'none'
    // todavía. Reproducido con `--repeat-each=6 --workers=6`. `expect.poll` reintenta hasta que
    // los cuatro valores asienten, que es lo que el test quiere afirmar (el estado final, no un
    // frame cualquiera de la transición).
    await expect
      .poll(
        async () =>
          playBtn.evaluate((el) => {
            const cs = getComputedStyle(el);
            return [cs.backgroundColor, cs.borderTopWidth, cs.boxShadow, cs.textShadow].join(' | ');
          }),
        { timeout: 5000, message: 'la placa calcada de JUGAR nunca terminó de apagarse' }
      )
      .toBe('rgba(0, 0, 0, 0) | 0px | none | none');

    await playBtn.click();
    await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('#title-screen')).toBeHidden();
  });

  test('3: la geometría del calco de JUGAR replica la placa horneada (±2px)', async ({ page }) => {
    const viewport = { width: 1920, height: 1080 };
    await boot(page, viewport);
    await waitArtReady(page);
    const s = artScale(viewport.width, viewport.height);
    const rect = await page.locator('#title-play-btn').evaluate((el) => el.getBoundingClientRect());
    expect(Math.abs(rect.width - 522 * s)).toBeLessThan(2);
    expect(Math.abs(rect.height - 137 * s)).toBeLessThan(2);
    expect(Math.abs(rect.x + rect.width / 2 - (viewport.width / 2 - 7 * s))).toBeLessThan(2);
    expect(Math.abs(rect.y + rect.height / 2 - (viewport.height / 2 + 205 * s))).toBeLessThan(2);
  });

  test('4: el hitbox de la ruedita calza el aro horneado (Ø125, sin sobresalir) y abre Ajustes', async ({
    page,
  }) => {
    const viewport = { width: 1280, height: 720 };
    await boot(page, viewport);
    await waitArtReady(page);
    const s = artScale(viewport.width, viewport.height);
    const settingsBtn = page.locator('#title-settings-btn');
    const rect = await settingsBtn.evaluate((el) => el.getBoundingClientRect());
    expect(Math.abs(rect.width - 125 * s)).toBeLessThan(2);
    expect(Math.abs(rect.height - 125 * s)).toBeLessThan(2);
    expect(Math.abs(rect.x + rect.width / 2 - (viewport.width / 2 + 726 * s))).toBeLessThan(2);
    expect(Math.abs(rect.y + rect.height / 2 - (viewport.height / 2 + 360.5 * s))).toBeLessThan(2);

    await settingsBtn.click();
    await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('#tab-content .settings-block').first()).toBeVisible();
  });

  test('5: en portrait (ruedita horneada fuera del encuadre) hay botón de Ajustes visible dentro del viewport', async ({
    page,
  }) => {
    await boot(page, { width: 375, height: 667 });
    await waitArtReady(page);
    const settingsBtn = page.locator('#title-settings-btn');
    await expect(settingsBtn).toBeVisible();
    const rect = await settingsBtn.evaluate((el) => el.getBoundingClientRect());
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(375);
    expect(rect.y + rect.height).toBeLessThanOrEqual(667);
    // Acá el botón es el circular visible de respaldo (la ruedita horneada quedó recortada por
    // el cover): tiene fondo propio, no es el hitbox transparente.
    const bg = await settingsBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');

    await settingsBtn.click();
    await expect(page.locator('.game-shell')).toBeVisible();
    await expect(page.locator('#tab-content .settings-block').first()).toBeVisible();
  });

  test('6: el arte de fondo carga (title-bg.png, 1672x941)', async ({ page }) => {
    await boot(page, { width: 1440, height: 900 });
    await waitArtReady(page);
    const art = await page.locator('.title-bg').evaluate((img) => ({
      src: img.currentSrc,
      naturalWidth: img.naturalWidth,
    }));
    expect(art.src).toMatch(/assets\/title-bg\.png$/);
    expect(art.naturalWidth).toBe(1672);
  });

  test('7: con la ruta del arte saboteada, cae al respaldo y JUGAR sigue funcionando', async ({
    page,
  }) => {
    await page.route('**/assets/title-bg.png', (route) => route.fulfill({ status: 404, body: '' }));
    await boot(page, { width: 375, height: 667 });

    await expect(page.locator('#title-screen')).toHaveAttribute('data-bg', 'error', { timeout: 10000 });
    const playBtn = page.locator('#title-play-btn');
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    await expect(page.locator('.game-shell')).toBeVisible();
  });
});
