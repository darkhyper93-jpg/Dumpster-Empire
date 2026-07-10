/**
 * Texto del efecto por nivel de una mejora repetible, leído de data (RONDA14-PLAN.md tarea B4).
 * Usado por QuickUpgrades.js (Suerte/Fuerza/Área) y AutomationView.js (Capacidad) — un solo
 * lugar para no duplicar la lectura de `mode`/`perNivel`.
 */

import { t } from '../i18n/i18n.js';

/**
 * @param {{mode:string, perNivel:number, label:string}} upgrade - entrada de upgrades.json
 * @returns {string} ej. "+2 Suerte por nivel" o "+4% Fuerza de Escarbado por nivel"
 */
export function upgradeEffectLabel(upgrade) {
  if (upgrade.mode === 'flat') return t('common.effectFlat', { amount: upgrade.perNivel, label: upgrade.label });
  return t('common.effectPercent', { pct: Math.round(upgrade.perNivel * 100), label: upgrade.label });
}
