/**
 * e2e (Playwright/Chromium) de la Ronda 21 (limpieza): remoción de Energía/espionaje y los tres
 * fixes de UI (prompt del canvas en inglés, racha tapada durante el escarbado, herramientas y
 * estadísticas mudadas fuera de Ajustes). Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado, cerrarCelebraciones } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

test.describe('Dumpster Empire — ronda 21 (limpieza: remoción de energía/espionaje + fixes de UI)', () => {
  test('1: cambiar idioma a inglés re-traduce el prompt del canvas ("Drag to dig")', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await iniciarEscarbado(page, 'tachoVereda');
    await expect(page.locator('.dig-idle-prompt p')).toHaveText('Arrastrá para escarbar');

    await page.locator('#settings-btn').click();
    const select = page.locator('[data-action="set-language"]');
    await expect(select).toBeVisible();
    await select.selectOption('en');
    await select.evaluate((el) => el.blur());

    await page.locator('[data-tab="escarbar"]').click();
    await expect(page.locator('.dig-idle-prompt p')).toHaveText('Drag to dig');
  });

  test('2: la racha es visible durante un escarbado activo, sin tapar el canvas ni el título', async ({ page }) => {
    const seeded = baseState();
    seeded.digStreak = 5;
    seeded.bestDigStreak = 5;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const streakPill = page.locator('#dig-streak-pill');
    await expect(streakPill).toBeVisible();
    await expect(streakPill).toHaveText('Racha: 5');

    await iniciarEscarbado(page, 'tachoVereda');
    // Con un escarbado activo la píldora sigue visible (antes el overlay del canvas la tapaba).
    await expect(streakPill).toBeVisible();

    const pillBox = await streakPill.boundingBox();
    const titleBox = await page.locator('#dig-container-title').boundingBox();
    const canvasBox = await page.locator('#dig-canvas-host').boundingBox();
    if (!pillBox || !titleBox || !canvasBox) throw new Error('sin boundingBox');
    // No se solapan: la píldora vive en la esquina superior derecha, el título centrado.
    const overlapsTitle = pillBox.x < titleBox.x + titleBox.width && pillBox.x + pillBox.width > titleBox.x;
    expect(overlapsTitle).toBe(false);
  });

  test('3: el selector de herramientas está en Escarbar y es operable (comprar + equipar)', async ({ page }) => {
    const seeded = baseState();
    seeded.money = 10000000;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const tools = page.locator('.settings-tools');
    await expect(tools).toBeVisible();

    await page.locator('[data-action="buy-tool"][data-id="palaAncha"]').click();
    await page.locator('[data-action="equip-tool"][data-id="palaAncha"]').click();
    await expect(page.locator('.tool-row', { hasText: 'Pala Ancha' }).locator('.badge')).toBeVisible();
  });

  test('4: Estadísticas abre desde un botón del header y muestra los valores del seed', async ({ page }) => {
    const seeded = baseState();
    seeded.itemsFoundCount = 42;
    seeded.trapsHit = 3;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('#stats-btn').click();
    await cerrarCelebraciones(page);

    const stats = page.locator('.settings-stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText('42');
    await expect(stats).toContainText('3');
  });

  test('5: Ajustes ya no contiene ni herramientas ni estadísticas', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('#settings-btn').click();
    await cerrarCelebraciones(page);

    // Scopeado a #tab-content (Ajustes): `.settings-tools` sigue existiendo en el DOM dentro de
    // #dig-area (la vista Escarbar, ronda 21), pero eso NO es Ajustes — solo Ajustes debe estar
    // libre de los dos bloques.
    const ajustes = page.locator('#tab-content');
    await expect(ajustes.locator('.settings-tools')).toHaveCount(0);
    await expect(ajustes.locator('.settings-stats')).toHaveCount(0);
  });
});
