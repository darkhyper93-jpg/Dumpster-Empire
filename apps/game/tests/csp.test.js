import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(path.join(here, '..', 'index.html'), 'utf8');

// Extrae el atributo content de la meta CSP (si existe). El content va entre comillas dobles pero
// contiene comillas simples ('self', 'none'): se captura la comilla delimitadora y se lee hasta ella.
function cspContent(html) {
  const match = html.match(
    /http-equiv=["']Content-Security-Policy["'][\s\S]*?content=(["'])([\s\S]*?)\1/i
  );
  return match ? match[2] : null;
}

describe('index.html — Content-Security-Policy (auditoría §M3)', () => {
  const csp = cspContent(indexHtml);

  it('declara una meta CSP', () => {
    expect(csp).not.toBeNull();
  });

  it('restringe scripts a self (sin unsafe-inline ni unsafe-eval en script-src)', () => {
    expect(csp).toMatch(/script-src\s+'self'/);
    // La protección real: nada de scripts inline/externos inyectables.
    const scriptSrc = csp.match(/script-src([^;]*)/)[1];
    expect(scriptSrc).not.toMatch(/unsafe-inline/);
    expect(scriptSrc).not.toMatch(/unsafe-eval/);
  });

  it('permite data: en img-src (íconos SVG rasterizados de icons.js)', () => {
    expect(csp).toMatch(/img-src[^;]*data:/);
  });

  it('bloquea object-src y base-uri por defecto', () => {
    expect(csp).toMatch(/object-src\s+'none'/);
    expect(csp).toMatch(/base-uri\s+'none'/);
  });
});
