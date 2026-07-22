/**
 * Dos defectos visuales reportados por el usuario (2026-07-22), medidos antes de tocar nada:
 *
 * 1. EVENTO DE CONTENEDOR (dorado / en llamas, PLAN.md §4.32). El banner del evento se inserta
 *    como PRIMER hijo de la tarjeta, y la imagen del contenedor (ronda 30) sale del flujo hacia
 *    arriba con márgenes negativos porque asume ser ella la primera: le come 4px al banner y le
 *    tapa el renglón del countdown. Peor: el texto del banner cambia de largo cada segundo
 *    ("quedan 70s" → "quedan 9s"), reflow que hace saltar el alto de la tarjeta 13px una vez por
 *    segundo — el "se mueve para arriba y abajo constantemente" del reporte. Medido: alto
 *    oscilando 223.7 ↔ 210.7 y `banner.bottom - imagen.top = 4`.
 *
 * 2. EXTRUSIÓN TAPADA. Las tarjetas del juego llevan `--shadow-tactile: 0 8px 0` (extrusión
 *    sólida, no una sombra difusa: es el "borde inferior" que se ve). Dos secciones apiladas sin
 *    margen dejan que la de abajo pise esos 8px: `.automation-status` ("Ampliar capacidad") con
 *    `.automation-grid`, y `.prestige-summary` con `.prestige-tree`. Medido: hueco 0px en ambas.
 *
 * El test 2 no comprueba UN caso sino la INVARIANTE: ninguna tarjeta con extrusión puede tener a
 * su hermano de abajo dentro de esos 8px, en ninguna pestaña.
 */

import { test, expect } from '@playwright/test';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego } from './helpers/dig.js';

/** Alto de la extrusión de `--shadow-tactile` (tokens.css: `0 8px 0 0`). */
const EXTRUSION = 8;

function baseState() {
  const seeded = freshState();
  seeded.tutorialStep = 99;
  seeded.money = 5e9;
  // Con contenedores en propiedad, `tryTriggerContainerEvent` tiene candidatos (§4.32).
  seeded.ownedContainers = { tachoVereda: 3, contenedorBarrio: 2 };
  seeded.lastEventAt = 0;
  return seeded;
}

async function seed(page, state) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    'dumpsterEmpireSave',
    serializeState(state),
  ]);
}

