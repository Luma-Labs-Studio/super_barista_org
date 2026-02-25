/**
 * Init System — game state initialization and ref reset.
 * Extracted from CoffeeRushGame.tsx initGame().
 */
import { GAME_CONFIG, TRAVEL_DURATION_BY_STAGE } from '../config';
import { resetRendererState } from '../renderer';
import type { GameRefs } from './gameRefs';

/**
 * Initialize game state from a loaded progression record.
 * Resets all refs, sets up blocks/weapons from progression data,
 * prepares for a new run. Does NOT touch React state or pools —
 * the caller (component) handles those.
 */
export function initGameState(
  refs: GameRefs,
  progression: {
    totalCoins: number;
    damagePips: number;
    powerPips: number;
    blockCountLevel: number;
    blockPips: number[];
    starPerBox?: boolean[];
    starUnlocked?: boolean;
    starPips?: number;
    brewPerBox?: boolean[];
    espressoPerBox?: boolean[];
    icePerBox?: boolean[];
  },
) {
  resetRendererState();

  refs.endHandledRef.current = false;
  refs.endReasonRef.current = null;
  refs.coinsStartRef.current = progression.totalCoins;

  // Calculate multipliers from upgrade levels
  const damageMultiplier = 1 + progression.damagePips * GAME_CONFIG.DAMAGE_BONUS_PER_PIP;
  const powerRegenMult = 1 + progression.powerPips * GAME_CONFIG.POWER_REGEN_BONUS_PER_PIP;

  // Block count from blockCountLevel
  const blockCount = 1 + progression.blockCountLevel;

  // Initialize blocks
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const baseHp = GAME_CONFIG.BLOCK_MAX_HP;
  const totalBlockPips = (progression.blockPips || []).reduce((sum: number, p: number) => sum + p, 0);
  const avgBlockPips = progression.blockCountLevel > 0 ? totalBlockPips / progression.blockCountLevel : 0;
  refs.blocksRef.current = Array.from({ length: blockCount }, (_, i) => {
    const pipBonus = i === 0 ? avgBlockPips : (progression.blockPips[i - 1] ?? 0);
    const blockHp = Math.floor(baseHp * (1 + pipBonus * 0.10));
    return {
      id: i,
      hp: blockHp,
      maxHp: blockHp,
      y: groundY - 30 - (i + 1) * GAME_CONFIG.BLOCK_HEIGHT,
      height: GAME_CONFIG.BLOCK_HEIGHT,
      destroyed: false,
      collapseOffset: 0,
    };
  });

  refs.damageMultiplierRef.current = damageMultiplier;
  refs.powerRegenMultiplierRef.current = powerRegenMult;

  // Weapon states from progression
  refs.hasStarRef.current = progression.starPerBox?.some(v => v) ?? (progression.starUnlocked ?? false);
  refs.starDamageMultRef.current = 1 + (progression.starPips ?? 0) * GAME_CONFIG.STAR_DAMAGE_BONUS_PER_PIP;

  refs.hasFoamRef.current = progression.brewPerBox?.some(v => v) ?? false;
  refs.foamBoxIndexRef.current = progression.brewPerBox?.findIndex(v => v) ?? -1;

  refs.hasEspressoRef.current = progression.espressoPerBox?.some(v => v) ?? false;
  refs.espressoBoxIndexRef.current = progression.espressoPerBox?.findIndex(v => v) ?? -1;

  refs.hasIceRef.current = progression.icePerBox?.some(v => v) ?? false;
  refs.iceBoxIndexRef.current = progression.icePerBox?.findIndex(v => v) ?? -1;

  // Reset all game refs
  refs.latchedCountRef.current = 0;
  refs.latchOrderCounterRef.current = 0;
  refs.screenShakeRef.current = { x: 0, y: 0, duration: 0 };
  refs.lastAttackRef.current = -999;
  refs.lastSpawnRef.current = -999;
  refs.lastStarAttackRef.current = -999;
  refs.starPassiveTickRef.current = 0;
  refs.starTelemetryRef.current = { passiveDamage: 0, throwDamageEnemies: 0, throwDamageGate: 0, throwUses: 0 };
  refs.foamPassiveTickRef.current = 0;
  refs.foamSweepRef.current = 0;
  refs.foamTelemetryRef.current = { passiveDamage: 0, passiveShotsToGate: 0, burstDamageEnemies: 0, burstDamageGate: 0, burstUses: 0, burstUsedDuringGate: 0, unlockedAt: -1, burstTimestamps: [] };
  refs.espressoPassiveTickRef.current = 0;
  refs.espressoBarrageRef.current = { active: false, timer: 0, shotsFired: 0 };
  refs.espressoTelemetryRef.current = { passiveDamage: 0, barrageDamageEnemies: 0, barrageDamageGate: 0, barrageUses: 0 };
  refs.icePassiveTickRef.current = 0;
  refs.iceTelemetryRef.current = { passiveDamage: 0, slowsApplied: 0, stormDamageEnemies: 0, stormDamageGate: 0, stormUses: 0 };
  refs.powerRef.current = 0;
  refs.timeRef.current = 0;
  refs.tipsRef.current = 0;
  refs.customersServedRef.current = 0;
  refs.shotsFiredRef.current = 0;
  refs.shotsHitRef.current = 0;
  refs.spawnIndexRef.current = 0;
  refs.coinsFromKillsRef.current = 0;
  refs.coinsFromGateLumpsRef.current = 0;
  refs.gateDamageDealtRef.current = [0, 0, 0, 0, 0];
  refs.gateTimeSpentRef.current = [0, 0, 0, 0, 0];
  refs.shotsToGateRef.current = 0;
  refs.shotsToEnemiesRef.current = 0;
  refs.bombGateDamageByGateRef.current = [0, 0, 0, 0, 0];
  refs.gateCleanupTimerRef.current = 0;
  refs.runIdRef.current = Date.now();
  refs.gateDestroyedRef.current = [false, false, false, false, false];
  refs.burstsTriggeredRef.current = 0;
  refs.targetModeCountsRef.current = { front: 0, mid: 0, back: 0, gate: 0 };
  refs.stage1WaveRef.current = { spawned: 0, breatherTimer: 0 };
  refs.bombSilenceTimerRef.current = 0;

  refs.telemetryRef.current = {
    maxLatchedPeak: 0, timeAtMaxLatched: 0,
    blocksLost: 0, timeToFirstBlockLost: -1,
    tonicBombUses: 0,
    enemiesSpawned: { normal: 0, heavy: 0, boss: 0 },
    enemiesKilled: { normal: 0, heavy: 0, boss: 0 },
  };

  // Boss reset
  refs.bossStateRef.current = { isActive: false, hp: 0, maxHp: 0, spawnedAt: 0, addSpawnTimer: 0, phase: 1, phaseTransitioned: [false, false, false] };
  refs.bossIncomingRef.current = 0;
  refs.bossEnemyRef.current = null;

  // Stage/phase reset
  refs.stageIndexRef.current = 1;
  refs.playPhaseRef.current = 'TRAVEL';
  refs.travelTimerRef.current = TRAVEL_DURATION_BY_STAGE[0];
  refs.isSimulationFrozenRef.current = false;
  refs.phaseTimersRef.current = { travel: 0, siege: 0, evoPick: 0, boss: 0 };
  refs.perStageTimersRef.current = { travel: [0, 0, 0, 0, 0], siege: [0, 0, 0, 0, 0], breather: [0, 0, 0, 0, 0] };
  refs.gateBuildingRef.current = null;
}
