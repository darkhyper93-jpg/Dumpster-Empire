/**
 * e2e (Playwright/Chromium) — auditoría de release, segunda pasada (post-ronda 33).
 *
 * Los tres 🔴 de esta ronda solo se manifiestan en el NAVEGADOR (una vista que lanza, un save que
 * se reescribe, una partida que arranca vacía), así que su regresión vive acá y no en Vitest.
 *
 * 1. `inventory[].containerId` con una clave del prototipo (`constructor`) hacía que
 *    `StallView.findItemDef` tirara `TypeError: pool.find is not a function` en CADA render:
 *    pestaña Puesto en blanco, permanente, y la excepción salía por `UIManager.render` →
 *    `notify()`, reventando también las acciones despachadas con esa pestaña abierta.
 * 2. `dailyMissions[].params.categoria` con la misma clase de clave metía `NaN` en un campo
 *    PERSISTIDO → `JSON.stringify` lo escribía `null` → el siguiente arranque rechazaba el save
 *    entero → partida borrada. Se verifica la cadena completa: jugar, autoguardar, reabrir.
 * 3. Un save rechazado ya no desaparece en silencio: se archiva una copia intacta y el jugador
 *    ve el aviso (toast + bloque permanente en Ajustes).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, cerrarCelebraciones, clickSorteandoCelebraciones } from './helpers/dig.js';

// AJUSTE: mismo patrón que ronda22/ronda23 — Playwright compila los specs sin "type":"module"
// en el package.json raíz, así que `import.meta` no está disponible acá.
const CONTAINER_IDS = JSON.parse(
  readFileSync(path.join(__dirname, '../src/data/containers.json'), 'utf8')
).map((c) => c.id);

const SAVE_KEY = 'dumpsterEmpireSave';
const SAVE_BACKUP_KEY = 'dumpsterEmpireSave.rejected';

/** Claves que resuelven contra `Object.prototype` en un objeto literal (napkin #7). */
const CLAVES_DEL_PROTOTIPO = ['constructor', '__proto__', 'toString'];

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SAVE_KEY, save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 777777;
  seeded.totalMoneyEarned = 777777;
  return seeded;
}

/** Captura toda excepción no atrapada del renderer durante el test. */
function capturarErrores(page) {
  const errores = [];
  page.on('pageerror', (err) => errores.push(err.message));
  return errores;
}

test.describe('Auditoría de release 2 — claves del prototipo en el save', () => {
  test('1: un containerId hostil en el inventario NO rompe la pestaña Puesto', async ({ page }) => {
    const seeded = baseState();
    seeded.stallLevel = 1;
    seeded.keepThreshold = 1;
    // Un ítem por cada clave hostil, más uno legítimo: la vista tiene que renderizar los cuatro.
    seeded.inventory = [
      ...CLAVES_DEL_PROTOTIPO.map((containerId) => ({
        itemId: 'x',
        containerId,
        categoria: 'common',
        baseValue: 10,
      })),
      { itemId: 'botella', containerId: 'tachoVereda', categoria: 'common', baseValue: 5 },
    ];
    const errores = capturarErrores(page);
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await clickSorteandoCelebraciones(page, '[data-tab="puesto"]');
    await cerrarCelebraciones(page);

    // Napkin #2: momento de observación FIJO. Si se dejara auto-reintentar, un `toHaveCount`
    // esperaría a que la vista se recupere sola (nunca lo hace) y el test sería un falso verde.
    await page.waitForTimeout(1500);
    expect(errores, `excepciones del renderer: ${errores.join(' | ')}`).toEqual([]);
    // La vista renderizó de verdad: 4 tarjetas de inventario con su botón de vender.
    expect(await page.locator('.stall-inventory-grid .shop-card').count()).toBe(4);
    // Los ítems de id desconocido caen al nombre oculto seguro, nunca al id crudo del save.
    const html = await page.locator('#tab-content').innerHTML();
    expect(html).not.toContain('constructor');
    expect(html).not.toContain('__proto__');
  });

  test('2: una misión con categoría hostil ya no borra la partida al reabrir el juego', async ({ page }) => {
    const seeded = baseState();
    seeded.missionsRolledAt = Date.now();
    seeded.dailyMissions = [
      {
        id: 'm1',
        type: 'findCategoryCount',
        difficulty: 'easy',
        params: { categoria: 'constructor' },
        target: 10,
        progress: 0,
        claimed: false,
        snapshot: 0,
        reward: { type: 'money', amount: 100 },
      },
    ];
    await seed(page, serializeState(seeded));

    // --- Sesión 1: el jugador juega (el tick recalcula el progreso de las misiones cada segundo)
    // y después se fuerza un guardado real con una acción suya, en vez de esperar los 15s del
    // autoguardado: `toggleSound` llama a `persist()` igual que cualquier otra acción.
    await entrarAlJuego(page);
    await cerrarCelebraciones(page);
    await page.waitForTimeout(1800);
    await clickSorteandoCelebraciones(page, '#settings-btn');
    await clickSorteandoCelebraciones(page, '[data-action="toggle-sound"]');
    const persistido = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
    // El corazón del bug: `NaN` se serializa como `null` y hace inválido al save entero.
    expect(persistido).not.toContain('"progress":null');

    // --- Sesión 2: el jugador vuelve a abrir el juego con ESE save.
    await page.reload();
    await entrarAlJuego(page);
    await cerrarCelebraciones(page);
    // El header NO sirve como fuente de verdad: es un conteo tweened (napkin #10) y además el
    // boot acredita recompensas de logros. Se mira el estado ya persistido, forzando el guardado
    // con una acción del jugador (mismo truco que arriba).
    await clickSorteandoCelebraciones(page, '#settings-btn');
    await clickSorteandoCelebraciones(page, '[data-action="toggle-sound"]');
    const trasReabrir = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY));
    expect(trasReabrir.money).toBeGreaterThanOrEqual(777777); // `freshState()` daría 0: eso era el wipe
    expect(Number.isFinite(trasReabrir.dailyMissions[0].progress)).toBe(true);
    // Y no se archivó nada: el save nunca fue rechazado.
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE_BACKUP_KEY)).toBeNull();
  });
});

