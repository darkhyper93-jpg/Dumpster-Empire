/**
 * Regresión e2e de la auditoría ronda 18: una falla de boot NUNCA deja la pantalla en
 * "Cargando…" para siempre (CLAUDE.md exige estado de error explícito). Antes del guard,
 * dos clases de falla quedaban mudas:
 *   1. Falla de evaluación del grafo de módulos (engine que no carga: el bug de empaquetado
 *      de la ronda 13 — "ventana en blanco" — era exactamente esto). boot() nunca corre, así
 *      que ningún try/catch de main.js puede verla: solo un listener global.
 *   2. Excepción DENTRO de boot() después de loadData (cuyo catch solo cubre la carga de
 *      data): la promesa de boot() quedaba como unhandled rejection y el estado en 'loading'.
 * El sabotaje va por intercepción de red (page.route con route.fetch + fuente parcheada),
 * nunca editando el repo (napkin: pipelines invisibles se verifican interceptando módulos).
 */
import { test, expect } from '@playwright/test';

test.describe('Ronda 18 — guard de boot (falla visible, nunca "Cargando…" eterno)', () => {
  test('el grafo de módulos roto (engine no evalúa) muestra el estado de error', async ({ page }) => {
    await page.route('**/packages/engine/src/index.js', (route) =>
      route.fulfill({
        body: 'throw new Error("sabotaje e2e: engine roto");',
        contentType: 'application/javascript',
      })
    );
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#boot-status')).toContainText('No se pudo cargar el juego');
  });

  test('una excepción post-loadData dentro de boot() muestra el estado de error', async ({ page }) => {
    const ANCLA = 'const store = createStore(';
    let anclaEncontrada = false;
    await page.route('**/apps/game/src/main.js', async (route) => {
      const original = await (await route.fetch()).text();
      anclaEncontrada = original.includes(ANCLA);
      await route.fulfill({
        body: original.replace(
          ANCLA,
          '(() => { throw new Error("sabotaje e2e: fallo post-loadData"); })(); const store = createStore('
        ),
        contentType: 'application/javascript',
      });
    });
    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#boot-status')).toContainText('No se pudo cargar el juego');
    // Si main.js dejó de contener el ancla, el sabotaje no inyectó nada y el test no probó nada.
    expect(anclaEncontrada).toBe(true);
  });
});
