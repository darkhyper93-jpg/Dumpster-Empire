/**
 * e2e de la auditoría de la ronda 15 (Verif&Audit.md, Agente E) — regresión del guard R5:
 * el toast "El robot descartó un contenedor con trampa" NUNCA debe dispararse por el solo
 * hecho de cargar un save que ya traía `trapsDiscarded > 0` (UIManager re-basea el contador
 * en el primer render y cada vez que el store reemplaza el objeto de estado — importSave/
 * resetGame; comparar contra `undefined`/0 lo dispararía).
 *
 * El caso POSITIVO (el toast sí aparece cuando el robot descarta de verdad) no tiene e2e por
 * el mismo motivo que documentó el Agente D (RNG no determinista en el navegador): el camino
 * de engine está cubierto por packages/engine/tests/ronda15-robot.test.js.
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';

const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));

test.describe('Dumpster Empire — auditoría ronda 15 (guard R5 del toast de descarte)', () => {
  test('bootear con trapsDiscarded > 0 ya guardado NO dispara el toast de descarte', async ({ page }) => {
    const seeded = freshState();
    seeded.tutorialStep = 99;
    // Todos los logros pre-desbloqueados: el seed no debe encolar celebraciones que tapen
    // la pantalla ni metan toasts propios (patrón de ronda15-contenido.spec.js).
    seeded.achievementsUnlocked = achievementsData.map((a) => a.id);
    seeded.trapsDiscarded = 7;
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      ['dumpsterEmpireSave', serializeState(seeded)]
    );

    await page.goto('/apps/game/');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    // Si el guard se rompiera, el toast se empuja sincrónicamente en el primer render (justo
    // al quedar ready) y vive 3.8s en el DOM (Toast.js): mirar a los 800ms es determinista.
    // OJO: count() inmediato, NO toHaveCount(0) — esa assertion auto-reintenta hasta que la
    // condición se cumpla, y como el toast expira solo a los 3.8s, "esperaría" a que
    // desaparezca y pasaría aunque el guard estuviera roto (verificado con un sabotaje).
    await page.waitForTimeout(800);
    expect(await page.locator('.toast').filter({ hasText: 'descartó' }).count()).toBe(0);
  });
});
