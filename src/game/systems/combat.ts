/**
 * Combat System — projectile firing, auto-attack targeting, projectile update.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG } from '../config';
import type { Enemy, Projectile } from '../types';
import type { GameRefs, ObjectPool } from './gameRefs';
import { spawnParticles, spawnFloatingDamage } from './vfx';

// ─────────────────────────────────────────────────────────────
// Projectile firing helpers
// ─────────────────────────────────────────────────────────────

/** Fire a projectile at a specific enemy */
export function fireProjectile(
  refs: GameRefs,
  targetEnemy: Enemy,
  isStressTest: boolean,
  pierce = false,
  isStar = false,
) {
  const proj = refs.projectilePool.acquire();
  if (!proj) return;

  const activeBlocks = refs.blocksRef.current.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;

  const topBlock = activeBlocks[activeBlocks.length - 1];
  proj.x = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  proj.y = topBlock.y + GAME_CONFIG.MUZZLE_Y_OFFSET;
  proj.targetX = targetEnemy.x;
  proj.targetY = targetEnemy.y - targetEnemy.height / 2;
  const stressMultiplier = isStressTest ? 0.4 : 1;
  proj.damage = Math.floor(GAME_CONFIG.PROJECTILE_DAMAGE * refs.damageMultiplierRef.current * stressMultiplier);
  proj.pierce = pierce;
  proj.isStar = isStar;
  proj.isBrew = false;
  proj.isEspresso = false;
  proj.isIce = false;
  proj.hitGate = false;
}

/** Fire a projectile at raw coordinates (for shotgun/burst spread) */
export function fireProjectileAt(
  refs: GameRefs,
  targetX: number,
  targetY: number,
  isStressTest: boolean,
  customDamage?: number,
  pierce = false,
  isStar = false,
) {
  const proj = refs.projectilePool.acquire();
  if (!proj) return;

  const activeBlocks = refs.blocksRef.current.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;

  const topBlock = activeBlocks[activeBlocks.length - 1];
  proj.x = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  proj.y = topBlock.y + GAME_CONFIG.MUZZLE_Y_OFFSET;
  proj.targetX = targetX;
  proj.targetY = targetY;
  proj.radius = GAME_CONFIG.PROJECTILE_RADIUS;
  const stressMultiplier = isStressTest ? 0.4 : 1;
  proj.damage = customDamage ?? Math.floor(GAME_CONFIG.PROJECTILE_DAMAGE * refs.damageMultiplierRef.current * stressMultiplier);
  proj.pierce = pierce;
  proj.isStar = isStar;
  proj.isBrew = false;
  proj.isEspresso = false;
  proj.isIce = false;
  proj.hitGate = false;
}

// ─────────────────────────────────────────────────────────────
// Auto-attack (called each frame from gameLoop)
// ─────────────────────────────────────────────────────────────

