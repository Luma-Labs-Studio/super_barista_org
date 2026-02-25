/**
 * GameRefs — "Ref Bag" pattern for system function extraction.
 *
 * CoffeeRushGame.tsx owns all refs and pools (React hooks).
 * System functions receive this bag and mutate refs in place.
 * When a React state update is needed, systems push into SystemActions.
 */
import type { MutableRefObject } from 'react';
import type {
  PlayPhase,
  GameState,
  GateBuilding,
  CartBlock,
  Enemy,
  Projectile,
  TipDrop,
  Particle,
  FloatingDamage,
  BossState,
  EvoTrait,
} from '../types';

// ─────────────────────────────────────────────────────────────
// Object Pool interface (matches useObjectPool return type)
// ─────────────────────────────────────────────────────────────
export interface ObjectPool<T> {
  acquire: () => T | null;
  release: (obj: T) => void;
  getActive: () => T[];
  getAll: () => T[];
  clear: () => void;
}

// ─────────────────────────────────────────────────────────────
// Per-weapon telemetry shapes
// ─────────────────────────────────────────────────────────────
export interface StarTelemetry {
  passiveDamage: number;
  throwDamageEnemies: number;
  throwDamageGate: number;
  throwUses: number;
}

export interface FoamTelemetry {
  passiveDamage: number;
  passiveShotsToGate: number;
  burstDamageEnemies: number;
  burstDamageGate: number;
  burstUses: number;
  burstUsedDuringGate: number;
  unlockedAt: number;
  burstTimestamps: number[];
}

export interface EspressoTelemetry {
  passiveDamage: number;
  barrageDamageEnemies: number;
  barrageDamageGate: number;
  barrageUses: number;
}

export interface IceTelemetry {
  passiveDamage: number;
  slowsApplied: number;
  stormDamageEnemies: number;
  stormDamageGate: number;
  stormUses: number;
}

export interface CoreTelemetry {
  maxLatchedPeak: number;
  timeAtMaxLatched: number;
  blocksLost: number;
  timeToFirstBlockLost: number;
  tonicBombUses: number;
  enemiesSpawned: { normal: number; heavy: number; boss: number };
  enemiesKilled: { normal: number; heavy: number; boss: number };
}

export interface EspressoBarrageState {
  active: boolean;
  timer: number;
  shotsFired: number;
}

// ─────────────────────────────────────────────────────────────
// GameRefs — the "ref bag" passed to every system function
// ─────────────────────────────────────────────────────────────
export interface GameRefs {
  // ── Pools ──
  enemyPool: ObjectPool<Enemy>;
  projectilePool: ObjectPool<Projectile>;
  particlePool: ObjectPool<Particle>;
  tipPool: ObjectPool<TipDrop>;
  floatingDamagePool: ObjectPool<FloatingDamage>;

  // ── Canvas ──
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;

  // ── Phase & stage ──
  playPhaseRef: MutableRefObject<PlayPhase>;
  stageIndexRef: MutableRefObject<number>;
  travelTimerRef: MutableRefObject<number>;
  isSimulationFrozenRef: MutableRefObject<boolean>;

  // ── Phase timing ──
  phaseTimersRef: MutableRefObject<{ travel: number; siege: number; evoPick: number; boss: number }>;
  perStageTimersRef: MutableRefObject<{
    travel: number[];
    siege: number[];
    breather: number[];
  }>;

  // ── Economy ──
  coinsFromKillsRef: MutableRefObject<number>;
  coinsFromGateLumpsRef: MutableRefObject<number>;
  tipsRef: MutableRefObject<number>;
  coinsStartRef: MutableRefObject<number>;

  // ── Gate telemetry ──
  gateDamageDealtRef: MutableRefObject<number[]>;
  gateTimeSpentRef: MutableRefObject<number[]>;
  shotsToGateRef: MutableRefObject<number>;
  shotsToEnemiesRef: MutableRefObject<number>;
  bombGateDamageByGateRef: MutableRefObject<number[]>;
  gateDestroyedRef: MutableRefObject<boolean[]>;
  gateCleanupTimerRef: MutableRefObject<number>;

