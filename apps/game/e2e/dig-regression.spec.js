/**
 * Regresión e2e (Playwright/Chromium) para Problema 2 (escarbado de un solo click,
 * intermitente): captura los dos defectos de origen antes del fix —
 * (a) `dragging` rancio en digInput.js cuando el release nunca llega, y
 * (b) DigCanvas confiando a ciegas en el buffer de la capa de suciedad — y confirma que
 * el arreglo (Pointer Events + compuerta de esfuerzo + reparación de anomalía) los cierra.
 *
 * Corre junto a smoke.spec.js: `npx playwright test apps/game/e2e/dig-regression.spec.js apps/game/e2e/smoke.spec.js`.
 */

import { test, expect } from '@playwright/test';

/** Arranca el juego y entra al escarbado del Tacho de Vereda. Devuelve el locator del canvas top. */
async function iniciarEscarbado(page) {
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#title-play-btn').click();
  await page.locator('[data-start-dig="tachoVereda"]').click();
  await expect(page.locator('#dig-active')).toBeVisible();
  const canvas = page.locator('.dig-canvas-top');
  await expect(canvas).toBeVisible();
  return canvas;
}

test.describe('Dumpster Empire — regresión escarbado de un solo click', () => {
  test('capa pre-vaciada externamente + un click NO completa el escarbado', async ({ page }) => {
    const canvas = await iniciarEscarbado(page);
    const moneyBefore = await page.locator('#money').textContent();

    // Simula una capa de suciedad ya transparente por una causa externa (pérdida de contexto
    // GPU, overlay, etc.), no por un arrastre legítimo del jugador.
    await canvas.evaluate((el) => {
      const ctx = el.getContext('2d');
      ctx.clearRect(0, 0, el.width, el.height);
    });

    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Sin arrastre real, el escarbado tiene que seguir activo (reparación de anomalía repinta
    // la capa y exige distancia de arrastre real desde cero).
    await expect(page.locator('#dig-active')).toBeVisible();
    const moneyAfter = await page.locator('#money').textContent();
    expect(moneyAfter).toEqual(moneyBefore);
  });

  test('mover el puntero sin botón presionado NO escarba (dragging rancio)', async ({ page }) => {
    const canvas = await iniciarEscarbado(page);
    const moneyBefore = await page.locator('#money').textContent();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    // NOTA DE IMPLEMENTACIÓN: se despachan Pointer Events sintéticos (pointerdown/pointermove)
    // porque son los eventos que el `digInput.js` YA CORREGIDO escucha (Pointer Events unifican
    // mouse+touch). Un `pointerdown` sintético con `isPrimary`/`button`/`buttons` seteados
    // arranca el arrastre igual que lo haría un puntero real; nunca se despacha `pointerup` (ni
    // `pointercancel`/`lostpointercapture`) para simular el release perdido (soltar afuera de la
    // ventana, Steam overlay, alt-tab) — el defecto (a) del brief.
    const progressAfterDown = await page.evaluate(
      ({ x, y }) => {
        const el = document.querySelector('.dig-canvas-top');
        const rect = el.getBoundingClientRect();
        const clientX = rect.left + x;
        const clientY = rect.top + y;
        el.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 1,
            isPrimary: true,
            button: 0,
            buttons: 1,
            clientX,
            clientY,
            bubbles: true,
          })
        );
        el.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 1,
            isPrimary: true,
            buttons: 1,
            clientX: clientX + 5,
            clientY: clientY + 5,
            bubbles: true,
          })
        );
        const ctx = el.getContext('2d');
        const before = ctx.getImageData(0, 0, el.width, el.height).data;
        let clearedBefore = 0;
        for (let i = 3; i < before.length; i += 4) if (before[i] < 40) clearedBefore++;
        return clearedBefore;
      },
      { x: box.width / 2, y: box.height / 2 }
    );

    const progressAfterZigzag = await page.evaluate(() => {
      const el = document.querySelector('.dig-canvas-top');
      const rect = el.getBoundingClientRect();
      const cols = 20;
      const rows = 10;
      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const clientX = rect.left + (rect.width * col) / cols;
          const clientY = rect.top + (rect.height * row) / rows;
          el.dispatchEvent(
            new PointerEvent('pointermove', {
              pointerId: 1,
              isPrimary: true,
              buttons: 0,
              clientX,
              clientY,
              bubbles: true,
            })
          );
        }
      }
      const ctx = el.getContext('2d');
      const after = ctx.getImageData(0, 0, el.width, el.height).data;
      let clearedAfter = 0;
      for (let i = 3; i < after.length; i += 4) if (after[i] < 40) clearedAfter++;
      return clearedAfter;
    });

    // El zigzag con buttons:0 no puede haber limpiado más superficie que el pointerdown inicial.
    expect(progressAfterZigzag).toBeLessThanOrEqual(progressAfterDown + 1);
    await expect(page.locator('#dig-active')).toBeVisible();
    const moneyAfter = await page.locator('#money').textContent();
    expect(moneyAfter).toEqual(moneyBefore);
  });

  test('mousemove sin botón con dragging rancio (implementación mouse actual) NO escarba', async ({ page }) => {
    // Complementa el test anterior probando directamente contra los listeners que existían antes
    // del fix (mousedown/mousemove), para capturar el defecto (a) tal cual describe el brief:
    // `dragging` se apaga solo con mouseup en window, y `onMove` no chequea `evt.buttons`. Este
    // test debe fallar contra el código sin arreglar (el zigzag sin botón sigue borrando y
    // completa el escarbado) y pasar una vez migrado a Pointer Events (ya no hay listeners de
    // mouse, así que estos eventos sintéticos no producen ningún efecto).
    const canvas = await iniciarEscarbado(page);
    const moneyBefore = await page.locator('#money').textContent();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    await page.evaluate(
      ({ x, y }) => {
        const el = document.querySelector('.dig-canvas-top');
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(
          new MouseEvent('mousedown', {
            button: 0,
            buttons: 1,
            clientX: rect.left + x,
            clientY: rect.top + y,
            bubbles: true,
          })
        );
        // Nunca se despacha 'mouseup': simula el release perdido. A partir de acá, todo
        // 'mousemove' -incluso sin botón presionado (buttons: 0)- debería seguir siendo ignorado.
        // El barrido se trocea con un `setTimeout` entre filas para dejar pasar el throttle de
        // muestreo del canvas (120ms, ver SAMPLE_THROTTLE_MS en DigCanvas.js) — igual que hace el
        // smoke test con el drag real — porque un burst 100% síncrono nunca deja que
        // `sampleClearedFraction()` se vuelva a evaluar.
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const cols = 20;
        const rows = 10;
        return (async () => {
          for (let row = 0; row <= rows; row++) {
            for (let col = 0; col <= cols; col++) {
              el.dispatchEvent(
                new MouseEvent('mousemove', {
                  button: 0,
                  buttons: 0,
                  clientX: rect.left + (rect.width * col) / cols,
                  clientY: rect.top + (rect.height * row) / rows,
                  bubbles: true,
                })
              );
            }
            await wait(150);
          }
        })();
      },
      { x: box.width / 2, y: box.height / 2 }
    );

    await expect(page.locator('#dig-active')).toBeVisible();
    const moneyAfter = await page.locator('#money').textContent();
    expect(moneyAfter).toEqual(moneyBefore);
  });

  test('un solo click sobre la capa fresca no completa el escarbado', async ({ page }) => {
    const canvas = await iniciarEscarbado(page);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.locator('#dig-active')).toBeVisible();
  });

  // Problema 1 (PLAN_PAM3.md / task-2-brief.md): #app crecía con `min-height:100vh` en vez de
  // clampearse al viewport, así que un panel con lista larga (Logros/Contenedores) desbordaba el
  // documento entero y scrolleaba topbar+sidebar+tabbar junto con el contenido, en vez de
  // scrollear solo `#tab-content` internamente.
  const VIEWPORTS_SCROLL = [
    { name: 'mobile-375', width: 375, height: 812 },
    { name: 'steam-deck-1280x800', width: 1280, height: 800 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ];

  for (const viewport of VIEWPORTS_SCROLL) {
    test(`la página no scrollea (solo el panel interno) en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/apps/game/');
      await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');

      // Pantalla de inicio: sin scroll fantasma de página (advertencia explícita del brief:
      // `.title-screen` usa min-height:100vh, verificar que #app clampeado no le suma scroll).
      await expect(page.locator('#title-screen')).toBeVisible();
      const titleScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      expect(titleScrollHeight).toBeLessThanOrEqual(viewportHeight + 1);

      await page.locator('#title-play-btn').click();

      // Pestaña con lista larga: Logros tiene contenido suficiente para desbordar el panel.
      await page.locator('[data-tab="logros"]').click();
      await expect(page.locator('#tab-content')).toBeVisible();

      const pageScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const innerHeight = await page.evaluate(() => window.innerHeight);
      expect(pageScrollHeight).toBeLessThanOrEqual(innerHeight + 1);

      const panelOverflows = await page.evaluate(() => {
        const el = document.querySelector('#tab-content');
        return el.scrollHeight > el.clientHeight;
      });
      expect(panelOverflows).toBe(true);
    });
  }
});
