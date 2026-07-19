/**
 * Helpers compartidos de los e2e de escarbado (ronda 5, revelado por-objeto).
 *
 * Con posiciones aleatorias por escarbado, los tests no pueden hardcodear dónde rascar:
 * leen `window.__digDebug` (hook de SOLO lectura que expone DigCanvas.start) y generan
 * gestos de puntero reales sobre cada objeto.
 */

import { expect } from '@playwright/test';

/** Resolución interna del canvas de escarbado (DigCanvas.js). */
export const DIG_W = 600;
export const DIG_H = 330;

/**
 * Cierra cualquier celebración encolada (ronda 12: logro/contenedor nuevo/primer hallazgo raro) que esté
 * tapando la pantalla. Los specs de mecánica no prueban el modal en sí (eso es
 * ronda12-regression.spec.js) — acá solo se la saca de encima para no bloquear los gestos de
 * puntero del resto de los tests con su backdrop.
 */
export async function cerrarCelebraciones(page) {
  const closeBtn = page.locator('[data-action="close-celebration"]');
  while (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
}

/**
 * Clickea un elemento tolerando celebraciones que aparezcan DURANTE el intento.
 *
 * Por qué existe (ronda 30): las celebraciones se encolan desde `render()` y solo se cierran
 * con click — `CelebrationModal.showNext` no tiene timer que las descarte. Vaciar la cola
 * ANTES del click no alcanza: si una se encola en el render siguiente, su backdrop intercepta
 * el click y el reintento propio de Playwright no puede resolverlo nunca (nada la va a cerrar),
 * así que el spec falla por algo que no estaba probando. La ronda 30 destapó esta carrera al
 * hacer el primer render un poco más pesado, pero es LATENTE desde la ronda 12: main pasaba por
 * ser marginalmente más rápido, no por ser correcto.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector - selector del elemento a clickear
 * @param {number} [timeoutMs]
 */
export async function clickSorteandoCelebraciones(page, selector, timeoutMs = 15000) {
  const target = page.locator(selector);
  const limite = Date.now() + timeoutMs;
  for (;;) {
    await cerrarCelebraciones(page);
    try {
      // Ráfagas cortas: si una celebración aparece justo ahora, se falla rápido, se la cierra
      // en la vuelta siguiente y se reintenta — en vez de agotar el timeout contra el backdrop.
      await target.click({ timeout: 1000 });
      return;
    } catch (err) {
      if (Date.now() > limite) throw err;
    }
  }
}

/** Entra al juego desde la pantalla de título y descarta el tutorial. */
export async function entrarAlJuego(page) {
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#title-play-btn').click();
  // El botón "Saltar tutorial" es el único trozo del overlay con pointer-events: si un objeto
  // (posición aleatoria, ronda 5) cae debajo, el mouse.down inicial del gesto aterrizaría en el
  // botón y el canvas nunca arrancaría el arrastre. Los specs de mecánica no prueban el tutorial.
  const skip = page.locator('[data-action="skip-tutorial"]');
  if (await skip.isVisible()) {
    await skip.click();
    await expect(skip).toBeHidden();
  }
  // Un save sembrado puede satisfacer condiciones de logro que todavía no estaban marcadas
  // (ronda 12): al cargar, `runAchievements()` las desbloquea todas de una y encola sus
  // celebraciones ANTES de que el test haga nada.
  await cerrarCelebraciones(page);
}

/** Arranca el escarbado del contenedor pedido. Devuelve el locator del canvas top. */
export async function iniciarEscarbado(page, containerId) {
  await page.locator(`[data-start-dig="${containerId}"]`).click();
  await expect(page.locator('#dig-active')).toBeVisible();
  // Comprar el contenedor (ronda 12) puede desbloquear el siguiente en la cadena y encolar su
  // celebración de "¡Contenedor nuevo!" ya al arrancar — se cierra antes de tocar el canvas.
  await cerrarCelebraciones(page);
  const canvas = page.locator('.dig-canvas-top');
  await expect(canvas).toBeVisible();
  return canvas;
}

/** Posiciones internas (600x330) de los objetos del escarbado en curso. */
export async function getDigPositions(page) {
  return page.evaluate(() => window.__digDebug.positions);
}

/**
 * Arranca un escarbado garantizando que NO haya salido trampa (la trampa tiene 1 solo
 * "objeto" y varios tests necesitan 2+). Si el roll dio trampa, abandona y reintenta:
 * con probTrampaBase 0.05-0.08 la chance de agotar los reintentos es ~1e-9.
 */
export async function iniciarEscarbadoSinTrampa(page, containerId, minObjetos = 2) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = await iniciarEscarbado(page, containerId);
    const positions = await getDigPositions(page);
    if (positions.length >= minObjetos) return { canvas, positions };
    await page.locator('#dig-abandon-btn').click();
    await expect(page.locator('#dig-empty')).toBeVisible();
  }
  throw new Error(`No salió un escarbado sin trampa de ${containerId} en 8 intentos.`);
}

/**
 * Rasca encima de un objeto con un gesto real: tres pasadas horizontales que cubren su
 * huella completa (radio 28 + pincel base 20), en coordenadas de página escaladas al
 * tamaño CSS actual del canvas.
 * @param {import('@playwright/test').Page} page
 * @param {{x:number,y:number,width:number,height:number}} box - boundingBox del canvas top
 * @param {{x:number,y:number}} pos - centro del objeto en coordenadas internas (600x330)
 */
export async function rascarObjeto(page, box, pos) {
  const sx = box.width / DIG_W;
  const sy = box.height / DIG_H;
  const cx = box.x + pos.x * sx;
  const cy = box.y + pos.y * sy;
  const half = 35 * sx;
  await page.mouse.move(cx - half, cy - 15 * sy);
  await page.mouse.down();
  for (const dy of [-15, 0, 15]) {
    await page.mouse.move(cx - half, cy + dy * sy, { steps: 2 });
    await page.mouse.move(cx + half, cy + dy * sy, { steps: 8 });
  }
  await page.mouse.up();
}

/**
 * Punto del canvas (coordenadas de página) lejos de TODOS los objetos: para probar que un
 * click aislado no revela ni completa nada, sin flakiness por dónde cayó el RNG.
 * @returns {Promise<{x:number,y:number}>}
 */
export async function puntoLejano(page, box) {
  const positions = await getDigPositions(page);
  const candidates = [
    { x: 25, y: 25 },
    { x: DIG_W - 25, y: 25 },
    { x: 25, y: DIG_H - 25 },
    { x: DIG_W - 25, y: DIG_H - 25 },
    { x: DIG_W / 2, y: 25 },
    { x: DIG_W / 2, y: DIG_H - 25 },
  ];
  let best = null;
  let bestDist = -1;
  for (const c of candidates) {
    const dist = Math.min(...positions.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
    if (dist > bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  // Pincel máx ~20 + huella 28: a >70px del centro no se limpia ni un punto de muestreo.
  if (bestDist <= 70) throw new Error('No hay punto del canvas lejos de todos los objetos.');
  return { x: box.x + (best.x / DIG_W) * box.width, y: box.y + (best.y / DIG_H) * box.height };
}