  // ── Gate building ──
  gateBuildingRef: MutableRefObject<GateBuilding | null>;

  // ── Boss ──
  bossStateRef: MutableRefObject<BossState>;
  bossIncomingRef: MutableRefObject<number>;
  bossEnemyRef: MutableRefObject<Enemy | null>;

  // ── Blocks & latching ──
  blocksRef: MutableRefObject<CartBlock[]>;
  latchedCountRef: MutableRefObject<number>;
  latchOrderCounterRef: MutableRefObject<number>;

  // ── Combat ──
  lastAttackRef: MutableRefObject<number>;
  lastSpawnRef: MutableRefObject<number>;
  shotsFiredRef: MutableRefObject<number>;
  shotsHitRef: MutableRefObject<number>;
  spawnIndexRef: MutableRefObject<number>;
  customersServedRef: MutableRefObject<number>;
  damageMultiplierRef: MutableRefObject<number>;
  targetModeCountsRef: MutableRefObject<{ front: number; mid: number; back: number; gate: number }>;
  burstsTriggeredRef: MutableRefObject<number>;

  // ── Power ──
  powerRef: MutableRefObject<number>;
  powerRegenMultiplierRef: MutableRefObject<number>;

  // ── Time ──
  timeRef: MutableRefObject<number>;
  hudAccumulatorRef: MutableRefObject<number>;
  fpsRef: MutableRefObject<number>;

  // ── Screen shake ──
  screenShakeRef: MutableRefObject<{ x: number; y: number; duration: number }>;

  // ── Run management ──
  runIdRef: MutableRefObject<number>;
  endHandledRef: MutableRefObject<boolean>;
  endReasonRef: MutableRefObject<'gameover' | 'clear' | null>;

  // ── Spawn ──
  stage1WaveRef: MutableRefObject<{ spawned: number; breatherTimer: number }>;
  bombSilenceTimerRef: MutableRefObject<number>;

  // ── Star weapon ──
  lastStarAttackRef: MutableRefObject<number>;
  hasStarRef: MutableRefObject<boolean>;
  starPassiveTickRef: MutableRefObject<number>;
  starDamageMultRef: MutableRefObject<number>;
  starTelemetryRef: MutableRefObject<StarTelemetry>;

  // ── Foam (Brew) weapon ──
  hasFoamRef: MutableRefObject<boolean>;
  foamBoxIndexRef: MutableRefObject<number>;
  foamPassiveTickRef: MutableRefObject<number>;
  foamSweepRef: MutableRefObject<number>;
  foamTelemetryRef: MutableRefObject<FoamTelemetry>;

  // ── Espresso weapon ──
  hasEspressoRef: MutableRefObject<boolean>;
  espressoBoxIndexRef: MutableRefObject<number>;
  espressoPassiveTickRef: MutableRefObject<number>;
  espressoBarrageRef: MutableRefObject<EspressoBarrageState>;
  espressoTelemetryRef: MutableRefObject<EspressoTelemetry>;

  // ── Ice weapon ──
  hasIceRef: MutableRefObject<boolean>;
  iceBoxIndexRef: MutableRefObject<number>;
  icePassiveTickRef: MutableRefObject<number>;
  iceTelemetryRef: MutableRefObject<IceTelemetry>;

  // ── Core telemetry ──
  telemetryRef: MutableRefObject<CoreTelemetry>;
}

// ─────────────────────────────────────────────────────────────
// SystemActions — returned by systems needing React setState
// ─────────────────────────────────────────────────────────────
export interface SystemActions {
  setGameState?: GameState;
  setPlayPhase?: PlayPhase;
  setStageIndex?: number;
  setPower?: number;
  setTips?: number;
  setTimeSurvived?: number;
  setBossState?: BossState;
  setGateBuildingState?: GateBuilding | null;
  setEvoPopupData?: { options: EvoTrait[]; category: string; slotIndex: number } | null;
  setShowRunSummary?: boolean;
  setStats?: {
    timeSurvived: number;
    customersServed: number;
    totalTips: number;
    coinsEarned: number;
    isNewRecord: boolean;
  };
}
