/**
 * Smoke test e2e (Playwright/Chromium) de apps/game — Fase 2. Complementa la simulación
 * headless del store (Node, sin DOM) con lo que solo se puede verificar contra el DOM y el
 * canvas real: cero errores de consola, el layout a los tres anchos de PLAN.md §10, y el gesto
 * de escarbado (pointer drag) revelando y sumando dinero al completar.
 *
 * Corre por separado de Vitest: `npm run test:e2e` (no está en `npm test`).
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'steam-deck-1280x800', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test.describe('Dumpster Empire — smoke', () => {
  test('carga sin errores de consola y el layout entra en los 3 anchos de referencia', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');

    // PLAN.md §11.8/§11.9: el juego arranca en la pantalla de inicio; "Jugar" entra al escarbado.
    await expect(page.locator('#title-screen')).toBeVisible();
    await page.locator('#title-play-btn').click();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // El área de escarbado y el tabbar tienen que seguir visibles a cualquier ancho de referencia.
      await expect(page.locator('#dig-area')).toBeVisible();
      await expect(page.locator('#tabbar')).toBeVisible();
      await page.screenshot({ path: `apps/game/e2e/.results/screenshots/${viewport.name}.png`, fullPage: true });
    }

    expect(consoleErrors, `Errores de consola encontrados:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('escarbar el Tacho de Vereda revela con un pointer drag real y suma dinero', async ({ page }) => {
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#title-play-btn').click();

    const moneyBefore = await page.locator('#money').textContent();
    expect(moneyBefore).toContain('$0');

    await page.locator('[data-start-dig="tachoVereda"]').click();
    await expect(page.locator('#dig-active')).toBeVisible();

    const canvas = page.locator('.dig-canvas-top');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');

    // Barrido en zigzag sobre todo el canvas: suficiente para superar el umbral de revelado
    // por defecto (60%, PLAN.md §2.2) sin depender de un valor exacto de la Fuerza del jugador.
    const rows = 10;
    await page.mouse.move(box.x + 1, box.y + 1);
    await page.mouse.down();
    for (let row = 0; row <= rows; row++) {
      const y = box.y + (box.height * row) / rows;
      const leftToRight = row % 2 === 0;
      const xFrom = leftToRight ? box.x : box.x + box.width;
      const xTo = leftToRight ? box.x + box.width : box.x;
      await page.mouse.move(xFrom, y, { steps: 3 });
      await page.mouse.move(xTo, y, { steps: 20 });
      // Deja pasar el throttle de muestreo del canvas (120ms) para que el progreso se vaya
      // registrando en vez de acumularse todo en una sola muestra al final.
      await page.waitForTimeout(150);
    }
    await page.mouse.up();

    // El engine decide cuándo se completa (getRevealThreshold); la UI vuelve sola al estado
    // vacío al llegar al umbral, sin que el test dispare `finishManualDig` a mano.
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#dig-active')).toBeHidden();

    const moneyAfter = await page.locator('#money').textContent();
    expect(moneyAfter).not.toEqual(moneyBefore);
  });
});
