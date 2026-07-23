import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

  // AUDITORÍA (2026-07-22): el único script inline del juego (el import map) se autoriza por
  // hash sha256, así que `script-src` puede quedarse sin 'unsafe-inline'. El costo es que el
  // hash y el import map quedan acoplados a mano: index.html avisa "si cambia el contenido del
  // import map, recalcular el hash [...] o el juego no cargará", y hasta acá nada lo verificaba.
  // Editar una coma del import map shippeaba un juego que solo muestra "Cargando…" para siempre
  // (el bloqueo es de la CSP, así que no hay excepción ni pantalla de error del bootGuard), y el
  // único que lo detectaba era el e2e completo. Esto lo ataja en unit, en milisegundos.
  it('el hash sha256 declarado corresponde al import map inline', () => {
    const match = indexHtml.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const hash = createHash('sha256').update(match[1], 'utf8').digest('base64');
    expect(csp).toContain(`'sha256-${hash}'`);
  });
});
