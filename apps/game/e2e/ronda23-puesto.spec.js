/**
 * e2e (Playwright/Chromium) de la Ronda 23 (El Puesto de Chatarra): PLAN.md §2.9 (concepto),
 * §4.27 (precio), §4.28 (pedidos), §4.29 (robot vendedor), §3.2 (historia liviana). Corre con
 * el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { formatMoney } from '../../../packages/engine/src/format.js';
import {
  entrarAlJuego,
  iniciarEscarbadoSinTrampa,
  rascarObjeto,
  cerrarCelebraciones,
  clickSorteandoCelebraciones,
} from './helpers/dig.js';

// AJUSTE: mismo patrón que ronda22-coleccion.spec.js — Playwright compila los specs sin
// "type":"module" en el package.json raíz, `import.meta` no está disponible acá.
const stallData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/stall.json'), 'utf8'));
const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

async function abrirPuesto(page) {
  // Un escarbado recién completado puede encolar su propia celebración ("¡Hallazgo nuevo!",
  // ronda 14) que tapa el tabbar con su backdrop. Cerrarlas ANTES no alcanza: otra puede
  // encolarse en el render siguiente, ya con el click en vuelo, y entonces nada la cierra
  // (no tienen timer) — ver `clickSorteandoCelebraciones` en helpers/dig.js.
  await clickSorteandoCelebraciones(page, '[data-tab="puesto"]');
  await cerrarCelebraciones(page);
}

/** Completa un escarbado entero (todos los objetos) y espera a que el resultado se aplique. */
async function completarEscarbadoSinTrampa(page, containerId) {
  const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, containerId);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
  for (const pos of positions) await rascarObjeto(page, box, pos);
  await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
}

