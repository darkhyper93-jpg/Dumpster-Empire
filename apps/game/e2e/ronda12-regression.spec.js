/**
 * Regresión e2e (Playwright/Chromium) de la Ronda 12 (celebraciones centradas, PLAN.md §5.2
 * ampliado):
 *
 * 1. Un logro celebra en el modal (con recompensa) y solo se cierra con la cruz; si caen
 *    varios se encolan y se muestran uno tras otro.
 * 2. Ya no queda el toast viejo de "Logro desbloqueado".
 * 3. Comprar un contenedor que desbloquea el siguiente celebra "¡Contenedor nuevo!" con el
 *    escarbado de fondo seguiendo activo.
 * 4. El progreso (dinero) no cambia por abrir/cerrar el modal.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto, cerrarCelebraciones } from './helpers/dig.js';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/**
 * Save con $100, el tacho ya "comprado" (desbloquea el barrio en el picker, ver
 * `isContainerUnlocked`) y ningún contenedor de pago: alcanza para el barrio ($25).
 */
function preBarrioSave() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 100;
  seeded.ownedContainers = { tachoVereda: 1 };
  return serializeState(seeded);
}

/** Completa un escarbado sin trampa del tacho y deja el juego en `#dig-empty`. */
async function completarEscarbadoDelTacho(page) {
  const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda', 2);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
  for (const pos of positions) await rascarObjeto(page, box, pos);
  await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
}

test.describe('Dumpster Empire — regresión ronda 12 (celebraciones)', () => {
  test('1: el logro celebra en modal con recompensa y solo cierra con la cruz (encolado)', async ({ page }) => {
    await seed(page, preBarrioSave());
    await entrarAlJuego(page);
    await completarEscarbadoDelTacho(page);

    const modal = page.locator('#celebration-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('¡Logro desbloqueado!');

    // Click en el centro del backdrop (fuera de la tarjeta) NO lo cierra.
    await modal.click({ position: { x: 8, y: 8 } });
    await expect(modal).toBeVisible();

    // El primer escarbado no-trampa del tacho garantiza 2 logros (a1 "Primeros Pasos" +
    // a10 "Primer Objeto") y con el RNG real puede sumarse un "¡Hallazgo nuevo!" encolado
    // (ronda 14: categoría más rara + primera vez que se encuentra ESE ítem, categoría única
    // del tacho ~1/6 por objeto) — se cierran una por una sin asumir la cuenta total, contando
    // cuántas fueron logro (con "Recompensa:") para verificar que caen juntas.
    let achievementCount = 0;
    for (let i = 0; i < 10 && (await modal.isVisible()); i++) {
      const text = await modal.textContent();
      if (text.includes('¡Logro desbloqueado!')) {
        achievementCount++;
        await expect(modal.locator('.celebration-reward')).toContainText('Recompensa:');
      }
      await page.locator('[data-action="close-celebration"]').click();
    }
    expect(achievementCount).toBeGreaterThanOrEqual(2);
    await expect(modal).toBeHidden();
    await expect(page.locator('#dig-empty')).toBeVisible();
    await expect(page.locator('[data-start-dig="tachoVereda"]')).toBeEnabled();
  });

  test('2: no hay más toast de "Logro desbloqueado"', async ({ page }) => {
    await seed(page, preBarrioSave());
    await entrarAlJuego(page);
    await completarEscarbadoDelTacho(page);
    // AJUSTE (ronda 17, deuda de la auditoría 15): `expect(...).toHaveCount(0)` auto-reintenta
    // hasta cumplirse, y como un toast expira solo (~3.8s) la assertion "esperaba" a que
    // desapareciera y pasaba AUNQUE el toast viejo hubiera aparecido (falso verde). El chequeo
    // de ausencia va con `count()` inmediato en un momento fijado: recién desbloqueado el logro
    // (línea de arriba) y recién cerrada la última celebración (abajo), ambos dentro de la vida
    // del toast. Verificado que falla reintroduciendo el toast viejo (sabotaje en UIManager).
    expect(await page.locator('.toast').filter({ hasText: 'Logro desbloqueado' }).count()).toBe(0);
    // Cierra las celebraciones encoladas y vuelve a chequear tras la interacción.
    // Drain robusto (helpers/dig.js): el botón puede ser reemplazado por el de la celebración
    // siguiente entre el isVisible y el click, y el click quedaría esperando de gusto.
    await cerrarCelebraciones(page);
    expect(await page.locator('.toast').filter({ hasText: 'Logro desbloqueado' }).count()).toBe(0);
  });

  test('3: comprar el barrio desbloquea el Industrial y celebra "¡Contenedor nuevo!"', async ({ page }) => {
    await seed(page, preBarrioSave());
    await entrarAlJuego(page);
    await page.locator('[data-start-dig="contenedorBarrio"]').click();
    await expect(page.locator('#dig-active')).toBeVisible();

    const modal = page.locator('#celebration-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('¡Contenedor nuevo!');
    await expect(modal).toContainText('Container Industrial');

    await page.locator('[data-action="close-celebration"]').click();
    await expect(page.locator('#dig-active')).toBeVisible();
    const canvas = page.locator('.dig-canvas-top');
    await expect(canvas).toBeVisible();
  });

  test('4: el progreso (dinero) es el mismo antes y después de cerrar el modal', async ({ page }) => {
    await seed(page, preBarrioSave());
    await entrarAlJuego(page);
    await completarEscarbadoDelTacho(page);

    await expect(page.locator('#money')).not.toHaveText('$100', { timeout: 5000 });
    // El contador de dinero tweenea 300-500ms (PLAN.md §5.2) sobre rAF. Un `waitForTimeout(600)`
    // fijo alcanzaba en una máquina ociosa, pero con varios workers de Chromium en paralelo los
    // frames se atrasan y la lectura caía a mitad de animación: se capturaba un valor intermedio
    // y la comparación de abajo fallaba contra el valor ya asentado. En vez de esperar un tiempo,
    // se espera a que el texto DEJE de cambiar (dos lecturas iguales seguidas).
    // Además del tween, el dinero puede seguir moviéndose un rato por CASCADA de logros: uno
    // paga su recompensa, la plata nueva hace que el siguiente `runAchievements` desbloquee otro
    // ("ganá $X"), y así. Dos lecturas iguales seguidas pueden caer justo en un hueco de esa
    // cascada, así que se exige que el texto quede quieto de verdad (varias muestras seguidas).
    const leerMoney = () => page.locator('#money').textContent();
    let ultimo = null;
    let estables = 0;
    await expect
      .poll(
        async () => {
          const actual = await leerMoney();
          estables = actual === ultimo ? estables + 1 : 0;
          ultimo = actual;
          return estables;
        },
        { timeout: 20000, intervals: [200] }
      )
      .toBeGreaterThanOrEqual(5);
    const moneyStable = ultimo;

    // Drain robusto (helpers/dig.js): el botón puede ser reemplazado por el de la celebración
    // siguiente entre el isVisible y el click, y el click quedaría esperando de gusto.
    await cerrarCelebraciones(page);
    await expect(page.locator('#celebration-modal')).toBeHidden();
    await expect(page.locator('#money')).toHaveText(moneyStable);
  });
});
