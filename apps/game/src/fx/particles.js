/**
 * Feedback de rareza y trampa (PLAN.md §5.2). El mockup Stitch `dumpster_empire_main_game`
 * (DESARROLLO.md §6) resuelve el hallazgo de rareza alta como un "glow" de blur de color
 * debajo de la tarjeta de escarbado, no como confeti/partículas voladoras — se implementa así
 * acá. Redibujado eficiente: reutiliza el mismo elemento glow, solo togglea clases/CSS vars.
 */

/**
 * @param {HTMLElement} hostEl - contenedor con el glow ya montado (ver UIManager: `#dig-rarity-glow`).
 * @param {string} colorToken - variable CSS de rareza, ej. `--r-relics`.
 * @param {number} intensity - 0-1, más alto para rarezas más raras.
 */
export function triggerRarityGlow(hostEl, colorToken, intensity = 0.5) {
  if (!hostEl) return;
  hostEl.style.setProperty('--glow-color', `var(${colorToken})`);
  hostEl.style.setProperty('--glow-intensity', String(intensity));
  hostEl.classList.remove('is-glowing');
  void hostEl.offsetWidth;
  hostEl.classList.add('is-glowing');
}

/**
 * Pop + partícula de color al revelar un objeto: un pequeño destello que nace del centro
 * de la tarjeta (o de la posición indicada) y se desvanece. Rareza alta = destello más
 * grande/lento.
 * @param {HTMLElement} hostEl
 * @param {string} colorToken
 * @param {number} rarityIndex - 0 (común) a 7 (futurista).
 * @param {{xPct:number, yPct:number}} [posPct] - posición del destello en % del host (ronda 5:
 *   el pop nace sobre el objeto recién destapado, no siempre en el centro de la tarjeta).
 */
export function spawnFindPop(hostEl, colorToken, rarityIndex = 0, posPct = null) {
  if (!hostEl) return;
  const pop = document.createElement('span');
  pop.className = 'find-pop';
  pop.style.setProperty('--pop-color', `var(${colorToken})`);
  pop.style.setProperty('--pop-scale', String(1 + rarityIndex * 0.12));
  if (posPct) {
    pop.style.left = `${posPct.xPct}%`;
    pop.style.top = `${posPct.yPct}%`;
  }
  hostEl.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove(), { once: true });
}

/** Shake + flash rojo tenue de pantalla al caer en trampa (PLAN.md §5.2). */
export function triggerTrapShake(hostEl) {
  if (!hostEl) return;
  hostEl.classList.remove('is-shaking');
  void hostEl.offsetWidth;
  hostEl.classList.add('is-shaking');
}
