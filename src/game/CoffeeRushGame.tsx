import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GAME_CONFIG, TRAVEL_DURATION_BY_STAGE } from './config';
import { drawGame, drawMenuScene, drawFloatingDamageNumbers } from './renderer';
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
  GameStats,
  BossState,
  RunTelemetry,
  EvoTrait,
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
import { updateVFX } from './systems/vfx';
import type { GameRefs } from './systems/gameRefs';
import { buildTelemetry as _buildTelemetry } from './systems/telemetry';
import { updateAutoAttack, updateProjectiles } from './systems/combat';
import { updateSiegeSpawning } from './systems/spawning';
import { updateEnemies } from './systems/enemies';
import {
  handleTonicBomb as _handleTonicBomb,
  handleStarThrow as _handleStarThrow,
  handleFoamBurst as _handleFoamBurst,
  handleEspressoBarrage as _handleEspressoBarrage,
  handleIceStorm as _handleIceStorm,
  updateWeaponPassives,
} from './systems/weapons';
import { updateGateSystem } from './systems/gate';
import {
  updateTravelPhase,
  updateApproachPhase,
  updateVictoryPhase,
  updateBreatherPhase,
} from './systems/phases';
import { updateBossSystem } from './systems/boss';
import { initGameState } from './systems/init';

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

    // Reset all refs and game state (delegated to init system)
    initGameState(refs, progression);

    // Clear pools (React hook objects — must stay in component)
    enemyPool.clear();
    projectilePool.clear();
    tipPool.clear();
    particlePool.clear();
    floatingDamagePool.clear();

    // Reset React state
    setPower(0);
    setTips(0);
    setTimeSurvived(0);
    setBossState(refs.bossStateRef.current);
    setStageIndex(1);
    setPlayPhase('TRAVEL');
    setGateBuildingState(null);
    setEvoPopupData(null);
    setShowRunSummary(false);
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
  // Active abilities (delegated to weapons system)
  const handleTonicBomb = useCallback(() => { _handleTonicBomb(refs, setPower); }, []);
  const handleStarThrow = useCallback(() => { _handleStarThrow(refs, setPower); }, []);
  const handleFoamBurst = useCallback(() => { _handleFoamBurst(refs, setPower); }, []);
  const handleEspressoBarrage = useCallback(() => { _handleEspressoBarrage(refs, setPower); }, []);
  const handleIceStorm = useCallback(() => { _handleIceStorm(refs, setPower); }, []);

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
    // PHASE UPDATES (delegated to systems/phases.ts, gate.ts, boss.ts)
    // ═══════════════════════════════════════════════════════════════════
    updateTravelPhase(refs, deltaTime, currentTime, setPlayPhase, setGateBuildingState);
    updateApproachPhase(refs, deltaTime, setPlayPhase);

    const skipRestOfFrame = updateVictoryPhase(refs, deltaTime, setPlayPhase, setGateBuildingState);
    if (skipRestOfFrame) {
      // Render and return early (VICTORY phase skips combat simulation)
      ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      drawGame(ctx, blocks, enemyPool.getActive(), projectilePool.getActive(),
        tipPool.getActive(), particlePool.getActive(), screenShakeRef.current,
        bossStateRef.current, bossIncomingRef.current, playPhaseRef.current,
        deltaTime, gateBuildingRef.current, currentTime, hasStarRef.current, hasFoamRef.current, foamBoxIndexRef.current,
        hasEspressoRef.current, espressoBoxIndexRef.current, hasIceRef.current, iceBoxIndexRef.current);
      drawFloatingDamageNumbers(ctx, floatingDamagePool.getActive(), screenShakeRef.current);
      return;
    }

    updateBreatherPhase(refs, deltaTime, currentTime, setStageIndex, setPlayPhase);
    updateBossSystem(refs, deltaTime, currentTime, handleChapterClear);
    updateGateSystem(refs, deltaTime, setTips, setPlayPhase, setGateBuildingState);
    
    // SPAWNING — siege phase (delegated to spawning system)
    updateSiegeSpawning(refs, currentTime, deltaTime);
    
    // AUTO-ATTACK (delegated to combat system)
    updateAutoAttack(refs, currentTime, isStressTest);
    
    // WEAPON PASSIVES (delegated to weapons system)
    const enemies = refs.enemyPool.getActive().filter(e => !e.isServed && e.state !== 'SERVED');
    updateWeaponPassives(refs, deltaTime, enemies);

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
    handleGameOver, handleChapterClear, isStressTest,
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
