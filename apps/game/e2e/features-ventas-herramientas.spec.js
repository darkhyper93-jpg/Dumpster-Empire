/**
 * e2e (Playwright/Chromium) de la ronda "features" (pedidos del usuario, 2026-07-22):
 *  1. "Vender todo" vacía el inventario del Puesto en un clic, y el botón "Vender" individual
 *     de cada tarjeta sigue existiendo y funcionando.
 *  2. La Vitrina se declara global y cada pedestal dice de qué rareza sale.
 *  3. El cartel "Botón gris = ..." ya no está en Automatización.
 *  4. Las 4 herramientas nuevas se compran y se equipan desde la vista Escarbar.
 *  5. Las etiquetas bajo cada contenedor dicen "Velocidad"/"Alcance", no "Ritmo"/"Pincel".
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego, cerrarCelebraciones, clickSorteandoCelebraciones } from './helpers/dig.js';

// Mismo patrón que ronda23-puesto.spec.js: Playwright compila los specs sin "type":"module",
// así que la data se lee con readFileSync y NUNCA se hardcodean conteos ni costos.
const toolsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/tools.json'), 'utf8'));
const legendariesData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/legendaries.json'), 'utf8'));
const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);

const HERRAMIENTAS_NUEVAS = ['exoesqueletoChatarrero', 'taladroNucleo', 'barredoraGravitatoria', 'excavadoraSingular'];

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

async function abrirPestania(page, tab) {
  await clickSorteandoCelebraciones(page, `[data-tab="${tab}"]`);
  await cerrarCelebraciones(page);
}

/** Inventario sembrado con 3 piezas reales de tachoVereda (ids del pool, no inventados). */
function conInventario(seeded) {
  seeded.stallLevel = 1;
  seeded.marketFluctuation = 1;
  seeded.marketFluctuationAt = Date.now();
  seeded.inventory = [
    { itemId: 'can-crushed', containerId: 'tachoVereda', categoria: 'common', baseValue: 1000 },
    { itemId: 'cork-bottle', containerId: 'tachoVereda', categoria: 'reusable', baseValue: 1000 },
    { itemId: 'can-crushed', containerId: 'tachoVereda', categoria: 'common', baseValue: 1000 },
  ];
  // Los logros nuevos pagan dinero al desbloquearse y ensuciarían los asserts de monto.
  seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;
  return seeded;
}

test.describe('Dumpster Empire — ronda features (venta en lote, vitrina, herramientas)', () => {
  test('1: "Vender todo" vacía el inventario en un clic y sube el dinero', async ({ page }) => {
    await seed(page, serializeState(conInventario(baseState())));
    await entrarAlJuego(page);
    await abrirPestania(page, 'puesto');

    const tarjetas = page.locator('.stall-inventory-grid [data-action="sell-item"]');
    await expect(tarjetas).toHaveCount(3);
    const moneyBefore = await page.locator('#money').textContent();

    await page.locator('[data-action="sell-all"]').click();

    await expect(page.locator('.stall-inventory-grid')).toHaveCount(0);
    await expect(page.locator('[data-action="sell-all"]')).toHaveCount(0);
    await expect(page.locator('#money')).not.toHaveText(moneyBefore);
    // El resumen del lote reemplaza al comentario de Rita (mismo canal que la venta individual).
    await expect(page.locator('.stall-npc-text')).toContainText('3');
  });

  test('1b: la venta individual sigue existiendo y saca de a UNA pieza (no se rompió al agregar el lote)', async ({
    page,
  }) => {
    await seed(page, serializeState(conInventario(baseState())));
    await entrarAlJuego(page);
    await abrirPestania(page, 'puesto');

    const tarjetas = page.locator('.stall-inventory-grid [data-action="sell-item"]');
    await expect(tarjetas).toHaveCount(3);
    await tarjetas.first().click();
    await expect(tarjetas).toHaveCount(2);
    // Y el botón de lote convive con ellas mientras quede inventario.
    await expect(page.locator('[data-action="sell-all"]')).toBeVisible();
  });

  test('2: la Vitrina se declara global y cada pedestal dice de qué rareza sale', async ({ page }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    await abrirPestania(page, 'index');

    await expect(page.locator('.showcase-global-hint')).toBeVisible();
    // Un pedestal por legendario, cada uno con su línea de origen (conteo derivado de la data).
    await expect(page.locator('.showcase-card-from')).toHaveCount(legendariesData.items.length);
  });

  test('3: el cartel "Botón gris = ..." ya no está en Automatización', async ({ page }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    await abrirPestania(page, 'automatizacion');

    const explainer = page.locator('.automation-explainer');
    await expect(explainer).toBeVisible();
    await expect(explainer).not.toContainText('Botón gris');
    await expect(page.locator('.automation-explainer-hint')).toHaveCount(0);
  });

  test('4: las 4 herramientas nuevas se compran y se equipan desde Escarbar', async ({ page }) => {
    const seeded = baseState();
    // Dinero para la más cara (leído de la data, nunca hardcodeado).
    seeded.money = Math.max(...toolsData.map((tool) => tool.costo)) * 2;
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    const tools = page.locator('.settings-tools');
    await expect(tools).toBeVisible();
    // Una fila por herramienta de tools.json, incluidas las 4 nuevas.
    await expect(page.locator('.tool-row')).toHaveCount(toolsData.length);

    for (const id of HERRAMIENTAS_NUEVAS) {
      const fila = page.locator(`.tool-row:has([data-action="buy-tool"][data-id="${id}"])`);
      await expect(fila).toHaveCount(1);
      await fila.locator(`[data-action="buy-tool"][data-id="${id}"]`).click();
      // Comprada: el botón de compra se reemplaza por el de equipar (la vista re-renderiza).
      await expect(page.locator(`[data-action="equip-tool"][data-id="${id}"]`)).toBeVisible();
      await page.locator(`[data-action="equip-tool"][data-id="${id}"]`).click();
      await expect(page.locator(`[data-action="equip-tool"][data-id="${id}"]`)).toHaveCount(0);
    }
    // La última equipada queda con su badge "Equipada" y ninguna otra lo tiene.
    await expect(page.locator('.tool-row .badge')).toHaveCount(1);
  });

  test('5: las etiquetas bajo cada contenedor dicen Velocidad/Alcance, no Ritmo/Pincel', async ({ page }) => {
    await seed(page, serializeState(baseState()));
    await entrarAlJuego(page);
    await abrirPestania(page, 'tienda');

    // La PRIMERA `.shop-card` de la Tienda es la del Puesto de Chatarra, que no tiene estas
    // líneas: se apunta a la primera tarjeta de CONTENEDOR (las únicas con `.shop-card-rate`).
    const primeraTarjeta = page.locator('.shop-card:has(.shop-card-rate)').first();
    await expect(primeraTarjeta).toContainText('Velocidad:');
    await expect(primeraTarjeta).toContainText('Alcance:');
    await expect(primeraTarjeta).not.toContainText('Ritmo:');
    await expect(primeraTarjeta).not.toContainText('Pincel:');
    // Y el tooltip explica contra qué se compara el %.
    await expect(page.locator('.shop-card-rate').first()).toHaveAttribute('title', /resistencia/i);
  });
});
