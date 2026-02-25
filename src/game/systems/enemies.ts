/**
 * Enemy Update System — movement, latching, stacking, damage, death.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG, LATCH_DAMAGE_MULT_BY_STAGE } from '../config';
import type { CartBlock } from '../types';
import type { GameRefs } from './gameRefs';
import { getStage } from './factories';
import { spawnParticles, spawnTip, spawnFloatingDamage } from './vfx';

/**
 * Update all active enemies each frame.
 * Handles: SERVED exit, death (coins + VFX), LATCHED (block damage),
 * QUEUED→LATCHED promotion, slow debuff, WALKING movement, latch check.
 *
 * @param onGameOver — callback invoked when all blocks are destroyed.
 * @param setTips    — React setter for tip display.
 */
export function updateEnemies(
  refs: GameRefs,
  deltaTime: number,
  blocks: CartBlock[],
  onGameOver: () => void,
  setTips: (v: number) => void,
) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  const cartRightEdge = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  const maxLatched = GAME_CONFIG.MAX_LATCHED_ENEMIES;
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const stackSpacing = GAME_CONFIG.ENEMY_STACK_SPACING;

  // Telemetry: peak latched tracking
  if (refs.latchedCountRef.current > refs.telemetryRef.current.maxLatchedPeak) {
    refs.telemetryRef.current.maxLatchedPeak = refs.latchedCountRef.current;
  }
  if (refs.latchedCountRef.current >= maxLatched) {
    refs.telemetryRef.current.timeAtMaxLatched += deltaTime;
  }

  // Calculate stack positions for latched enemies (sorted by latch order)
  const latchedEnemies = refs.enemyPool.getActive()
    .filter(e => e.state === 'LATCHED' && e.hp > 0)
    .sort((a, b) => a.latchOrder - b.latchOrder);
  latchedEnemies.forEach((enemy, stackIdx) => {
    // Position enemies in a vertical stack: bottom-up from ground level
    enemy.y = groundY - stackIdx * stackSpacing;
  });

  let queuedCount = 0;

  refs.enemyPool.getActive().forEach(enemy => {
    // ── SERVED state ──
    if (enemy.state === 'SERVED' || enemy.isServed) {
      enemy.servedTimer -= deltaTime;
      enemy.x += GAME_CONFIG.SERVED_EXIT_SPEED * deltaTime;
      if (enemy.servedTimer <= 0 || enemy.x > GAME_CONFIG.CANVAS_WIDTH + 50) {
        refs.enemyPool.release(enemy);
      }
      return;
    }

    // ── Check if just killed (HP <= 0) ──
    if (enemy.hp <= 0) {
      if (enemy.state === 'LATCHED') {
        const slotsUsed = enemy.kind === 'BOSS' ? GAME_CONFIG.BOSS_LATCH_SLOTS : 1;
        refs.latchedCountRef.current = Math.max(0, refs.latchedCountRef.current - slotsUsed);
      }

      enemy.state = 'SERVED';
      enemy.isServed = true;
      enemy.servedTimer = GAME_CONFIG.SERVED_EXIT_DURATION;
      refs.customersServedRef.current++;

      // Track kills
      if (enemy.kind === 'BOSS') refs.telemetryRef.current.enemiesKilled.boss++;
      else if (enemy.kind === 'HEAVY') refs.telemetryRef.current.enemiesKilled.heavy++;
      else refs.telemetryRef.current.enemiesKilled.normal++;

      // Drop coins (stage-based)
      const stage = getStage(refs.stageIndexRef.current);
      const coinDrop = enemy.kind === 'BOSS' ? (stage.bossDropCoins ?? stage.enemyDropCoins) : stage.enemyDropCoins;
      refs.coinsFromKillsRef.current += coinDrop;
      refs.tipsRef.current += coinDrop;
      setTips(refs.tipsRef.current);

      // Spawn tip visual
      spawnTip(refs.tipPool, enemy.x, enemy.y - enemy.height, coinDrop);

      // Celebration particles
      const pCount = enemy.kind === 'BOSS' ? 10 : 3;
      spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'heart', pCount);
      spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'sparkle', pCount + 2);
      if (enemy.kind === 'BOSS') spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'confetti', 20);

      // EXPLODER: on death, deal blast damage to nearby blocks
      if (enemy.kind === 'EXPLODER' && activeBlocks.length > 0) {
        refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.25 };
        spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'confetti', 15);
        spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'steam', 10);
        // Damage closest block if within blast radius
        const blastX = enemy.x;
        const blastY = enemy.y - enemy.height / 2;
        activeBlocks.forEach(b => {
          const bx = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH / 2;
          const by = b.y + GAME_CONFIG.BLOCK_HEIGHT / 2;
          const dist = Math.sqrt((blastX - bx) ** 2 + (blastY - by) ** 2);
          if (dist < GAME_CONFIG.EXPLODER_BLAST_RADIUS) {
            b.hp -= GAME_CONFIG.EXPLODER_BLAST_DAMAGE;
            spawnParticles(refs.particlePool, bx, by, 'crumble', 4);
            spawnFloatingDamage(refs.floatingDamagePool, bx, by - 10, GAME_CONFIG.EXPLODER_BLAST_DAMAGE, 'hsl(0, 70%, 55%)');
          }
        });
      }
      return;
    }

    // ── LATCHED state — enemies damage blocks based on their stack height ──
    if (enemy.state === 'LATCHED') {
      enemy.latchedTimer -= deltaTime;
      if (enemy.latchedTimer <= 0 && activeBlocks.length > 0) {
        // Find which block this enemy overlaps based on its stack Y position
        const enemyCenterY = enemy.y - enemy.height / 2;

        // Find the block whose vertical range contains the enemy's center
        let targetBlock = activeBlocks.find(b => {
          const blockTop = b.y;
          const blockBottom = b.y + b.height;
          return enemyCenterY >= blockTop && enemyCenterY <= blockBottom;
        });

        // Fallback: if enemy is below all blocks, hit bottom block
        // If enemy is above all blocks, hit top block
        if (!targetBlock) {
          if (enemyCenterY > activeBlocks[0].y + activeBlocks[0].height) {
            targetBlock = activeBlocks[0]; // below all blocks → hit bottom
          } else {
            targetBlock = activeBlocks[activeBlocks.length - 1]; // above all → hit top
          }
        }

        let tickDamage = GAME_CONFIG.LATCHED_TICK_DAMAGE;
        // Stage-aware latch damage multiplier (death wall pressure)
        const stageMult = LATCH_DAMAGE_MULT_BY_STAGE[refs.stageIndexRef.current - 1] ?? 1.0;
        tickDamage *= stageMult;
        if (enemy.kind === 'BOSS') {
          tickDamage *= GAME_CONFIG.BOSS_TICK_DAMAGE_MULT;
          // Boss phase damage multiplier
          const bossPhase = refs.bossStateRef.current.phase;
          if (bossPhase === 4) tickDamage *= GAME_CONFIG.BOSS_PHASE4_DAMAGE_MULT;
          else if (bossPhase === 3) tickDamage *= GAME_CONFIG.BOSS_PHASE3_DAMAGE_MULT;
          else if (bossPhase === 2) tickDamage *= GAME_CONFIG.BOSS_PHASE2_DAMAGE_MULT;
        }
        else if (enemy.kind === 'HEAVY') tickDamage *= GAME_CONFIG.HEAVY_TICK_DAMAGE_MULT;
        else if (enemy.kind === 'SPEEDER') tickDamage *= GAME_CONFIG.SPEEDER_TICK_DAMAGE_MULT;
        else if (enemy.kind === 'SHIELDED') tickDamage *= GAME_CONFIG.SHIELDED_TICK_DAMAGE_MULT;
        else if (enemy.kind === 'EXPLODER') tickDamage *= GAME_CONFIG.EXPLODER_TICK_DAMAGE_MULT;
        targetBlock.hp -= tickDamage;
        enemy.latchedTimer = GAME_CONFIG.LATCHED_TICK_INTERVAL;

        spawnParticles(refs.particlePool, cartRightEdge, targetBlock.y + GAME_CONFIG.BLOCK_HEIGHT / 2, 'steam', enemy.kind === 'BOSS' ? 5 : 2);

        if (targetBlock.hp <= 0) {
          targetBlock.destroyed = true;
          refs.telemetryRef.current.blocksLost++;
          if (refs.telemetryRef.current.timeToFirstBlockLost < 0) {
            refs.telemetryRef.current.timeToFirstBlockLost = refs.timeRef.current;
          }

          // Crumble particles at destroyed block position
          spawnParticles(refs.particlePool, GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH / 2, targetBlock.y, 'crumble', 12);
          spawnParticles(refs.particlePool, GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH / 2, targetBlock.y, 'steam', 8);

          // Screen shake on block destruction
          refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.4 };

          // Collapse: blocks above the destroyed one need to fall down
          const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
          const remainingBlocks = blocks.filter(b => !b.destroyed && b.id > targetBlock.id);
          remainingBlocks.forEach(b => {
            b.collapseOffset -= boxHeight;
          });

          // Update game logic Y positions for remaining blocks
          const newActiveBlocks = blocks.filter(b => !b.destroyed).sort((a, b2) => a.id - b2.id);
          newActiveBlocks.forEach((b, i) => {
            b.y = groundY - 30 - (i + 1) * GAME_CONFIG.BLOCK_HEIGHT;
          });

          if (blocks.filter(b => !b.destroyed).length === 0) {
            onGameOver();
          }
        }
      }
      return;
    }

    // ── QUEUED state ──
    if (enemy.state === 'QUEUED') {
      if (refs.latchedCountRef.current < maxLatched) {
        enemy.state = 'LATCHED';
        enemy.latchedTimer = GAME_CONFIG.LATCHED_TICK_INTERVAL;
        enemy.x = cartRightEdge + enemy.width / 2;
        enemy.latchOrder = refs.latchOrderCounterRef.current++;
        refs.latchedCountRef.current++;
      } else {
        queuedCount++;
        const targetX = cartRightEdge + enemy.width / 2 + queuedCount * (enemy.width + GAME_CONFIG.LATCHED_QUEUE_SPACING);
        if (enemy.x > targetX) {
          enemy.x -= enemy.speed * 0.3 * deltaTime;
          enemy.x = Math.max(enemy.x, targetX);
        }
      }
      return;
    }

    // ── Update slow debuff timer ──
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= deltaTime;
      if (enemy.slowTimer <= 0) { enemy.slowTimer = 0; enemy.slowFactor = 1; }
    }

    // ── WALKING state ──
    const effectiveSpeed = enemy.speed * (enemy.slowTimer > 0 ? enemy.slowFactor : 1);
    enemy.x -= effectiveSpeed * deltaTime;

    if (enemy.x - enemy.width / 2 < cartRightEdge) {
      const slotsNeeded = enemy.kind === 'BOSS' ? GAME_CONFIG.BOSS_LATCH_SLOTS : 1;
      if (refs.latchedCountRef.current + slotsNeeded <= maxLatched && activeBlocks.length > 0) {
        enemy.state = 'LATCHED';
        enemy.latchedTimer = GAME_CONFIG.LATCHED_TICK_INTERVAL;
        enemy.x = cartRightEdge + enemy.width / 2;
        enemy.latchOrder = refs.latchOrderCounterRef.current++;
        refs.latchedCountRef.current += slotsNeeded;
      } else if (activeBlocks.length > 0) {
        enemy.state = 'QUEUED';
      }
    }
  });
}
