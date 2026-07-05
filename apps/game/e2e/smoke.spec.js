/**
 * Smoke test e2e (Playwright/Chromium) de apps/game — Fase 2. Complementa la simulación
 * headless del store (Node, sin DOM) con lo que solo se puede verificar contra el DOM y el
 * canvas real: cero errores de consola, el layout a los tres anchos de PLAN.md §10, y el gesto
 * de escarbado (pointer drag) revelando y sumando dinero al completar.
 *
 * Corre por separado de Vitest: `npm run test:e2e` (no está en `npm test`).
 */

import { test, expect } from '@playwright/test';
import { entrarAlJuego, iniciarEscarbadoSinTrampa, rascarObjeto } from './helpers/dig.js';

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
    await entrarAlJuego(page);

    const moneyBefore = await page.locator('#money').textContent();
    expect(moneyBefore).toContain('$0');

    // Ronda 5: el escarbado se completa SOLO al destapar todos los objetos (revelado
    // por-objeto, posiciones aleatorias). El gesto rasca encima de cada uno, leyendo las
    // posiciones del hook de debug del canvas.
    const { canvas, positions } = await iniciarEscarbadoSinTrampa(page, 'tachoVereda');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No se pudo medir el canvas de escarbado.');
    for (const pos of positions) {
      await rascarObjeto(page, box, pos);
    }

    // El modelo de revelado decide cuándo se completa (todos los objetos destapados); la UI
    // vuelve sola al estado vacío tras el momento de revelado, sin `finishManualDig` a mano.
    await expect(page.locator('#dig-empty')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#dig-active')).toBeHidden();

    const moneyAfter = await page.locator('#money').textContent();
    expect(moneyAfter).not.toEqual(moneyBefore);
  });
});
