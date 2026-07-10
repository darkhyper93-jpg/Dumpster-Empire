import { describe, it, expect } from 'vitest';
import { setLanguage, getLanguage, t } from '../src/i18n/i18n.js';
import es from '../src/i18n/es.js';
import en from '../src/i18n/en.js';

describe('i18n (ronda 14, Agente D) — bases sin selector visible todavía', () => {
  it('es.js y en.js tienen exactamente el mismo conjunto de claves', () => {
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();
    const onlyInEs = esKeys.filter((k) => !enKeys.includes(k));
    const onlyInEn = enKeys.filter((k) => !esKeys.includes(k));
    expect(onlyInEs, 'claves en es.js que faltan en en.js').toEqual([]);
    expect(onlyInEn, 'claves en en.js que faltan en es.js').toEqual([]);
    expect(esKeys.length).toBeGreaterThan(0);
  });

  it('t() interpola parámetros por nombre', () => {
    setLanguage('es');
    expect(t('settings.volume', { pct: 80 })).toBe('Volumen: 80%');
  });

  it('t() con una clave inexistente devuelve la clave tal cual', () => {
    setLanguage('es');
    expect(t('esto.no.existe')).toBe('esto.no.existe');
  });

  it('setLanguage rechaza un idioma no soportado y no cambia el actual', () => {
    setLanguage('es');
    setLanguage('hack');
    expect(getLanguage()).toBe('es');

    setLanguage('en');
    setLanguage('<img src=x>');
    expect(getLanguage()).toBe('en');
    setLanguage('es');
  });

  it('en.js tiene las mismas claves que es.js (paridad, valores copiados a propósito)', () => {
    setLanguage('en');
    expect(t('titleScreen.play')).toBe(en['titleScreen.play']);
    setLanguage('es');
  });
});
