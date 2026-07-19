/**
 * Ronda 30 — cobertura y seguridad del registro de imágenes de contenedor.
 *
 * Espejo del test de `objectArt` (ronda 29): la cobertura se DERIVA de containers.json, así que
 * un contenedor nuevo obliga a decidir (ilustrar o encolar en PENDING_IMAGES) y el test falla si
 * no se decidió ninguna de las dos.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONTAINER_IMAGES,
  PENDING_IMAGES,
  CONTAINER_IMAGE_DIR,
  hasContainerImage,
  containerImageSrc,
} from '../src/icons/containerImages.js';
import containers from '../src/data/containers.json' with { type: 'json' };
import dayNight from '../src/data/dayNight.json' with { type: 'json' };

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.join(here, '..');

describe('cobertura derivada de containers.json', () => {
  it('todo contenedor tiene imagen o figura en PENDING_IMAGES: uno nuevo obliga a decidir', () => {
    for (const c of containers) {
      const decided = hasContainerImage(c.id) || PENDING_IMAGES.includes(c.id);
      expect(
        decided,
        `el contenedor "${c.id}" no tiene imagen NI figura en PENDING_IMAGES: hay que decidir`
      ).toBe(true);
    }
  });

  it('ningún id está en CONTAINER_IMAGES y PENDING_IMAGES a la vez (una sola fuente de verdad)', () => {
    for (const id of PENDING_IMAGES) {
      expect(hasContainerImage(id), `"${id}" está en PENDING_IMAGES pero YA tiene imagen`).toBe(false);
    }
  });

  it('PENDING_IMAGES no acumula ids muertos: todos existen en containers.json, sin duplicados', () => {
    const known = new Set(containers.map((c) => c.id));
    for (const id of PENDING_IMAGES) {
      expect(known.has(id), `"${id}" está en PENDING_IMAGES pero no existe en containers.json`).toBe(true);
    }
    expect(new Set(PENDING_IMAGES).size).toBe(PENDING_IMAGES.length);
  });

  it('CONTAINER_IMAGES no referencia contenedores inexistentes', () => {
    const known = new Set(containers.map((c) => c.id));
    for (const id of Object.keys(CONTAINER_IMAGES)) {
      expect(known.has(id), `"${id}" tiene imagen pero no existe en containers.json`).toBe(true);
    }
  });

  it('cada archivo declarado existe realmente en disco (una ruta rota es un 404 en la tarjeta)', () => {
    for (const [id, entry] of Object.entries(CONTAINER_IMAGES)) {
      const files = typeof entry === 'string' ? [entry] : Object.values(entry);
      for (const file of files) {
        const abs = path.join(assetsRoot, CONTAINER_IMAGE_DIR, file);
        expect(existsSync(abs), `falta el asset de "${id}": ${abs}`).toBe(true);
      }
    }
  });
});

describe('containerImageSrc — allow-list, jamás interpolación de un id del save', () => {
  it('devuelve una ruta bajo el directorio de assets para un id conocido', () => {
    const [known] = Object.keys(CONTAINER_IMAGES);
    const src = containerImageSrc(known);
    expect(src).toContain(CONTAINER_IMAGE_DIR);
    expect(src.endsWith('.webp') || src.endsWith('.png')).toBe(true);
  });

  it('devuelve null para cualquier id desconocido u hostil (nunca construye la ruta con el input)', () => {
    const hostile = [
      'noExiste',
      '../../../etc/passwd',
      'tachoVereda/../../secret',
      '"onerror="alert(1)',
      "'><img src=x onerror=alert(1)>",
      'bigbangPlus999',
      '__proto__',
      'constructor',
      'toString',
      '',
      null,
      undefined,
      42,
      {},
      [],
    ];
    for (const id of hostile) {
      expect(containerImageSrc(id), String(id)).toBe(null);
      expect(hasContainerImage(id), String(id)).toBe(false);
    }
  });

  it('ninguna ruta generada contiene caracteres que rompan el atributo src interpolado', () => {
    for (const c of containers) {
      const src = containerImageSrc(c.id);
      if (src === null) continue;
      expect(src).not.toMatch(/["'<>]/);
      expect(src).not.toContain('..');
    }
  });
});

describe('variantes por franja horaria (§4.40): el contenedor de barrio cambia de modelo', () => {
  const VARIANT_ID = 'contenedorBarrio';
  const bandIds = dayNight.timeBands.map((b) => b.id);

  it('contenedorBarrio declara una variante por cada franja de la data', () => {
    const entry = CONTAINER_IMAGES[VARIANT_ID];
    expect(typeof entry, 'contenedorBarrio debe mapear franja -> archivo').toBe('object');
    expect(Object.keys(entry).sort()).toEqual([...bandIds].sort());
  });

  it('cada franja da un archivo DISTINTO (si dos coinciden, el cambio horario es invisible)', () => {
    const files = Object.values(CONTAINER_IMAGES[VARIANT_ID]);
    expect(new Set(files).size).toBe(files.length);
  });

  it('la franja elige la variante; una franja desconocida cae en un default estable', () => {
    const entry = CONTAINER_IMAGES[VARIANT_ID];
    for (const band of bandIds) {
      expect(containerImageSrc(VARIANT_ID, band)).toContain(entry[band]);
    }
    const fallback = containerImageSrc(VARIANT_ID, 'franjaInventada');
    expect(fallback).not.toBe(null);
    expect(containerImageSrc(VARIANT_ID, undefined)).toBe(fallback);
    expect(containerImageSrc(VARIANT_ID, null)).toBe(fallback);
  });

  it('un contenedor de imagen única ignora la franja (misma ruta en las 5)', () => {
    const single = Object.entries(CONTAINER_IMAGES).find(([, v]) => typeof v === 'string');
    expect(single, 'debería haber al menos un contenedor de imagen única').toBeTruthy();
    const [id] = single;
    const srcs = new Set(bandIds.map((b) => containerImageSrc(id, b)));
    expect(srcs.size).toBe(1);
  });
});
