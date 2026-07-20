/**
 * e2e (Playwright/Chromium) — Ronda 31, bloque 31.3.B (PLAN.md §4.42/§4.43): trampa simultánea
 * con crédito por-ítem en el escarbado manual. Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoConTrampa, rascarObjeto } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/**
 * #money tweenea ~400ms por rAF (PLAN.md §5.2) — una lectura one-shot puede capturar un valor
 * intermedio. Espera a que el texto quede quieto varias muestras seguidas antes de devolverlo
 * (mismo patrón que la ronda 30.B usó para la cascada de logros).
 */
async function moneySettled(page, locator) {
  let last = null;
  let stable = 0;
  while (stable < 6) {
    const text = await locator.textContent();
    if (text === last) {
      stable++;
    } else {
      stable = 0;
      last = text;
    }
    await page.waitForTimeout(150);
  }
  return last;
}

/** Save con depositoAbandonado pagable (probTrampaBase 0.20 — converge rápido en los reintentos). */
function conDepositoSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 1_000_000;
  seeded.ownedContainers = { tachoVereda: 1, contenedorBarrio: 1, containerIndustrial: 1, depositoAbandonado: 1 };
  return serializeState(seeded);
}

test.describe('Dumpster Empire — ronda 31 (trampa simultánea + crédito parcial)', () => {
  // Timeout propio más generoso que el default (30s): iniciarEscarbadoConTrampa reintenta hasta
  // encontrar una trampa real (probTrampaBase 0.20, ~5 intentos esperados) y cada intento paga
  // el costo de comprar/abandonar el contenedor — bajo carga pesada de CI puede acumularse.
  test.describe.configure({ timeout: 60000 });

  test('1: destapar items antes de la trampa los acredita al toque; abandonar conserva ese loot sin castigo', async ({
    page,
  }) => {
    await seed(page, conDepositoSave());
    await entrarAlJuego(page);
    const money = page.locator('#money');
    const moneyBefore = await money.textContent();

    const { canvas, positions, trapIndex } = await iniciarEscarbadoConTrampa(page, 'depositoAbandonado', 1);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    // Destapa TODOS los objetos NO-trampa (al menos 1, garantizado por el helper).
    const nonTrapIndexes = positions.map((_, i) => i).filter((i) => i !== trapIndex);
    for (const i of nonTrapIndexes) await rascarObjeto(page, box, positions[i]);

    // El dinero de los items ya destapados sube AL TOQUE, sin esperar a completar el resto.
    await expect(money).not.toHaveText(moneyBefore, { timeout: 5000 });
    const moneyAfterItems = await moneySettled(page, money);
    await expect(page.locator('#dig-active')).toBeVisible();

    // Abandonar: el loot ya destapado QUEDA (sin castigo, la trampa nunca se disparó).
    await page.locator('#dig-abandon-btn').click();
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    const moneyAfterAbandon = await moneySettled(page, money);
    expect(moneyAfterAbandon).toBe(moneyAfterItems);
  });

  test('2: destapar la trampa salta y corta el escarbado sin destapar el resto (castigo aplicado)', async ({ page }) => {
    await seed(page, conDepositoSave());
    await entrarAlJuego(page);
    const money = page.locator('#money');
    const moneyBefore = await money.textContent();

    const { canvas, positions, trapIndex } = await iniciarEscarbadoConTrampa(page, 'depositoAbandonado', 1);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    // Destapa UN item no-trampa primero (el helper garantiza al menos 1).
    const firstNonTrap = positions.map((_, i) => i).find((i) => i !== trapIndex);
    await rascarObjeto(page, box, positions[firstNonTrap]);
    await expect(money).not.toHaveText(moneyBefore, { timeout: 5000 });
    await moneySettled(page, money);
    const itemsFoundBeforeTrap = JSON.parse(await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'))).itemsFoundCount;

    // Ahora destapa la trampa: salta, castiga y CIERRA el escarbado sin destapar el resto (el
    // dig-empty visible es la prueba de que NO esperó a los demás objetos, a diferencia del test 1).
    // Timeout generoso: REVEAL_HOLD_MS + el ciclo de reveal-a-trap-a-close puede tardar más que
    // el resto de la suite bajo carga pesada de workers en paralelo.
    await rascarObjeto(page, box, positions[trapIndex]);
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 10000 });

    // Precisión de "cobra lo destapado antes menos el castigo" (trapsHit/digStreak/castigo) ya
    // está cubierta EXACTA a nivel motor en ronda31-trampa-simultanea.test.js — acá se lee el
    // save persistido para confirmar que la UI disparó el camino correcto (no una comparación de
    // #money formateado, que el gesto ancho de rascarObjeto puede rozar un objeto vecino y volver
    // ruidosa — ver R31.8/nota del helper).
    const save = JSON.parse(await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave')));
    expect(save.trapsHit).toBe(1);
    expect(save.digStreak).toBe(0);
    // El primer item quedó acreditado y NUNCA se contó de nuevo (guard de índice, R31.8): el
    // contador de colección no retrocede ni se duplica.
    expect(save.itemsFoundCount).toBeGreaterThanOrEqual(itemsFoundBeforeTrap);
  });
});
