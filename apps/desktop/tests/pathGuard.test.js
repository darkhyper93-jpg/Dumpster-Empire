import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createRequire } from 'node:module';

// pathGuard.js es CommonJS (apps/desktop es "type": "commonjs"); se carga con require.
const require = createRequire(import.meta.url);
const { resolveSafePath } = require('../pathGuard.js');

const ROOT = path.resolve('/srv', 'dumpster', 'app');

describe('resolveSafePath — guard de path traversal del protocolo dumpster:// (auditoría §M2)', () => {
  it('permite un archivo legítimo dentro de la raíz', () => {
    const result = resolveSafePath(ROOT, '/apps/game/index.html');
    expect(result).toBe(path.join(ROOT, 'apps', 'game', 'index.html'));
  });

  it('permite la propia raíz', () => {
    const result = resolveSafePath(ROOT, '/');
    expect(result).not.toBeNull();
    // path.join('/') puede dejar separador final; lo que importa es que resuelve a la raíz.
    expect(path.resolve(result)).toBe(ROOT);
  });

  it('rechaza escape por ../', () => {
    expect(resolveSafePath(ROOT, '/../secreto.txt')).toBeNull();
  });

  it('rechaza escape profundo por múltiples ../', () => {
    expect(resolveSafePath(ROOT, '/../../../etc/passwd')).toBeNull();
  });

  it('rechaza un directorio hermano con nombre-prefijo (el bug que startsWith dejaba pasar)', () => {
    // '/srv/dumpster/app-secrets/x' comparte prefijo con ROOT: startsWith(ROOT) daba true.
    expect(resolveSafePath(ROOT, '/../app-secrets/x')).toBeNull();
  });

  it('rechaza una ruta absoluta que resuelve fuera de la raíz', () => {
    // path.join ignora el join si el segundo arg no es absoluto; forzamos salida vía ../
    const escaped = resolveSafePath(ROOT, '/..' + path.sep + '..' + path.sep + 'otra-raiz');
    expect(escaped).toBeNull();
  });
});
