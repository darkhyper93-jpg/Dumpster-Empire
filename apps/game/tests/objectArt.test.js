import { describe, it, expect } from 'vitest';
import {
  ART,
  BODIES,
  MATERIALS,
  PENDING_ART,
  composeObjectArt,
  getObjectArtMarkup,
  getObjectImage,
  hasObjectArt,
  getObjectScale,
  clampArtScale,
  artRotationFor,
  paletteFrom,
  ART_ROTATION_MAX_DEG,
} from '../src/icons/objectArt.js';
import items from '../src/data/items.json';
import legendaries from '../src/data/legendaries.json';
import tools from '../src/data/tools.json';

/**
 * Sanity de buena-formación XML sin dependencias (Node no tiene DOMParser): parser de pila
 * sobre tags. Alcanza para cazar el bug real de esta clase (SVG que abre y no cierra, o
 * atributos sin comillas que rompen el documento standalone del data-URL).
 * @param {string} xml
 * @returns {{ ok: boolean, error?: string }}
 */
function xmlWellFormed(xml) {
  const stack = [];
  const tagRe = /<\/?([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g;
  let cursor = 0;
  let match;
  while ((match = tagRe.exec(xml)) !== null) {
    const between = xml.slice(cursor, match.index);
    if (between.includes('<') || between.includes('>')) {
      return { ok: false, error: `markup suelto no parseable cerca de: ${between.slice(0, 60)}` };
    }
    cursor = tagRe.lastIndex;
    const [full, name, , selfClose] = match;
    if (full.startsWith('</')) {
      const open = stack.pop();
      if (open !== name) return { ok: false, error: `cierre </${name}> no matchea <${open}>` };
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  const tail = xml.slice(cursor);
  if (tail.includes('<') || tail.includes('>')) {
    return { ok: false, error: `markup suelto al final: ${tail.slice(0, 60)}` };
  }
  if (stack.length > 0) return { ok: false, error: `tags sin cerrar: ${stack.join(',')}` };
  return { ok: true };
}

/** Ids de ícono de la data que la ronda 29 cubre con arte (derivados, cero conteos hardcodeados). */
function dataArtKeys() {
  const keys = new Set();
  for (const pool of Object.values(items.containers)) {
    for (const item of pool) keys.add(item.icon);
  }
  for (const legend of legendaries.items) keys.add(legend.icon);
  return keys;
}

describe('objectArt — sistema de objetos ilustrados (ronda 29.A, PLAN.md §5.5)', () => {
  it('cobertura derivada de la data: todo icon id de items.json + legendaries.json tiene arte o está en PENDING_ART', () => {
    const keys = dataArtKeys();
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      const covered = hasObjectArt(key) || PENDING_ART.includes(key);
      expect(covered, `el ítem "${key}" no tiene arte NI figura en PENDING_ART: hay que decidir`).toBe(true);
    }
  });

  it('ningún id figura en ART y PENDING_ART a la vez (una sola fuente de verdad por ítem)', () => {
    for (const key of PENDING_ART) {
      expect(hasObjectArt(key), `"${key}" está en PENDING_ART pero YA tiene arte: quitarlo de la lista`).toBe(false);
    }
  });

  it('PENDING_ART no acumula ids muertos: todos existen en items/legendaries/tools y sin duplicados', () => {
    const known = dataArtKeys();
    for (const tool of tools) known.add(tool.icon);
    for (const key of PENDING_ART) {
      expect(known.has(key), `"${key}" en PENDING_ART no existe en la data (¿typo o ítem eliminado?)`).toBe(true);
    }
    expect(new Set(PENDING_ART).size).toBe(PENDING_ART.length);
  });

  it('todo body × material compone un SVG con xmlns y bien formado (contrato del vocabulario de partes)', () => {
    const palette = paletteFrom('#8a96a8');
    const bodyIds = Object.keys(BODIES);
    const materialIds = Object.keys(MATERIALS);
    expect(bodyIds.length).toBeGreaterThan(0);
    expect(materialIds.length).toBeGreaterThan(0);
    for (const body of bodyIds) {
      for (const material of materialIds) {
        const svg = composeObjectArt(
          { body, material, palette, details: ['<circle cx="48" cy="48" r="4" fill="#000" opacity="0.2"/>'], scale: 1 },
          { size: 128, uid: `test-${body}-${material}` }
        );
        expect(svg, `composición ${body}+${material} devolvió vacío`).toBeTruthy();
        expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(svg).toContain('viewBox="0 0 96 96"');
        const parsed = xmlWellFormed(svg);
        expect(parsed.ok, `SVG mal formado (${body}+${material}): ${parsed.error}`).toBe(true);
      }
    }
  });

  it('toda composición registrada en ART compone con xmlns y bien formada (cubre gratis las tandas de B y C)', () => {
    for (const [key, def] of Object.entries(ART)) {
      const svg = getObjectArtMarkup(key, { size: 128 });
      expect(svg, `ART["${key}"] no compuso`).toBeTruthy();
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      const parsed = xmlWellFormed(svg);
      expect(parsed.ok, `ART["${key}"] mal formado: ${parsed.error}`).toBe(true);
      expect(BODIES[def.body], `ART["${key}"] usa un body inexistente "${def.body}"`).toBeDefined();
      if (def.material) {
        expect(MATERIALS[def.material], `ART["${key}"] usa un material inexistente "${def.material}"`).toBeDefined();
      }
    }
  });

  it('artKey desconocido: markup/imagen devuelven null limpio (activa el fallback del canvas)', () => {
    expect(getObjectArtMarkup('clave-inventada-que-no-existe')).toBeNull();
    expect(getObjectImage('clave-inventada-que-no-existe')).toBeNull();
    expect(hasObjectArt('clave-inventada-que-no-existe')).toBe(false);
  });

  it('rotación determinística por posición: misma posición → mismo ángulo, y siempre dentro de ±15°', () => {
    const maxRad = (ART_ROTATION_MAX_DEG * Math.PI) / 180;
    const samples = [
      [40, 40],
      [123.4, 250.9],
      [300, 165],
      [580, 40],
      [37, 300],
    ];
    for (const [x, y] of samples) {
      const a = artRotationFor(x, y);
      const b = artRotationFor(x, y);
      expect(a).toBe(b);
      expect(Math.abs(a)).toBeLessThanOrEqual(maxRad);
    }
    // Dos posiciones distintas no comparten ángulo (si no, la "rotación leve" sería un sesgo fijo).
    expect(artRotationFor(40, 40)).not.toBe(artRotationFor(300, 165));
  });

  it('escala natural: clampeada al rango 0.7-1.4 de PLAN.md §5.5; sin arte, escala neutra 1', () => {
    expect(clampArtScale(0.1)).toBe(0.7);
    expect(clampArtScale(9)).toBe(1.4);
    expect(clampArtScale(1.15)).toBe(1.15);
    expect(clampArtScale(NaN)).toBe(1);
    expect(clampArtScale(undefined)).toBe(1);
    expect(getObjectScale('clave-inventada-que-no-existe')).toBe(1);
  });

  it('paletteFrom deriva una paleta completa y determinística de un solo color base', () => {
    const p = paletteFrom('#ffb627');
    for (const slot of ['base', 'light', 'dark', 'deep', 'accent']) {
      expect(p[slot], `falta el slot "${slot}" de la paleta`).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(paletteFrom('#ffb627')).toEqual(p);
    expect(p.light).not.toBe(p.dark);
  });
});
