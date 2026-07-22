/**
 * Sección de herramientas de escarbado (PLAN.md §4.23): vive en la vista Escarbar (ronda 21 —
 * antes era subvista de Ajustes; se muda a donde las herramientas se usan). Solo modifica el
 * pincel del escarbado manual (radio/ritmo) — nunca economía.
 */

import { formatMoney } from '@dumpster/engine';
import { t } from '../i18n/i18n.js';
import { iconMarkup } from '../icons/icons.js';
import { getObjectArtMarkup } from '../icons/objectArt.js';

/**
 * Nombre traducido de una herramienta: `tools.json` no pasa por el overlay de dataI18n.js
 * (no lo escanea el test de paridad de la ronda 16), así que su nombre de pantalla sale de una
 * clave `tools.<id>` en es.js/en.js en vez del campo `name` (uso interno/economía).
 * @param {string} toolId
 * @returns {string}
 */
function toolLabel(toolId) {
  return t(`tools.${toolId}`);
}

export const ToolsSection = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    if (!container.dataset.boundTools) {
      container.dataset.boundTools = 'true';
      container.addEventListener('click', (evt) => onClick(evt, store));
    }
    const tools = store.ctx.data.tools;
    if (!tools || !tools.length) {
      container.innerHTML = '';
      return;
    }
    const rows = tools.map((tool) => {
      const owned = Boolean(state.toolsOwned[tool.id]);
      const equipped = state.equippedTool === tool.id;
      let actionHtml;
      if (equipped) {
        actionHtml = `<span class="badge">${t('tools.equipped')}</span>`;
      } else if (owned) {
        actionHtml = `<button type="button" data-action="equip-tool" data-id="${tool.id}">${t('tools.equip')}</button>`;
      } else {
        const canAfford = state.money >= tool.costo;
        const reason = canAfford ? '' : t('common.missingMoney', { amount: formatMoney(tool.costo - state.money) });
        actionHtml =
          `<button type="button" data-action="buy-tool" data-id="${tool.id}" ${canAfford ? '' : 'disabled'} title="${reason}">` +
          `${tool.costo > 0 ? t('tools.buyFor', { amount: formatMoney(tool.costo) }) : t('common.free')}</button>`;
      }
      // Ronda 29.B: el selector muestra el arte ilustrado (PLAN.md §5.5) — es la única vista
      // donde las herramientas se lucen. `getObjectArtMarkup` namespacia los ids internos por
      // artKey, así que los 4 SVG conviven inline; sin arte registrado cae al ícono clásico.
      const art = getObjectArtMarkup(tool.icon, { size: 40 });
      const iconHtml = art ?? iconMarkup(tool.icon, { size: 20 });
      return `<div class="tool-row"><span class="tool-row-art">${iconHtml}</span><span class="tool-row-name">${toolLabel(tool.id)}</span>${actionHtml}</div>`;
    });
    // Ronda "features" (2026-07-22): las filas van dentro de su propia caja scrolleable. La
    // escalera pasó de 4 a 8 herramientas y en desktop `#dig-area` queda visible en TODAS las
    // pestañas con `flex-shrink: 0` (layout.css), así que el alto de esta lista empujaba el
    // documento entero más allá del viewport y devolvía el scroll de PÁGINA que
    // dig-regression.spec.js vigila desde el rework de escarbado. El título queda fijo afuera.
    //
    // FIX (2026-07-22, reporte del usuario): el ESQUELETO (section + título + caja) se construye
    // una sola vez y después solo se reemplazan las FILAS. Antes se reescribía
    // `container.innerHTML` entero en cada render, así que el elemento que scrollea nacía y moría
    // en cada pasada con `scrollTop = 0`: con automatización o Puesto activos el store notifica
    // una vez por segundo (`tickAutomation`) y la lista volvía sola al principio — solo se podían
    // ver las 4 primeras de las 8 herramientas. El resto de los scrollers del juego
    // (`#tab-content`, `#quick-upgrades`, `#tabbar`) ya son elementos estáticos de `index.html` a
    // los que solo se les cambia el contenido; ésta era la excepción.
    let list = container.querySelector('.settings-tools-list');
    if (!list) {
      container.innerHTML =
        `<section class="settings-block settings-tools">` +
        `<h3></h3>` +
        `<div class="settings-tools-list"></div>` +
        `</section>`;
      list = container.querySelector('.settings-tools-list');
    }
    // Fuera del subárbol que se reemplaza, así que se refresca acá (cubre el cambio de idioma).
    container.querySelector('.settings-tools h3').textContent = t('tools.title');
    // Red de seguridad por si el navegador clampea la posición mientras la caja está vacía: se
    // escribe SOLO si cambió, para no cortar el impulso de un scroll táctil en curso.
    const scrollTop = list.scrollTop;
    list.innerHTML = rows.join('');
    if (list.scrollTop !== scrollTop) list.scrollTop = scrollTop;
  },
};

function onClick(evt, store) {
  const buyToolBtn = evt.target.closest('[data-action="buy-tool"]');
  if (buyToolBtn && !buyToolBtn.disabled) {
    store.actions.buyTool(buyToolBtn.dataset.id);
    return;
  }
  const equipToolBtn = evt.target.closest('[data-action="equip-tool"]');
  if (equipToolBtn) {
    store.actions.equipTool(equipToolBtn.dataset.id);
  }
}
