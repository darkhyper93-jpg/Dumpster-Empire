/**
 * Auditoría de release (🟡): el guardado a `userData` usaba `fs.writeFileSync` directo sobre
 * `save.json`. Un corte de luz o un force-quit de Steam a mitad de escritura truncaba el save —
 * en un idle de Steam el archivo ES la partida. Extraído a su módulo (patrón pathGuard.js/
 * saveTimestamp.js: lógica pura, testeable sin el runtime de Electron).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeFileAtomic } from '../atomicWrite.js';

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dumpster-atomic-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeFileAtomic', () => {
  it('escribe el contenido exacto en el archivo destino', () => {
    const target = path.join(dir, 'save.json');
    expect(writeFileAtomic(target, '{"a":1}')).toBe(true);
    expect(fs.readFileSync(target, 'utf-8')).toBe('{"a":1}');
  });

  it('NO deja ningún archivo temporal huérfano tras una escritura exitosa', () => {
    const target = path.join(dir, 'save.json');
    writeFileAtomic(target, 'hola');
    // Solo el destino debe quedar en el directorio — el .tmp se renombró, no quedó suelto.
    expect(fs.readdirSync(dir)).toEqual(['save.json']);
  });

  it('reemplaza por completo un archivo previo más largo (sin dejar cola del anterior)', () => {
    // Justamente lo que un write no-atómico truncado a mitad podría dejar: cola del contenido viejo.
    const target = path.join(dir, 'save.json');
    writeFileAtomic(target, 'AAAAAAAAAAAAAAAAAAAA');
    writeFileAtomic(target, 'BBB');
    expect(fs.readFileSync(target, 'utf-8')).toBe('BBB');
  });

  it('crea el directorio destino si no existe', () => {
    const target = path.join(dir, 'nested', 'deep', 'save.json');
    expect(writeFileAtomic(target, 'x')).toBe(true);
    expect(fs.readFileSync(target, 'utf-8')).toBe('x');
  });

  it('devuelve false (sin lanzar) si el destino es imposible de escribir', () => {
    // Un path cuyo "directorio" es en realidad un archivo existente: mkdir/rename fallan.
    const clash = path.join(dir, 'clash');
    fs.writeFileSync(clash, 'soy un archivo');
    expect(writeFileAtomic(path.join(clash, 'save.json'), 'x')).toBe(false);
  });
});
