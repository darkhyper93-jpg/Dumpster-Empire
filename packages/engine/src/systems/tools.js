/**
 * Sistema de herramientas de escarbado (PLAN.md §4.23, ronda 20): compra y equipado.
 * Mutaciones puras: reciben el estado y lo mutan, sin tocar el DOM.
 */

/**
 * Compra una herramienta de escarbado (descuenta dinero, la marca como poseída). No la equipa.
 * @param {import('../state.js').GameState} state
 * @param {{ id: string, costo: number }} tool
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function buyTool(state, tool) {
  if (state.toolsOwned[tool.id]) return { ok: false, error: 'Ya tenés esta herramienta.' };
  if (state.money < tool.costo) return { ok: false, error: 'No alcanza el dinero para esta herramienta.' };
  state.money -= tool.costo;
  state.toolsOwned[tool.id] = true;
  return { ok: true };
}

/**
 * Equipa una herramienta ya poseída. Solo una equipada a la vez.
 * @param {import('../state.js').GameState} state
 * @param {string} toolId
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function equipTool(state, toolId) {
  if (!state.toolsOwned[toolId]) return { ok: false, error: 'No poseés esta herramienta.' };
  state.equippedTool = toolId;
  return { ok: true };
}