export function updateAutoAttack(refs: GameRefs, currentTime: number, isStressTest: boolean) {
  const enemies = refs.enemyPool.getActive().filter(e => !e.isServed && e.state !== 'SERVED');
  const hasEnemies = enemies.length > 0;
  const hasGateTarget = refs.gateBuildingRef.current && !refs.gateBuildingRef.current.isDestroyed && refs.playPhaseRef.current === 'SIEGE';

  if ((hasEnemies || hasGateTarget) && currentTime - refs.lastAttackRef.current > GAME_CONFIG.AUTO_ATTACK_INTERVAL / 1000) {
    const cartX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;

    // Find nearest enemy
    let nearest: Enemy | null = null;
    if (hasEnemies) {
      nearest = enemies[0];
      let minDist = Math.abs(enemies[0].x - cartX);
      enemies.forEach(e => {
        const dist = Math.abs(e.x - cartX);
        if (dist < minDist) { minDist = dist; nearest = e; }
      });
    }

    if (GAME_CONFIG.WEAPON_MODE === 'shotgun') {
      const activeBlocks = refs.blocksRef.current.filter(b => !b.destroyed);
      if (activeBlocks.length > 0) {
        const originX = cartX;
        const topBlock = activeBlocks[activeBlocks.length - 1];
        const originY = topBlock.y + GAME_CONFIG.MUZZLE_Y_OFFSET;

        // ── Determine target mode ──
        let targetMode: 'front' | 'mid' | 'back' | 'gate' = 'gate';

        if (hasEnemies) {
          const crowding = enemies.filter(e => e.x < cartX + GAME_CONFIG.CROWDING_RANGE).length;
          const weights = crowding >= GAME_CONFIG.CROWDING_THRESHOLD
            ? GAME_CONFIG.TARGET_WEIGHTS_CROWDED
            : GAME_CONFIG.TARGET_WEIGHTS_NORMAL;

          const roll = Math.random();
          let cumulative = 0;
          const modes: Array<'front' | 'mid' | 'back' | 'gate'> = ['front', 'mid', 'back', 'gate'];
          for (let m = 0; m < 4; m++) {
            cumulative += weights[m];
            if (roll < cumulative) { targetMode = modes[m]; break; }
          }

          // Gate snap lock: when lane is clear, force gate targeting
          const nearEnemies = enemies.filter(e => e.x < cartX + 150);
          if (nearEnemies.length === 0 && refs.gateBuildingRef.current && !refs.gateBuildingRef.current.isDestroyed) {
            targetMode = 'gate';
          }
        } else {
          targetMode = 'gate';
        }

        // Determine aim target based on mode
        let aimTarget: { x: number; y: number };
        const sorted = [...enemies].sort((a, b) => a.x - b.x);

        if (targetMode === 'mid' && sorted.length >= 3) {
          const midStart = Math.floor(sorted.length * 0.3);
          const midEnd = Math.floor(sorted.length * 0.7);
          const midEnemies = sorted.slice(midStart, Math.max(midEnd, midStart + 1));
          const pick = midEnemies[Math.floor(Math.random() * midEnemies.length)];
          aimTarget = { x: pick.x, y: pick.y - pick.height / 2 };
        } else if (targetMode === 'back' && sorted.length >= 2) {
          const backStart = Math.floor(sorted.length * 0.7);
          const backEnemies = sorted.slice(backStart);
          const pick = backEnemies[Math.floor(Math.random() * backEnemies.length)];
          aimTarget = { x: pick.x, y: pick.y - pick.height / 2 };
        } else if (targetMode === 'gate' && refs.gateBuildingRef.current && !refs.gateBuildingRef.current.isDestroyed) {
          const g = refs.gateBuildingRef.current;
          aimTarget = { x: g.x + g.width / 2, y: g.y + g.height / 2 + (Math.random() * 40 - 20) };
        } else if (nearest) {
          targetMode = 'front';
          aimTarget = { x: nearest.x, y: nearest.y - nearest.height / 2 };
        } else {
          return; // No valid target
        }

        refs.targetModeCountsRef.current[targetMode]++;

        // Apply Y jitter + tilt (TDS feel)
        const roughDist = Math.abs(aimTarget.x - originX);
        const jitterScale = Math.max(0.35, Math.min(1.0, roughDist / GAME_CONFIG.CROWDING_RANGE));
        const scaledJitter = GAME_CONFIG.AIM_Y_JITTER * jitterScale;
        const jitteredY = aimTarget.y + GAME_CONFIG.AIM_Y_TILT + (Math.random() * 2 - 1) * scaledJitter;

        const baseAngle = Math.atan2(jitteredY - originY, aimTarget.x - originX);
        const distance = Math.sqrt((aimTarget.x - originX) ** 2 + (jitteredY - originY) ** 2);

        // Dynamic spread
        const distanceFactor = 1 + (distance / 300) * GAME_CONFIG.SHOTGUN_SPREAD_DISTANCE_SCALE;
        const effectiveSpreadDeg = Math.min(
          Math.max(GAME_CONFIG.SHOTGUN_SPREAD_DEG * distanceFactor, GAME_CONFIG.SHOTGUN_SPREAD_DEG_MIN),
          GAME_CONFIG.SHOTGUN_SPREAD_DEG_MAX
        );
        const spreadRad = effectiveSpreadDeg * (Math.PI / 180);

        const count = Math.min(GAME_CONFIG.SHOTGUN_PELLETS, 6);

        // Per-pellet damage
        const stressMultiplier = isStressTest ? 0.4 : 1;
        const baseDamage = Math.floor(GAME_CONFIG.PROJECTILE_DAMAGE * refs.damageMultiplierRef.current * stressMultiplier);
        let pelletDamages: number[];
        if (GAME_CONFIG.SHOTGUN_DAMAGE_SPLIT === 'weighted_center') {
          const rawWeights = Array.from({ length: count }, (_, i) => {
            const center = (count - 1) / 2;
            return 1 + (1 - Math.abs(i - center) / Math.max(center, 1));
          });
          const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
          pelletDamages = rawWeights.map(w => Math.max(1, Math.round((w / totalWeight) * baseDamage)));
        } else {
          pelletDamages = Array(count).fill(Math.max(1, Math.round(baseDamage / count)));
        }

        for (let i = 0; i < count; i++) {
          const t = (i - (count - 1) / 2) / Math.max((count - 1) / 2, 1);
          const biasedT = Math.sign(t) * Math.pow(Math.abs(t), 0.8);
          const offset = biasedT * spreadRad / 2;
          const angle = baseAngle + offset;
          const projTargetX = originX + Math.cos(angle) * distance;
          const projTargetY = originY + Math.sin(angle) * distance;
          fireProjectileAt(refs, projTargetX, projTargetY, isStressTest, pelletDamages[i]);
        }
        refs.shotsFiredRef.current += count;
        refs.burstsTriggeredRef.current++;
      }
    } else if (nearest) {
      fireProjectile(refs, nearest, isStressTest);
      refs.shotsFiredRef.current++;
    }
    refs.lastAttackRef.current = currentTime;
  }
}

