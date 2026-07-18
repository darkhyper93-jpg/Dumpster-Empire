/**
 * e2e (Playwright/Chromium) de la Ronda 15 (contenido: 4 contenedores de prestigio 6-9, 4
 * máquinas del robot, nodo de prestigio Escáner de Trampas y logro a28):
 *
 * 1. Contenedores por prestigio: con `prestigeCount: 6` y los 12 contenedores previos poseídos,
 *    "Chatarrería de Titanes" (requiere Prestigio 6) queda comprable; "Naufragio Temporal"
 *    (requiere Prestigio 7) queda bloqueado con el texto de "Se desbloquea con el Prestigio 7.".
 * 2. Máquinas del robot: comprar Servobrazos Reforzados desde Automatización lo deja "Activo" y
 *    baja el dinero.
 * 3. Nodo Escáner: con las Llaves y los 3 nodos previos de la rama ya al nivel 1, comprar el
 *    Escáner de Trampas 3 veces lo deja "Máximo" y las Llaves bajan 65 en total (8+18+39).
 * 4. Logro nuevo: `totalMoneyEarned` justo por debajo de 1e12 + un escarbado que lo cruza dispara
 *    la celebración de "Billonario Galáctico" (a28).
 *
 * DECISIÓN (D2 del roadmap): el descarte de trampas del Escáner (RNG no determinista en el
 * navegador) NO tiene e2e propio — está cubierto por el test de engine de A2 caso 5
 * (`packages/engine/tests/ronda15-robot.test.js`) y por la verificación manual del Agente E.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

const containersData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/containers.json'), 'utf8'));
const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));

// Todos los contenedores anteriores a "Chatarrería de Titanes" (primero de la ronda 15) — la
// posición se deriva de la data, nunca se hardcodea un índice (regla R3 de ROADMAPv3.md).
const PREVIOUS_CONTAINER_IDS = containersData
  .slice(0, containersData.findIndex((c) => c.id === 'chatarreriaTitanes'))
  .map((c) => c.id);

const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);
const A28_ID = achievementsData.find((a) => a.cond.type === 'totalMoneyEarnedAtLeast' && a.cond.value === 1e12).id;

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save base: tutorial saltado, todos los logros ya desbloqueados salvo los que cada test excluya. */
function baseState({ excludeAchievements = [] } = {}) {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS.filter((id) => !excludeAchievements.includes(id));
  return seeded;
}

test.describe('Dumpster Empire — ronda 15 (contenido nuevo)', () => {
  test('1: contenedores nuevos gatean por prestigio (comprable vs. bloqueado)', async ({ page }) => {
    const seeded = baseState();
    seeded.money = 1e18;
    seeded.prestigeCount = 6;
    for (const id of PREVIOUS_CONTAINER_IDS) seeded.ownedContainers[id] = 1;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="tienda"]').click();
    await cerrarCelebraciones(page);

    const chatarreria = page.locator('.shop-card', { hasText: 'Chatarrería de Titanes' });
    await expect(chatarreria).toBeVisible();
    await expect(chatarreria).not.toHaveClass(/shop-card--locked/);

    const naufragio = page.locator('.shop-card', { hasText: 'Naufragio Temporal' });
    await expect(naufragio).toBeVisible();
    await expect(naufragio).toHaveClass(/shop-card--locked/);
    await expect(naufragio).toContainText('Se desbloquea con el Prestigio 7.');
  });

  test('2: comprar una máquina nueva del robot la deja "Activo" y baja el dinero', async ({ page }) => {
    const seeded = baseState();
    seeded.money = 1e7;
    seeded.tutorialStep = 99;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="automatizacion"]').click();
    await cerrarCelebraciones(page);

    const card = page.locator('.automation-card', { hasText: 'Servobrazos Reforzados' });
    await expect(card).toBeVisible();
    const buyBtn = card.locator('[data-action="buy-automation"]');
    await expect(buyBtn).toBeEnabled();

    const moneyEl = page.locator('#money');
    const moneyBefore = await moneyEl.textContent();
    await buyBtn.click();

    await expect(card).toHaveClass(/automation-card--owned/);
    await expect(card.locator('.badge')).toHaveText('Activo');
    await expect(moneyEl).not.toHaveText(moneyBefore);
  });

  test('3: el nodo Escáner de Trampas llega a "Máximo" tras 3 compras y baja 65 Llaves', async ({ page }) => {
    const seeded = baseState();
    seeded.prestigeKeys = 70;
    seeded.prestigeTreeLevels = { capitalInicial: 1, suerteAncestral: 1, instintoCarronero: 1 };
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await page.locator('[data-tab="prestigio"]').click();
    await cerrarCelebraciones(page);

    const node = page.locator('.prestige-node', { hasText: 'Escáner de Trampas' });
    await expect(node).toBeVisible();

    const keysEl = page.locator('#keys');
    const keysBefore = await keysEl.textContent();

    for (let i = 0; i < 3; i++) {
      const buyBtn = node.locator('[data-action="buy-node"]');
      await expect(buyBtn).toBeEnabled();
      await buyBtn.click();
      await cerrarCelebraciones(page);
    }

    await expect(node.locator('.badge')).toHaveText('Máximo');
    await expect(keysEl).not.toHaveText(keysBefore);
    // 65 Llaves totales (8 + 18 + 39): con 70 sembradas, quedan 5.
    await expect(page.locator('#keys-value')).toHaveText('5');
  });

  test('4: cruzar totalMoneyEarned = 1e12 dispara el logro "Billonario Galáctico" (a28)', async ({ page }) => {
    const seeded = baseState({ excludeAchievements: [A28_ID] });
    seeded.totalMoneyEarned = 1e12 - 1;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    // AJUSTE (ronda 27, fix de flake preexistente): con minObjetos=1 una TRAMPA (1 solo
    // "objeto") pasaba el filtro del helper → el escarbado no vendía nada, totalMoneyEarned no
    // cruzaba 1e12 y a28 nunca celebraba (~5-8% de las corridas). Con 2 el helper reintenta
    // ante trampa; el tacho sin trampa siempre da 3 objetos.
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 2);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    for (const pos of positions) await rascarObjeto(page, box, pos);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });

    const modal = page.locator('#celebration-modal');
    // AJUSTE (ronda 27): la celebración se pinta en el notify SIGUIENTE al último rascado — bajo
    // carga puede llegar un frame después de #dig-empty y el loop de abajo salía sin iterar.
    // Esperar el modal explícitamente antes de recorrer la cola de celebraciones.
    await expect(modal).toBeVisible({ timeout: 5000 });
    let sawA28 = false;
    for (let i = 0; i < 10 && (await modal.isVisible().catch(() => false)); i++) {
      const text = await modal.textContent();
      if (text.includes('Billonario Galáctico')) sawA28 = true;
      await page.locator('[data-action="close-celebration"]').click();
    }
    expect(sawA28).toBe(true);
  });
});