test.describe('Dumpster Empire — ronda 23 (Puesto de Chatarra)', () => {
  test('1: sin Puesto, un escarbado con ítem valioso va directo a #money (juego idéntico)', async ({ page }) => {
    const seeded = baseState();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const moneyBefore = await page.locator('#money').textContent();
    await completarEscarbadoSinTrampa(page, 'tachoVereda');

    await expect(page.locator('#money')).not.toHaveText(moneyBefore);
  });

  test('2: con Puesto y umbral bajo, el ítem valioso captura al inventario (el dinero NO sube) y venderlo manualmente sube #money', async ({
    page,
  }) => {
    const seeded = baseState();
    seeded.stallLevel = 1;
    seeded.keepThreshold = 1; // umbral mínimo: cualquier hallazgo de tachoVereda vale más que $1.
    // Cualquier logro nuevo (a46 "Primer Objeto Guardado" incluido) paga dinero al desbloquearse
    // y ensuciaría el assert exacto de "el dinero no sube" — se preseedan todos desbloqueados.
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const moneyBefore = await page.locator('#money').textContent();
    await completarEscarbadoSinTrampa(page, 'tachoVereda');

    // Capturado, no vendido: el dinero no se mueve (venta instantánea desactivada por el umbral).
    await expect(page.locator('#money')).toHaveText(moneyBefore);

    await abrirPuesto(page);
    const cards = page.locator('.stall-inventory-grid [data-action="sell-item"]');
    await expect(cards.first()).toBeVisible();
    const countBefore = await cards.count();

    await cards.first().click();
    await expect(page.locator('#money')).not.toHaveText(moneyBefore);
    await expect(cards).toHaveCount(countBefore - 1);
  });

  test('3: un pedido sembrado paga el mult sobre la categoría pedida (comparado contra vender sin pedido)', async ({
    page,
  }) => {
    const seeded = baseState();
    seeded.stallLevel = 1; // stallMultBase 1.25, sin bonus de nivel.
    seeded.marketFluctuation = 1;
    seeded.marketFluctuationAt = Date.now(); // reciente: refreshMarketFluctuation no la recalcula (rng.js, <60s).
    seeded.inventory = [
      { itemId: 'can-crushed', containerId: 'tachoVereda', categoria: 'common', baseValue: 1000 },
      { itemId: 'cork-bottle', containerId: 'tachoVereda', categoria: 'reusable', baseValue: 1000 },
    ];
    seeded.stallOrders = [
      { id: 'order-common-seed', npcId: 'salomon', categoria: 'common', cantidad: 1, mult: stallData.orderMult, progress: 0 },
    ];
    seeded.ordersRotatedAt = Date.now();
    // Cualquier logro nuevo paga dinero al desbloquearse y ensuciaría los montos exactos del
    // test (a46 "Primer Objeto Guardado" se dispara solo con inventory.length >= 1) — se
    // preseedan todos desbloqueados.
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirPuesto(page);

    const basePrice = 1000 * 1 * stallData.stallMultBase;
    const orderPrice = basePrice * stallData.orderMult;

    // Vende primero el ítem SIN pedido (reusable, índice 1): sube exactamente basePrice.
    await page.locator('[data-action="sell-item"][data-index="1"]').click();
    await expect(page.locator('#money')).toHaveText(formatMoney(basePrice));

    // El ítem con pedido (common) sigue en el índice 0 (splice no lo movió).
    await page.locator('[data-action="sell-item"][data-index="0"]').click();
    await expect(page.locator('#money')).toHaveText(formatMoney(basePrice + orderPrice));
  });

  test('4: con el robot vendedor, el inventario se vacía solo (sin acción manual del jugador)', async ({ page }) => {
    const seeded = baseState();
    seeded.stallLevel = 1;
    seeded.automationOwned.robotVendedor = true;
    seeded.marketFluctuation = 1;
    seeded.marketFluctuationAt = Date.now();
    seeded.inventory = [{ itemId: 'can-crushed', containerId: 'tachoVereda', categoria: 'common', baseValue: 500 }];
    seeded.stallVendorAt = Date.now();
    await page.clock.install();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await abrirPuesto(page);

    await expect(page.locator('.stall-inventory-grid [data-action="sell-item"]')).toHaveCount(1);

    // vendedorIntervalo (20s, data/stall.json) + margen: el loop de automatización corre cada 1s
    // (loop.js) y stallVendorTick compara contra el reloj real avanzado por page.clock.
    await page.clock.fastForward((stallData.vendedorIntervalo + 5) * 1000);

    await expect(page.locator('.stall-inventory-grid')).toHaveCount(0);
    await expect(page.locator('p.empty-state', { hasText: 'El puesto está vacío' })).toBeVisible();
  });

  test('5: la viñeta de Doña Rita aparece UNA vez al desbloquear el Puesto (recargar no la repite)', async ({
    page,
  }) => {
    const seeded = baseState();
    seeded.stallLevel = 1;
    // `seed()` registra un addInitScript que se re-ejecuta en CADA navegación (incluido
    // `page.reload()` más abajo): sin el guard de `sessionStorage`, pisaría el save real
    // (con `storySeen` ya actualizado por el juego) con el seed original en cada recarga, y
    // la viñeta parecería repetirse por un artefacto del test, no del juego. `sessionStorage`
    // sobrevive a `reload()` pero no a un contexto/pestaña nueva.
    await page.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem('__e2eSeeded')) {
          localStorage.setItem(key, value);
          sessionStorage.setItem('__e2eSeeded', '1');
        }
      },
      ['dumpsterEmpireSave', serializeState(seeded)]
    );

    // No se usa entrarAlJuego (cierra celebraciones sola): acá hace falta ver la viñeta ANTES
    // de descartarla, para poder cerrarla a mano y verificar que no vuelve tras recargar.
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#title-play-btn').click();
    let skip = page.locator('[data-action="skip-tutorial"]');
    if (await skip.isVisible()) await skip.click();

    await expect(page.locator('.celebration-icon--story')).toBeVisible();
    await expect(page.locator('#celebration-modal h2')).toHaveText('Doña Rita');
    await page.locator('[data-action="close-celebration"]').click();

    // Recargar: `beforeunload` (loop.js) persiste `storySeen` (ya marcado en memoria desde el
    // boot, ronda 23.C store.js `runStory()`) — la viñeta no vuelve a encolarse. Se dispara el
    // evento a mano antes de `page.reload()`: Chromium en automation no siempre corre los
    // listeners de `beforeunload` sin un gesto de usuario previo a la navegación.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#title-play-btn').click();
    skip = page.locator('[data-action="skip-tutorial"]');
    if (await skip.isVisible()) await skip.click();
    await expect(page.locator('.celebration-icon--story')).toHaveCount(0);
  });
});
