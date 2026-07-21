/**
 * e2e de los idiomas nuevos (ronda 33): pt/fr/de entran a `SUPPORTED_LANGUAGES` y por lo tanto
 * a la detección por locale del navegador, al selector de Ajustes y al save persistido.
 *
 * Cubre lo que los tests de Vitest NO pueden: que el diccionario nuevo llegue de verdad a la
 * pantalla (boot + switch en vivo + recarga), y que el selector muestre exactamente los idiomas
 * del allow-list del engine — la lista se DERIVA de `SUPPORTED_LANGUAGES`, sin hardcodear 5
 * (regla §0 del roadmap: los conteos se recuentan al ejecutar).
 *
 * Corre con el resto: `npm run test:e2e`.
 */

import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../../packages/engine/src/save.js';

/** Ancla de texto por idioma: el botón JUGAR de la pantalla de título y el primer tab. */
const ANCHORS = {
  es: { play: 'Jugar', digTab: 'Escarbar' },
  en: { play: 'Play', digTab: 'Dig' },
  pt: { play: 'Jogar', digTab: 'Escavar' },
  fr: { play: 'Jouer', digTab: 'Fouiller' },
  de: { play: 'Spielen', digTab: 'Wühlen' },
};

/** Entra a la partida desde la pantalla de título, saltando el tutorial si aparece. */
async function enterGame(page) {
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#title-play-btn').click();
  const skip = page.locator('[data-action="skip-tutorial"]');
  if (await skip.isVisible()) await skip.click();
}

test.describe('Dumpster Empire — idiomas pt/fr/de (ronda 33)', () => {
  // Un bloque por idioma nuevo: el locale del navegador tiene que bastar para bootear en él,
  // sin que el jugador toque nada (resolveInitialLanguage por subtag primario).
  for (const [lang, locale] of [
    ['pt', 'pt-BR'],
    ['fr', 'fr-FR'],
    ['de', 'de-DE'],
  ]) {
    test.describe(`locale ${locale}`, () => {
      test.use({ locale });

      test(`partida nueva en ${locale} bootea en ${lang} y lo persiste`, async ({ page }) => {
        await page.goto('/apps/game/');
        await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
        await expect(page.locator('#title-play-btn')).toHaveText(ANCHORS[lang].play);

        await enterGame(page);
        await expect(page.locator('[data-tab="escarbar"]')).toHaveText(ANCHORS[lang].digTab);
        // Cero residuo español: el copy del tab de Escarbar en español es el canario.
        await expect(page.locator('#tabbar')).not.toContainText(ANCHORS.es.digTab);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);

        const saved = await page.evaluate(() => localStorage.getItem('dumpsterEmpireSave'));
        expect(JSON.parse(saved).language).toBe(lang);
      });
    });
  }

  test('el selector de Ajustes ofrece exactamente los idiomas de SUPPORTED_LANGUAGES', async ({ page }) => {
    await page.goto('/apps/game/');
    await enterGame(page);
    await page.locator('#settings-btn').click();

    const select = page.locator('#tab-content [data-action="set-language"]');
    await expect(select).toBeVisible();
    const values = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
    expect(values).toEqual([...SUPPORTED_LANGUAGES]);
    // Endónimos: ninguna opción puede quedar sin etiqueta legible (bug de "opción vacía").
    const labels = await select.locator('option').evaluateAll((opts) => opts.map((o) => o.textContent.trim()));
    for (const label of labels) expect(label.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('cambiar a alemán y volver a español actualiza en vivo y sobrevive la recarga', async ({ page }) => {
    await page.goto('/apps/game/');
    await enterGame(page);
    // Arranca en español (locale es-ES de playwright.config.js).
    await expect(page.locator('[data-tab="escarbar"]')).toHaveText(ANCHORS.es.digTab);

    await page.locator('#settings-btn').click();
    const select = page.locator('#tab-content [data-action="set-language"]');
    await select.selectOption('de');
    // R-16.4: el guard de SELECT se traga el re-render mientras el elemento sigue enfocado.
    await select.evaluate((el) => el.blur());

    await expect(page.locator('[data-tab="escarbar"]')).toHaveText(ANCHORS.de.digTab);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await page.reload();
    await expect(page.locator('#title-play-btn')).toHaveText(ANCHORS.de.play);
    await page.locator('#title-play-btn').click();
    await expect(page.locator('[data-tab="escarbar"]')).toHaveText(ANCHORS.de.digTab);

    // Ida y vuelta: volver al español restaura el copy original (la data real es el baseline).
    await page.locator('#settings-btn').click();
    const backSelect = page.locator('#tab-content [data-action="set-language"]');
    await backSelect.selectOption('es');
    await backSelect.evaluate((el) => el.blur());
    await expect(page.locator('[data-tab="escarbar"]')).toHaveText(ANCHORS.es.digTab);
  });

  test('la data traducida (contenedores, no solo UI) llega a la Tienda en francés', async ({ page }) => {
    await page.goto('/apps/game/');
    await enterGame(page);
    await page.locator('#settings-btn').click();
    const select = page.locator('#tab-content [data-action="set-language"]');
    await select.selectOption('fr');
    await select.evaluate((el) => el.blur());

    await page.locator('[data-tab="tienda"]').click();
    // `Coût :` sale de fr.js (UI) y `Poubelle de Trottoir` de data-fr.js (overlay de data): si el
    // overlay no se aplicara, el nombre del contenedor seguiría en español y este assert lo caza.
    await expect(page.locator('#tab-content')).toContainText('Coût :');
    await expect(page.locator('#tab-content')).toContainText('Poubelle de Trottoir');
    await expect(page.locator('#tab-content')).not.toContainText('Tacho de Vereda');
  });
});
