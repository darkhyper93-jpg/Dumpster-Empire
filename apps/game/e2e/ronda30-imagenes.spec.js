/**
 * e2e (Playwright/Chromium) de la Ronda 30: imágenes reales de contenedor (PLAN.md §5.6) y
 * franjas horarias cosméticas (§4.41). Verifica en el navegador real:
 *   1. Las tarjetas de la Tienda muestran su imagen CARGADA (`naturalWidth > 0`).
 *   2. Con la ruta saboteada, la tarjeta cae al ícono SVG sin romper la vista ni el escarbado.
 *   3. Un contenedor sin imagen (PENDING_IMAGES) usa el SVG y no deja un `<img>` roto.
 *   4. El reloj del topbar muestra hora y franja.
 *   5. El contenedor de barrio cambia de modelo según la franja horaria.
 * Corre con el resto: `npm run test:e2e`.
 */
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, iniciarEscarbado } from './helpers/dig.js';
import { PENDING_IMAGES } from '../src/icons/containerImages.js';
import dayNight from '../src/data/dayNight.json' with { type: 'json' };

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

/** Estado con la cadena temprana comprada: garantiza tarjetas desbloqueadas en Tienda y picker. */
function estadoConContenedores() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 1e6;
  // `ownedContainers` es un MAPA id -> cantidad, no un array (napkin: el seed malo falla en silencio).
  seeded.ownedContainers = { tachoVereda: 3, contenedorBarrio: 2, containerIndustrial: 1 };
  return seeded;
}

async function irATienda(page) {
  await page.locator('[data-tab="tienda"]').click();
  await expect(page.locator('.shop-grid')).toBeVisible();
}

/**
 * Espera a que un banner esté REALMENTE cargado (píxeles decodificados).
 *
 * Dos cosas obligan a re-resolver el locator en cada intento en vez de guardarse un handle:
 * (1) los banners son `loading="lazy"`, así que hay que traerlos al viewport para que lleguen a
 * pedirse; y (2) `ShopView` re-renderiza por innerHTML en cada notify del store (el tick de
 * automatización notifica ~1 vez por segundo), así que el `<img>` de hace un instante puede
 * estar YA desprendido del DOM — de ahí el "Element is not attached to the DOM" que hacía
 * flakear este spec. Cada vuelta del poll vuelve a resolver y tolera el desprendimiento.
 */
async function esperarBannerCargado(locator) {
  await expect
    .poll(
      async () => {
        try {
          await locator.scrollIntoViewIfNeeded({ timeout: 2000 });
          return await locator.evaluate((img) => img.complete && img.naturalWidth > 0);
        } catch {
          return false; // el nodo se re-renderizó en el medio: se reintenta con uno fresco
        }
      },
      { timeout: 15000 }
    )
    .toBe(true);
}

