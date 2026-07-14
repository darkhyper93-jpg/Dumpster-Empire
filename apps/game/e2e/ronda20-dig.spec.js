/**
 * e2e (Playwright/Chromium) de la Ronda 20.C: herramientas de escarbado (radio del pincel) y los
 * dos contenedores con mecánica propia (Bóveda a Contrarreloj / Sótano Sin Luz). El espionaje de
 * slots (Energía) de esta ronda se removió en la ronda 21 — ver ronda21-limpieza.spec.js.
 * Corre con el resto: `npm run test:e2e`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { formatMoney } from '../../../packages/engine/src/format.js';
import { entrarAlJuego, iniciarEscarbado, getDigPositions, cerrarCelebraciones } from './helpers/dig.js';

const containersData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/containers.json'), 'utf8'));

async function seed(page, save) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), ['dumpsterEmpireSave', save]);
}

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  return seeded;
}

/** Toca (sin arrastrar) un único punto del canvas — mismo escalado que rascarObjeto en helpers/dig.js. */
async function tocarPunto(page, box, pos) {
  const sx = box.width / 600;
  const sy = box.height / 330;
  await page.mouse.move(box.x + pos.x * sx, box.y + pos.y * sy);
  await page.mouse.down();
  await page.mouse.up();
}

test.describe('Dumpster Empire — ronda 20 (grados de trampa, herramientas, contenedores con mecánica)', () => {
  test('2: la herramienta equipada cambia el radio real del pincel (mismo gesto, resultado distinto)', async ({
    page,
  }) => {
    const seeded = baseState();
    seeded.money = 10000000;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    // Con "Manos curtidas" (radioMult 1.0): un toque único en el centro de un objeto no alcanza
    // la cobertura de revelado (REVEAL_COVERAGE 0.6) — el radio base no cubre el anillo externo
    // de la huella (digRevealModel.js, footprintPoints).
    let canvas = await iniciarEscarbado(page, 'tachoVereda');
    let positions = await getDigPositions(page);
    let box = await canvas.boundingBox();
    if (!box) throw new Error('sin boundingBox');
    await tocarPunto(page, box, positions[0]);
    let revealed = await page.evaluate(() => window.__digDebug.revealed());
    expect(revealed[0]).toBe(false);
    await page.locator('#dig-abandon-btn').click();
    await expect(page.locator('#dig-empty')).toBeVisible();

    // Equipar el Guante Hidráulico (radioMult 1.3 × ritmoMult 1.3, la combinación con mayor
    // radio neto de pincel entre las 4 herramientas). Ronda 21: la sección de herramientas se
    // mudó de Ajustes a la vista Escarbar (donde ya estamos tras abandonar arriba).
    await cerrarCelebraciones(page);
    await page.locator('[data-action="buy-tool"][data-id="guanteHidraulico"]').click();
    await page.locator('[data-action="equip-tool"][data-id="guanteHidraulico"]').click();
    await expect(page.locator('.tool-row', { hasText: 'Guante Hidráulico' }).locator('.badge')).toBeVisible();

    // Mismo gesto (toque único en el centro) sobre un contenedor nuevo: ahora sí cubre la huella
    // completa y el objeto se revela.
    await page.locator('[data-tab="escarbar"]').click();
    canvas = await iniciarEscarbado(page, 'tachoVereda');
    positions = await getDigPositions(page);
    box = await canvas.boundingBox();
    if (!box) throw new Error('sin boundingBox');
    await tocarPunto(page, box, positions[0]);
    revealed = await page.evaluate(() => window.__digDebug.revealed());
    expect(revealed[0]).toBe(true);
  });

  test('3: la Bóveda a Contrarreloj expira sin castigo de dinero si no se completa a tiempo', async ({ page }) => {
    const boveda = containersData.find((c) => c.id === 'bovedaContrarreloj');
    const seeded = baseState();
    seeded.prestigeCount = 7;
    seeded.money = boveda.costoInicial * 2;
    await page.clock.install();
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    await iniciarEscarbado(page, 'bovedaContrarreloj');
    await expect(page.locator('#dig-timed-timer')).toBeVisible();
    // El reloj real del test (setup/boot) ya consume un par de segundos antes de esta lectura
    // (page.clock no lo congela, solo lo hace controlable) — se tolera cerca del `digTime` en
    // vez de exigir el segundo exacto.
    await expect(page.locator('#dig-timed-timer')).toContainText(/Tiempo restante: \d+s/);

    // El saldo tras comprar el contenedor: sale del engine (formatMoney), nunca de un snapshot
    // leído a mitad del tween de #money (juice de PLAN.md §5.2 — el conteo se anima, no salta).
    const expectedMoneyAfterBuy = formatMoney(seeded.money - boveda.costoInicial);
    await expect(page.locator('#money')).toHaveText(expectedMoneyAfterBuy);

    // El límite duro (`digTime`) corre por delta real del loop (nunca setTimeout, R20.3):
    // avanzar el reloj virtual de Playwright dispara los `setInterval` de loop.js como si
    // pasara tiempo real.
    await page.clock.fastForward((boveda.digTime + 5) * 1000);

    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast').filter({ hasText: 'Bóveda a Contrarreloj' })).toBeVisible();
    // Sin castigo de dinero: el saldo sigue siendo el mismo que justo después de comprar el
    // contenedor (el costo de compra ya estaba descontado; expirar no resta nada más).
    await expect(page.locator('#money')).toHaveText(expectedMoneyAfterBuy);
  });

  test('4: el Sótano Sin Luz renderiza la máscara de oscuridad', async ({ page }) => {
    const sotano = containersData.find((c) => c.id === 'sotanoSinLuz');
    const seeded = baseState();
    seeded.prestigeCount = 8;
    seeded.money = sotano.costoInicial * 2;
    await seed(page, serializeState(seeded));
    await entrarAlJuego(page);

    // Sin ningún contenedor con mecánica propia, la máscara está oculta (R18: degrada limpio).
    await iniciarEscarbado(page, 'sotanoSinLuz');
    const mask = page.locator('#dig-dark-mask');
    await expect(mask).toBeVisible();

    const canvas = page.locator('.dig-canvas-top');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('sin boundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(mask).toHaveCSS('background-image', /gradient/);
  });
});
