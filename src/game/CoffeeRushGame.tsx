import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GAME_CONFIG, COLORS, STAGES, TRAVEL_DURATION_BY_STAGE, BOMB_SILENCE_BY_STAGE } from './config';
import { drawGame, drawMenuScene, drawFloatingDamageNumbers, resetRendererState } from './renderer';
import { useGameLoop } from './useGameLoop';
import { useObjectPool } from './useObjectPool';
import { GarageOverlay } from './GarageOverlay';
import { EndScreen } from './EndScreen';
import { RunSummaryOverlay } from './RunSummaryOverlay';
import { GameHUD } from './GameHUD';
import { DebugHUD } from './DebugHUD';
import { PauseMenu } from './PauseMenu';
import { EvoPopup } from './EvoPopup';
import {
  loadProgression,
  saveProgression,
  updateRecords,
  updateChapterClear,
  getPipCost,
  getPurchaseLog,
  clearPurchaseLog,
  consumeEnergy,
} from './persistence';
import type {
  GameState,
  GameMode,
  PlayPhase,
  GateBuilding,
  CartBlock,
  Enemy,
  Projectile,
  TipDrop,
  Particle,
  FloatingDamage,
  GameStats,
  BossState,
  RunTelemetry,
  EvoTrait,
  PurchaseEvent,
} from './types';
import {
  createEnemy,
  createProjectile,
  createTip,
  createParticle,
  createFloatingDamage,
  resetEnemy,
  resetProjectile,
  resetTip,
  resetParticle,
  resetFloatingDamage,
  getStage,
} from './systems/factories';
import {
  spawnParticles as _spawnParticles,
  spawnTip as _spawnTip,
  spawnFloatingDamage as _spawnFloatingDamage,
  updateVFX,
} from './systems/vfx';
import type { GameRefs } from './systems/gameRefs';
import { buildTelemetry as _buildTelemetry } from './systems/telemetry';
import {
  fireProjectile as _fireProjectile,
  fireProjectileAt as _fireProjectileAt,
  updateAutoAttack,
  updateProjectiles,
} from './systems/combat';
import {
  spawnEnemy as _spawnEnemy,
  updateSiegeSpawning,
  updateTravelSpawning,
  updateBreatherSpawning,
} from './systems/spawning';
import { updateEnemies } from './systems/enemies';

