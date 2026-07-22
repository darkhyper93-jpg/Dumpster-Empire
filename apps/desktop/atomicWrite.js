/**
 * Escritura atómica de archivos (auditoría de release). Aislado en su propio módulo, sin
 * dependencias de Electron, para poder cubrirlo con tests (mismo patrón que pathGuard.js /
 * saveTimestamp.js). Lo usa saveFile.js para el guardado a `userData`.
 */
const fs = require('node:fs');
const path = require('node:path');

/**
 * Escribe `text` en `filePath` de forma atómica: primero a un temporal hermano y luego `rename`
 * (atómico dentro del mismo volumen). Un corte de energía o un force-quit a mitad de escritura
 * deja el `.tmp` a medias pero NUNCA trunca el archivo bueno — el `rename` solo publica un
 * contenido ya completo. Antes se hacía `writeFileSync` directo sobre el save real, así que una
 * interrupción lo dejaba truncado (y en un idle de Steam, el archivo ES la partida).
 * @param {string} filePath - ruta absoluta del archivo destino
 * @param {string} text - contenido a escribir
 * @returns {boolean} true si se escribió y publicó correctamente; false ante cualquier error.
 */
function writeFileAtomic(filePath, text) {
  const dir = path.dirname(filePath);
  // El `.pid` evita que dos escrituras concurrentes (varias ventanas/procesos apuntando al mismo
  // userData) pisen el temporal una de otra antes del rename.
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, text, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch {
    // Limpieza best-effort del temporal si quedó a medias; nunca propaga el error (el guardado es
    // fire-and-forget, no debe reventar la acción del jugador que lo disparó).
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {
      // Nada que hacer si ni el temporal se puede borrar.
    }
    return false;
  }
}

module.exports = { writeFileAtomic };
