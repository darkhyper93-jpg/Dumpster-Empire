/**
 * e2e de i18n (Ronda 16, tarea D): detección automática por locale del navegador, switch en
 * vivo desde Ajustes, y migración de guardado v6 -> v7 (itemsFoundByItem nombre-español -> id).
 *
 * `test.use({ locale: 'en-US' })` a nivel de describe simula un navegador en inglés — el resto
 * de la suite corre con `locale: 'es-ES'` (playwright.config.js, R-16.1) y sigue en español.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';

// AJUSTE: igual que ronda14-regression.spec.js — Playwright compila los specs sin
// "type":"module" en el package.json raíz, así que se usa __dirname en vez de import.meta.
const itemsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/items.json'), 'utf8'));
// Nombre español real (clave de guardado pre-ronda-16) del primer ítem de tachoVereda.
const CAN_CRUSHED = itemsData.containers.tachoVereda.find((item) => item.id === 'can-crushed');

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/**
 * Save v6 armado a mano (JSON literal, PLAN.md §16.D): `itemsFoundByItem` todavía usa el
 * NOMBRE español del ítem como clave (comportamiento pre-ronda-16) — la migración v6->v7 debe
 * remapearlo al id estable (`can-crushed`) al bootear.
 */
function saveV6ConItemPorNombre() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  const raw = JSON.parse(JSON.stringify(seeded));
  raw.itemsFoundByItem = { tachoVereda: { [CAN_CRUSHED.name]: 3 } };
  raw.saveVersion = 6;
  return JSON.stringify(raw);
}

test.describe('Dumpster Empire — i18n (ronda 16): detección, switch en vivo, migración v7', () => {
  test.describe('locale de navegador en inglés (en-US)', () => {
    test.use({ locale: 'en-US' });

    test('1: partida nueva en en-US bootea en inglés, cero texto español', async ({ page }) => {
      await page.goto('/apps/game/');
      await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');

      await expect(page.locator('#title-play-btn')).toHaveText('Play');
      await page.locator('#title-play-btn').click();
      const skip = page.locator('[data-action="skip-tutorial"]');
      if (await skip.isVisible()) await skip.click();

      const tabs = page.locator('#tabbar button');
      await expect(tabs).toHaveText(['Dig', 'Containers', 'Automation', 'Achievements', 'Prestige', 'Index']);

      await page.locator('[data-tab="tienda"]').click();
      await expect(page.locator('#tab-content')).toContainText('Cost:');
      await expect(page.locator('#tab-content')).not.toContainText('Costo:');

      // Ancla adicional: el nuevo save persistido ya arranca en inglés (sin locale distinto que
      // lo pise), cubre R-16.9/boot bilingüe end to end.
      const saved = await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'));
      expect(JSON.parse(saved).language).toBe('en');
    });
  });

  test('2: cambiar idioma en Ajustes actualiza la vista en vivo y persiste al recargar', async ({ page }) => {
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#title-play-btn').click();
    const skip = page.locator('[data-action="skip-tutorial"]');
    if (await skip.isVisible()) await skip.click();

    // Arranca en español (locale es-ES del config): el tab de Escarbar es el ancla.
    await expect(page.locator('[data-tab="escarbar"]')).toHaveText('Escarbar');

    await page.locator('#settings-btn').click();
    const select = page.locator('[data-action="set-language"]');
    await expect(select).toBeVisible();
    await select.selectOption('en');
    // R-16.4: el guard de SELECT se traga el re-render mientras sigue enfocado.
    await select.evaluate((el) => el.blur());

    await expect(page.locator('[data-tab="escarbar"]')).toHaveText('Dig');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    // El juego siempre vuelve a la pantalla de título al recargar (PLAN.md §11.8); ya en inglés.
    await expect(page.locator('#title-play-btn')).toHaveText('Play');
    await page.locator('#title-play-btn').click();
    await expect(page.locator('[data-tab="escarbar"]')).toHaveText('Dig');
  });

  test('3: un save v6 con clave de ítem en español migra a id al bootear', async ({ page }) => {
    await seed(page, saveV6ConItemPorNombre());
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#title-play-btn').click();
    const skip = page.locator('[data-action="skip-tutorial"]');
    if (await skip.isVisible()) await skip.click();

    await page.locator('[data-tab="index"]').click();
    // tachoVereda es el primer contenedor (tab activo por defecto en CollectionView).
    const card = page.locator('.index-card', { hasText: CAN_CRUSHED.name });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Encontrado: 3');

    // La migración vive solo en memoria hasta el próximo `persist()` (store.js no reescribe
    // localStorage con el estado ya migrado hasta que corre alguna acción) — se dispara una
    // acción inocua (toggle de sonido, sin efecto sobre la colección) para poder verificar el
    // save persistido, tal como pide el DoD.
    await page.locator('#settings-btn').click();
    await page.locator('[data-action="toggle-sound"]').click();

    const saved = await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'));
    const parsed = JSON.parse(saved);
    expect(parsed.saveVersion).toBeGreaterThanOrEqual(7);
    expect(parsed.itemsFoundByItem.tachoVereda[CAN_CRUSHED.id]).toBe(3);
    expect(parsed.itemsFoundByItem.tachoVereda[CAN_CRUSHED.name]).toBeUndefined();
  });
});