export const CoffeeRushGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>('CHAPTER');
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState<GameStats>({ timeSurvived: 0, customersServed: 0, totalTips: 0, coinsEarned: 0, isNewRecord: false });
  const [power, setPower] = useState<number>(0);
  const [tips, setTips] = useState(0);
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [isStressTest, setIsStressTest] = useState(false);
  const [progressionVersion, setProgressionVersion] = useState(0);
  const [scale, setScale] = useState(1);
  
  // PlayPhase state
  const [playPhase, setPlayPhase] = useState<PlayPhase>('TRAVEL');
  const playPhaseRef = useRef<PlayPhase>('TRAVEL');
  
  // Stage tracking
  const stageIndexRef = useRef(1);
  const [stageIndex, setStageIndex] = useState(1);
  
  // Gate Building
  const gateBuildingRef = useRef<GateBuilding | null>(null);
  const [gateBuildingState, setGateBuildingState] = useState<GateBuilding | null>(null);
  
  // Boss state
  const [bossState, setBossState] = useState<BossState>({
    isActive: false, hp: 0, maxHp: 0, spawnedAt: 0, addSpawnTimer: 0, phase: 1, phaseTransitioned: [false, false, false],
  });
  const bossStateRef = useRef<BossState>({
    isActive: false, hp: 0, maxHp: 0, spawnedAt: 0, addSpawnTimer: 0, phase: 1, phaseTransitioned: [false, false, false],
  });
  const bossIncomingRef = useRef<number>(0);
  const bossEnemyRef = useRef<Enemy | null>(null);
  
  // EVO popup state
  const [evoPopupData, setEvoPopupData] = useState<{
    options: EvoTrait[];
    category: string;
    slotIndex: number;
  } | null>(null);
  
  // Travel timer
  const travelTimerRef = useRef<number>(0);
  
  // Simulation freeze
  const isSimulationFrozenRef = useRef<boolean>(false);
  
  // Phase time tracking
  const phaseTimersRef = useRef({ travel: 0, siege: 0, evoPick: 0, boss: 0 });
  // Per-stage phase timing
  const perStageTimersRef = useRef({
    travel: [0, 0, 0, 0, 0],
    siege: [0, 0, 0, 0, 0],
    breather: [0, 0, 0, 0, 0],
  });
  
  // Coins earned from kills and gates this run
  const coinsFromKillsRef = useRef(0);
  const coinsFromGateLumpsRef = useRef(0);
  
  // Gate damage tracking for telemetry
  const gateDamageDealtRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const gateTimeSpentRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const shotsToGateRef = useRef(0);
  const shotsToEnemiesRef = useRef(0);
  const bombGateDamageByGateRef = useRef<number[]>([0, 0, 0, 0, 0]);
  
  // Run summary overlay
  const [showRunSummary, setShowRunSummary] = useState(false);
  const runIdRef = useRef(0);
  const gateDestroyedRef = useRef<boolean[]>([false, false, false, false, false]);
  const burstsTriggeredRef = useRef(0);
  const targetModeCountsRef = useRef({ front: 0, mid: 0, back: 0, gate: 0 });
  const gateCleanupTimerRef = useRef(0);
  
  // Stage 1 pilot refs
  const stage1WaveRef = useRef({ spawned: 0, breatherTimer: 0 });
  const bombSilenceTimerRef = useRef(0);
  
  const [debugInfo, setDebugInfo] = useState<{
    fps: number;
    activeEnemies: number;
    effectiveSpawnInterval: number;
    latchedCount: number;
    shotsFired: number;
    shotsHit: number;
    heavyCount: number;
    activeProjectiles: number;
    power: number;
    stageIndex: number;
    gateHpPercent: number;
    gateDamageDealt: number;
  }>({
    fps: 60, activeEnemies: 0, effectiveSpawnInterval: 900,
    latchedCount: 0, shotsFired: 0, shotsHit: 0, heavyCount: 0,
    activeProjectiles: 0, power: 0, stageIndex: 1, gateHpPercent: 100,
    gateDamageDealt: 0,
  });
  
  // Game state refs
  const blocksRef = useRef<CartBlock[]>([]);
  const latchedCountRef = useRef(0);
  const latchOrderCounterRef = useRef(0);  // Increments each time an enemy latches, for stack ordering
  const screenShakeRef = useRef({ x: 0, y: 0, duration: 0 });
  const lastAttackRef = useRef(-999);
  const lastSpawnRef = useRef(-999);
  const powerRef = useRef<number>(0);
  const timeRef = useRef(0);
  const tipsRef = useRef(0);
  const shotsFiredRef = useRef(0);
  const shotsHitRef = useRef(0);
  const spawnIndexRef = useRef(0);
  const customersServedRef = useRef(0);
  const damageMultiplierRef = useRef(1);
  const powerRegenMultiplierRef = useRef(1);
  const coinsStartRef = useRef(0);
  const endHandledRef = useRef(false);
  const endReasonRef = useRef<'gameover' | 'clear' | null>(null);
  const hudAccumulatorRef = useRef(0);
  const fpsRef = useRef(60);
  
  // Star weapon state
  const lastStarAttackRef = useRef(-999);
  const hasStarRef = useRef(false);
  const starPassiveTickRef = useRef(0);
  const starDamageMultRef = useRef(1);
  const starTelemetryRef = useRef({ passiveDamage: 0, throwDamageEnemies: 0, throwDamageGate: 0, throwUses: 0 });
  
  // Foam (Brew) weapon state
  const hasFoamRef = useRef(false);
  const foamBoxIndexRef = useRef(-1); // which cargo box has foam equipped (-1 = none)
  const foamPassiveTickRef = useRef(0);
  const foamSweepRef = useRef(0);
  const foamTelemetryRef = useRef({ passiveDamage: 0, passiveShotsToGate: 0, burstDamageEnemies: 0, burstDamageGate: 0, burstUses: 0, burstUsedDuringGate: 0, unlockedAt: -1, burstTimestamps: [] as number[] });

  // Espresso Cannon weapon state
  const hasEspressoRef = useRef(false);
  const espressoBoxIndexRef = useRef(-1);
  const espressoPassiveTickRef = useRef(0);
  const espressoBarrageRef = useRef({ active: false, timer: 0, shotsFired: 0 });
  const espressoTelemetryRef = useRef({ passiveDamage: 0, barrageDamageEnemies: 0, barrageDamageGate: 0, barrageUses: 0 });

  // Ice Blender weapon state
  const hasIceRef = useRef(false);
  const iceBoxIndexRef = useRef(-1);
  const icePassiveTickRef = useRef(0);
  const iceTelemetryRef = useRef({ passiveDamage: 0, slowsApplied: 0, stormDamageEnemies: 0, stormDamageGate: 0, stormUses: 0 });
  
  // Telemetry
  const telemetryRef = useRef({
    maxLatchedPeak: 0,
    timeAtMaxLatched: 0,
    blocksLost: 0,
    timeToFirstBlockLost: -1,
    tonicBombUses: 0,
    enemiesSpawned: { normal: 0, heavy: 0, boss: 0 },
    enemiesKilled: { normal: 0, heavy: 0, boss: 0 },
  });
  
  // Scale-to-fit
  useEffect(() => {
    const computeScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / GAME_CONFIG.CANVAS_WIDTH, vh / GAME_CONFIG.CANVAS_HEIGHT);
      setScale(Math.max(0.5, Math.min(s, 1.2)));
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    window.addEventListener('orientationchange', computeScale);
    return () => {
      window.removeEventListener('resize', computeScale);
      window.removeEventListener('orientationchange', computeScale);
    };
  }, []);
  
  // Object pools (with reset functions to prevent stale data on reuse)
  const enemyPool = useObjectPool(createEnemy, GAME_CONFIG.MAX_ENEMIES, resetEnemy);
  const projectilePool = useObjectPool(createProjectile, 80, resetProjectile);
  const tipPool = useObjectPool(createTip, 30, resetTip);
  const particlePool = useObjectPool(createParticle, GAME_CONFIG.MAX_PARTICLES, resetParticle);
  const floatingDamagePool = useObjectPool(createFloatingDamage, 20, resetFloatingDamage);

  // ── Assemble GameRefs "ref bag" for system functions ──
  const refs: GameRefs = {
    // Pools
    enemyPool, projectilePool, particlePool, tipPool, floatingDamagePool,
    // Canvas
    canvasRef,
    // Phase & stage
    playPhaseRef, stageIndexRef, travelTimerRef, isSimulationFrozenRef,
    // Phase timing
    phaseTimersRef, perStageTimersRef,
    // Economy
    coinsFromKillsRef, coinsFromGateLumpsRef, tipsRef, coinsStartRef,
    // Gate telemetry
    gateDamageDealtRef, gateTimeSpentRef, shotsToGateRef, shotsToEnemiesRef,
    bombGateDamageByGateRef, gateDestroyedRef, gateCleanupTimerRef,
    // Gate building
    gateBuildingRef,
    // Boss
    bossStateRef, bossIncomingRef, bossEnemyRef,
    // Blocks & latching
    blocksRef, latchedCountRef, latchOrderCounterRef,
    // Combat
    lastAttackRef, lastSpawnRef, shotsFiredRef, shotsHitRef, spawnIndexRef,
    customersServedRef, damageMultiplierRef, targetModeCountsRef, burstsTriggeredRef,
    // Power
    powerRef, powerRegenMultiplierRef,
    // Time
    timeRef, hudAccumulatorRef, fpsRef,
    // Screen shake
    screenShakeRef,
    // Run management
    runIdRef, endHandledRef, endReasonRef,
    // Spawn
    stage1WaveRef, bombSilenceTimerRef,
    // Star weapon
    lastStarAttackRef, hasStarRef, starPassiveTickRef, starDamageMultRef, starTelemetryRef,
    // Foam weapon
    hasFoamRef, foamBoxIndexRef, foamPassiveTickRef, foamSweepRef, foamTelemetryRef,
    // Espresso weapon
    hasEspressoRef, espressoBoxIndexRef, espressoPassiveTickRef, espressoBarrageRef, espressoTelemetryRef,
    // Ice weapon
    hasIceRef, iceBoxIndexRef, icePassiveTickRef, iceTelemetryRef,
    // Core telemetry
    telemetryRef,
  };

  const initGame = useCallback(() => {
    const progression = loadProgression();

    resetRendererState();
    endHandledRef.current = false;
    endReasonRef.current = null;
    coinsStartRef.current = progression.totalCoins;
    
    // Calculate multipliers from upgrade levels (continuous upgrade system)
    // Damage: base multiplier + flat bonus per level (e.g. 12 + 1*level = 13, 14, 15...)
    const damageMultiplier = 1 + progression.damagePips * GAME_CONFIG.DAMAGE_BONUS_PER_PIP;
    // Power regen: base + per-upgrade bonus (0.35 + 0.02*level)
    const powerRegenMult = 1 + progression.powerPips * GAME_CONFIG.POWER_REGEN_BONUS_PER_PIP;
    
    // Block count from blockCountLevel
    const blockCount = 1 + progression.blockCountLevel;
    
    // Initialize blocks
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
    const baseHp = GAME_CONFIG.BLOCK_MAX_HP;
    // Chassis (i=0) gets average pip bonus from all block pips
    const totalBlockPips = (progression.blockPips || []).reduce((sum: number, p: number) => sum + p, 0);
    const avgBlockPips = progression.blockCountLevel > 0 ? totalBlockPips / progression.blockCountLevel : 0;
    blocksRef.current = Array.from({ length: blockCount }, (_, i) => {
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
    
    damageMultiplierRef.current = damageMultiplier;
    powerRegenMultiplierRef.current = powerRegenMult;
    
    // Check for star weapon (purchased from Garage, per-box)
    hasStarRef.current = progression.starPerBox?.some(v => v) ?? progression.starUnlocked;
    starDamageMultRef.current = 1 + (progression.starPips ?? 0) * GAME_CONFIG.STAR_DAMAGE_BONUS_PER_PIP;
    
    // Check for brew weapon (purchased from Garage, per-box)
    hasFoamRef.current = progression.brewPerBox?.some(v => v) ?? false;
    foamBoxIndexRef.current = progression.brewPerBox?.findIndex(v => v) ?? -1;

    // Check for espresso weapon
    hasEspressoRef.current = progression.espressoPerBox?.some(v => v) ?? false;
    espressoBoxIndexRef.current = progression.espressoPerBox?.findIndex(v => v) ?? -1;

    // Check for ice weapon
    hasIceRef.current = progression.icePerBox?.some(v => v) ?? false;
    iceBoxIndexRef.current = progression.icePerBox?.findIndex(v => v) ?? -1;
    
    // Reset all refs
    latchedCountRef.current = 0;
    latchOrderCounterRef.current = 0;
    screenShakeRef.current = { x: 0, y: 0, duration: 0 };
    lastAttackRef.current = -999;
    lastSpawnRef.current = -999;
    lastStarAttackRef.current = -999;
    starPassiveTickRef.current = 0;
    starTelemetryRef.current = { passiveDamage: 0, throwDamageEnemies: 0, throwDamageGate: 0, throwUses: 0 };
    foamPassiveTickRef.current = 0;
    foamSweepRef.current = 0;
    foamTelemetryRef.current = { passiveDamage: 0, passiveShotsToGate: 0, burstDamageEnemies: 0, burstDamageGate: 0, burstUses: 0, burstUsedDuringGate: 0, unlockedAt: -1, burstTimestamps: [] };
    espressoPassiveTickRef.current = 0;
    espressoBarrageRef.current = { active: false, timer: 0, shotsFired: 0 };
    espressoTelemetryRef.current = { passiveDamage: 0, barrageDamageEnemies: 0, barrageDamageGate: 0, barrageUses: 0 };
    icePassiveTickRef.current = 0;
    iceTelemetryRef.current = { passiveDamage: 0, slowsApplied: 0, stormDamageEnemies: 0, stormDamageGate: 0, stormUses: 0 };
    powerRef.current = 0;
    timeRef.current = 0;
    tipsRef.current = 0;
    customersServedRef.current = 0;
    shotsFiredRef.current = 0;
    shotsHitRef.current = 0;
    spawnIndexRef.current = 0;
    coinsFromKillsRef.current = 0;
    coinsFromGateLumpsRef.current = 0;
    gateDamageDealtRef.current = [0, 0, 0, 0, 0];
    gateTimeSpentRef.current = [0, 0, 0, 0, 0];
    shotsToGateRef.current = 0;
    shotsToEnemiesRef.current = 0;
    bombGateDamageByGateRef.current = [0, 0, 0, 0, 0];
    gateCleanupTimerRef.current = 0;
    runIdRef.current = Date.now();
    gateDestroyedRef.current = [false, false, false, false, false];
    burstsTriggeredRef.current = 0;
    targetModeCountsRef.current = { front: 0, mid: 0, back: 0, gate: 0 };
    stage1WaveRef.current = { spawned: 0, breatherTimer: 0 };
    bombSilenceTimerRef.current = 0;
    setShowRunSummary(false);
    
    telemetryRef.current = {
      maxLatchedPeak: 0, timeAtMaxLatched: 0,
      blocksLost: 0, timeToFirstBlockLost: -1,
      tonicBombUses: 0,
      enemiesSpawned: { normal: 0, heavy: 0, boss: 0 },
      enemiesKilled: { normal: 0, heavy: 0, boss: 0 },
    };
    
    // Clear pools
    enemyPool.clear();
    projectilePool.clear();
    tipPool.clear();
    particlePool.clear();
    floatingDamagePool.clear();
    
    // Reset state
    setPower(0);
    setTips(0);
    setTimeSurvived(0);
    
    // Boss reset
    bossStateRef.current = { isActive: false, hp: 0, maxHp: 0, spawnedAt: 0, addSpawnTimer: 0, phase: 1, phaseTransitioned: [false, false, false] };
    setBossState(bossStateRef.current);
    bossIncomingRef.current = 0;
    bossEnemyRef.current = null;
    
    // Stage/phase reset
    stageIndexRef.current = 1;
    setStageIndex(1);
    playPhaseRef.current = 'TRAVEL';
    setPlayPhase('TRAVEL');
    travelTimerRef.current = TRAVEL_DURATION_BY_STAGE[0];
    isSimulationFrozenRef.current = false;
    phaseTimersRef.current = { travel: 0, siege: 0, evoPick: 0, boss: 0 };
    perStageTimersRef.current = { travel: [0, 0, 0, 0, 0], siege: [0, 0, 0, 0, 0], breather: [0, 0, 0, 0, 0] };
    gateBuildingRef.current = null;
    setGateBuildingState(null);
    setEvoPopupData(null);
  }, [enemyPool, projectilePool, tipPool, particlePool, floatingDamagePool]);
  
  const handlePlay = useCallback((mode: GameMode) => {
    // Consume energy before starting (EndScreen and GarageOverlay both call this)
    const result = consumeEnergy();
    if (!result.success) {
      // Not enough energy - go back to menu
      setGameState('MENU');
      return;
    }
    setGameMode(mode);
    initGame();
    setIsPaused(false);
    setGameState('PLAY');
  }, [initGame]);
  
  const handlePause = useCallback(() => setIsPaused(true), []);
  const handleContinue = useCallback(() => setIsPaused(false), []);
  
  const handleLeave = useCallback(() => {
    if (endHandledRef.current) {
      setIsPaused(false);
      setGameState('MENU');
      return;
    }
    endHandledRef.current = true;
    const coinsEarned = coinsFromKillsRef.current + coinsFromGateLumpsRef.current;
    if (coinsEarned > 0) {
      const current = loadProgression();
      saveProgression({ ...current, totalCoins: current.totalCoins + coinsEarned });
    }
    setIsPaused(false);
    setGameState('MENU');
  }, []);
  
  const buildTelemetry = useCallback((): RunTelemetry => {
    return _buildTelemetry(refs, gameMode);
  }, [gameMode]);
  
  const handleChapterClear = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    endReasonRef.current = 'clear';
    isSimulationFrozenRef.current = true;
    
    const capturedCoinsStart = coinsStartRef.current;
    const bossStage = getStage(6);
    const clearBonus = bossStage.clearBonus ?? 0;
    const killCoins = coinsFromKillsRef.current;
    const gateCoins = coinsFromGateLumpsRef.current;
    const totalToAdd = killCoins + gateCoins + clearBonus;
    
    const current = loadProgression();
    const newTotal = current.totalCoins + totalToAdd;
    
    saveProgression({
      ...current,
      chapter1Cleared: true,
      bestChapter1Time: current.bestChapter1Time > 0 
        ? Math.min(current.bestChapter1Time, timeRef.current) : timeRef.current,
      totalCoins: newTotal,
      bestStageReached: Math.max(current.bestStageReached, 6),
    });
    
    const telemetry = buildTelemetry();
    telemetry.bossOutcome = 'defeated';
    telemetry.bossHpPercent = 0;
    telemetry.clearBonusCoins = clearBonus;
    telemetry.coinsTotalBreakdown = killCoins + gateCoins + clearBonus;
    telemetry.coinsStart = capturedCoinsStart;
    telemetry.coinsEnd = newTotal;
    telemetry.coinsEarnedActual = newTotal - capturedCoinsStart;
    telemetry.economyDelta = telemetry.coinsEarnedActual - telemetry.coinsTotalBreakdown;
    
    if (Math.abs(telemetry.economyDelta) > 1) {
      telemetry.deltaExplanation = `Start:${capturedCoinsStart} End:${newTotal} Kills:${killCoins} Gates:${gateCoins} Clear:${clearBonus} → Δ=${telemetry.economyDelta}`;
    }
    
    setStats({
      timeSurvived: timeRef.current,
      customersServed: customersServedRef.current,
      totalTips: killCoins + gateCoins,
      coinsEarned: totalToAdd,
      isNewRecord: false,
      isChapterClear: true,
      stageReached: 6,
      telemetry,
    });
    setGameState('END');
    setShowRunSummary(true);
  }, [buildTelemetry]);
  
  const handleGameOver = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    endReasonRef.current = 'gameover';
    isSimulationFrozenRef.current = true;
    
    const capturedCoinsStart = coinsStartRef.current;
    const killCoins = coinsFromKillsRef.current;
    const gateCoins = coinsFromGateLumpsRef.current;
    const totalToAdd = killCoins + gateCoins;
    
    const current = loadProgression();
    const newTotal = current.totalCoins + totalToAdd;
    const isNewTimeRecord = timeRef.current > current.bestTimeSurvivedSeconds;
    
    saveProgression({
      ...current,
      bestTimeSurvivedSeconds: Math.max(current.bestTimeSurvivedSeconds, timeRef.current),
      bestCustomersServed: Math.max(current.bestCustomersServed, customersServedRef.current),
      totalCoins: newTotal,
      bestStageReached: Math.max(current.bestStageReached, stageIndexRef.current),
    });
    
    const telemetry = buildTelemetry();
    telemetry.coinsStart = capturedCoinsStart;
    telemetry.coinsEnd = newTotal;
    telemetry.coinsEarnedActual = newTotal - capturedCoinsStart;
    telemetry.coinsTotalBreakdown = totalToAdd;
    telemetry.economyDelta = telemetry.coinsEarnedActual - telemetry.coinsTotalBreakdown;
    
    if (Math.abs(telemetry.economyDelta) > 1) {
      telemetry.deltaExplanation = `Start:${capturedCoinsStart} End:${newTotal} Kills:${killCoins} Gates:${gateCoins} → Δ=${telemetry.economyDelta}`;
    }
    
    setStats({
      timeSurvived: timeRef.current,
      customersServed: customersServedRef.current,
      totalTips: killCoins + gateCoins,
      coinsEarned: totalToAdd,
      isNewRecord: isNewTimeRecord,
      stageReached: stageIndexRef.current,
      telemetry,
    });
    setGameState('END');
    setShowRunSummary(true);
  }, [buildTelemetry]);
  
  const handleHome = useCallback(() => setGameState('MENU'), []);
  
  // ═══════════════════════════════════════════════════════════════════════
  // SPAWN ENEMY (delegated to spawning system)
  const spawnEnemy = useCallback(() => {
    _spawnEnemy(refs);
  }, []);
  
  const fireProjectile = useCallback((targetEnemy: Enemy, pierce = false, isStar = false) => {
    _fireProjectile(refs, targetEnemy, isStressTest, pierce, isStar);
  }, [isStressTest]);

  const fireProjectileAt = useCallback((targetX: number, targetY: number, customDamage?: number, pierce = false, isStar = false) => {
    _fireProjectileAt(refs, targetX, targetY, isStressTest, customDamage, pierce, isStar);
  }, [isStressTest]);

  const spawnParticles = useCallback((x: number, y: number, type: Particle['type'], count: number) => {
    _spawnParticles(particlePool, x, y, type, count);
  }, [particlePool]);

  const spawnTip = useCallback((x: number, y: number, value: number) => {
    _spawnTip(tipPool, x, y, value);
  }, [tipPool]);

  const spawnFloatingDamage = useCallback((x: number, y: number, value: number, color?: string) => {
    _spawnFloatingDamage(floatingDamagePool, x, y, value, color);
  }, [floatingDamagePool]);
  
  // ═══════════════════════════════════════════════════════════════════════
  // TONIC BOMB (damages enemies + gate)
  // ═══════════════════════════════════════════════════════════════════════
  const handleTonicBomb = useCallback(() => {
    if (powerRef.current < GAME_CONFIG.TONIC_BOMB_COST) return;
    
    telemetryRef.current.tonicBombUses++;
    powerRef.current -= GAME_CONFIG.TONIC_BOMB_COST;
    setPower(powerRef.current);
    
    screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
    
    const bombX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + 50;
    const bombY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 30;
    
    spawnParticles(bombX, bombY, 'confetti', 20);
    spawnParticles(bombX, bombY, 'steam', 10);
    
    // Damage enemies
    let totalBombDmg = 0;
    enemyPool.getActive().forEach(enemy => {
      if (enemy.state === 'SERVED' || enemy.isServed) return;
      const dx = enemy.x - bombX;
      const dy = (enemy.y - enemy.height / 2) - bombY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GAME_CONFIG.TONIC_BOMB_RADIUS) {
        let dmg = GAME_CONFIG.TONIC_BOMB_DAMAGE;
        if (enemy.shieldHp > 0) {
          const absorbed = Math.min(enemy.shieldHp, dmg);
          enemy.shieldHp -= absorbed; dmg -= absorbed;
        }
        enemy.hp -= dmg;
        totalBombDmg += GAME_CONFIG.TONIC_BOMB_DAMAGE;
        spawnParticles(enemy.x, enemy.y - enemy.height / 2, 'sparkle', 3);
      }
    });
    // Show total bomb damage as floating number
    if (totalBombDmg > 0) {
      spawnFloatingDamage(bombX, bombY - 30, totalBombDmg, 'hsl(25, 80%, 55%)');
    }

    // Damage gate building (bomb always damages gate)
    const gate = gateBuildingRef.current;
    if (gate && !gate.isDestroyed) {
      const gdx = gate.x + gate.width / 2 - bombX;
      const gdy = gate.y + gate.height / 2 - bombY;
      const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
      if (gDist < GAME_CONFIG.TONIC_BOMB_RADIUS + gate.width) {
        gate.hp -= GAME_CONFIG.TONIC_BOMB_DAMAGE;
        const si = stageIndexRef.current - 1;
        if (si >= 0 && si < 5) {
          gateDamageDealtRef.current[si] += GAME_CONFIG.TONIC_BOMB_DAMAGE;
          bombGateDamageByGateRef.current[si] += GAME_CONFIG.TONIC_BOMB_DAMAGE;
        }
        spawnParticles(gate.x + gate.width / 2, gate.y, 'sparkle', 5);
        spawnFloatingDamage(gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.TONIC_BOMB_DAMAGE, 'hsl(45, 90%, 55%)');
      }
    }
    
    // All stages SIEGE: bomb creates spawn silence window
    if (playPhaseRef.current === 'SIEGE') {
      const si = stageIndexRef.current;
      const silenceDuration = BOMB_SILENCE_BY_STAGE[si - 1] ?? 0.6;
      bombSilenceTimerRef.current = silenceDuration;
      lastSpawnRef.current = timeRef.current; // CRITICAL: reset spawn timer (safeguard #3)
      if (si === 1 || si === 2) {
        stage1WaveRef.current.spawned = 0; // Reset wave counter
        stage1WaveRef.current.breatherTimer = 0;
      }
    }
  }, [enemyPool, spawnParticles, spawnFloatingDamage]);

  // ═══════════════════════════════════════════════════════════════════════
  // STAR THROW (piercing power skill)
  // ═══════════════════════════════════════════════════════════════════════
  const handleStarThrow = useCallback(() => {
    if (!hasStarRef.current) return;
    if (powerRef.current < GAME_CONFIG.STAR_THROW_COST) return;
    
    powerRef.current -= GAME_CONFIG.STAR_THROW_COST;
    setPower(powerRef.current);
    starTelemetryRef.current.throwUses++;
    
    const activeBlocks = blocksRef.current.filter(b => !b.destroyed);
    if (activeBlocks.length === 0) return;
    
    const topBlock = activeBlocks[activeBlocks.length - 1];
    const proj = projectilePool.acquire();
    if (!proj) return;
    
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
    proj.x = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
    proj.y = groundY - 30;
    proj.targetX = GAME_CONFIG.CANVAS_WIDTH + 100;
    proj.targetY = proj.y;
    proj.speed = GAME_CONFIG.STAR_THROW_SPEED;
    proj.damage = Math.floor(GAME_CONFIG.STAR_THROW_DAMAGE * damageMultiplierRef.current * starDamageMultRef.current);
    proj.radius = GAME_CONFIG.STAR_THROW_RADIUS;
    proj.pierce = true;
    proj.isStar = true;
    proj.isEspresso = false;
    proj.isIce = false;
    proj.isBrew = false;
    proj.hitGate = false;
  }, [projectilePool]);
  
  // ═══════════════════════════════════════════════════════════════════════
  // FOAM BURST (canvas-wide foam wave — AoE power skill)
  // ═══════════════════════════════════════════════════════════════════════
  const handleFoamBurst = useCallback(() => {
    if (!hasFoamRef.current) return;
    // If equipped box is destroyed, disable foam entirely
    const foamBlock = blocksRef.current.find(b => b.id === foamBoxIndexRef.current + 1);
    if (!foamBlock || foamBlock.destroyed) {
      hasFoamRef.current = false;
      return;
    }
    if (powerRef.current < GAME_CONFIG.BREW_BURST_COST) return;
    
    powerRef.current -= GAME_CONFIG.BREW_BURST_COST;
    setPower(powerRef.current);
    foamTelemetryRef.current.burstUses++;
    foamTelemetryRef.current.burstTimestamps.push(timeRef.current);
    
    // Track burst during gate presence
    const burstGate = gateBuildingRef.current;
    if (burstGate && !burstGate.isDestroyed) {
      foamTelemetryRef.current.burstUsedDuringGate++;
    }
    
    screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
    
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
    
    // Spawn foam wave particles across the road (dense, bright for premium feel)
    for (let px = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH; px < GAME_CONFIG.CANVAS_WIDTH; px += 12) {
      spawnParticles(px, groundY - 30 + (Math.random() - 0.5) * 30, 'steam', 6);
    }
    
    // Damage ALL enemies on screen
    let totalBurstDmg = 0;
    enemyPool.getActive().forEach(enemy => {
      if (enemy.state === 'SERVED' || enemy.isServed) return;
      let dmg = GAME_CONFIG.BREW_BURST_DAMAGE;
      if (enemy.shieldHp > 0) {
        const absorbed = Math.min(enemy.shieldHp, dmg);
        enemy.shieldHp -= absorbed; dmg -= absorbed;
      }
      enemy.hp -= dmg;
      totalBurstDmg += GAME_CONFIG.BREW_BURST_DAMAGE;
      foamTelemetryRef.current.burstDamageEnemies += GAME_CONFIG.BREW_BURST_DAMAGE;
      spawnParticles(enemy.x, enemy.y - enemy.height / 2, 'sparkle', 2);
    });
    // Show total burst damage as floating number
    if (totalBurstDmg > 0) {
      spawnFloatingDamage(GAME_CONFIG.CANVAS_WIDTH / 2, groundY - 80, totalBurstDmg, 'hsl(200, 70%, 75%)');
    }

    // Damage gate (flat damage)
    const gate = gateBuildingRef.current;
    if (gate && !gate.isDestroyed) {
      gate.hp -= GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
      foamTelemetryRef.current.burstDamageGate += GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
      const si = stageIndexRef.current - 1;
      if (si >= 0 && si < 5) {
        gateDamageDealtRef.current[si] += GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
      }
      spawnParticles(gate.x + gate.width / 2, gate.y, 'sparkle', 4);
      spawnFloatingDamage(gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.BREW_BURST_GATE_DAMAGE, 'hsl(200, 70%, 75%)');
    }
  }, [enemyPool, spawnParticles, spawnFloatingDamage]);

  // ═══════════════════════════════════════════════════════════════════════
  // ESPRESSO BARRAGE (rapid-fire carpet bombardment — power skill)
  // ═══════════════════════════════════════════════════════════════════════
  const handleEspressoBarrage = useCallback(() => {
    if (!hasEspressoRef.current) return;
    const espBlock = blocksRef.current.find(b => b.id === espressoBoxIndexRef.current + 1);
    if (!espBlock || espBlock.destroyed) { hasEspressoRef.current = false; return; }
    if (powerRef.current < GAME_CONFIG.ESPRESSO_BARRAGE_COST) return;

    powerRef.current -= GAME_CONFIG.ESPRESSO_BARRAGE_COST;
    setPower(powerRef.current);
    screenShakeRef.current = { x: 0, y: 0, duration: 0.2 };

    // Activate barrage mode (fires shots over ESPRESSO_BARRAGE_DURATION in game loop)
    espressoBarrageRef.current = {
      active: true,
      timer: GAME_CONFIG.ESPRESSO_BARRAGE_DURATION,
      shotsFired: 0,
    };
    espressoTelemetryRef.current.barrageUses++;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // ICE STORM (AoE slow + damage — power skill)
  // ═══════════════════════════════════════════════════════════════════════
  const handleIceStorm = useCallback(() => {
    if (!hasIceRef.current) return;
    const iceBlock = blocksRef.current.find(b => b.id === iceBoxIndexRef.current + 1);
    if (!iceBlock || iceBlock.destroyed) { hasIceRef.current = false; return; }
    if (powerRef.current < GAME_CONFIG.ICE_STORM_COST) return;

    powerRef.current -= GAME_CONFIG.ICE_STORM_COST;
    setPower(powerRef.current);
    screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
    iceTelemetryRef.current.stormUses++;

    const stormX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + 80;
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
    const stormY = groundY - 60;

    // Spawn ice particles
    spawnParticles(stormX, stormY, 'steam', 15);

    // Damage + slow ALL enemies in radius
    let totalDmg = 0;
    enemyPool.getActive().forEach(enemy => {
      if (enemy.state === 'SERVED' || enemy.isServed) return;
      const dx = enemy.x - stormX;
      const dy = (enemy.y - enemy.height / 2) - stormY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GAME_CONFIG.ICE_STORM_RADIUS) {
        let dmg = GAME_CONFIG.ICE_STORM_DAMAGE;
        if (enemy.shieldHp > 0) {
          const absorbed = Math.min(enemy.shieldHp, dmg);
          enemy.shieldHp -= absorbed; dmg -= absorbed;
        }
        enemy.hp -= dmg;
        totalDmg += GAME_CONFIG.ICE_STORM_DAMAGE;
        iceTelemetryRef.current.stormDamageEnemies += GAME_CONFIG.ICE_STORM_DAMAGE;
        // Apply slow
        enemy.slowTimer = GAME_CONFIG.ICE_STORM_SLOW_DURATION;
        enemy.slowFactor = GAME_CONFIG.ICE_STORM_SLOW_FACTOR;
        spawnParticles(enemy.x, enemy.y - enemy.height / 2, 'sparkle', 2);
      }
    });
    if (totalDmg > 0) {
      spawnFloatingDamage(stormX, stormY - 30, totalDmg, 'hsl(200, 80%, 70%)');
    }

    // Damage gate
    const gate = gateBuildingRef.current;
    if (gate && !gate.isDestroyed) {
      const gdx = gate.x + gate.width / 2 - stormX;
      const gdy = gate.y + gate.height / 2 - stormY;
      const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
      if (gDist < GAME_CONFIG.ICE_STORM_RADIUS + gate.width) {
        gate.hp -= GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
        iceTelemetryRef.current.stormDamageGate += GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
        const si = stageIndexRef.current - 1;
        if (si >= 0 && si < 5) gateDamageDealtRef.current[si] += GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
        spawnParticles(gate.x + gate.width / 2, gate.y, 'sparkle', 4);
        spawnFloatingDamage(gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.ICE_STORM_GATE_DAMAGE, 'hsl(200, 80%, 70%)');
      }
    }
  }, [enemyPool, spawnParticles, spawnFloatingDamage]);

  // ═══════════════════════════════════════════════════════════════════════
  // EVO CHOICE HANDLER
  // ═══════════════════════════════════════════════════════════════════════
  const handleEvoChoice = useCallback((trait: EvoTrait) => {
    // Apply trait effects (run-persistent via persistence)
    // For now, just save the choice and unfreeze
    setEvoPopupData(null);
    isSimulationFrozenRef.current = false;
    
    // Advance to next stage or boss
    const currentStage = stageIndexRef.current;
    if (currentStage >= 5) {
      // After Stage 5, go to Boss
      stageIndexRef.current = 6;
      setStageIndex(6);
      playPhaseRef.current = 'BOSS';
      setPlayPhase('BOSS');
    } else {
      // Next gate
      stageIndexRef.current = currentStage + 1;
      setStageIndex(currentStage + 1);
      travelTimerRef.current = TRAVEL_DURATION_BY_STAGE[currentStage] ?? GAME_CONFIG.TRAVEL_DURATION;
      playPhaseRef.current = 'TRAVEL';
      setPlayPhase('TRAVEL');
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════
  // CREATE GATE BUILDING
  // ═══════════════════════════════════════════════════════════════════════
  const createGateBuilding = useCallback((si: number) => {
    const stage = getStage(si);
    if (stage.isBoss || !stage.gateHP) return null;
    
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
    const gate: GateBuilding = {
      hp: stage.gateHP,
      maxHp: stage.gateHP,
      x: GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.GATE_BUILDING_X_OFFSET,
      y: groundY - GAME_CONFIG.GATE_BUILDING_HEIGHT,
      width: GAME_CONFIG.GATE_BUILDING_WIDTH,
      height: GAME_CONFIG.GATE_BUILDING_HEIGHT,
      isDestroyed: false,
      stageIndex: si,
      breathingActive: false,
      breathingTimer: 0,
      crossedThresholds: [],
      crumbleTimer: 0,
      lastHitTime: 0,
    };
    return gate;
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════
  // GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════
  const gameLoop = useCallback((deltaTime: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const blocks = blocksRef.current;
    const currentTime = timeRef.current;
    
    // Phase time tracking
    const phaseKey = playPhaseRef.current === 'EVO_PICK' ? 'evoPick' 
      : playPhaseRef.current === 'APPROACH' ? 'travel'
      : playPhaseRef.current === 'VICTORY' ? 'siege'
      : playPhaseRef.current === 'BREATHER' ? 'travel'
      : playPhaseRef.current.toLowerCase() as 'travel' | 'siege' | 'boss';
    if (phaseKey in phaseTimersRef.current) phaseTimersRef.current[phaseKey] += deltaTime;
    
    // Per-stage phase timing
    const psi = stageIndexRef.current - 1; // 0-indexed
    if (psi >= 0 && psi < 5) {
      const phase = playPhaseRef.current;
      if (phase === 'TRAVEL' || phase === 'APPROACH') {
        perStageTimersRef.current.travel[psi] += deltaTime;
      } else if (phase === 'SIEGE' || phase === 'VICTORY') {
        perStageTimersRef.current.siege[psi] += deltaTime;
      } else if (phase === 'BREATHER') {
        perStageTimersRef.current.breather[psi] += deltaTime;
      }
    }
    
    // Simulation freeze (EVO popup)
    if (isSimulationFrozenRef.current) {
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      drawGame(ctx, blocks, enemyPool.getActive(), projectilePool.getActive(),
        tipPool.getActive(), particlePool.getActive(), screenShakeRef.current,
        bossStateRef.current, bossIncomingRef.current, playPhaseRef.current,
        deltaTime, gateBuildingRef.current, currentTime, hasStarRef.current, hasFoamRef.current, foamBoxIndexRef.current,
        hasEspressoRef.current, espressoBoxIndexRef.current, hasIceRef.current, iceBoxIndexRef.current);
      drawFloatingDamageNumbers(ctx, floatingDamagePool.getActive(), screenShakeRef.current);
      return;
    }

    // ── Time + HUD Throttle ──
    timeRef.current += deltaTime;
    hudAccumulatorRef.current += deltaTime;
    const shouldUpdateHUD = hudAccumulatorRef.current >= 0.1;
    if (shouldUpdateHUD) {
      hudAccumulatorRef.current = 0;
      setTimeSurvived(timeRef.current);
      fpsRef.current = 0.9 * fpsRef.current + 0.1 * (1 / deltaTime);
      
      setDebugInfo({
        fps: fpsRef.current,
        activeEnemies: enemyPool.getActive().length,
        effectiveSpawnInterval: getStage(stageIndexRef.current).spawnInterval,
        latchedCount: latchedCountRef.current,
        shotsFired: shotsFiredRef.current,
        shotsHit: shotsHitRef.current,
        heavyCount: enemyPool.getActive().filter(e => e.kind === 'HEAVY' && !e.isServed).length,
        activeProjectiles: projectilePool.getActive().length,
        power: powerRef.current,
        stageIndex: stageIndexRef.current,
        gateHpPercent: gateBuildingRef.current ? Math.round((gateBuildingRef.current.hp / gateBuildingRef.current.maxHp) * 100) : 0,
        gateDamageDealt: gateDamageDealtRef.current[Math.max(0, stageIndexRef.current - 1)] ?? 0,
      });
      setBossState({ ...bossStateRef.current });
      setGateBuildingState(gateBuildingRef.current ? { ...gateBuildingRef.current } : null);
    }
    
    // ── Power regeneration (uncapped) ──
    if (powerRef.current < GAME_CONFIG.POWER_POOL_SOFT_CAP) {
      const effectiveRegen = GAME_CONFIG.POWER_START_REGEN * powerRegenMultiplierRef.current;
      powerRef.current = Math.min(GAME_CONFIG.POWER_POOL_SOFT_CAP, powerRef.current + effectiveRegen * deltaTime);
      if (shouldUpdateHUD) setPower(powerRef.current);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // TRAVEL PHASE
    // ═══════════════════════════════════════════════════════════════════
    if (playPhaseRef.current === 'TRAVEL') {
      travelTimerRef.current -= deltaTime;

      // Spawn scheduling (delegated to spawning system)
      updateTravelSpawning(refs, currentTime);

      // Phase transition
      if (travelTimerRef.current <= 0) {
        const si = stageIndexRef.current;
        const stage = getStage(si);

        if (si > 1 && stage.isBoss) {
          playPhaseRef.current = 'BOSS';
          setPlayPhase('BOSS');
        } else {
          // Transition to APPROACH (gate slides in)
          console.log('STATE -> APPROACH' + (si > 1 ? ' (Stage ' + si + ')' : ''));
          playPhaseRef.current = 'APPROACH';
          setPlayPhase('APPROACH');
          const gate = createGateBuilding(si > 1 ? si : 1);
          if (gate) {
            gate.x = GAME_CONFIG.GATE_START_X;
            gateBuildingRef.current = gate;
            setGateBuildingState(gate);
          }
          travelTimerRef.current = GAME_CONFIG.APPROACH_DURATION;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // APPROACH PHASE (all gate stages: gate slides in)
    // ═══════════════════════════════════════════════════════════════════
    if (playPhaseRef.current === 'APPROACH') {
      travelTimerRef.current -= deltaTime;
      
      // Lerp gate to final position
      const gate = gateBuildingRef.current;
      if (gate) {
        const finalX = GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.GATE_BUILDING_X_OFFSET;
        const progress = 1 - Math.max(0, travelTimerRef.current / GAME_CONFIG.APPROACH_DURATION);
        gate.x = GAME_CONFIG.GATE_START_X + (finalX - GAME_CONFIG.GATE_START_X) * Math.min(1, progress);
      }
      
      // No enemy spawning during approach
      
      if (travelTimerRef.current <= 0) {
        // Gate in position, start siege
        if (gate) {
          gate.x = GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.GATE_BUILDING_X_OFFSET;
        }
        console.log('STATE -> SIEGE (Stage ' + stageIndexRef.current + ')');
        playPhaseRef.current = 'SIEGE';
        setPlayPhase('SIEGE');
        lastSpawnRef.current = timeRef.current;
        // Init wave refs for wave-based stages (Stage 1 & 2)
        if (stageIndexRef.current === 1 || stageIndexRef.current === 2) {
          stage1WaveRef.current = { spawned: 0, breatherTimer: 0 };
        }
        bombSilenceTimerRef.current = 0;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // VICTORY PHASE (all gate stages: gate destroyed cleanup)
    // ═══════════════════════════════════════════════════════════════════
    if (playPhaseRef.current === 'VICTORY') {
      gateCleanupTimerRef.current -= deltaTime;
      
      // Fade remaining enemies
      enemyPool.getActive().forEach(enemy => {
        if (enemy.state !== 'SERVED' && !enemy.isServed) {
          enemy.hp = 0;
          enemy.state = 'SERVED';
          enemy.isServed = true;
          enemy.servedTimer = 0.3;
        }
      });
      
      if (gateCleanupTimerRef.current <= 0) {
        // Transition to BREATHER (pacing window before next TRAVEL)
        console.log('STATE -> BREATHER (after Stage ' + stageIndexRef.current + ')');
        playPhaseRef.current = 'BREATHER';
        setPlayPhase('BREATHER');
        travelTimerRef.current = GAME_CONFIG.POST_VICTORY_BREATHER_DURATION;
        gateBuildingRef.current = null;
        setGateBuildingState(null);
        lastSpawnRef.current = timeRef.current;
      }
      
      // Render and skip rest of sim
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      drawGame(ctx, blocks, enemyPool.getActive(), projectilePool.getActive(),
        tipPool.getActive(), particlePool.getActive(), screenShakeRef.current,
        bossStateRef.current, bossIncomingRef.current, playPhaseRef.current,
        deltaTime, gateBuildingRef.current, currentTime, hasStarRef.current, hasFoamRef.current, foamBoxIndexRef.current,
        hasEspressoRef.current, espressoBoxIndexRef.current, hasIceRef.current, iceBoxIndexRef.current);
      drawFloatingDamageNumbers(ctx, floatingDamagePool.getActive(), screenShakeRef.current);
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // BREATHER PHASE (post-victory pacing: running, reduced spawns, no gate)
    // ═══════════════════════════════════════════════════════════════════
    if (playPhaseRef.current === 'BREATHER') {
      travelTimerRef.current -= deltaTime;

      // Spawn scheduling (delegated to spawning system)
      updateBreatherSpawning(refs, currentTime);

      if (travelTimerRef.current <= 0) {
        // Advance to next stage and enter TRAVEL
        const nextStage = stageIndexRef.current + 1;
        const nextStageConfig = getStage(nextStage);
        stageIndexRef.current = nextStage;
        setStageIndex(nextStage);
        
        if (nextStageConfig.isBoss) {
          travelTimerRef.current = GAME_CONFIG.TRAVEL_DURATION;
        } else {
          travelTimerRef.current = TRAVEL_DURATION_BY_STAGE[nextStage - 1] ?? GAME_CONFIG.TRAVEL_DURATION;
        }
        playPhaseRef.current = 'TRAVEL';
        setPlayPhase('TRAVEL');
        console.log('STATE -> TRAVEL (Stage ' + nextStage + ')');
      }
    }
    
    // (Duplicate gate cleanup block removed — VICTORY phase handles all post-gate transitions)
    
    // ═══════════════════════════════════════════════════════════════════
    // BOSS SPAWN LOGIC
    // ═══════════════════════════════════════════════════════════════════
    if (playPhaseRef.current === 'BOSS') {
      if (bossIncomingRef.current > 0) {
        bossIncomingRef.current -= deltaTime;
        if (bossIncomingRef.current <= 0) {
          bossIncomingRef.current = -1;
          const bossEnemy = enemyPool.acquire();
          if (bossEnemy) {
            const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
            const bossHP = getStage(6).bossHP ?? 10000;
            bossEnemy.kind = 'BOSS';
            bossEnemy.x = GAME_CONFIG.CANVAS_WIDTH + 50;
            bossEnemy.y = groundY;
            bossEnemy.maxHp = bossHP;
            bossEnemy.hp = bossHP;
            bossEnemy.speed = GAME_CONFIG.ENEMY_BASE_SPEED * GAME_CONFIG.BOSS_SPEED_MULT;
            bossEnemy.width = Math.floor(GAME_CONFIG.ENEMY_WIDTH * GAME_CONFIG.BOSS_SIZE_MULT);
            bossEnemy.height = Math.floor(GAME_CONFIG.ENEMY_HEIGHT * GAME_CONFIG.BOSS_SIZE_MULT);
            bossEnemy.isServed = false;
            bossEnemy.servedTimer = 0;
            bossEnemy.state = 'WALKING';
            bossEnemy.latchedTimer = 0;
            bossEnemy.latchOrder = 0;
            bossEnemyRef.current = bossEnemy;
            bossStateRef.current = {
              isActive: true, hp: bossHP, maxHp: bossHP,
              spawnedAt: currentTime, addSpawnTimer: 0,
              phase: 1, phaseTransitioned: [false, false, false],
            };
            telemetryRef.current.enemiesSpawned.boss++;
          }
        }
      } else if (!bossStateRef.current.isActive && bossEnemyRef.current === null && bossIncomingRef.current === 0) {
        bossIncomingRef.current = GAME_CONFIG.BOSS_INCOMING_BANNER_DURATION;
      }

      // Update boss state + phase transitions
      if (bossStateRef.current.isActive && bossEnemyRef.current) {
        const boss = bossEnemyRef.current;
        bossStateRef.current.hp = boss.hp;

        if (boss.hp <= 0 || boss.isServed) {
          bossStateRef.current.isActive = false;
          bossEnemyRef.current = null;
          handleChapterClear();
          return;
        }

        // Boss Phase System: check HP thresholds for phase transitions
        const hpPercent = boss.hp / boss.maxHp;
        const bs = bossStateRef.current;

        // Phase 4: Enrage (25% HP)
        if (hpPercent <= GAME_CONFIG.BOSS_PHASE4_THRESHOLD && !bs.phaseTransitioned[2]) {
          bs.phase = 4;
          bs.phaseTransitioned[2] = true;
          screenShakeRef.current = { x: 0, y: 0, duration: 0.5 };
          spawnParticles(boss.x, boss.y - boss.height / 2, 'confetti', 15);
        }
        // Phase 3: Speed + Damage (50% HP)
        else if (hpPercent <= GAME_CONFIG.BOSS_PHASE3_THRESHOLD && !bs.phaseTransitioned[1]) {
          bs.phase = 3;
          bs.phaseTransitioned[1] = true;
          screenShakeRef.current = { x: 0, y: 0, duration: 0.4 };
          spawnParticles(boss.x, boss.y - boss.height / 2, 'steam', 10);
        }
        // Phase 2: Extra spawns (75% HP)
        else if (hpPercent <= GAME_CONFIG.BOSS_PHASE2_THRESHOLD && !bs.phaseTransitioned[0]) {
          bs.phase = 2;
          bs.phaseTransitioned[0] = true;
          screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
          spawnParticles(boss.x, boss.y - boss.height / 2, 'steam', 8);
        }

        // Phase-based add spawning (phases 2-4 spawn extra enemies)
        if (bs.phase >= 2) {
          const spawnInterval = bs.phase === 4 ? GAME_CONFIG.BOSS_PHASE4_SPAWN_INTERVAL
            : bs.phase === 3 ? GAME_CONFIG.BOSS_PHASE3_SPAWN_INTERVAL
            : GAME_CONFIG.BOSS_PHASE2_SPAWN_INTERVAL;

          bs.addSpawnTimer += deltaTime;
          if (bs.addSpawnTimer >= spawnInterval) {
            bs.addSpawnTimer -= spawnInterval;
            spawnEnemy(); // Spawn an add
          }
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // SIEGE: Gate breathing windows
    // ═══════════════════════════════════════════════════════════════════
    const gate = gateBuildingRef.current;
    if (gate && !gate.isDestroyed && playPhaseRef.current === 'SIEGE') {
      // Track time at gate
      const si = stageIndexRef.current - 1;
      if (si >= 0 && si < 5) gateTimeSpentRef.current[si] += deltaTime;
      
      // Check breathing thresholds
      const hpPercent = gate.hp / gate.maxHp;
      for (const threshold of GAME_CONFIG.GATE_BREATHING_THRESHOLDS) {
        if (hpPercent <= threshold && !gate.crossedThresholds.includes(threshold)) {
          gate.crossedThresholds.push(threshold);
          gate.breathingActive = true;
          gate.breathingTimer = GAME_CONFIG.GATE_BREATHING_SLOWDOWN_DURATION;
        }
      }
      
      if (gate.breathingActive) {
        gate.breathingTimer -= deltaTime;
        if (gate.breathingTimer <= 0) {
          gate.breathingActive = false;
        }
      }
      
      // Check gate destruction
      if (gate.hp <= 0) {
        gate.isDestroyed = true;
        gateDestroyedRef.current[stageIndexRef.current - 1] = true;
        
        // Award lump sum
        const stage = getStage(stageIndexRef.current);
        coinsFromGateLumpsRef.current += stage.gateLumpSum;
        tipsRef.current += stage.gateLumpSum;
        setTips(tipsRef.current);
        
        // Victory pulse
        spawnParticles(gate.x + gate.width / 2, gate.y, 'crumble', 15);
        spawnParticles(gate.x + gate.width / 2, gate.y + gate.height / 2, 'confetti', 20);
        screenShakeRef.current = { x: 0, y: 0, duration: 0.5 };
        
        // All gate stages: use VICTORY phase
        console.log('STATE -> VICTORY (Stage ' + stageIndexRef.current + ')');
        playPhaseRef.current = 'VICTORY';
        setPlayPhase('VICTORY');
        gateCleanupTimerRef.current = GAME_CONFIG.GATE_CLEANUP_DURATION;
      }
    }
    
    // SPAWNING — siege phase (delegated to spawning system)
    updateSiegeSpawning(refs, currentTime, deltaTime);
    
    // AUTO-ATTACK (delegated to combat system)
    updateAutoAttack(refs, currentTime, isStressTest);
    
    // ═══════════════════════════════════════════════════════════════════
    // PASSIVE SAW (melee zone - only if unlocked)
    // ═══════════════════════════════════════════════════════════════════
    if (hasStarRef.current) {
      starPassiveTickRef.current -= deltaTime;
      if (starPassiveTickRef.current <= 0) {
        starPassiveTickRef.current = GAME_CONFIG.STAR_PASSIVE_TICK_INTERVAL;
        const sawCenterX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + GAME_CONFIG.STAR_PASSIVE_RADIUS * 0.5;
        const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
        const sawCenterY = groundY - 60;
        
        enemies.forEach(enemy => {
          const ex = enemy.x;
          const ey = enemy.y - enemy.height / 2;
          const dx = ex - sawCenterX;
          const dy = ey - sawCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < GAME_CONFIG.STAR_PASSIVE_RADIUS) {
            let starDmg = Math.floor(GAME_CONFIG.STAR_PASSIVE_TICK_DAMAGE * starDamageMultRef.current);
            if (enemy.shieldHp > 0) {
              const absorbed = Math.min(enemy.shieldHp, starDmg);
              enemy.shieldHp -= absorbed; starDmg -= absorbed;
            }
            enemy.hp -= starDmg;
            starTelemetryRef.current.passiveDamage += starDmg;
            spawnParticles(enemy.x, enemy.y - enemy.height / 2, 'sparkle', 1);
          }
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PASSIVE FOAM CANNON (sinusoidal sweeping, fires foam projectiles)
    // ═══════════════════════════════════════════════════════════════════
    // Check if foam's equipped box is destroyed — if so, disable foam
    if (hasFoamRef.current) {
      const equippedFoamBlock = blocksRef.current.find(b => b.id === foamBoxIndexRef.current + 1);
      if (!equippedFoamBlock || equippedFoamBlock.destroyed) {
        hasFoamRef.current = false;
      }
    }
    
    if (hasFoamRef.current) {
      foamPassiveTickRef.current -= deltaTime;
      foamSweepRef.current += GAME_CONFIG.BREW_SWEEP_SPEED * deltaTime;
      
      if (foamPassiveTickRef.current <= 0) {
        foamPassiveTickRef.current = GAME_CONFIG.BREW_PASSIVE_FIRE_INTERVAL;
        
        const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
        // Anchor foam origin to equipped box VISUAL Y position (matches drawCart rendering)
        const foamBlock = foamBoxIndexRef.current >= 0 
          ? blocksRef.current.find(b => b.id === foamBoxIndexRef.current + 1 && !b.destroyed)
          : null;
        let originY: number;
        if (foamBlock && foamBlock.id > 0) {
          const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
          const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
          const chassisY = groundY - 30 - chassisHeight;
          const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
          // Use index-based positioning (matching renderer drawCart)
          const activeCargoBlocks = blocksRef.current.filter(b => !b.destroyed && b.id > 0).sort((a, b2) => a.id - b2.id);
          const foamCargoIdx = activeCargoBlocks.findIndex(b => b.id === foamBlock.id);
          const visualBlockY = chassisY - (foamCargoIdx + 1) * boxHeight + (foamBlock.collapseOffset || 0);
          originY = visualBlockY + boxHeight / 2;
        } else {
          originY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 50;
        }
        const sweepHalf = (GAME_CONFIG.BREW_SWEEP_ANGLE / 2) * (Math.PI / 180);
        const currentAngle = Math.sin(foamSweepRef.current) * sweepHalf;
        
        // Decide target: ~18% chance gate, rest enemy
        const targetGate = Math.random() < GAME_CONFIG.BREW_PASSIVE_GATE_CHANCE;
        const gate = gateBuildingRef.current;
        
        let targetX: number;
        let targetY: number;
        
        if (targetGate && gate && !gate.isDestroyed && playPhaseRef.current === 'SIEGE') {
          targetX = gate.x + gate.width / 2;
          targetY = gate.y + gate.height / 2;
          foamTelemetryRef.current.passiveShotsToGate++;
        } else if (enemies.length > 0) {
          // Pick a random enemy in range
          const inRange = enemies.filter(e => {
            const dx = e.x - cartFrontX;
            return dx > 0 && dx < GAME_CONFIG.BREW_PASSIVE_RANGE;
          });
          if (inRange.length > 0) {
            const target = inRange[Math.floor(Math.random() * inRange.length)];
            targetX = target.x;
            targetY = target.y - target.height / 2;
          } else {
            // Fire in sweep direction
            targetX = cartFrontX + Math.cos(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
            targetY = originY + Math.sin(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
          }
        } else {
          // No targets, fire in sweep direction
          targetX = cartFrontX + Math.cos(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
          targetY = originY + Math.sin(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
        }
        
        // Fire foam projectile
        const proj = projectilePool.acquire();
        if (proj) {
          proj.x = cartFrontX;
          proj.y = originY;
          proj.targetX = targetX;
          proj.targetY = targetY;
          proj.speed = GAME_CONFIG.BREW_PASSIVE_SPEED;
          proj.damage = GAME_CONFIG.BREW_PASSIVE_DAMAGE;
          proj.radius = GAME_CONFIG.BREW_PROJECTILE_RADIUS;
          proj.pierce = false;
          proj.isStar = false;
          proj.isBrew = true;
          proj.isEspresso = false;
          proj.isIce = false;
          proj.hitGate = false;
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // PASSIVE ESPRESSO CANNON (rapid-fire spray)
    // ═══════════════════════════════════════════════════════════════════
    if (hasEspressoRef.current) {
      const espBlock = blocksRef.current.find(b => b.id === espressoBoxIndexRef.current + 1);
      if (!espBlock || espBlock.destroyed) { hasEspressoRef.current = false; }
    }
    if (hasEspressoRef.current) {
      espressoPassiveTickRef.current -= deltaTime;
      if (espressoPassiveTickRef.current <= 0) {
        espressoPassiveTickRef.current = GAME_CONFIG.ESPRESSO_PASSIVE_FIRE_INTERVAL;
        const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
        const espBlock = blocksRef.current.find(b => b.id === espressoBoxIndexRef.current + 1 && !b.destroyed);
        if (espBlock) {
          const groundY2 = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
          const chassisH = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
          const chassisY2 = groundY2 - 30 - chassisH;
          const boxH = GAME_CONFIG.BLOCK_HEIGHT - 4;
          const activeCargoB = blocksRef.current.filter(b => !b.destroyed && b.id > 0).sort((a, b2) => a.id - b2.id);
          const espIdx = activeCargoB.findIndex(b => b.id === espBlock.id);
          const visY = chassisY2 - (espIdx + 1) * boxH + (espBlock.collapseOffset || 0);
          const originY = visY + boxH / 2;
          // Pick random direction with spread
          const spreadRad = (GAME_CONFIG.ESPRESSO_PASSIVE_SPREAD_DEG / 2) * (Math.PI / 180);
          const angle = (Math.random() - 0.5) * spreadRad * 2;
          const range = GAME_CONFIG.ESPRESSO_PASSIVE_RANGE;
          // Target: nearest enemy or random direction
          let tX = cartFrontX + Math.cos(angle) * range;
          let tY = originY + Math.sin(angle) * range;
          if (enemies.length > 0) {
            const inRange = enemies.filter(e => e.x - cartFrontX < range && e.x > cartFrontX);
            if (inRange.length > 0) {
              const t = inRange[Math.floor(Math.random() * inRange.length)];
              tX = t.x + (Math.random() - 0.5) * 20;
              tY = t.y - t.height / 2 + (Math.random() - 0.5) * 15;
            }
          }
          const proj = projectilePool.acquire();
          if (proj) {
            proj.x = cartFrontX; proj.y = originY;
            proj.targetX = tX; proj.targetY = tY;
            proj.speed = GAME_CONFIG.ESPRESSO_PASSIVE_SPEED;
            proj.damage = GAME_CONFIG.ESPRESSO_PASSIVE_DAMAGE;
            proj.radius = GAME_CONFIG.ESPRESSO_PROJECTILE_RADIUS;
            proj.pierce = false; proj.isStar = false; proj.isBrew = false; proj.isEspresso = true; proj.isIce = false; proj.hitGate = false;
          }
        }
      }
    }

    // Espresso Barrage update (active ability — rapid fire over duration)
    if (espressoBarrageRef.current.active) {
      const barrage = espressoBarrageRef.current;
      barrage.timer -= deltaTime;
      const shotsPerSec = GAME_CONFIG.ESPRESSO_BARRAGE_SHOTS / GAME_CONFIG.ESPRESSO_BARRAGE_DURATION;
      const shouldFire = Math.floor(shotsPerSec * (GAME_CONFIG.ESPRESSO_BARRAGE_DURATION - barrage.timer)) > barrage.shotsFired;
      if (shouldFire && barrage.shotsFired < GAME_CONFIG.ESPRESSO_BARRAGE_SHOTS) {
        const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
        const groundYb = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
        const spreadRad = (GAME_CONFIG.ESPRESSO_BARRAGE_SPREAD_DEG / 2) * (Math.PI / 180);
        const angle = (Math.random() - 0.5) * spreadRad * 2;
        const range = 300;
        let tX = cartFrontX + Math.cos(angle) * range;
        let tY = groundYb - 60 + Math.sin(angle) * range;
        // Prefer enemies/gate
        if (enemies.length > 0) {
          const t = enemies[Math.floor(Math.random() * enemies.length)];
          tX = t.x + (Math.random() - 0.5) * 30; tY = t.y - t.height / 2 + (Math.random() - 0.5) * 20;
        } else if (gateBuildingRef.current && !gateBuildingRef.current.isDestroyed) {
          const g = gateBuildingRef.current;
          tX = g.x + g.width / 2 + (Math.random() - 0.5) * 20;
          tY = g.y + g.height / 2 + (Math.random() - 0.5) * 30;
        }
        const proj = projectilePool.acquire();
        if (proj) {
          proj.x = cartFrontX; proj.y = groundYb - 80;
          proj.targetX = tX; proj.targetY = tY;
          proj.speed = GAME_CONFIG.ESPRESSO_PASSIVE_SPEED * 1.3;
          proj.damage = GAME_CONFIG.ESPRESSO_BARRAGE_DAMAGE;
          proj.radius = GAME_CONFIG.ESPRESSO_PROJECTILE_RADIUS + 1;
          proj.pierce = false; proj.isStar = false; proj.isBrew = false; proj.isEspresso = true; proj.isIce = false; proj.hitGate = false;
        }
        barrage.shotsFired++;
      }
      if (barrage.timer <= 0) {
        barrage.active = false;
        const totalDmg = barrage.shotsFired * GAME_CONFIG.ESPRESSO_BARRAGE_DAMAGE;
        if (totalDmg > 0) {
          spawnFloatingDamage(GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 100, totalDmg, 'hsl(25, 70%, 45%)');
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PASSIVE ICE BLENDER (periodic ice drops that slow)
    // ═══════════════════════════════════════════════════════════════════
    if (hasIceRef.current) {
      const iceBlock = blocksRef.current.find(b => b.id === iceBoxIndexRef.current + 1);
      if (!iceBlock || iceBlock.destroyed) { hasIceRef.current = false; }
    }
    if (hasIceRef.current) {
      icePassiveTickRef.current -= deltaTime;
      if (icePassiveTickRef.current <= 0) {
        icePassiveTickRef.current = GAME_CONFIG.ICE_PASSIVE_FIRE_INTERVAL;
        const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
        // Find nearest enemy in range to target with ice drop
        const inRange = enemies.filter(e => {
          const dx = e.x - cartFrontX;
          return dx > 0 && dx < GAME_CONFIG.ICE_PASSIVE_RANGE;
        });
        if (inRange.length > 0) {
          const target = inRange[Math.floor(Math.random() * inRange.length)];
          const proj = projectilePool.acquire();
          if (proj) {
            const iceBlock = blocksRef.current.find(b => b.id === iceBoxIndexRef.current + 1 && !b.destroyed);
            const groundY3 = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
            const originY = iceBlock ? iceBlock.y + GAME_CONFIG.BLOCK_HEIGHT / 2 : groundY3 - 60;
            proj.x = cartFrontX; proj.y = originY;
            proj.targetX = target.x; proj.targetY = target.y - target.height / 2;
            proj.speed = GAME_CONFIG.ICE_PASSIVE_SPEED;
            proj.damage = GAME_CONFIG.ICE_PASSIVE_DAMAGE;
            proj.radius = GAME_CONFIG.ICE_PROJECTILE_RADIUS;
            proj.pierce = false; proj.isStar = false; proj.isBrew = false; proj.isEspresso = false; proj.isIce = true; proj.hitGate = false;
          }
        }
      }
    }

    // UPDATE PROJECTILES (delegated to combat system)
    updateProjectiles(refs, deltaTime);
    
    // ═══════════════════════════════════════════════════════════════════
    // BLOCK COLLAPSE ANIMATION
    // ═══════════════════════════════════════════════════════════════════
    {
      const collapseSpeed = (GAME_CONFIG.BLOCK_HEIGHT - 4) / 0.3; // Complete collapse in 0.3s
      blocks.forEach(block => {
        if (!block.destroyed && block.collapseOffset !== 0) {
          if (block.collapseOffset < 0) {
            block.collapseOffset = Math.min(0, block.collapseOffset + collapseSpeed * deltaTime);
          } else if (block.collapseOffset > 0) {
            block.collapseOffset = Math.max(0, block.collapseOffset - collapseSpeed * deltaTime);
          }
        }
      });
    }

    // UPDATE ENEMIES (delegated to enemies system)
    updateEnemies(refs, deltaTime, blocks, handleGameOver, setTips);
    
    // Update VFX (tips, particles, floating damage, screen shake)
    updateVFX(refs, deltaTime);
    
    // Render
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    drawGame(ctx, blocks, enemyPool.getActive(), projectilePool.getActive(),
      tipPool.getActive(), particlePool.getActive(), screenShakeRef.current,
      bossStateRef.current, bossIncomingRef.current, playPhaseRef.current,
      deltaTime, gateBuildingRef.current, currentTime, hasStarRef.current, hasFoamRef.current, foamBoxIndexRef.current,
      hasEspressoRef.current, espressoBoxIndexRef.current, hasIceRef.current, iceBoxIndexRef.current);

    // Draw floating damage numbers on top of everything
    drawFloatingDamageNumbers(ctx, floatingDamagePool.getActive(), screenShakeRef.current);
  }, [
    enemyPool, projectilePool, tipPool, particlePool, floatingDamagePool,
    spawnEnemy, fireProjectile, spawnParticles, spawnTip, spawnFloatingDamage,
    handleGameOver, handleChapterClear, createGateBuilding,
  ]);
  
  useGameLoop(gameLoop, gameState === 'PLAY' && !isPaused);
  
  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    if (gameState === 'MENU') {
      const progression = loadProgression();
      const blockCount = 1 + progression.blockCountLevel;
      drawMenuScene(ctx, blockCount);
    }
  }, [gameState, progressionVersion]);
  
  const canUseBomb = powerRef.current >= GAME_CONFIG.TONIC_BOMB_COST;
  
  return (
    <div className="cr-viewport">
      <div 
        className="cr-stage"
        style={{
          width: GAME_CONFIG.CANVAS_WIDTH,
          height: GAME_CONFIG.CANVAS_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {gameState === 'MENU' && (
          <GarageOverlay 
            onPlay={handlePlay} 
            blockCount={1 + loadProgression().blockCountLevel}
            onProgressionChange={() => setProgressionVersion(v => v + 1)}
          />
        )}
        
        {gameState === 'PLAY' && !isPaused && (
          <GameHUD
            timeSurvived={timeSurvived}
            tips={tips}
            power={power}
            onTonicBomb={handleTonicBomb}
            canUseBomb={canUseBomb}
            onStarThrow={handleStarThrow}
            canUseStar={hasStarRef.current && powerRef.current >= GAME_CONFIG.STAR_THROW_COST}
            hasStar={hasStarRef.current}
            onBrewBurst={handleFoamBurst}
            canUseBrew={hasFoamRef.current && powerRef.current >= GAME_CONFIG.BREW_BURST_COST}
            hasBrew={hasFoamRef.current}
            onEspressoBarrage={handleEspressoBarrage}
            canUseEspresso={hasEspressoRef.current && powerRef.current >= GAME_CONFIG.ESPRESSO_BARRAGE_COST}
            hasEspresso={hasEspressoRef.current}
            onIceStorm={handleIceStorm}
            canUseIce={hasIceRef.current && powerRef.current >= GAME_CONFIG.ICE_STORM_COST}
            hasIce={hasIceRef.current}
            onPause={handlePause}
            gameMode={gameMode}
            bossState={bossState}
            bossIncomingTimer={bossIncomingRef.current}
            playPhase={playPhase}
            stageIndex={stageIndex}
            gateBuilding={gateBuildingState}
          />
        )}
        
        {/* EVO Popup */}
        {gameState === 'PLAY' && evoPopupData && (
          <EvoPopup
            options={evoPopupData.options}
            onSelect={handleEvoChoice}
          />
        )}
        
        {gameState === 'PLAY' && isPaused && (
          <PauseMenu
            tipsSoFar={tipsRef.current}
            onContinue={handleContinue}
            onLeave={handleLeave}
          />
        )}
        
        {gameState === 'PLAY' && !isPaused && (
          <DebugHUD
            fps={debugInfo.fps}
            activeEnemies={debugInfo.activeEnemies}
            maxEnemies={GAME_CONFIG.MAX_ENEMIES}
            latchedCount={debugInfo.latchedCount}
            shotsFired={debugInfo.shotsFired}
            shotsHit={debugInfo.shotsHit}
            heavyCount={debugInfo.heavyCount}
            activeProjectiles={debugInfo.activeProjectiles}
            power={debugInfo.power}
            stageIndex={debugInfo.stageIndex}
            gateHpPercent={debugInfo.gateHpPercent}
            gateDamageDealt={debugInfo.gateDamageDealt}
            gameMode={gameMode}
            bossState={bossState}
            isVisible={showDebug}
            isStressTest={isStressTest}
            onToggle={() => setShowDebug(prev => !prev)}
            onStressTestToggle={() => setIsStressTest(prev => !prev)}
          />
        )}
        
        {gameState === 'END' && showRunSummary && (
          <RunSummaryOverlay
            stats={stats}
            purchaseLog={getPurchaseLog()}
            onContinue={() => {
              clearPurchaseLog();
              setShowRunSummary(false);
            }}
          />
        )}
        
        {gameState === 'END' && !showRunSummary && (
          <EndScreen 
            stats={stats}
            onPlayAgain={() => handlePlay(gameMode)}
            onHome={handleHome}
            gameMode={gameMode}
          />
        )}
      </div>
    </div>
  );
};
