/**
 * Coherencia de los identificadores de Steam repartidos entre el runtime y los VDF de SteamPipe
 * (auditoría 2026-07-22).
 *
 * `tools/steam/RELEASE.md` §2 documenta que el `480` (Spacewar) es un placeholder en CUATRO
 * lugares, y que el reemplazo del día del release NO es un search-and-replace: dos pasan a ser el
 * **appId** y dos el **depotId de Windows**. Hoy los cuatro dicen 480 porque el placeholder cubre
 * los dos roles, y eso es exactamente lo que esconde el error caro: reemplazar unos y olvidarse de
 * otros, o conflacionar los dos roles. Los síntomas llegan tarde y mal (el build sube al depot
 * equivocado; los logros y Steam Cloud escriben contra otro appId y fallan en SILENCIO, porque
 * `setAchievement`/`writeCloudSave` devuelven `false` sin ruido).
 *
 * Este test NO exige un valor concreto y NO bloquea el appId de prueba: la Fase 10 de
 * DESARROLLO.md declara como salida "builds instalables; logros y cloud saves contra el appId de
 * prueba", así que 480 es el estado intencional de la fase. Solo fija la COHERENCIA INTERNA entre
 * los cuatro lugares, que es lo que la tabla de RELEASE.md pide a mano.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const steamDir = path.join(here, '..', '..', '..', 'tools', 'steam');

const { STEAM_APP_ID } = require('../steam.js');
const appBuildVdf = readFileSync(path.join(steamDir, 'app_build.vdf'), 'utf8');
const depotBuildVdf = readFileSync(path.join(steamDir, 'depot_build.vdf'), 'utf8');

/** `"Clave" "valor"` de un VDF, ignorando el tabulado y los comentarios `//` de la línea. */
function vdfValue(text, key) {
  const match = text.match(new RegExp(`"${key}"\\s+"(\\d+)"`));
  return match ? Number(match[1]) : null;
}

/** Primera clave del bloque `"Depots" { "<depotId>" "depot_build.vdf" }`. */
function depotKeyInAppBuild(text) {
  const match = text.match(/"Depots"\s*\{\s*"(\d+)"/);
  return match ? Number(match[1]) : null;
}

describe('identificadores de Steam — coherencia entre runtime y SteamPipe (RELEASE.md §2)', () => {
  it('los cuatro identificadores se pueden leer de sus archivos', () => {
    expect(STEAM_APP_ID).toBeTypeOf('number');
    expect(vdfValue(appBuildVdf, 'AppID')).not.toBeNull();
    expect(depotKeyInAppBuild(appBuildVdf)).not.toBeNull();
    expect(vdfValue(depotBuildVdf, 'DepotID')).not.toBeNull();
  });

  it('clase appId: el runtime y el build de SteamPipe usan el MISMO appId', () => {
    // steam.js:12 (logros + Cloud) y app_build.vdf "AppID" son los dos que pasan a ser el appId
    // real. Si divergen, el build sube a una app y el juego reporta logros a otra.
    expect(vdfValue(appBuildVdf, 'AppID')).toBe(STEAM_APP_ID);
  });

  it('clase depotId: el depot listado en el build es el MISMO que el del contenido', () => {
    // app_build.vdf "Depots" y depot_build.vdf "DepotID" son los dos que pasan a ser el depotId
    // de Windows. Si divergen, steamcmd sube contenido a un depot que el build no incluye.
    expect(depotKeyInAppBuild(appBuildVdf)).toBe(vdfValue(depotBuildVdf, 'DepotID'));
  });

  it('el depot de contenido apunta a la salida real de electron-builder', () => {
    // Si electron-builder cambia de carpeta de salida, el depot sube vacío sin avisar.
    expect(depotBuildVdf).toContain('dist\\win-unpacked\\*');
  });
});
