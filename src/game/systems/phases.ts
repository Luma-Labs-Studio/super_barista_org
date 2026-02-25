/**
 * Phase System — TRAVEL, APPROACH, VICTORY, BREATHER state transitions.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG, TRAVEL_DURATION_BY_STAGE } from '../config';
import type { PlayPhase, GateBuilding } from '../types';
import type { GameRefs } from './gameRefs';
import { getStage } from './factories';
import { createGateBuilding } from './gate';
import { updateTravelSpawning, updateBreatherSpawning } from './spawning';

// ─────────────────────────────────────────────────────────────
// TRAVEL phase — countdown + spawning + transition to APPROACH/BOSS
// ─────────────────────────────────────────────────────────────

export function updateTravelPhase(
  refs: GameRefs,
  deltaTime: number,
  currentTime: number,
  setPlayPhase: (p: PlayPhase) => void,
  setGateBuildingState: (g: GateBuilding | null) => void,
) {
  if (refs.playPhaseRef.current !== 'TRAVEL') return;

  refs.travelTimerRef.current -= deltaTime;

  // Spawn scheduling (delegated to spawning system)
  updateTravelSpawning(refs, currentTime);

  // Phase transition
  if (refs.travelTimerRef.current <= 0) {
    const si = refs.stageIndexRef.current;
    const stage = getStage(si);

    if (si > 1 && stage.isBoss) {
      refs.playPhaseRef.current = 'BOSS';
      setPlayPhase('BOSS');
    } else {
      // Transition to APPROACH (gate slides in)
      console.log('STATE -> APPROACH' + (si > 1 ? ' (Stage ' + si + ')' : ''));
      refs.playPhaseRef.current = 'APPROACH';
      setPlayPhase('APPROACH');
      const gate = createGateBuilding(si > 1 ? si : 1);
      if (gate) {
        gate.x = GAME_CONFIG.GATE_START_X;
        refs.gateBuildingRef.current = gate;
        setGateBuildingState(gate);
      }
      refs.travelTimerRef.current = GAME_CONFIG.APPROACH_DURATION;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// APPROACH phase — gate slides in, then transition to SIEGE
// ─────────────────────────────────────────────────────────────

export function updateApproachPhase(
  refs: GameRefs,
  deltaTime: number,
  setPlayPhase: (p: PlayPhase) => void,
) {
  if (refs.playPhaseRef.current !== 'APPROACH') return;

  refs.travelTimerRef.current -= deltaTime;

  // Lerp gate to final position
  const gate = refs.gateBuildingRef.current;
  if (gate) {
    const finalX = GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.GATE_BUILDING_X_OFFSET;
    const progress = 1 - Math.max(0, refs.travelTimerRef.current / GAME_CONFIG.APPROACH_DURATION);
    gate.x = GAME_CONFIG.GATE_START_X + (finalX - GAME_CONFIG.GATE_START_X) * Math.min(1, progress);
  }

  // No enemy spawning during approach

  if (refs.travelTimerRef.current <= 0) {
    // Gate in position, start siege
    if (gate) {
      gate.x = GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.GATE_BUILDING_X_OFFSET;
    }
    console.log('STATE -> SIEGE (Stage ' + refs.stageIndexRef.current + ')');
    refs.playPhaseRef.current = 'SIEGE';
    setPlayPhase('SIEGE');
    refs.lastSpawnRef.current = refs.timeRef.current;
    // Init wave refs for wave-based stages (Stage 1 & 2)
    if (refs.stageIndexRef.current === 1 || refs.stageIndexRef.current === 2) {
      refs.stage1WaveRef.current = { spawned: 0, breatherTimer: 0 };
    }
    refs.bombSilenceTimerRef.current = 0;
  }
}

// ─────────────────────────────────────────────────────────────
// VICTORY phase — fade enemies, then transition to BREATHER.
// Returns true if the caller should skip the rest of the frame
// (render and return early).
// ─────────────────────────────────────────────────────────────

export function updateVictoryPhase(
  refs: GameRefs,
  deltaTime: number,
  setPlayPhase: (p: PlayPhase) => void,
  setGateBuildingState: (g: GateBuilding | null) => void,
): boolean {
  if (refs.playPhaseRef.current !== 'VICTORY') return false;

  refs.gateCleanupTimerRef.current -= deltaTime;

  // Fade remaining enemies
  refs.enemyPool.getActive().forEach(enemy => {
    if (enemy.state !== 'SERVED' && !enemy.isServed) {
      enemy.hp = 0;
      enemy.state = 'SERVED';
      enemy.isServed = true;
      enemy.servedTimer = 0.3;
    }
  });

  if (refs.gateCleanupTimerRef.current <= 0) {
    // Transition to BREATHER (pacing window before next TRAVEL)
    console.log('STATE -> BREATHER (after Stage ' + refs.stageIndexRef.current + ')');
    refs.playPhaseRef.current = 'BREATHER';
    setPlayPhase('BREATHER');
    refs.travelTimerRef.current = GAME_CONFIG.POST_VICTORY_BREATHER_DURATION;
    refs.gateBuildingRef.current = null;
    setGateBuildingState(null);
    refs.lastSpawnRef.current = refs.timeRef.current;
  }

  return true; // Skip rest of simulation — caller should render and return
}

// ─────────────────────────────────────────────────────────────
// BREATHER phase — reduced spawns, then advance stage → TRAVEL
// ─────────────────────────────────────────────────────────────

export function updateBreatherPhase(
  refs: GameRefs,
  deltaTime: number,
  currentTime: number,
  setStageIndex: (idx: number) => void,
  setPlayPhase: (p: PlayPhase) => void,
) {
  if (refs.playPhaseRef.current !== 'BREATHER') return;

  refs.travelTimerRef.current -= deltaTime;

  // Spawn scheduling (delegated to spawning system)
  updateBreatherSpawning(refs, currentTime);

  if (refs.travelTimerRef.current <= 0) {
    // Advance to next stage and enter TRAVEL
    const nextStage = refs.stageIndexRef.current + 1;
    const nextStageConfig = getStage(nextStage);
    refs.stageIndexRef.current = nextStage;
    setStageIndex(nextStage);

    if (nextStageConfig.isBoss) {
      refs.travelTimerRef.current = GAME_CONFIG.TRAVEL_DURATION;
    } else {
      refs.travelTimerRef.current = TRAVEL_DURATION_BY_STAGE[nextStage - 1] ?? GAME_CONFIG.TRAVEL_DURATION;
    }
    refs.playPhaseRef.current = 'TRAVEL';
    setPlayPhase('TRAVEL');
    console.log('STATE -> TRAVEL (Stage ' + nextStage + ')');
  }
}
