/**
 * Ajustes: sonido, sensibilidad de escarbado y reset con doble confirmación (PLAN.md §5.4.5,
 * §6.3). El export/import de guardado se sacó de acá (PLAN.md §11.1): Steam Cloud cubre la
 * persistencia y era ruido inútil para el jugador. `store.actions.exportSave/importSave` siguen
 * existiendo en el engine/store para uso interno (ej. sincronización con Steam Cloud, Fase 10)
 * — no se tocó `store.js`.
 *
 * AJUSTE (ronda 14, requisito #6): se sacó la sección "Créditos" de acá (atribución de
 * tipografía movida al comentario de apps/game/index.html, la licencia SIL OFL no la exige en
 * la UI) y se sumó el slider de sensibilidad de escarbado, calcado del de volumen.
 */

import { DIG_SENSITIVITY_MIN, DIG_SENSITIVITY_MAX, formatMoney, formatNumber, getContainerLevel, CONTAINER_LEVEL_MAX } from '@dumpster/engine';
import { t } from '../i18n/i18n.js';
import { getCollectionCompletion } from '../collectionProgress.js';
import { iconMarkup } from '../icons/icons.js';

/**
 * Nombre traducido de una herramienta (PLAN.md §4.23, ronda 20): `tools.json` no pasa por el
 * overlay de dataI18n.js (no lo escanea el test de paridad de la ronda 16 — ver HANDOFF del
 * Agente A), así que su nombre de pantalla sale de una clave `tools.<id>` en es.js/en.js en vez
 * del campo `name` (que queda en español fijo, uso interno/economía).
 * @param {string} toolId
 * @returns {string}
 */
function toolLabel(toolId) {
  return t(`tools.${toolId}`);
}

const local = {
  resetArmed: false,
};
let resetTimer = null;

function armReset() {
  local.resetArmed = true;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    local.resetArmed = false;
  }, 5000);
}

