/**
 * Telemetry System — builds run telemetry from game refs.
 * Extracted from CoffeeRushGame.tsx.
 */
import { STAGES } from '../config';
import { loadProgression } from '../persistence';
import type { GameMode, RunTelemetry } from '../types';
import type { GameRefs } from './gameRefs';

/**
 * Build a complete RunTelemetry snapshot from current game state.
 * Pure read-only — does not mutate any refs.
 */
export function buildTelemetry(refs: GameRefs, gameMode: GameMode): RunTelemetry {
  const t = refs.telemetryRef.current;
  const hitRate = refs.shotsFiredRef.current > 0
    ? Math.round((refs.shotsHitRef.current / refs.shotsFiredRef.current) * 100) : 0;

  let bossOutcome: RunTelemetry['bossOutcome'] = 'not_spawned';
  let bossHpPercent = 0;
  if (refs.bossStateRef.current.isActive || refs.bossEnemyRef.current) {
    const boss = refs.bossEnemyRef.current;
    if (boss && boss.hp <= 0) {
      bossOutcome = 'defeated';
    } else if (boss) {
      bossOutcome = 'died_during_boss';
      bossHpPercent = Math.round((boss.hp / boss.maxHp) * 100);
    } else {
      bossOutcome = 'spawned';
    }
  }

  const prog = loadProgression();
  const coinsFromKills = refs.coinsFromKillsRef.current;
  const coinsFromGateLumps = refs.coinsFromGateLumpsRef.current;

  return {
    runId: refs.runIdRef.current,
    telemetryBuiltAt: Date.now(),
    gameMode,
    stageReached: refs.stageIndexRef.current,
    reachedBoss: refs.bossStateRef.current.isActive || refs.bossEnemyRef.current !== null || bossOutcome === 'defeated',
    bossOutcome, bossHpPercent,
    pipLevels: {
      blockPips: [...prog.blockPips],
      weaponPips: [...prog.weaponPips],
      powerPips: prog.powerPips,
      damagePips: prog.damagePips,
      blockCount: prog.blockCountLevel,
      starPips: prog.starPips ?? 0,
    },
    shotsFired: refs.shotsFiredRef.current,
    shotsHit: refs.shotsHitRef.current,
    hitRate,
    maxLatchedPeak: t.maxLatchedPeak,
    timeAtMaxLatched: t.timeAtMaxLatched,
    blocksLost: t.blocksLost,
    timeToFirstBlockLost: t.timeToFirstBlockLost,
    tonicBombUses: t.tonicBombUses,
    gateDamageDealt: [...refs.gateDamageDealtRef.current],
    gateTimeSpent: [...refs.gateTimeSpentRef.current],
    gateHpRemainingByGate: (() => {
      const result: number[] = [];
      for (let i = 0; i < 5; i++) {
        const stageReached = refs.stageIndexRef.current;
        if (i < stageReached - 1) {
          result.push(0);
        } else if (i === stageReached - 1) {
          const g = refs.gateBuildingRef.current;
          result.push(g ? Math.max(0, g.hp) : (STAGES[i].gateHP ?? 0));
        } else {
          result.push(STAGES[i].gateHP ?? 0);
        }
      }
      return result;
    })(),
    shotsToGate: refs.shotsToGateRef.current,
    shotsToEnemies: refs.shotsToEnemiesRef.current,
    bombGateDamageTotal: refs.bombGateDamageByGateRef.current.reduce((a, b) => a + b, 0),
    bombGateDamageByGate: [...refs.bombGateDamageByGateRef.current],
    gateDestroyedByGate: [...refs.gateDestroyedRef.current],
    burstsTriggered: refs.burstsTriggeredRef.current,
    targetModeCounts: { ...refs.targetModeCountsRef.current },
    phaseAtDeath: refs.playPhaseRef.current,
    deathStage: refs.stageIndexRef.current,
    timeInTravel: refs.phaseTimersRef.current.travel,
    timeInSiege: refs.phaseTimersRef.current.siege,
    timeInEvoPick: refs.phaseTimersRef.current.evoPick,
    timeInBoss: refs.phaseTimersRef.current.boss,
    travelTimeByStage: [...refs.perStageTimersRef.current.travel],
    siegeTimeByStage: [...refs.perStageTimersRef.current.siege],
    breatherTimeByStage: [...refs.perStageTimersRef.current.breather],
    totalTravelTime: refs.perStageTimersRef.current.travel.reduce((a, b) => a + b, 0),
    totalSiegeTime: refs.perStageTimersRef.current.siege.reduce((a, b) => a + b, 0),
    totalBreatherTime: refs.perStageTimersRef.current.breather.reduce((a, b) => a + b, 0),
    enemiesSpawned: { ...t.enemiesSpawned },
    enemiesKilled: { ...t.enemiesKilled },
    // Star telemetry
    starPassiveDamageDealt: refs.starTelemetryRef.current.passiveDamage,
    starThrowDamageToEnemies: refs.starTelemetryRef.current.throwDamageEnemies,
    starThrowDamageToGate: refs.starTelemetryRef.current.throwDamageGate,
    starThrowUses: refs.starTelemetryRef.current.throwUses,
    // Brew telemetry
    brewPassiveDamageDealt: refs.foamTelemetryRef.current.passiveDamage,
    brewPassiveShotsToGate: refs.foamTelemetryRef.current.passiveShotsToGate,
    brewBurstDamageToEnemies: refs.foamTelemetryRef.current.burstDamageEnemies,
    brewBurstDamageToGate: refs.foamTelemetryRef.current.burstDamageGate,
    brewBurstUses: refs.foamTelemetryRef.current.burstUses,
    brewUnlockedAt: refs.foamTelemetryRef.current.unlockedAt,
    brewBurstTimestamps: [...refs.foamTelemetryRef.current.burstTimestamps],
    brewEquippedBoxIndex: refs.foamBoxIndexRef.current,
    brewBurstUsedDuringGate: refs.foamTelemetryRef.current.burstUsedDuringGate,
    // Espresso telemetry
    espressoPassiveDamageDealt: refs.espressoTelemetryRef.current.passiveDamage,
    espressoBarrageDamageToEnemies: refs.espressoTelemetryRef.current.barrageDamageEnemies,
    espressoBarrageDamageToGate: refs.espressoTelemetryRef.current.barrageDamageGate,
    espressoBarrageUses: refs.espressoTelemetryRef.current.barrageUses,
    espressoEquippedBoxIndex: refs.espressoBoxIndexRef.current,
    // Ice telemetry
    icePassiveDamageDealt: refs.iceTelemetryRef.current.passiveDamage,
    iceSlowsApplied: refs.iceTelemetryRef.current.slowsApplied,
    iceStormDamageToEnemies: refs.iceTelemetryRef.current.stormDamageEnemies,
    iceStormDamageToGate: refs.iceTelemetryRef.current.stormDamageGate,
    iceStormUses: refs.iceTelemetryRef.current.stormUses,
    iceEquippedBoxIndex: refs.iceBoxIndexRef.current,
    // Economy
    coinsStart: refs.coinsStartRef.current,
    coinsEnd: 0,
    coinsEarnedActual: 0,
    coinsFromKills,
    coinsFromGateLumps,
    clearBonusCoins: 0,
    coinsTotalBreakdown: coinsFromKills + coinsFromGateLumps,
    economyDelta: 0,
    deltaExplanation: '',
  };
}