test.describe('Auditoría de release 2 — un guardado rechazado nunca desaparece en silencio', () => {
  test('3: se archiva una copia intacta y el jugador ve el aviso', async ({ page }) => {
    // Save estructuralmente inválido (money no numérico): lo rechaza `validateSave` sí o sí.
    const roto = JSON.parse(serializeState(baseState()));
    roto.money = null;
    const textoOriginal = JSON.stringify(roto);
    await seed(page, textoOriginal);
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    // Con la pantalla de inicio arriba el toast NO puede verse: `layout.css` oculta
    // `#toast-container` mientras `#title-screen` está visible. El aviso se retiene hasta acá.
    expect(await page.locator('.toast').count()).toBe(0);
    await page.locator('#title-play-btn').click();

    // (a) El aviso, ya con el juego a la vista. Filtrado por texto (napkin #3), nunca `.toast` pelado.
    await expect(page.locator('.toast').filter({ hasText: 'No se pudo leer' })).toBeVisible({ timeout: 3000 });
    await cerrarCelebraciones(page);

    // (b) La copia archivada es BYTE A BYTE la original.
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE_BACKUP_KEY)).toBe(textoOriginal);

    // (c) El estado de error persiste más allá del toast: bloque permanente en Ajustes.
    await clickSorteandoCelebraciones(page, '#settings-btn');
    await expect(page.locator('.settings-save-warning')).toBeVisible();
    await expect(page.locator('.settings-save-warning')).toContainText('ilegible');
  });

  test('4: en el caso normal no hay ni aviso ni copia archivada', async ({ page }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    await cerrarCelebraciones(page);
    // Napkin #2: `.toast` se auto-expira a los 3.8s — con `toHaveCount(0)` el assert "esperaría"
    // a que desaparezca y pasaría igual con el bug puesto. Momento de observación fijo + count().
    await page.waitForTimeout(600);
    expect(await page.locator('.toast').filter({ hasText: 'No se pudo leer' }).count()).toBe(0);
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE_BACKUP_KEY)).toBeNull();

    await clickSorteandoCelebraciones(page, '#settings-btn');
    await expect(page.locator('#tab-content .settings-block').first()).toBeVisible();
    expect(await page.locator('.settings-save-warning').count()).toBe(0);
  });
});

test.describe('Auditoría de release 2 — costo de render de la Tienda', () => {
  test('5: la pestaña Contenedores no genera long tasks por tick (memoización)', async ({ page }) => {
    const seeded = baseState();
    seeded.money = 1e15;
    seeded.prestigeCount = 12;
    // Jugador avanzado: TODOS los contenedores desbloqueados. Sin esto la Tienda renderiza cuatro
    // tarjetas y el costo no se nota — el test pasaba incluso con el cache desactivado (verificado
    // saboteando el fix, napkin #2).
    for (const c of CONTAINER_IDS) {
      seeded.ownedContainers[c] = 5;
      seeded.containerLevels[c] = 5;
    }
    // Y con el robot comprado: `tickAutomation` solo notifica (→ re-render de la pestaña) si hay
    // algo automatizado, el Puesto activo o un evento — que es justo el estado en el que un
    // jugador pasa el 99% del tiempo mirando la Tienda. Sin esto la vista se renderiza UNA vez y
    // el costo por tick, que es lo que este test mide, no existe.
    seeded.automationOwned = { robotClasificador: true };
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);
    await clickSorteandoCelebraciones(page, '[data-tab="tienda"]');
    await cerrarCelebraciones(page);
    await expect(page.locator('.shop-grid')).toBeVisible();

    // 5 segundos de idle con la vista abierta = al menos 4 re-renders completos por el tick del
    // store. Antes del cache eran ~60ms cada uno (5 long tasks medidas en esta misma prueba).
    const longTasks = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const tasks = [];
          const obs = new PerformanceObserver((list) => {
            for (const e of list.getEntries()) tasks.push(Math.round(e.duration));
          });
          obs.observe({ entryTypes: ['longtask'] });
          setTimeout(() => {
            obs.disconnect();
            resolve(tasks);
          }, 5000);
        })
    );
    const totalMs = longTasks.reduce((a, b) => a + b, 0);
    // Margen de 2x a propósito: esto NO es un test de balance de milisegundos (sería flaky en un
    // runner cargado, napkin #11) sino la red que caza una regresión de ORDEN DE MAGNITUD. Sin el
    // cache, la misma medición daba 5 long tasks de ~60ms = ~300ms de bloqueo en esos 5 segundos.
    expect(totalMs, `long tasks: ${longTasks.join(', ') || 'ninguna'}`).toBeLessThan(150);
  });
});
