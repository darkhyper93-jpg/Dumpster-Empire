/**
 * % de completitud de la colección (PLAN.md §5.4, ronda 19): puramente derivado de
 * `state.itemsFoundByItem` contra los pools reales de `itemsData` — sin contador paralelo
 * persistido, para no poder desincronizarse del estado real (regla del engine, aplicada acá
 * porque es derivado de UI, no una fórmula de economía — ver ROADMAPv4.md §19.3).
 *
 * R19.3: los legendarios (ronda 22, PLAN.md §4.26) quedan FUERA de este cálculo — nunca entran
 * a `itemsFoundByItem` (contrato §3.5.3); tienen su propio contador "Vitrina X/8" en la Vitrina
 * de CollectionView.js, derivado de `state.legendariesFound`.
 */

/**
 * @param {import('@dumpster/engine').GameState} state
 * @param {Array<Object>} allContainers
 * @param {{ containers: Object<string, Array<Object>> }} itemsData
 * @returns {{ globalPct: number, perContainerPct: Object<string, number> }}
 */
export function getCollectionCompletion(state, allContainers, itemsData) {
  let totalItems = 0;
  let foundItems = 0;
  const perContainerPct = {};
  for (const container of allContainers) {
    const pool = itemsData.containers[container.id] || [];
    const foundMap = state.itemsFoundByItem[container.id] || {};
    const foundCount = pool.filter((item) => (Number(foundMap[item.id]) || 0) > 0).length;
    perContainerPct[container.id] = pool.length ? foundCount / pool.length : 0;
    totalItems += pool.length;
    foundItems += foundCount;
  }
  return { globalPct: totalItems ? foundItems / totalItems : 0, perContainerPct };
}
