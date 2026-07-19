/**
 * e2e (Playwright/Chromium) de la Ronda 29.D: arte ilustrado de los objetos enterrados
 * (PLAN.md §5.5). Verifica en el navegador real las tres garantías de la ronda:
 *   1. Cero fallbacks: todos los objetos de un escarbado se pintan con arte ilustrado CARGADO.
 *   2. El fallback existe y no corta el gesto: con el arte saboteado (SVG sin `xmlns`, que en
 *      data-URL falla en SILENCIO) el escarbado se completa igual.
 *   3. El repintado desde el modelo (focus/visibilitychange) reproduce el frame IDÉNTICO
 *      (rotación/escala deterministas, R29.1: el canvas solo PINTA lo que dice el modelo).
 * Corre con el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado, iniciarEscarbadoSinTrampa, rascarObjeto } from './helpers/dig.js';

const OBJECT_ART_SOURCE = path.join(__dirname, '../src/icons/objectArt.js');
/** Marca del SVG standalone que lo hace rasterizable; quitarla es el sabotaje del test 2. */
const XMLNS_ATTR = 'xmlns="http://www.w3.org/2000/svg" ';
/** Capa de abajo del canvas (los objetos); la de arriba es la suciedad. */
const BOTTOM_CANVAS = '.dig-canvas-layer:not(.dig-canvas-top)';

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

/** Estado del arte por entry del escarbado en curso (hook de solo lectura de DigCanvas). */
function leerArte(page) {
  return page.evaluate(() => window.__digDebug.art());
}

/** Espera a que TODAS las imágenes de arte hayan resuelto (cargadas o rotas). */
async function esperarArteResuelto(page) {
  await expect
    .poll(async () => (await leerArte(page)).every((entry) => entry.settled), { timeout: 10000 })
    .toBe(true);
}

/** Contenido del canvas de abajo como data-URL, para comparar dos frames pixel a pixel. */
function snapshotCapaObjetos(page) {
  return page.evaluate((selector) => document.querySelector(selector).toDataURL(), BOTTOM_CANVAS);
}

test.describe('Dumpster Empire — ronda 29 (objetos ilustrados en el escarbado)', () => {
  test('1: todos los objetos del escarbado usan arte ilustrado cargado (cero fallbacks)', async ({ page }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    await iniciarEscarbado(page, 'tachoVereda');

    await esperarArteResuelto(page);
    const arte = await leerArte(page);
    expect(arte.length).toBeGreaterThan(0);
    for (const entry of arte) {
      expect(entry.hasArt, `el ítem "${entry.icon}" no tiene arte registrado en objectArt.js`).toBe(true);
      expect(entry.loaded, `el arte de "${entry.icon}" no rasterizó (naturalWidth 0)`).toBe(true);
    }
  });

  test('2: con el arte saboteado el escarbado se completa igual (fallback al render clásico)', async ({ page }) => {
    // Sabotaje por interceptación de módulo (patrón napkin: probar el pipeline por HTTP sin
    // tocar el working tree). Un SVG standalone SIN `xmlns` no rasteriza: la imagen queda con
    // naturalWidth 0 y `drawEntry` tiene que caer al render clásico sin lanzar InvalidStateError.
    const fuente = readFileSync(OBJECT_ART_SOURCE, 'utf8');
    expect(fuente.includes(XMLNS_ATTR), 'el sabotaje del test asume el xmlns de composeObjectArt').toBe(true);
    await page.route('**/apps/game/src/icons/objectArt.js', (route) =>
      route.fulfill({ body: fuente.replace(XMLNS_ATTR, ''), contentType: 'application/javascript' })
    );
    const errores = [];
    page.on('pageerror', (error) => errores.push(error.message));

    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');

    await esperarArteResuelto(page);
    // Assert INMEDIATO (sin auto-retry): "no cargó" es una ausencia, y `expect.poll` sobre una
    // ausencia es un falso verde (napkin). Ya esperamos el `settled` de todas arriba.
    const arte = await leerArte(page);
    expect(arte.every((entry) => entry.hasArt)).toBe(true);
    expect(arte.filter((entry) => entry.loaded)).toEqual([]);

    const box = await canvas.boundingBox();
    if (!box) throw new Error('sin boundingBox');
    const dineroAntes = await page.locator('#money').textContent();
    for (const pos of positions) await rascarObjeto(page, box, pos);

    // El gesto llegó hasta el final: barra al 100%, vuelta al picker y cobro. No se puede leer
    // `__digDebug.isComplete()` acá — al completarse, `stop()` deja el modelo en null y la
    // lectura carrerea contra el "momento de revelado" (650ms).
    expect(await page.locator('#dig-progress-fill').evaluate((el) => el.style.width)).toBe('100%');
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#money')).not.toHaveText(dineroAntes, { timeout: 5000 });
    expect(errores).toEqual([]);
  });

  test('3: el repintado desde el modelo reproduce el frame idéntico (rotación/escala deterministas)', async ({
    page,
  }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    await esperarArteResuelto(page);

    const box = await canvas.boundingBox();
    if (!box) throw new Error('sin boundingBox');
    await rascarObjeto(page, box, positions[0]);
    const antes = await snapshotCapaObjetos(page);

    // focus → repaintFromModel(): el compositor pudo haber descartado los buffers.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect(await snapshotCapaObjetos(page)).toBe(antes);
  });
});