// ─────────────────────────────────────────────────────────────
// Projectile update (movement + collision detection)
// ─────────────────────────────────────────────────────────────

export function updateProjectiles(refs: GameRefs, deltaTime: number) {
  refs.projectilePool.getActive().forEach(proj => {
    const dx = proj.targetX - proj.x;
    const dy = proj.targetY - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const speed = proj.speed * deltaTime;
      proj.x += (dx / dist) * speed;
      proj.y += (dy / dist) * speed;
    }

    // Check enemy collision
    let hitEnemy = false;
    refs.enemyPool.getActive().forEach(enemy => {
      if (hitEnemy && !proj.pierce) return;
      if (enemy.isServed || enemy.state === 'SERVED') return;

      const ex = enemy.x;
      const ey = enemy.y - enemy.height / 2;
      const hitDist = Math.sqrt((proj.x - ex) ** 2 + (proj.y - ey) ** 2);

      if (hitDist < enemy.width / 2 + proj.radius + 5) {
        // Shield absorption
        let dmg = proj.damage;
        if (enemy.shieldHp > 0) {
          const absorbed = Math.min(enemy.shieldHp, dmg);
          enemy.shieldHp -= absorbed;
          dmg -= absorbed;
          if (enemy.shieldHp <= 0) {
            spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'steam', 5);
          }
        }
        enemy.hp -= dmg;
        // Ice projectile: apply slow debuff
        if (proj.isIce && enemy.hp > 0) {
          enemy.slowTimer = GAME_CONFIG.ICE_PASSIVE_SLOW_DURATION;
          enemy.slowFactor = GAME_CONFIG.ICE_PASSIVE_SLOW_FACTOR;
          refs.iceTelemetryRef.current.slowsApplied++;
        }
        refs.shotsHitRef.current++;
        refs.shotsToEnemiesRef.current++;
        if (proj.isStar) {
          refs.starTelemetryRef.current.throwDamageEnemies += proj.damage;
          spawnFloatingDamage(refs.floatingDamagePool, enemy.x, enemy.y - enemy.height, proj.damage, 'hsl(45, 90%, 55%)');
        }
        if (proj.isBrew) refs.foamTelemetryRef.current.passiveDamage += proj.damage;
        if (proj.isEspresso) refs.espressoTelemetryRef.current.passiveDamage += proj.damage;
        if (proj.isIce) refs.iceTelemetryRef.current.passiveDamage += proj.damage;
        spawnParticles(refs.particlePool, proj.x, proj.y, enemy.shieldHp > 0 ? 'steam' : 'sparkle', 3);
        hitEnemy = true;
        if (!proj.pierce) {
          refs.projectilePool.release(proj);
        }
      }
    });

    // Gate collision
    if (!hitEnemy || proj.pierce) {
      const g = refs.gateBuildingRef.current;
      if (g && !g.isDestroyed && !proj.hitGate && refs.playPhaseRef.current !== 'APPROACH') {
        const isStarPierce = proj.isStar && proj.pierce;
        const positionHit = proj.x >= g.x && proj.x <= g.x + g.width &&
            proj.y >= g.y && proj.y <= g.y + g.height;

        if (isStarPierce || positionHit) {
          g.hp -= proj.damage;
          g.lastHitTime = refs.timeRef.current;
          if (proj.pierce) proj.hitGate = true;
          const si = refs.stageIndexRef.current - 1;
          if (si >= 0 && si < 5) refs.gateDamageDealtRef.current[si] += proj.damage;
          if (proj.isStar) {
            refs.starTelemetryRef.current.throwDamageGate += proj.damage;
            spawnFloatingDamage(refs.floatingDamagePool, g.x + g.width / 2, g.y, proj.damage, 'hsl(45, 90%, 55%)');
          }
          if (proj.isBrew) refs.foamTelemetryRef.current.passiveShotsToGate++;
          if (proj.isEspresso) refs.espressoTelemetryRef.current.passiveDamage += proj.damage;
          if (proj.isIce) refs.iceTelemetryRef.current.passiveDamage += proj.damage;
          refs.shotsToGateRef.current++;
          spawnParticles(refs.particlePool, isStarPierce ? g.x : proj.x, isStarPierce ? g.y + g.height / 2 : proj.y, 'sparkle', 3);
          if (!proj.pierce) {
            refs.projectilePool.release(proj);
            return;
          }
        }
      }
    }

    // Out of bounds
    if (!hitEnemy && (proj.x > GAME_CONFIG.CANVAS_WIDTH + 50 || dist <= 1)) {
      refs.projectilePool.release(proj);
    }
  });
}
