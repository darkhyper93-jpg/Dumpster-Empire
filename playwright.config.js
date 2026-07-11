// Config de Playwright para el smoke test e2e de apps/game (Fase 2). Separado a propósito de
// Vitest (npm test): esto abre un Chromium real contra el juego servido por HTTP; Vitest sigue
// siendo la suite rápida sin browser para packages/engine. Ver DESARROLLO.md §3/§9.
import { defineConfig, devices } from '@playwright/test';

const PORT = 5185;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './apps/game/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  outputDir: './apps/game/e2e/.results',
  use: {
    baseURL: BASE_URL,
    // Ronda 16 (R-16.1): Chromium reporta 'en-US' por defecto y la detección de idioma en
    // partida nueva (resolveInitialLanguage) bootearía TODO e2e en inglés — los specs
    // existentes asertan copy español. Los tests de i18n lo pisan con test.use({ locale }).
    locale: 'es-ES',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx serve . -l ${PORT}`,
    url: `${BASE_URL}/apps/game/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
