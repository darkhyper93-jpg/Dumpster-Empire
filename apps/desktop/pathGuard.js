/**
 * Guard de path traversal para el protocolo `dumpster://` (ver main.js).
 * Aislado en su propio módulo para poder cubrirlo con tests sin arrancar el runtime de Electron.
 */
const path = require('node:path');

/**
 * Resuelve `decodedPath` (el pathname ya decodificado de una URL `dumpster://`) dentro de
 * `rootDir`, garantizando que el resultado no escape de la raíz permitida —ni por `../` ni por
 * un directorio hermano con nombre-prefijo (p.ej. `<root>-secrets`), que un simple
 * `startsWith(rootDir)` dejaba pasar—.
 * @param {string} rootDir - raíz absoluta permitida
 * @param {string} decodedPath - pathname ya decodificado de la URL
 * @returns {string|null} ruta absoluta segura, o `null` si cae fuera de `rootDir`
 */
function resolveSafePath(rootDir, decodedPath) {
  const filePath = path.normalize(path.join(rootDir, decodedPath));
  const relative = path.relative(rootDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return filePath;
}

module.exports = { resolveSafePath };
