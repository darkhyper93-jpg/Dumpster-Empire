/**
 * e2e (Playwright/Chromium) de la Ronda 27 (flota de robots, PLAN.md §4.38/§4.39):
 *
 * 1. Con flotaFundadora comprada (flota de 2), Automatización muestra DOS tarjetas de robot;
 *    el robot 2 con target fijo procesa ESE contenedor y el robot 1 (Auto) procesa en paralelo.
 * 2. El filtro de descarte se aplica visiblemente: fijar el umbral desde la tarjeta muestra el
 *    % estimado de descarte que calcula el engine (estimateDiscardShare).
 *
 * Corre con el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, cerrarCelebraciones } from './helpers/dig.js';

// AJUSTE: mismo patrón que ronda23-puesto.spec.js — Playwright compila los specs sin
// "type":"module" en el package.json raíz, `import.meta` no está disponible acá.
const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const itemsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/items.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);
const TACHO_ITEM_IDS = itemsData.containers.tachoVereda.map((item) => item.id);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save con el robot clasificador + flotaFundadora (flota de 2), dinero de sobra y el barrio
 * alcanzable (la cadena de desbloqueo pide poseer el contenedor anterior, ver isContainerUnlocked). */
function flotaSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 1e9;
  seeded.ownedContainers = { tachoVereda: 1 };
  seeded.automationOwned = { robotClasificador: true };
  seeded.deedsTreeLevels = { flotaFundadora: 1 };
  return seeded;
}

test.describe('Dumpster Empire — ronda 27 (flota de robots)', () => {
  test('1: flota de 2 → dos tarjetas; el robot 2 con target fijo y el robot 1 en Auto procesan en paralelo', async ({
    page,
  }) => {
    const seeded = flotaSave();
    // DECISIÓN: el target del robot 2 se siembra en el save en vez de elegirse por UI — si se
    // eligiera con el <select> en vivo, el robot 2 (Auto hasta ese momento, con $1e9) puede
    // haber tomado ya un contenedor caro cuyo procesamiento dura más que la ventana de aserción
    // (flake real de la primera corrida). El despacho del <select> ya lo cubre el e2e de ronda
    // 14 con el MISMO data-action/handler; acá se verifica que el select refleja lo persistido.
    seeded.robots.push({ targetContainerId: 'contenedorBarrio', filters: { descartarBajoValor: 0, reservarCategorias: [] } });
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    // El robot 1 en Auto con $1e9 compra contenedores nuevos enseguida → celebraciones de
    // "¡Contenedor nuevo!" pueden tapar el tabbar en cualquier momento: click con reintento
    // cerrando modales (patrón ronda 9/14/23).
    await expect(async () => {
      await cerrarCelebraciones(page);
      await page.locator('[data-tab="automatizacion"]').click({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await cerrarCelebraciones(page);

    await expect(page.locator('.robot-card')).toHaveCount(2);
    await expect(page.locator('.automation-status')).toContainText('Flota: 2 robots');

    const select2 = page.locator('[data-action="set-auto-target"][data-robot="1"]');
    await expect(select2).toBeVisible();
    await expect(select2).toHaveValue('contenedorBarrio');

    // automationTick corre cada 1s (loop.js) — timeout generoso con reintento, cerrando las
    // celebraciones de contenedores nuevos que desbloquea la primera compra (patrón ronda 14).
    await expect(async () => {
      await cerrarCelebraciones(page);
      await expect(page.locator('[data-robot-card="1"] .robot-card-processing')).toContainText('Contenedor de Barrio');
    }).toPass({ timeout: 15000 });

    // El robot 1 (modo Auto) procesa a la vez: su tarjeta muestra un ítem con % de progreso.
    await expect(async () => {
      await cerrarCelebraciones(page);
      await expect(page.locator('[data-robot-card="0"] .robot-card-processing')).toContainText('%');
    }).toPass({ timeout: 15000 });
  });

  test('2: fijar el umbral de descarte desde la tarjeta muestra el % estimado del engine', async ({ page }) => {
    const seeded = flotaSave();
    // Target fijo en el tacho para AMBOS robots: el estimado usa SIEMPRE ese pool y ningún
    // robot compra contenedores nuevos (cero celebraciones de "¡Contenedor nuevo!" durante la
    // interacción con los filtros). Logros y hallazgos del tacho preseedeados por lo mismo
    // (patrón ronda 14/23: sin modales sorpresa que intercepten los clicks).
    seeded.robots[0].targetContainerId = 'tachoVereda';
    seeded.robots.push({ targetContainerId: 'tachoVereda', filters: { descartarBajoValor: 0, reservarCategorias: [] } });
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;
    seeded.itemsFoundByItem = { tachoVereda: Object.fromEntries(TACHO_ITEM_IDS.map((id) => [id, 1])) };
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await page.locator('[data-tab="automatizacion"]').click();
    await cerrarCelebraciones(page);

    const card = page.locator('[data-robot-card="0"]');
    await card.locator('.robot-filters summary').click();
    const threshold = card.locator('[data-action="set-robot-filter-threshold"]');
    await expect(threshold).toBeVisible();
    // Todos los ítems del tacho valen menos que 999999 → el engine estima 100% de descarte.
    await threshold.fill('999999');
    await threshold.evaluate((el) => el.blur());

    await expect(card.locator('.robot-filter-estimate')).toContainText('100%', { timeout: 5000 });
    // El input queda persistido en el estado: el re-render del tick lo vuelve a pintar con el valor.
    await expect(card.locator('[data-action="set-robot-filter-threshold"]')).toHaveValue('999999');
  });
});
