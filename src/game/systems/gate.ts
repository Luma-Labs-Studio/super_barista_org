/**
 * Gate System — creation, breathing windows, destruction.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG } from '../config';
import type { GateBuilding, PlayPhase } from '../types';
import type { GameRefs } from './gameRefs';
import { getStage } from './factories';
import { spawnParticles } from './vfx';

// ─────────────────────────────────────────────────────────────
// createGateBuilding — factory for a new gate at a given stage
// ─────────────────────────────────────────────────────────────

export function createGateBuilding(si: number): GateBuilding | null {
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
}

// ─────────────────────────────────────────────────────────────
// updateGateSystem — breathing windows + destruction check
// Call each frame during SIEGE phase.
// ─────────────────────────────────────────────────────────────

export function updateGateSystem(
  refs: GameRefs,
  deltaTime: number,
  setTips: (v: number) => void,
  setPlayPhase: (phase: PlayPhase) => void,
  setGateBuildingState: (g: GateBuilding | null) => void,
) {
  const gate = refs.gateBuildingRef.current;
  if (!gate || gate.isDestroyed || refs.playPhaseRef.current !== 'SIEGE') return;

  // Track time at gate
  const si = refs.stageIndexRef.current - 1;
  if (si >= 0 && si < 5) refs.gateTimeSpentRef.current[si] += deltaTime;

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
    refs.gateDestroyedRef.current[refs.stageIndexRef.current - 1] = true;

    // Award lump sum
    const stage = getStage(refs.stageIndexRef.current);
    refs.coinsFromGateLumpsRef.current += stage.gateLumpSum;
    refs.tipsRef.current += stage.gateLumpSum;
    setTips(refs.tipsRef.current);

    // Victory pulse
    spawnParticles(refs.particlePool, gate.x + gate.width / 2, gate.y, 'crumble', 15);
    spawnParticles(refs.particlePool, gate.x + gate.width / 2, gate.y + gate.height / 2, 'confetti', 20);
    refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.5 };

    // Transition to VICTORY
    console.log('STATE -> VICTORY (Stage ' + refs.stageIndexRef.current + ')');
    refs.playPhaseRef.current = 'VICTORY';
    setPlayPhase('VICTORY');
    refs.gateCleanupTimerRef.current = GAME_CONFIG.GATE_CLEANUP_DURATION;
  }
}
