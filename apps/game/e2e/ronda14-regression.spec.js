/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 14 (QoL: selector de target del robot,
 * sensibilidad de escarbado persistida y primer hallazgo raro reemplazando al jackpot):
 *
 * 1. Comprar robot → elegir un target fijo → la cola solo encola ESE contenedor.
 * 2. Mover la sensibilidad a 50% → recargar → sigue en 50%.
 * 3. Forzar un primer hallazgo raro → modal "¡Hallazgo nuevo!" visible → cerrarlo → repetir el
 *    hallazgo (ítem ya encontrado) → NO hay modal.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

// AJUSTE: Playwright compila los specs sin "type":"module" en el package.json raíz — `import.meta`
// no está disponible acá (a diferencia de los tests de Vitest); se usa `__dirname` (provisto por
// el wrapper CJS de esbuild) en su lugar.
const itemsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/items.json'), 'utf8'));
// Los 6 ítems de tachoVereda son TODOS de categoría "common" — como es la única categoría del
// contenedor, "common" es siempre la más rara: cualquier hallazgo nuevo de acá dispara el modal.
// Ronda 16: itemsFoundByItem se indexa por id estable de ítem, no por nombre (PLAN.md §16).
const TACHO_ITEM_IDS = itemsData.containers.tachoVereda.map((item) => item.id);

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Save con el robot ya comprado, dinero de sobra y el barrio desbloqueado. */
function conRobotSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 1e9;
  seeded.ownedContainers = { tachoVereda: 1 };
  seeded.automationOwned = { robotClasificador: true };
  return serializeState(seeded);
}

/** Save con TODOS los ítems de tachoVereda ya encontrados: ningún hallazgo ahí vuelve a celebrar. */
function tachoAgotadoSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  // itemsFoundByItem es containerId -> { itemId -> número } (contador, ver save.js
  // isValidItemsFoundByItem) — un booleano no pasa la validación y el save entero se rechaza.
  seeded.itemsFoundByItem = {
    tachoVereda: Object.fromEntries(TACHO_ITEM_IDS.map((id) => [id, 1])),
  };
  return serializeState(seeded);
}

/**
 * Completa un escarbado sin trampa y devuelve el juego a `#dig-empty`. `minObjetos` en 2 (no 1)
 * es lo que hace que `iniciarEscarbadoSinTrampa` reintente: una trampa siempre resulta en
 * exactamente 1 "objeto" (ver rollContainerResult), tachoVereda con 3 slots siempre da 3.
 */
async function completarEscarbado(page, containerId, minObjetos = 2) {
  const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, containerId, minObjetos);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
  for (const pos of positions) await rascarObjeto(page, box, pos);
  await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
}

test.describe('Dumpster Empire — regresión ronda 14 (target del robot, sensibilidad, primer hallazgo)', () => {
  test('1: elegir un target fijo hace que el robot solo encole/procese ese contenedor', async ({ page }) => {
    await seed(page, conRobotSave());
    await entrarAlJuego(page);
    await page.locator('[data-tab="automatizacion"]').click();
    await cerrarCelebraciones(page);

    const select = page.locator('[data-action="set-auto-target"]');
    await expect(select).toBeVisible();
    await select.selectOption('contenedorBarrio');
    // El guard de SELECT (UIManager.renderTabContent) congela el re-render mientras el <select>
    // sigue enfocado — sacar el foco para que la vista vuelva a reflejar la cola en vivo.
    await select.evaluate((el) => el.blur());

    // automationTick corre cada 1s (loop.js) — en vez de un sleep fijo + un solo intento, se le
    // da a la aserción un timeout generoso para que reintente sola (más robusto bajo carga de CI
    // con varios workers de Chromium en paralelo, donde el timer puede atrasarse). Comprar el
    // barrio por primera vez desbloquea el Industrial y encola su celebración, así que se cierra
    // cualquier modal que aparezca en el camino.
    await expect(async () => {
      await cerrarCelebraciones(page);
      await expect(page.locator('.automation-status')).toContainText('Contenedor de Barrio: ');
    }).toPass({ timeout: 15000 });
    await cerrarCelebraciones(page);

    // El propio <select> lista TODOS los contenedores desbloqueados como <option> (incluido
    // Industrial, recién desbloqueado) — acotar la aserción a `.automation-processing`, el único
    // lugar donde aparece el nombre del contenedor que el robot realmente compra.
    const processing = page.locator('.automation-processing');
    await expect(processing).toContainText('Contenedor de Barrio');
    // Con money=1e9 el modo Auto habría escalado a contenedores mucho más caros que el barrio;
    // si el target fijo NO se respetara, alguno de estos nombres aparecería procesándose.
    await expect(processing).not.toContainText('Container Industrial');
    await expect(processing).not.toContainText('Depósito Abandonado');
    await expect(processing).not.toContainText('Tacho de Vereda');

    // Volver a "Auto": el dropdown no debe cerrarse solo mientras tanto (guard de SELECT).
    await expect(select).toHaveValue('contenedorBarrio');
  });

  test('2: la sensibilidad de escarbado persiste tras recargar', async ({ page }) => {
    await entrarAlJuego(page);
    await page.locator('#settings-btn').click();

    const slider = page.locator('[data-action="set-sensitivity"]');
    await expect(slider).toBeVisible();
    // Playwright .fill() no soporta <input type="range"> ("Input of type range cannot be
    // filled") — se setea el value por JS y se dispara 'input', el mismo evento que escucha
    // SettingsView.
    await slider.evaluate((el) => {
      el.value = '50';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('[data-sensitivity-label]')).toContainText('50%');

    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    // El juego siempre arranca en la pantalla de título (PLAN.md §11.8), incluso al recargar.
    await page.locator('#title-play-btn').click();
    const skip = page.locator('[data-action="skip-tutorial"]');
    if (await skip.isVisible()) await skip.click();
    await page.locator('#settings-btn').click();
    await expect(page.locator('[data-sensitivity-label]')).toContainText('50%');
    await expect(page.locator('[data-action="set-sensitivity"]')).toHaveValue('50');
  });

  test('3: el modal de "¡Hallazgo nuevo!" sale la 1ra vez y NO la 2da (mismo ítem ya encontrado)', async ({
    page,
  }) => {
    // 3a: estado limpio, nada encontrado todavía — cualquier ítem de tachoVereda celebra.
    await entrarAlJuego(page);
    await completarEscarbado(page, 'tachoVereda');

    const modal = page.locator('#celebration-modal');
    let sawFirstFind = false;
    for (let i = 0; i < 10 && (await modal.isVisible().catch(() => false)); i++) {
      const text = await modal.textContent();
      if (text.includes('¡Hallazgo nuevo!')) sawFirstFind = true;
      await page.locator('[data-action="close-celebration"]').click();
    }
    expect(sawFirstFind).toBe(true);
    await expect(modal).toBeHidden();

    // 3b: recargar con TODOS los ítems de tachoVereda ya marcados como encontrados — ningún
    // hallazgo ahí puede volver a ser "primera vez".
    await seed(page, tachoAgotadoSave());
    await entrarAlJuego(page);
    await completarEscarbado(page, 'tachoVereda');

    let sawFirstFindAgain = false;
    for (let i = 0; i < 10 && (await modal.isVisible().catch(() => false)); i++) {
      const text = await modal.textContent();
      if (text.includes('¡Hallazgo nuevo!')) sawFirstFindAgain = true;
      await page.locator('[data-action="close-celebration"]').click();
    }
    expect(sawFirstFindAgain).toBe(false);
    await cerrarCelebraciones(page);
  });
});
