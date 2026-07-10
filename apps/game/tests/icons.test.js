import { describe, it, expect } from 'vitest';
import { hasIcon, iconMarkup, SHAPES, ICON_MAP } from '../src/icons/icons.js';
import items from '../src/data/items.json';
import containers from '../src/data/containers.json';
import automations from '../src/data/automations.json';
import upgrades from '../src/data/upgrades.json';
import prestigeTree from '../src/data/prestigeTree.json';
import achievements from '../src/data/achievements.json';

describe('icons — cero pentágono de fallback en la data real (ronda 14)', () => {
  it('todo ítem de items.json tiene un ícono dedicado', () => {
    const keys = Object.values(items.containers)
      .flat()
      .map((entry) => entry.icon);
    for (const key of keys) {
      expect(hasIcon(key), `falta ícono para item "${key}"`).toBe(true);
    }
    expect(keys.length).toBeGreaterThan(0);
  });

  it('todo contenedor de containers.json tiene un ícono dedicado', () => {
    for (const c of containers) {
      expect(hasIcon(c.icon), `falta ícono para contenedor "${c.icon}"`).toBe(true);
    }
  });

  it('toda automatización de automations.json tiene un ícono dedicado', () => {
    for (const a of automations) {
      expect(hasIcon(a.icon), `falta ícono para automatización "${a.icon}"`).toBe(true);
    }
  });

  it('toda mejora de upgrades.json tiene un ícono dedicado', () => {
    for (const u of upgrades) {
      expect(hasIcon(u.icon), `falta ícono para mejora "${u.icon}"`).toBe(true);
    }
  });

  it('todo nodo de prestigeTree.json tiene un ícono dedicado', () => {
    for (const n of prestigeTree) {
      expect(hasIcon(n.icon), `falta ícono para nodo de prestigio "${n.icon}"`).toBe(true);
    }
  });

  it('todo logro de achievements.json tiene un ícono dedicado', () => {
    for (const a of achievements) {
      expect(hasIcon(a.icon), `falta ícono para logro "${a.icon}"`).toBe(true);
    }
  });

  it('regresión: una clave nueva sin mapear cae en el fallback "artifact" (detectable)', () => {
    expect(hasIcon('clave-inventada-que-no-existe')).toBe(false);
    expect(iconMarkup('clave-inventada-que-no-existe')).toContain('data-icon="clave-inventada-que-no-existe"');
  });

  it('todo valor de ICON_MAP existe como clave de SHAPES', () => {
    for (const [key, shapeId] of Object.entries(ICON_MAP)) {
      expect(SHAPES[shapeId], `ICON_MAP["${key}"] apunta a una forma inexistente "${shapeId}"`).toBeDefined();
    }
  });

  it('iconMarkup incluye xmlns (regresión: sin esto, getIconImage falla en silencio en el canvas)', () => {
    const svg = iconMarkup('coin');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});
