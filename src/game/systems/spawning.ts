/**
 * Spawning System — spawnEnemy + siege/travel/breather spawn scheduling.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG, MINI_RUSH_CONFIG, TRAVEL_DURATION_BY_STAGE } from '../config';
import type { EnemyKind } from '../types';
import type { GameRefs } from './gameRefs';
import { getStage } from './factories';

// ─────────────────────────────────────────────────────────────
// spawnEnemy — create and configure a new enemy from the pool
// ─────────────────────────────────────────────────────────────

export function spawnEnemy(refs: GameRefs) {
  const activeCount = refs.enemyPool.getActive().length;
  if (activeCount >= GAME_CONFIG.MAX_ENEMIES) return;

  const enemy = refs.enemyPool.acquire();
  if (!enemy) return;

  const stage = getStage(refs.stageIndexRef.current);
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;

  // Determine enemy type based on spawn index and stage schedule
  refs.spawnIndexRef.current++;
  const idx = refs.spawnIndexRef.current;

  // Priority: Heavy > Shielded > Exploder > Speeder > Normal
  // Only one special type per spawn — first match wins
  let kind: EnemyKind = 'NORMAL';
  if (stage.heavyEvery > 0 && idx % stage.heavyEvery === 0) {
    kind = 'HEAVY';
  } else if (stage.shieldedEvery > 0 && idx % stage.shieldedEvery === 0) {
    kind = 'SHIELDED';
  } else if (stage.exploderEvery > 0 && idx % stage.exploderEvery === 0) {
    kind = 'EXPLODER';
  } else if (stage.speederEvery > 0 && idx % stage.speederEvery === 0) {
    kind = 'SPEEDER';
  }

  enemy.kind = kind;

  // Telemetry
  if (kind === 'HEAVY') refs.telemetryRef.current.enemiesSpawned.heavy++;
  else refs.telemetryRef.current.enemiesSpawned.normal++; // all non-heavy counted as normal for now

  // Per-kind multipliers
  let hpMult = 1, speedMult = 1, sizeMult = 1;
  switch (kind) {
    case 'HEAVY':
      hpMult = GAME_CONFIG.HEAVY_HP_MULT; speedMult = GAME_CONFIG.HEAVY_SPEED_MULT; sizeMult = GAME_CONFIG.HEAVY_SIZE_MULT;
      break;
    case 'SPEEDER':
      hpMult = GAME_CONFIG.SPEEDER_HP_MULT; speedMult = GAME_CONFIG.SPEEDER_SPEED_MULT; sizeMult = GAME_CONFIG.SPEEDER_SIZE_MULT;
      break;
    case 'SHIELDED':
      hpMult = GAME_CONFIG.SHIELDED_HP_MULT; speedMult = GAME_CONFIG.SHIELDED_SPEED_MULT; sizeMult = GAME_CONFIG.SHIELDED_SIZE_MULT;
      break;
    case 'EXPLODER':
      hpMult = GAME_CONFIG.EXPLODER_HP_MULT; speedMult = GAME_CONFIG.EXPLODER_SPEED_MULT; sizeMult = GAME_CONFIG.EXPLODER_SIZE_MULT;
      break;
  }

  enemy.x = GAME_CONFIG.CANVAS_WIDTH + 30;
  enemy.y = groundY;
  enemy.maxHp = Math.floor(GAME_CONFIG.ENEMY_BASE_HP * stage.enemyHpMult * hpMult);
  enemy.hp = enemy.maxHp;
  enemy.speed = GAME_CONFIG.ENEMY_BASE_SPEED * stage.enemySpeedMult * speedMult;
  enemy.width = Math.floor(GAME_CONFIG.ENEMY_WIDTH * sizeMult);
  enemy.height = Math.floor(GAME_CONFIG.ENEMY_HEIGHT * sizeMult);
  enemy.isServed = false;
  enemy.servedTimer = 0;
  enemy.state = 'WALKING';
  enemy.latchedTimer = 0;
  enemy.queuePosition = 0;
  enemy.latchOrder = 0;
  enemy.slowTimer = 0;
  enemy.slowFactor = 1;

  // Shielded: extra armor HP
  enemy.shieldHp = kind === 'SHIELDED'
    ? Math.floor(enemy.maxHp * GAME_CONFIG.SHIELDED_ARMOR_HP_MULT) : 0;
}

// ─────────────────────────────────────────────────────────────
// Siege spawn scheduling (wave-based or continuous)
// ─────────────────────────────────────────────────────────────

export function updateSiegeSpawning(refs: GameRefs, currentTime: number, deltaTime: number) {
  const gate = refs.gateBuildingRef.current;
  const canSpawn = refs.playPhaseRef.current === 'SIEGE' && gate && !gate.isDestroyed;

  if (!canSpawn) return;

  const si = refs.stageIndexRef.current;
  const isWaveSiege = si === 1 || si === 2;

  if (isWaveSiege) {
    // Wave-based spawning with breather windows (Stage 1 & 2)
    const waveSize = si === 1 ? GAME_CONFIG.STAGE1_WAVE_SIZE : GAME_CONFIG.STAGE2_WAVE_SIZE;
    const waveBreather = si === 1 ? GAME_CONFIG.STAGE1_WAVE_BREATHER : GAME_CONFIG.STAGE2_WAVE_BREATHER;

    // Bomb silence timer
    if (refs.bombSilenceTimerRef.current > 0) {
      refs.bombSilenceTimerRef.current -= deltaTime;
    } else if (refs.stage1WaveRef.current.breatherTimer > 0) {
      // Breather between waves
      refs.stage1WaveRef.current.breatherTimer -= deltaTime;
      if (refs.stage1WaveRef.current.breatherTimer <= 0) {
        refs.stage1WaveRef.current.spawned = 0; // Reset for next wave
      }
    } else if (refs.stage1WaveRef.current.spawned < waveSize) {
      // Spawn wave enemies
      const stage = getStage(si);
      const effectiveInterval = Math.max(GAME_CONFIG.MIN_SPAWN_INTERVAL, stage.spawnInterval);
      if (currentTime - refs.lastSpawnRef.current > effectiveInterval / 1000) {
        spawnEnemy(refs);
        refs.lastSpawnRef.current = currentTime;
        refs.stage1WaveRef.current.spawned++;
      }
    } else {
      // Wave fully spawned, check if all dead for breather
      const aliveEnemies = refs.enemyPool.getActive().filter(e => !e.isServed && e.state !== 'SERVED').length;
      if (aliveEnemies === 0) {
        refs.stage1WaveRef.current.breatherTimer = waveBreather;
      }
    }
  } else {
    // Stages 2+: continuous spawning with bomb silence
    if (refs.bombSilenceTimerRef.current > 0) {
      refs.bombSilenceTimerRef.current -= deltaTime;
    } else {
      const stage = getStage(refs.stageIndexRef.current);
      let spawnInterval = stage.spawnInterval;

      if (gate!.breathingActive) {
        spawnInterval *= GAME_CONFIG.GATE_BREATHING_SPAWN_MULT;
      }

      const effectiveInterval = Math.max(GAME_CONFIG.MIN_SPAWN_INTERVAL, spawnInterval);

      if (currentTime - refs.lastSpawnRef.current > effectiveInterval / 1000) {
        spawnEnemy(refs);
        refs.lastSpawnRef.current = currentTime;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Travel spawn scheduling (stages 1 vs 2+)
// ─────────────────────────────────────────────────────────────

export function updateTravelSpawning(refs: GameRefs, currentTime: number) {
  if (refs.playPhaseRef.current !== 'TRAVEL') return;

  const si = refs.stageIndexRef.current;

  if (si === 1) {
    // Stage 1 pilot: travel with enemy spawning
    const stage = getStage(1);
    const effectiveInterval = Math.max(GAME_CONFIG.MIN_SPAWN_INTERVAL, stage.spawnInterval);
    if (currentTime - refs.lastSpawnRef.current > effectiveInterval / 1000) {
      spawnEnemy(refs);
      refs.lastSpawnRef.current = currentTime;
    }
  } else {
    // Stages 2+: travel WITH enemy spawning (mini-rush in middle section)
    const stage = getStage(si);
    const totalTravelDuration = TRAVEL_DURATION_BY_STAGE[si - 1] ?? GAME_CONFIG.TRAVEL_DURATION;
    const elapsed = totalTravelDuration - refs.travelTimerRef.current;
    const rushStart = totalTravelDuration * MINI_RUSH_CONFIG.START_RATIO;
    const rushEnd = rushStart + MINI_RUSH_CONFIG.DURATION;
    const isInMiniRush = si >= MINI_RUSH_CONFIG.ENABLED_FROM_STAGE && elapsed >= rushStart && elapsed < rushEnd;

    const baseInterval = Math.max(GAME_CONFIG.MIN_SPAWN_INTERVAL, stage.spawnInterval);
    const effectiveInterval = isInMiniRush ? baseInterval * MINI_RUSH_CONFIG.SPAWN_MULT : baseInterval;
    if (currentTime - refs.lastSpawnRef.current > effectiveInterval / 1000) {
      spawnEnemy(refs);
      refs.lastSpawnRef.current = currentTime;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Breather spawn scheduling (reduced rate)
// ─────────────────────────────────────────────────────────────

export function updateBreatherSpawning(refs: GameRefs, currentTime: number) {
  if (refs.playPhaseRef.current !== 'BREATHER') return;

  const stage = getStage(refs.stageIndexRef.current);
  const baseInterval = Math.max(GAME_CONFIG.MIN_SPAWN_INTERVAL, stage.spawnInterval);
  const breatherInterval = baseInterval / GAME_CONFIG.BREATHER_SPAWN_REDUCTION; // slower spawns
  if (currentTime - refs.lastSpawnRef.current > breatherInterval / 1000) {
    spawnEnemy(refs);
    refs.lastSpawnRef.current = currentTime;
  }
}