export const SettingsView = {
  /**
   * @param {HTMLElement} container
   * @param {import('@dumpster/engine').GameState} state
   * @param {ReturnType<import('../store.js').createStore>} store
   */
  render(container, state, store) {
    // AJUSTE (ronda 16): marca de bind con nombre de vista (boundSettings) — #tab-content es
    // compartido entre vistas y una marca genérica le robaría el listener a la próxima vista
    // que use la misma (ya pasó con los tabs del Índice, ver napkin/R-16.5).
    if (!container.dataset.boundSettings) {
      container.dataset.boundSettings = 'true';
      container.addEventListener('click', (evt) => onClick(evt, container, store));
      container.addEventListener('change', (evt) => {
        const select = evt.target.closest('[data-action="set-language"]');
        if (!select) return;
        // El guard de UIManager.renderTabContent NO re-renderiza mientras un SELECT tiene
        // foco (R-16.4): sin este blur, la vista quedaría en el idioma viejo hasta el
        // próximo click. Blur ANTES de despachar, siempre.
        select.blur();
        store.actions.setLanguage(select.value);
      });
      // El volumen se despacha en 'input' (arrastre en vivo), no en 'click'. Mientras el slider
      // está enfocado, UIManager.renderTabContent NO re-renderiza (evita cortar el arrastre), así
      // que el % del label se actualiza a mano acá; el volumen real sí se aplica en cada 'input'
      // (store.setVolume → UIManager.render → setMasterVolume).
      container.addEventListener('input', (evt) => {
        const volumeSlider = evt.target.closest('[data-action="set-volume"]');
        if (volumeSlider) {
          store.actions.setVolume(Number(volumeSlider.value) / 100);
          const label = container.querySelector('[data-volume-label]');
          if (label) label.textContent = t('settings.volume', { pct: volumeSlider.value });
          return;
        }
        const sensitivitySlider = evt.target.closest('[data-action="set-sensitivity"]');
        if (sensitivitySlider) {
          store.actions.setDigSensitivity(Number(sensitivitySlider.value) / 100);
          const label = container.querySelector('[data-sensitivity-label]');
          if (label) label.textContent = t('settings.sensitivity', { pct: sensitivitySlider.value });
        }
      });
    }

    const volumePct = Math.round(state.volume * 100);
    const sensitivityPct = Math.round((Number(state.digSensitivity) || 1) * 100);
    container.innerHTML =
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-sound">${t('settings.sound', { state: state.soundOn ? t('settings.on') : t('settings.off') })}</button>` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="toggle-vibration">${t('settings.vibration', { state: state.vibrationOn ? t('settings.on') : t('settings.off') })}</button>` +
      `</section>` +
      `${renderStatsSection(state, store)}` +
      `${renderToolsSection(state, store)}` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="volume-slider" data-volume-label>${t('settings.volume', { pct: volumePct })}</label>` +
      `<input class="settings-volume-slider" type="range" id="volume-slider" data-action="set-volume"` +
      ` min="0" max="100" step="1" value="${volumePct}" />` +
      `</section>` +
      `<section class="settings-block settings-volume">` +
      `<label class="settings-volume-label" for="sensitivity-slider" data-sensitivity-label>` +
      `${t('settings.sensitivity', { pct: sensitivityPct })}</label>` +
      // El rango del slider sale del engine (DIG_SENSITIVITY_MIN/MAX), no de un 50/150 suelto:
      // si el rango de diseño cambia, cambia en un solo lugar (state.js) y la UI lo sigue.
      `<input class="settings-volume-slider" type="range" id="sensitivity-slider" data-action="set-sensitivity"` +
      ` min="${DIG_SENSITIVITY_MIN * 100}" max="${DIG_SENSITIVITY_MAX * 100}" step="5" value="${sensitivityPct}" />` +
      `</section>` +
      // Los labels de las opciones son endónimos fijos a propósito (cada idioma se nombra a sí
      // mismo): no pasan por t() porque no deben cambiar con el idioma activo.
      `<section class="settings-block">` +
      `<label class="settings-volume-label" for="language-select">${t('settings.language')}</label>` +
      `<select id="language-select" data-action="set-language">` +
      `<option value="es"${state.language === 'es' ? ' selected' : ''}>Español</option>` +
      `<option value="en"${state.language === 'en' ? ' selected' : ''}>English</option>` +
      `</select>` +
      `</section>` +
      `<section class="settings-block">` +
      `<button type="button" data-action="reset-game">${
        local.resetArmed ? t('settings.resetConfirm') : t('settings.resetButton')
      }</button>` +
      `</section>`;
  },
};

/**
 * Sección de Estadísticas (PLAN.md §5.4, ronda 19): deriva TODO de `state`/data existentes —
 * no hay contador paralelo nuevo en el engine (ver ROADMAPv4.md §19.3).
 * @param {import('@dumpster/engine').GameState} state
 * @param {ReturnType<import('../store.js').createStore>} store
 * @returns {string}
 */
function renderStatsSection(state, store) {
  const { allContainers, itemsData } = store.ctx;
  if (!allContainers.length) {
    return `<section class="settings-block settings-stats"><p class="empty-state">${t('common.emptyContainers')}</p></section>`;
  }
  const { globalPct } = getCollectionCompletion(state, allContainers, itemsData);
  const containersMaxed = allContainers.filter((c) => getContainerLevel(state, c.id) >= CONTAINER_LEVEL_MAX).length;
  const rows = [
    t('stats.itemsFound', { count: formatNumber(state.itemsFoundCount) }),
    t('stats.trapsHit', { count: formatNumber(state.trapsHit) }),
    t('stats.totalMoneyEarned', { amount: formatMoney(state.totalMoneyEarned) }),
    t('stats.autoProcessed', { count: formatNumber(state.autoProcessedCount) }),
    t('stats.bestStreak', { count: formatNumber(state.bestDigStreak) }),
    t('stats.completion', { pct: Math.round(globalPct * 100) }),
    t('stats.maxLevelContainers', { count: containersMaxed, total: allContainers.length }),
  ];
  return (
    `<section class="settings-block settings-stats">` +
    `<h3>${t('stats.title')}</h3>` +
    rows.map((row) => `<p>${row}</p>`).join('') +
    `</section>`
  );
}

/**
 * Sección de herramientas de escarbado (PLAN.md §4.23, ronda 20): comprar/equipar. Solo modifica
 * el pincel del escarbado manual (radio/ritmo) — la sección NO calcula ni muestra economía más
 * allá del costo de compra (que sale directo de `tools.json`, ya inyectado en `data.tools`).
 * @param {import('@dumpster/engine').GameState} state
 * @param {ReturnType<import('../store.js').createStore>} store
 * @returns {string}
 */
function renderToolsSection(state, store) {
  const tools = store.ctx.data.tools;
  if (!tools || !tools.length) return '';
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
    return `<div class="tool-row">${iconMarkup(tool.icon, { size: 20 })}<span class="tool-row-name">${toolLabel(tool.id)}</span>${actionHtml}</div>`;
  });
  return (
    `<section class="settings-block settings-tools">` +
    `<h3>${t('tools.title')}</h3>` +
    rows.join('') +
    `</section>`
  );
}

function onClick(evt, container, store) {
  if (evt.target.closest('[data-action="toggle-sound"]')) {
    store.actions.toggleSound();
    return;
  }
  if (evt.target.closest('[data-action="toggle-vibration"]')) {
    store.actions.toggleVibration();
    return;
  }
  const buyToolBtn = evt.target.closest('[data-action="buy-tool"]');
  if (buyToolBtn && !buyToolBtn.disabled) {
    store.actions.buyTool(buyToolBtn.dataset.id);
    return;
  }
  const equipToolBtn = evt.target.closest('[data-action="equip-tool"]');
  if (equipToolBtn) {
    store.actions.equipTool(equipToolBtn.dataset.id);
    return;
  }
  if (evt.target.closest('[data-action="reset-game"]')) {
    if (local.resetArmed) {
      local.resetArmed = false;
      clearTimeout(resetTimer);
      store.actions.resetGame();
    } else {
      armReset();
      SettingsView.render(container, store.getState(), store);
    }
  }
}
