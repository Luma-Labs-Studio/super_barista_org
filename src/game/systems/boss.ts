/**
 * Boss System — spawn, HP phase transitions, add spawning.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG } from '../config';
import type { GameRefs } from './gameRefs';
import { getStage } from './factories';
import { spawnEnemy } from './spawning';
import { spawnParticles } from './vfx';

// ─────────────────────────────────────────────────────────────
// updateBossSystem — boss spawn countdown, phase transitions,
// add spawning during phases 2-4, death → chapter clear.
// ─────────────────────────────────────────────────────────────

export function updateBossSystem(
  refs: GameRefs,
  deltaTime: number,
  currentTime: number,
  handleChapterClear: () => void,
) {
  if (refs.playPhaseRef.current !== 'BOSS') return;

  // ── Boss spawn countdown ──
  if (refs.bossIncomingRef.current > 0) {
    refs.bossIncomingRef.current -= deltaTime;
    if (refs.bossIncomingRef.current <= 0) {
      refs.bossIncomingRef.current = -1;
      const bossEnemy = refs.enemyPool.acquire();
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
        refs.bossEnemyRef.current = bossEnemy;
        refs.bossStateRef.current = {
          isActive: true, hp: bossHP, maxHp: bossHP,
          spawnedAt: currentTime, addSpawnTimer: 0,
          phase: 1, phaseTransitioned: [false, false, false],
        };
        refs.telemetryRef.current.enemiesSpawned.boss++;
      }
    }
  } else if (!refs.bossStateRef.current.isActive && refs.bossEnemyRef.current === null && refs.bossIncomingRef.current === 0) {
    // Kick off the incoming banner countdown
    refs.bossIncomingRef.current = GAME_CONFIG.BOSS_INCOMING_BANNER_DURATION;
  }

  // ── Boss state + phase transitions ──
  if (refs.bossStateRef.current.isActive && refs.bossEnemyRef.current) {
    const boss = refs.bossEnemyRef.current;
    refs.bossStateRef.current.hp = boss.hp;

    // Boss defeated
    if (boss.hp <= 0 || boss.isServed) {
      refs.bossStateRef.current.isActive = false;
      refs.bossEnemyRef.current = null;
      handleChapterClear();
      return;
    }

    // Boss Phase System: check HP thresholds
    const hpPercent = boss.hp / boss.maxHp;
    const bs = refs.bossStateRef.current;

    // Phase 4: Enrage (25% HP)
    if (hpPercent <= GAME_CONFIG.BOSS_PHASE4_THRESHOLD && !bs.phaseTransitioned[2]) {
      bs.phase = 4;
      bs.phaseTransitioned[2] = true;
      refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.5 };
      spawnParticles(refs.particlePool, boss.x, boss.y - boss.height / 2, 'confetti', 15);
    }
    // Phase 3: Speed + Damage (50% HP)
    else if (hpPercent <= GAME_CONFIG.BOSS_PHASE3_THRESHOLD && !bs.phaseTransitioned[1]) {
      bs.phase = 3;
      bs.phaseTransitioned[1] = true;
      refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.4 };
      spawnParticles(refs.particlePool, boss.x, boss.y - boss.height / 2, 'steam', 10);
    }
    // Phase 2: Extra spawns (75% HP)
    else if (hpPercent <= GAME_CONFIG.BOSS_PHASE2_THRESHOLD && !bs.phaseTransitioned[0]) {
      bs.phase = 2;
      bs.phaseTransitioned[0] = true;
      refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
      spawnParticles(refs.particlePool, boss.x, boss.y - boss.height / 2, 'steam', 8);
    }

    // Phase-based add spawning (phases 2-4 spawn extra enemies)
    if (bs.phase >= 2) {
      const spawnInterval = bs.phase === 4 ? GAME_CONFIG.BOSS_PHASE4_SPAWN_INTERVAL
        : bs.phase === 3 ? GAME_CONFIG.BOSS_PHASE3_SPAWN_INTERVAL
        : GAME_CONFIG.BOSS_PHASE2_SPAWN_INTERVAL;

      bs.addSpawnTimer += deltaTime;
      if (bs.addSpawnTimer >= spawnInterval) {
        bs.addSpawnTimer -= spawnInterval;
        spawnEnemy(refs); // Spawn an add
      }
    }
  }
}