test.describe('fix: evento de contenedor y extrusión de las tarjetas', () => {
  test('el banner del evento no tapa ni es tapado, y la tarjeta no salta cada segundo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seed(page, baseState());
    // `Math.random` fijo en 0 fuerza el disparo del evento en el primer tick y lo hace dorado
    // (`random() < goldenProbability`), sin tocar la data de balance.
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await entrarAlJuego(page);

    const card = page.locator('.dig-picker-card--golden');
    await expect(card).toBeVisible({ timeout: 15000 });
    const banner = card.locator('.dig-picker-card-event');
    await expect(banner).toBeVisible();

    // (a) El banner se ve ENTERO: el punto medio del banner hittestea al propio banner, no a la
    // imagen del contenedor que se le montaba encima.
    const encima = await banner.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === el || el.contains(hit);
    });
    expect(encima, 'algo se dibuja encima del banner del evento').toBe(true);

    // (b) El countdown cambia cada segundo: ni la tarjeta ni la fila pueden moverse por eso.
    //     Se mide en tiempo real (el evento dura 75s, así que acá solo pasan unos segundos).
    // Se mide con `querySelector` dentro de un solo `evaluate` y NO a través del locator: la
    // lista se reescribe una vez por segundo, y un handle resuelto un instante antes puede quedar
    // detached — un rect de 0 que no dice nada del layout (pasó al escribir este test).
    const medir = () =>
      page.evaluate(() => {
        const el = document.querySelector('.dig-picker-card--golden');
        // Una tarjeta SIN evento: con `.dig-picker-card` pelado el `querySelector` devolvía la
        // dorada misma (es la primera del picker) y la comparación de abajo era un verde vacío.
        const primera = document.querySelector('.dig-picker-card:not(.dig-picker-card--golden)');
        return {
          alto: Math.round(el.getBoundingClientRect().height),
          altoHermana: Math.round(primera.getBoundingClientRect().height),
          texto: el.querySelector('.dig-picker-card-event').textContent.trim(),
        };
      });
    const altos = [];
    const textos = new Set();
    let altoHermana = 0;
    for (let i = 0; i < 8; i += 1) {
      const m = await medir();
      expect(m.alto, 'la tarjeta se midió detached').toBeGreaterThan(0);
      altos.push(m.alto);
      altoHermana = m.altoHermana;
      textos.add(m.texto);
      await page.waitForTimeout(600);
    }
    expect(new Set(altos).size, `la tarjeta salta de alto con el countdown: ${altos.join(', ')}`).toBe(1);
    // Si el countdown no avanzó, (b) sería un verde vacío.
    expect(textos.size, 'el countdown no avanzó: la medición de arriba no probaría nada').toBeGreaterThan(1);
    // La tarjeta con evento mide lo mismo que una sin evento: la cinta no empuja la fila.
    expect(altoHermana, 'la tarjeta con evento no mide lo mismo que sus hermanas').toBe(altos[0]);

    // (c) Barrido determinista de TODOS los valores del countdown (los dígitos de Plus Jakarta
    //     Sans no son de ancho fijo: `75s` y `9s` no miden lo mismo). Escribir el texto a mano
    //     cubre en un segundo los 75s del evento sin esperarlos.
    const altosPorSegundo = await page.evaluate(() => {
      const el = document.querySelector('.dig-picker-card--golden');
      const b = el.querySelector('.dig-picker-card-event');
      const original = b.innerHTML;
      const plantilla = b.textContent.trim();
      const alturas = new Set();
      for (let s = 1; s <= 75; s += 1) {
        b.textContent = plantilla.replace(/\d+\s*s$/, `${s}s`);
        alturas.add(Math.round(el.getBoundingClientRect().height));
      }
      b.innerHTML = original;
      return [...alturas];
    });
    expect(altosPorSegundo, `el alto de la tarjeta depende del countdown: ${altosPorSegundo}`).toHaveLength(1);
  });

  test('ninguna tarjeta con extrusión tiene al hermano de abajo encima de su borde', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const seeded = baseState();
    // Con auto-escarbado comprado aparecen también `.fleet-section` y las tarjetas de robot.
    seeded.automationOwned = { robotBasico: true };
    // Con el Puesto comprado esa pestaña muestra tarjetas de verdad (bloqueado es un panel sin
    // ninguna) — así el barrido cubre las 6 pestañas con contenido real.
    seeded.stallLevel = 1;
    seeded.marketFluctuation = 1;
    seeded.marketFluctuationAt = Date.now();
    await seed(page, seeded);
    await entrarAlJuego(page);

    for (const tab of ['automatizacion', 'tienda', 'logros', 'prestigio', 'puesto', 'index']) {
      await page.locator(`[data-tab="${tab}"]`).click();
      await page.waitForTimeout(300);
      const { malas: pisadas, revisadas } = await page.evaluate((extrusion) => {
        const host = document.querySelector('#tab-content');
        const conExtrusion = (el) => getComputedStyle(el).boxShadow.includes(`${extrusion}px`);
        const malas = [];
        let revisadas = 0;
        for (const el of host.querySelectorAll('*')) {
          if (!conExtrusion(el)) continue;
          revisadas += 1;
          const siguiente = el.nextElementSibling;
          if (!siguiente) continue;
          const a = el.getBoundingClientRect();
          const b = siguiente.getBoundingClientRect();
          // Solo interesa el hermano que va DEBAJO (los de al lado en una grilla no pisan nada).
          const seSolapaEnX = b.left < a.right && b.right > a.left;
          if (!seSolapaEnX || b.top < a.top) continue;
          const hueco = b.top - a.bottom;
          if (hueco < extrusion) malas.push({ el: el.className, hueco: Math.round(hueco * 10) / 10 });
        }
        return { malas, revisadas };
      }, EXTRUSION);
      // Si la vista no llegó a renderizar, el barrido no encuentra nada y el `toEqual([])` sería
      // un verde vacío: cada pestaña tiene que haber revisado al menos una tarjeta con extrusión.
      expect(revisadas, `${tab}: no se revisó ninguna tarjeta con extrusión`).toBeGreaterThan(0);
      expect(pisadas, `${tab}: ${JSON.stringify(pisadas)}`).toEqual([]);
    }
  });
});