test.describe('Dumpster Empire — ronda 30 (imágenes reales de contenedor)', () => {
  test('1: las tarjetas de la Tienda muestran su imagen realmente cargada', async ({ page }) => {
    await seed(page, serializeState(estadoConContenedores()));
    await entrarAlJuego(page);
    await irATienda(page);

    const banners = page.locator('.shop-card .container-banner');
    await expect(banners.first()).toBeVisible();

    // Los banners son `loading="lazy"`, así que solo se pide lo que entra en viewport: se
    // afirma sobre las primeras tarjetas, tras asegurarse de que estén a la vista. Un 404
    // dejaría naturalWidth en 0 (y el fallback lo habría sacado del DOM).
    const aVerificar = Math.min(3, await banners.count());
    for (let i = 0; i < aVerificar; i += 1) {
      await esperarBannerCargado(banners.nth(i));
    }

    // Con banner, el ícono SVG de esa tarjeta queda oculto (es la reserva del fallback).
    const conBanner = page.locator('.shop-card--has-banner').first();
    await expect(conBanner.locator('.shop-card-icon')).toBeHidden();
  });

  test('2: con la ruta de imágenes saboteada, la tarjeta cae al ícono SVG y el juego sigue', async ({ page }) => {
    // Sabotaje por interceptación: TODOS los assets de contenedor devuelven 404.
    await page.route('**/assets/containers/*', (route) => route.fulfill({ status: 404, body: '' }));
    await seed(page, serializeState(estadoConContenedores()));
    await entrarAlJuego(page);
    await irATienda(page);

    // El fallback quita el banner y la clase, así que el ícono SVG vuelve a verse. Con
    // `loading="lazy"` solo intenta cargar (y por lo tanto solo falla) lo que está en viewport:
    // se verifica sobre la primera tarjeta, traída a la vista a propósito.
    const primera = page.locator('.shop-card--has-banner, .shop-card').first();
    await expect(primera).toBeVisible();
    await primera.scrollIntoViewIfNeeded();
    await expect.poll(async () => primera.locator('.container-banner').count(), { timeout: 10000 }).toBe(0);
    await expect(primera).not.toHaveClass(/shop-card--has-banner/);
    await expect(primera.locator('.shop-card-icon')).toBeVisible();

    // Y lo importante: el flujo de juego no se rompió — se puede escarbar igual.
    await page.locator('[data-tab="escarbar"]').click();
    await iniciarEscarbado(page, 'tachoVereda');
    await expect(page.locator('#dig-active')).toBeVisible();
  });

  test('3: cada tarjeta de la Tienda muestra su imagen O su ícono SVG, nunca un hueco', async ({ page }) => {
    await seed(page, serializeState(estadoConContenedores()));
    await entrarAlJuego(page);
    await irATienda(page);

    // Invariante que vale con PENDING_IMAGES vacía o no: toda tarjeta tiene algo que mostrar, y
    // un contenedor pendiente NUNCA emite un banner (no hay archivo que pedir, sería un 404).
    const cards = page.locator('.shop-card');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i += 1) {
      const card = cards.nth(i);
      const conBanner = (await card.locator('.container-banner').count()) > 0;
      const conIcono = (await card.locator('.shop-card-icon').count()) > 0;
      expect(conBanner || conIcono, `la tarjeta ${i} no muestra ni imagen ni ícono`).toBe(true);
    }
    for (const id of PENDING_IMAGES) {
      await expect(page.locator(`.container-banner[data-container-banner="${id}"]`)).toHaveCount(0);
    }
  });

  test('4: el topbar muestra la hora real y el nombre de la franja', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-07-19T14:30:00') });
    await seed(page, serializeState(estadoConContenedores()));
    await entrarAlJuego(page);

    const reloj = page.locator('#daynight-indicator');
    await expect(reloj.locator('.topbar-clock-time')).toHaveText('14:30');
    // 14h cae en la franja "tarde" según data/dayNight.json.
    await expect(reloj.locator('.topbar-clock-band')).toHaveText('Tarde');
  });

  // El contenedor de barrio es el único con modelo por franja: cada hora sembrada debe pedir
  // un archivo DISTINTO. Un test por franja, con reloj propio (page.clock.install va antes del
  // primer goto, así que no se pueden probar dos horas en la misma página).
  for (const { id: band, startHour } of dayNight.timeBands) {
    test(`5.${band}: a las ${startHour}:00 el contenedor de barrio usa su modelo de "${band}"`, async ({ page }) => {
      const hora = String(startHour).padStart(2, '0');
      await page.clock.install({ time: new Date(`2026-07-19T${hora}:15:00`) });
      await seed(page, serializeState(estadoConContenedores()));
      await entrarAlJuego(page);
      await irATienda(page);

      // Scope a la tarjeta de Tienda: el selector de Escarbar vive en el DOM de la pestaña
      // oculta y también emite su banner del barrio (si no, el locator matchea 2 elementos).
      const banner = page.locator('.shop-card .container-banner[data-container-banner="contenedorBarrio"]');
      await expect(banner).toHaveAttribute('src', `assets/containers/contenedorBarrio-${band}.webp`);
      await esperarBannerCargado(banner);
    });
  }
});
