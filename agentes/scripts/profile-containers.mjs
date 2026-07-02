import * as engine from '../../packages/engine/src/index.js';
import containersData from '../../apps/game/src/data/containers.json' with { type: 'json' };
import upgradesData from '../../apps/game/src/data/upgrades.json' with { type: 'json' };
import automationsData from '../../apps/game/src/data/automations.json' with { type: 'json' };
import prestigeTreeData from '../../apps/game/src/data/prestigeTree.json' with { type: 'json' };
import itemsData from '../../apps/game/src/data/items.json' with { type: 'json' };

const data = { upgrades: upgradesData, automations: automationsData, prestigeTree: prestigeTreeData };

function stateAtLuckDigPower(luck, digPowerMult) {
  const s = engine.freshState();
  // set luck level to hit approx target (luck upgrade is flat, baseValue 0, perNivel 2)
  const luckDef = upgradesData.find((u) => u.id === 'luck');
  s.upgradeLevels.luck = Math.round((luck - luckDef.baseValue) / luckDef.perNivel);
  const dpDef = upgradesData.find((u) => u.id === 'digPower');
  s.upgradeLevels.digPower = Math.round((digPowerMult - dpDef.baseValue) / dpDef.perNivel);
  return s;
}

console.log('container'.padEnd(24), 'luck', 'digPow', 'cost0'.padStart(8), 'net$/dig'.padStart(10), 'net$/s'.padStart(10), 'recLuck'.padStart(8));
for (const c of containersData) {
  for (const [luck, dp] of [[0, 1], [10, 1.5], [30, 2.5], [80, 4]]) {
    const s = stateAtLuckDigPower(luck, dp);
    const cost = engine.getContainerCost(s, c, data);
    const gross = engine.expectedContainerValue(s, c, itemsData, data);
    const trapProb = engine.getEffectiveTrapProbability(s, c, false, data);
    const trapPenalty = engine.getTrapPenalty(s, c, data);
    const netPerDig = gross - trapProb * trapPenalty - cost;
    const effTime = engine.getEffectiveDigTime(s, c, data);
    const netPerSec = netPerDig / effTime;
    const recLuck = engine.getRecommendedLuck(s, c, itemsData, data);
    console.log(
      c.id.padEnd(24),
      String(luck).padStart(4),
      String(dp).padStart(6),
      cost.toFixed(0).padStart(8),
      netPerDig.toFixed(1).padStart(10),
      netPerSec.toFixed(2).padStart(10),
      String(recLuck).padStart(8)
    );
  }
}
