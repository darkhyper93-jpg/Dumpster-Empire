/**
 * Regresión del "borde marrón" bajo el panel de herramientas (reportado por el usuario tras la
 * ronda 33).
 *
 * CAUSA RAÍZ: `.settings-block` (components.css) trae `margin-bottom: var(--space-3)` para separar
 * los bloques APILADOS de la vista Ajustes. `ToolsSection` reusa esa misma clase dentro de
 * `#dig-area` (gotcha ya anotado en el HANDOFF de la ronda 32: `.settings-block` NO es exclusivo de
 * Ajustes), donde el bloque es el ÚLTIMO: ese margen no separa de nada y solo destapa 16px del
 * sustrato de madera (`--wood-surface`) por debajo del panel. En desktop se nota especialmente
 * porque ahí `#dig-area` tiene `padding: 0`, así que el panel es flush arriba y a los lados y
 * marrón solo abajo — asimetría = el "borde que sobresale".
 *
 * El test mide GEOMETRÍA, no píxeles: el hueco de abajo tiene que ser igual al de arriba (el
 * padding real de `#dig-area`), en los dos anchos del DoD.
 */

import { test, expect } from '@playwright/test';

/** Tolerancia de subpíxel: los rects vienen con decimales por el layout de flex/grid. */
const EPSILON = 1.5;

async function enterDigTab(page) {
  await page.goto('/apps/game/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#title-play-btn').click();
  const skip = page.locator('[data-action="skip-tutorial"]');
  if (await skip.isVisible()) await skip.click();
  await page.locator('[data-tab="escarbar"]').click();
}

/**
 * Huecos entre `#dig-area` y su primer/último hijo visible. Con el bug, `below` da 16px más que
 * `above`; sano, los dos valen el padding vertical de `#dig-area`.
 */
async function digAreaGaps(page) {
  return page.evaluate(() => {
    const area = document.querySelector('#dig-area');
    const areaRect = area.getBoundingClientRect();
    const visible = [...area.children].filter((el) => {
      const cs = getComputedStyle(el);
      return !el.hasAttribute('hidden') && cs.display !== 'none' && cs.position !== 'absolute';
    });
    const first = visible[0].getBoundingClientRect();
    const last = visible[visible.length - 1].getBoundingClientRect();
    return {
      above: first.top - areaRect.top,
      below: areaRect.bottom - last.bottom,
      lastId: visible[visible.length - 1].id,
    };
  });
}

test.describe('fix: el sustrato de madera no asoma bajo el panel de herramientas', () => {
  test('desktop 1280: el panel de herramientas cierra flush con #dig-area', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterDigTab(page);

    const gaps = await digAreaGaps(page);
    expect(gaps.lastId).toBe('dig-tools-section');
    // En desktop `#dig-area` tiene padding 0: el hueco de arriba es 0 y el de abajo tiene que
    // serlo también. Con el margin-bottom huérfano de `.settings-block`, `below` daba 16.
    expect(gaps.below, `sobra sustrato bajo el panel: ${gaps.below}px`).toBeLessThanOrEqual(gaps.above + EPSILON);
  });

  test('mobile 375: el hueco de abajo es el mismo padding que el de arriba', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await enterDigTab(page);

    const gaps = await digAreaGaps(page);
    expect(gaps.lastId).toBe('dig-tools-section');
    expect(gaps.below, `abajo ${gaps.below}px vs arriba ${gaps.above}px`).toBeLessThanOrEqual(gaps.above + EPSILON);
  });

  test('Ajustes: el último bloque tampoco deja un hueco extra al pie', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterDigTab(page);
    await page.locator('#settings-btn').click();

    const gaps = await page.evaluate(() => {
      const host = document.querySelector('#tab-content');
      const blocks = host.querySelectorAll('.settings-block');
      const hostRect = host.getBoundingClientRect();
      const first = blocks[0].getBoundingClientRect();
      const last = blocks[blocks.length - 1].getBoundingClientRect();
      // `scrollHeight` y no `bottom`: el panel scrollea, así que el pie real es el del contenido.
      return { above: first.top - hostRect.top, below: host.scrollHeight - (last.bottom - hostRect.top + host.scrollTop) };
    });
    expect(gaps.below, `pie de Ajustes: ${gaps.below}px vs cabecera ${gaps.above}px`).toBeLessThanOrEqual(gaps.above + EPSILON);
  });
});
