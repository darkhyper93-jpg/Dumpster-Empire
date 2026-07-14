/**
 * e2e (Playwright/Chromium) de la Ronda 22 (colección con dientes): PLAN.md §4.25 (sets) y
 * §4.26 (legendarios). Corre con el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, cerrarCelebraciones } from './helpers/dig.js';

// AJUSTE: mismo patrón que ronda14-regression.spec.js — Playwright compila los specs sin
// "type":"module" en el package.json raíz, `import.meta` no está disponible acá.
const itemsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/items.json'), 'utf8'));

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

async function abrirIndice(page) {
  await page.locator('[data-tab="index"]').click();
  await cerrarCelebraciones(page);
}

test.describe('Dumpster Empire — ronda 22 (colección: sets, legendarios, vitrina)', () => {
  test('1: pool completo de tachoVereda ⇒ el INDEX muestra el badge SET COMPLETO', async ({ page }) => {
    const seeded = baseState();
    const pool = itemsData.containers.tachoVereda;
    seeded.itemsFoundByItem.tachoVereda = Object.fromEntries(pool.map((it) => [it.id, 1]));
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirIndice(page);

    // tachoVereda es el primer contenedor: el INDEX arranca con él seleccionado.
    await expect(page.locator('.index-set-badge')).toBeVisible();
    await expect(page.locator('.index-set-badge')).toContainText('2%');
  });

  test('2: sin ningún pool completo, el INDEX no muestra el badge', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirIndice(page);

    await expect(page.locator('.index-set-badge')).toHaveCount(0);
  });

  test('3: seed con legendariesFound ⇒ la Vitrina los exhibe revelados y cuenta bien', async ({ page }) => {
    const seeded = baseState();
    seeded.legendariesFound = ['legendary-first-can', 'legendary-ghost-bike'];
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirIndice(page);

    await expect(page.locator('.showcase-count')).toContainText('2/8');
    const revealed = page.locator('.showcase-card:not(.showcase-card--hidden)');
    await expect(revealed).toHaveCount(2);
    await expect(page.locator('.showcase-card', { hasText: 'La Primera Lata' })).toBeVisible();
    await expect(page.locator('.showcase-card', { hasText: 'La Bicicleta Fantasma' })).toBeVisible();
  });

  test('4: vitrina vacía muestra su empty state en las 8 siluetas', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirIndice(page);

    await expect(page.locator('.showcase-count')).toContainText('0/8');
    await expect(page.locator('.showcase-card--hidden')).toHaveCount(8);
    await expect(page.locator('.showcase-card--hidden').first()).toContainText('Todavía no encontraste este legendario.');
  });
});
