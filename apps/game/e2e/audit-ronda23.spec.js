/**
 * Auditoría de la Ronda 23 (Agente E, Verif&Audit.md): regresión de seguridad del Puesto de
 * Chatarra. El save valida `stallOrders[].categoria` solo por tipo (`typeof string`) — por
 * diseño la capa de save chequea tipo y la UI hace la defensa en profundidad (allow-list),
 * napkin #8. Este spec fija esa defensa en el sink `StallView.renderOrders`: un save manipulado
 * con una categoría hostil NO debe inyectar HTML en la pestaña Puesto.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { freshState } from '../../../packages/engine/src/state.js';
import { serializeState } from '../../../packages/engine/src/save.js';
import { entrarAlJuego } from './helpers/dig.js';

const achievementsData = JSON.parse(readFileSync(path.join(__dirname, '../src/data/achievements.json'), 'utf8'));
const ALL_ACHIEVEMENT_IDS = achievementsData.map((a) => a.id);

test.describe('Dumpster Empire — auditoría ronda 23 (seguridad del Puesto)', () => {
  test('un pedido con categoría hostil (save manipulado) no inyecta HTML en la pestaña Puesto', async ({ page }) => {
    const seeded = freshState();
    seeded.tutorialStep = 99;
    seeded.stallLevel = 1;
    // Payload XSS: `categoria` es un string libre que pasa la validación del save (typeof string)
    // pero no es un id de rareza conocido — con el bug, renderOrders lo interpola crudo en innerHTML.
    const payload = '<img src=x onerror="window.__xssPwned=true">';
    seeded.stallOrders = [
      { id: 'o-hostil', npcId: 'salomon', categoria: payload, cantidad: 2, mult: 1.4, progress: 0 },
      { id: 'o-limpio', npcId: 'salomon', categoria: 'common', cantidad: 2, mult: 1.4, progress: 0 },
    ];
    seeded.ordersRotatedAt = Date.now(); // reciente: rotateStallOrders no reemplaza los pedidos sembrados.
    // Preseedar logros evita que una celebración tape el tabbar antes de abrir el Puesto.
    seeded.achievementsUnlocked = ALL_ACHIEVEMENT_IDS;

    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      'dumpsterEmpireSave',
      serializeState(seeded),
    ]);
    await entrarAlJuego(page);
    await page.locator('[data-tab="puesto"]').click();

    // Los pedidos ya están en el DOM (la assertion espera al primer render de las tarjetas).
    await expect(page.locator('.stall-order-card').first()).toBeVisible();

    // Ningún `<img>` (ni el payload) debe existir dentro de las tarjetas de pedido, y el onerror
    // nunca debe haber corrido. Chequeo inmediato (napkin #2: no depender de auto-retry para una
    // ausencia — acá el elemento no expira, pero el count inmediato es la comprobación honesta).
    expect(await page.locator('.stall-order-card img').count()).toBe(0);
    expect(await page.evaluate(() => Boolean(window.__xssPwned))).toBe(false);
  });
});
