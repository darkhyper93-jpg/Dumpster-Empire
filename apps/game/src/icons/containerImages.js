/**
 * Registro de IMÁGENES REALES de contenedor (ronda 30, PLAN.md §5.6).
 *
 * Hermano de `icons.js` (SVG vectorial) y de `objectArt.js` (ilustración compuesta del canvas),
 * con un contrato propio: acá los assets son ARCHIVOS de mapa de bits servidos localmente
 * (`img-src 'self'` — la CSP de index.html NO se toca, regla dura 7).
 *
 * Reglas del módulo:
 *
 * 1. **Allow-list estricta.** `containerImageSrc` resuelve SOLO contra las claves propias de
 *    `CONTAINER_IMAGES`; un id que no está devuelve `null`. La ruta NUNCA se construye
 *    concatenando el input, así que un id hostil venido de un save manipulado
 *    (`../../x`, `"onerror=`, `__proto__`) no puede salir interpolado en un `src`.
 * 2. **Fallback total.** `null` significa "usá el ícono SVG de siempre": un contenedor sin
 *    imagen (PENDING_IMAGES) o con el archivo roto jamás rompe la tarjeta.
 * 3. **Cobertura derivada de la data.** `tests/containerImages.test.js` exige que todo id de
 *    containers.json esté acá o en `PENDING_IMAGES`: un contenedor nuevo obliga a decidir.
 *
 * Formato: WebP. DECISIÓN (ronda 30): los originales que entregó el usuario son PNG de ~1620px
 * de ancho y 0.5-3.7 MB cada uno (más de 40 MB en total) — inviable para el build de Steam
 * (R30.1). El pipeline los baja a 768px de ancho y los recodifica a WebP: **~1.3 MB para los 24
 * archivos**, sin artefactos visibles a tamaño de tarjeta. Chromium (navegador y Electron)
 * soporta WebP nativo, así que no hace falta ni polyfill ni doble formato. Los PNG originales
 * viven en `reference/ui/Contenedores/` como fuente y NO están versionados (regla dura 1).
 */

/** Directorio de los assets, relativo a `apps/game/` (raíz que sirve index.html). */
export const CONTAINER_IMAGE_DIR = 'assets/containers';

/**
 * Mapa `containerId` → archivo, o `containerId` → `{ franjaHoraria: archivo }` cuando el
 * contenedor tiene modelos por hora (§4.41).
 *
 * El orden de la serie que entregó el usuario es por TIER (el arte escala en riqueza con el
 * costo), no por la fantasía del nombre: `contenedor 0..15` son la cadena completa,
 * `contenedor16` (gemas) fue a `bovedaContrarreloj` y `contenedor17` a `sotanoSinLuz`. Los
 * `contenedor18/19` no mapean a nada previo: son los DOS CONTENEDORES NUEVOS de la ronda 30.B
 * (§4.40). Mapeo confirmado por el usuario el 2026-07-19.
 *
 * @type {Record<string, string | Record<string, string>>}
 */
export const CONTAINER_IMAGES = {
  tachoVereda: 'tachoVereda.webp',
  // Único con modelos por franja: los 5 archivos son el mismo contenedor pintado de otro color
  // (azul / verde / amarillo / rosa / rojo). Ver §4.41 y `getTimeBand` en el engine.
  contenedorBarrio: {
    madrugada: 'contenedorBarrio-madrugada.webp',
    manana: 'contenedorBarrio-manana.webp',
    tarde: 'contenedorBarrio-tarde.webp',
    atardecer: 'contenedorBarrio-atardecer.webp',
    noche: 'contenedorBarrio-noche.webp',
  },
  containerIndustrial: 'containerIndustrial.webp',
  depositoAbandonado: 'depositoAbandonado.webp',
  mudanzaMansion: 'mudanzaMansion.webp',
  galeriaLiquidacion: 'galeriaLiquidacion.webp',
  bovedaPerdida: 'bovedaPerdida.webp',
  containerExtradimensional: 'containerExtradimensional.webp',
  convoyFantasma: 'convoyFantasma.webp',
  criptaColeccionista: 'criptaColeccionista.webp',
  estacionOrbital: 'estacionOrbital.webp',
  vertederoDivino: 'vertederoDivino.webp',
  chatarreriaTitanes: 'chatarreriaTitanes.webp',
  naufragioTemporal: 'naufragioTemporal.webp',
  archivoMultiverso: 'archivoMultiverso.webp',
  vertederoBigBang: 'vertederoBigBang.webp',
  bovedaContrarreloj: 'bovedaContrarreloj.webp',
  sotanoSinLuz: 'sotanoSinLuz.webp',
  // Especiales nuevos de la ronda 30.B (contenedor18/19 del lote del usuario).
  reactorDeCuasar: 'reactorDeCuasar.webp',
  horizonteDeSucesos: 'horizonteDeSucesos.webp',
};

/**
 * Contenedores que TODAVÍA no tienen imagen y usan el ícono SVG. El test de cobertura exige
 * que todo id de containers.json esté acá o en `CONTAINER_IMAGES`.
 *
 * VACÍA desde la ronda 30.B: el usuario cerró el catálogo con `contenedor17` (que fue a
 * `sotanoSinLuz`) y sumó dos contenedores nuevos con su arte. La lista se mantiene exportada a
 * propósito: un contenedor NUEVO tiene que entrar acá o en `CONTAINER_IMAGES`, y el test de
 * cobertura falla si no se decidió ninguna de las dos.
 */
export const PENDING_IMAGES = [];

/**
 * Franja usada cuando la que llega no existe en el mapa del contenedor (o no llega ninguna).
 * Que sea una constante y no "la primera clave" hace el fallback estable ante un reordenamiento
 * del objeto de arriba.
 */
const DEFAULT_BAND = 'tarde';

/**
 * @param {unknown} containerId
 * @returns {boolean} true si el id tiene imagen declarada (allow-list).
 */
export function hasContainerImage(containerId) {
  return typeof containerId === 'string' && Object.hasOwn(CONTAINER_IMAGES, containerId);
}

/**
 * Resuelve la ruta del asset de un contenedor.
 *
 * @param {unknown} containerId - id de containers.json. Cualquier otra cosa devuelve `null`.
 * @param {string|null} [band] - franja horaria (`getTimeBand`); se ignora si el contenedor no
 *   tiene variantes, y cae en `DEFAULT_BAND` si no la conoce.
 * @returns {string|null} ruta relativa lista para un `src`, o `null` si hay que usar el SVG.
 */
export function containerImageSrc(containerId, band) {
  if (!hasContainerImage(containerId)) return null;
  const entry = CONTAINER_IMAGES[containerId];
  if (typeof entry === 'string') return `${CONTAINER_IMAGE_DIR}/${entry}`;
  const file =
    (typeof band === 'string' && Object.hasOwn(entry, band) && entry[band]) || entry[DEFAULT_BAND];
  return `${CONTAINER_IMAGE_DIR}/${file}`;
}
