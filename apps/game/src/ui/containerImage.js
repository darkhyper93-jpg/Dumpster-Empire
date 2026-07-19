/**
 * Helper de presentación para las imágenes reales de contenedor (ronda 30).
 *
 * Emite el markup del banner y bindea su FALLBACK. Dos decisiones que conviene no perder:
 *
 * 1. **El fallback se bindea con `addEventListener`, no con `onerror=` inline.** El roadmap
 *    (30.2.1) sugería el atributo inline, pero la CSP de index.html es `script-src 'self'` +
 *    hash, sin `unsafe-inline`: un `onerror="..."` quedaría BLOQUEADO y el fallback no
 *    correría justo cuando más se lo necesita. La CSP no se toca (regla dura 7), así que el
 *    handler va por JS.
 *
 * 2. **La tarjeta trae SIEMPRE el ícono SVG de siempre**, oculto por CSS mientras el banner
 *    esté; si la imagen falla, se quita el banner y la clase, y el ícono reaparece solo. No
 *    hay estado que sincronizar ni una tarjeta que pueda quedar vacía.
 */

import { containerImageSrc } from '../icons/containerImages.js';

/** Relación de aspecto real de los assets (768×461): fija el alto por CSS y evita layout shift. */
const BANNER_W = 768;
const BANNER_H = 461;

/**
 * Markup del banner de un contenedor, o `''` si no tiene imagen (la tarjeta usa su ícono SVG).
 *
 * `containerImageSrc` resuelve contra una allow-list, así que `src` nunca contiene nada
 * derivado del id crudo de un save (napkin, clase XSS). `alt=""` porque el nombre del
 * contenedor ya está en el `<h3>` de al lado: para un lector de pantalla la imagen es decorativa.
 *
 * @param {string} containerId
 * @param {string|null} band - franja horaria actual (`getTimeBand`)
 * @param {string} [extraClass] - modificador de la vista que lo usa
 * @returns {string}
 */
export function containerBannerMarkup(containerId, band, extraClass = '') {
  const src = containerImageSrc(containerId, band);
  if (!src) return '';
  const cls = extraClass ? `container-banner ${extraClass}` : 'container-banner';
  // `loading="lazy"` no es cosmético acá: la Tienda tiene ~19 tarjetas y las pestañas inactivas
  // viven en el DOM (display:none), así que sin lazy el arranque se comía ~19 descargas de golpe
  // — medido en los e2e: duplicaba el tiempo de carga de la página. Con lazy, una pestaña oculta
  // no pide NADA y la visible solo lo que está cerca del viewport. `decoding="async"` evita
  // además que la decodificación bloquee el hilo principal durante el escarbado.
  return (
    `<img class="${cls}" src="${src}" alt="" width="${BANNER_W}" height="${BANNER_H}" ` +
    `loading="lazy" decoding="async" data-container-banner="${containerId}">`
  );
}

/**
 * Bindea el fallback de todos los banners de un subárbol recién renderizado. Idempotente por
 * elemento (`dataset.fallbackBound`), así que llamarlo tras cada render no apila listeners.
 *
 * @param {HTMLElement} root - contenedor sobre el que se acaba de escribir innerHTML
 * @param {string} hasBannerClass - clase que oculta el ícono SVG mientras hay banner
 */
export function bindContainerBannerFallback(root, hasBannerClass) {
  for (const img of root.querySelectorAll('[data-container-banner]')) {
    if (img.dataset.fallbackBound) continue;
    img.dataset.fallbackBound = 'true';
    const drop = () => {
      // Quitar la clase ANTES de sacar el nodo: el ícono SVG ya está en el DOM y solo estaba
      // oculto, así que la tarjeta nunca pasa por un frame sin nada que mostrar.
      img.closest(`.${hasBannerClass}`)?.classList.remove(hasBannerClass);
      img.remove();
    };
    img.addEventListener('error', drop, { once: true });
    // Una imagen que YA falló (cache negativa) puede no volver a emitir `error` nunca: si al
    // bindear está completa y sin píxeles, el fallback se aplica en el acto.
    if (img.complete && img.naturalWidth === 0) drop();
  }
}
