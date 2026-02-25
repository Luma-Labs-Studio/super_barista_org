/**
 * Weapons System — 4 passive weapons + 5 active abilities.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG, BOMB_SILENCE_BY_STAGE } from '../config';
import type { Enemy } from '../types';
import type { GameRefs } from './gameRefs';
import { spawnParticles, spawnFloatingDamage } from './vfx';

// ─────────────────────────────────────────────────────────────
// Active abilities (called from HUD button handlers)
// ─────────────────────────────────────────────────────────────

/** Tonic Bomb — AoE damage to enemies + gate, creates spawn silence */
export function handleTonicBomb(
  refs: GameRefs,
  setPower: (v: number) => void,
) {
  if (refs.powerRef.current < GAME_CONFIG.TONIC_BOMB_COST) return;

  refs.telemetryRef.current.tonicBombUses++;
  refs.powerRef.current -= GAME_CONFIG.TONIC_BOMB_COST;
  setPower(refs.powerRef.current);

  refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };

  const bombX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + 50;
  const bombY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 30;

  spawnParticles(refs.particlePool, bombX, bombY, 'confetti', 20);
  spawnParticles(refs.particlePool, bombX, bombY, 'steam', 10);

  // Damage enemies
  let totalBombDmg = 0;
  refs.enemyPool.getActive().forEach(enemy => {
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
      spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'sparkle', 3);
    }
  });
  if (totalBombDmg > 0) {
    spawnFloatingDamage(refs.floatingDamagePool, bombX, bombY - 30, totalBombDmg, 'hsl(25, 80%, 55%)');
  }

  // Damage gate building
  const gate = refs.gateBuildingRef.current;
  if (gate && !gate.isDestroyed) {
    const gdx = gate.x + gate.width / 2 - bombX;
    const gdy = gate.y + gate.height / 2 - bombY;
    const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (gDist < GAME_CONFIG.TONIC_BOMB_RADIUS + gate.width) {
      gate.hp -= GAME_CONFIG.TONIC_BOMB_DAMAGE;
      const si = refs.stageIndexRef.current - 1;
      if (si >= 0 && si < 5) {
        refs.gateDamageDealtRef.current[si] += GAME_CONFIG.TONIC_BOMB_DAMAGE;
        refs.bombGateDamageByGateRef.current[si] += GAME_CONFIG.TONIC_BOMB_DAMAGE;
      }
      spawnParticles(refs.particlePool, gate.x + gate.width / 2, gate.y, 'sparkle', 5);
      spawnFloatingDamage(refs.floatingDamagePool, gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.TONIC_BOMB_DAMAGE, 'hsl(45, 90%, 55%)');
    }
  }

  // Spawn silence window
  if (refs.playPhaseRef.current === 'SIEGE') {
    const si = refs.stageIndexRef.current;
    const silenceDuration = BOMB_SILENCE_BY_STAGE[si - 1] ?? 0.6;
    refs.bombSilenceTimerRef.current = silenceDuration;
    refs.lastSpawnRef.current = refs.timeRef.current;
    if (si === 1 || si === 2) {
      refs.stage1WaveRef.current.spawned = 0;
      refs.stage1WaveRef.current.breatherTimer = 0;
    }
  }
}

/** Star Throw — piercing projectile power skill */
export function handleStarThrow(refs: GameRefs, setPower: (v: number) => void) {
  if (!refs.hasStarRef.current) return;
  if (refs.powerRef.current < GAME_CONFIG.STAR_THROW_COST) return;

  refs.powerRef.current -= GAME_CONFIG.STAR_THROW_COST;
  setPower(refs.powerRef.current);
  refs.starTelemetryRef.current.throwUses++;

  const activeBlocks = refs.blocksRef.current.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;

  const proj = refs.projectilePool.acquire();
  if (!proj) return;

  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  proj.x = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  proj.y = groundY - 30;
  proj.targetX = GAME_CONFIG.CANVAS_WIDTH + 100;
  proj.targetY = proj.y;
  proj.speed = GAME_CONFIG.STAR_THROW_SPEED;
  proj.damage = Math.floor(GAME_CONFIG.STAR_THROW_DAMAGE * refs.damageMultiplierRef.current * refs.starDamageMultRef.current);
  proj.radius = GAME_CONFIG.STAR_THROW_RADIUS;
  proj.pierce = true;
  proj.isStar = true;
  proj.isEspresso = false;
  proj.isIce = false;
  proj.isBrew = false;
  proj.hitGate = false;
}

/** Foam Burst — canvas-wide AoE power skill */
export function handleFoamBurst(refs: GameRefs, setPower: (v: number) => void) {
  if (!refs.hasFoamRef.current) return;
  const foamBlock = refs.blocksRef.current.find(b => b.id === refs.foamBoxIndexRef.current + 1);
  if (!foamBlock || foamBlock.destroyed) {
    refs.hasFoamRef.current = false;
    return;
  }
  if (refs.powerRef.current < GAME_CONFIG.BREW_BURST_COST) return;

  refs.powerRef.current -= GAME_CONFIG.BREW_BURST_COST;
  setPower(refs.powerRef.current);
  refs.foamTelemetryRef.current.burstUses++;
  refs.foamTelemetryRef.current.burstTimestamps.push(refs.timeRef.current);

  const burstGate = refs.gateBuildingRef.current;
  if (burstGate && !burstGate.isDestroyed) {
    refs.foamTelemetryRef.current.burstUsedDuringGate++;
  }

  refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };

  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;

  // Spawn foam wave particles
  for (let px = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH; px < GAME_CONFIG.CANVAS_WIDTH; px += 12) {
    spawnParticles(refs.particlePool, px, groundY - 30 + (Math.random() - 0.5) * 30, 'steam', 6);
  }

  // Damage ALL enemies on screen
  let totalBurstDmg = 0;
  refs.enemyPool.getActive().forEach(enemy => {
    if (enemy.state === 'SERVED' || enemy.isServed) return;
    let dmg = GAME_CONFIG.BREW_BURST_DAMAGE;
    if (enemy.shieldHp > 0) {
      const absorbed = Math.min(enemy.shieldHp, dmg);
      enemy.shieldHp -= absorbed; dmg -= absorbed;
    }
    enemy.hp -= dmg;
    totalBurstDmg += GAME_CONFIG.BREW_BURST_DAMAGE;
    refs.foamTelemetryRef.current.burstDamageEnemies += GAME_CONFIG.BREW_BURST_DAMAGE;
    spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'sparkle', 2);
  });
  if (totalBurstDmg > 0) {
    spawnFloatingDamage(refs.floatingDamagePool, GAME_CONFIG.CANVAS_WIDTH / 2, groundY - 80, totalBurstDmg, 'hsl(200, 70%, 75%)');
  }

  // Damage gate
  const gate = refs.gateBuildingRef.current;
  if (gate && !gate.isDestroyed) {
    gate.hp -= GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
    refs.foamTelemetryRef.current.burstDamageGate += GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
    const si = refs.stageIndexRef.current - 1;
    if (si >= 0 && si < 5) {
      refs.gateDamageDealtRef.current[si] += GAME_CONFIG.BREW_BURST_GATE_DAMAGE;
    }
    spawnParticles(refs.particlePool, gate.x + gate.width / 2, gate.y, 'sparkle', 4);
    spawnFloatingDamage(refs.floatingDamagePool, gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.BREW_BURST_GATE_DAMAGE, 'hsl(200, 70%, 75%)');
  }
}

/** Espresso Barrage — activate rapid-fire mode */
export function handleEspressoBarrage(refs: GameRefs, setPower: (v: number) => void) {
  if (!refs.hasEspressoRef.current) return;
  const espBlock = refs.blocksRef.current.find(b => b.id === refs.espressoBoxIndexRef.current + 1);
  if (!espBlock || espBlock.destroyed) { refs.hasEspressoRef.current = false; return; }
  if (refs.powerRef.current < GAME_CONFIG.ESPRESSO_BARRAGE_COST) return;

  refs.powerRef.current -= GAME_CONFIG.ESPRESSO_BARRAGE_COST;
  setPower(refs.powerRef.current);
  refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.2 };

  refs.espressoBarrageRef.current = {
    active: true,
    timer: GAME_CONFIG.ESPRESSO_BARRAGE_DURATION,
    shotsFired: 0,
  };
  refs.espressoTelemetryRef.current.barrageUses++;
}

/** Ice Storm — AoE slow + damage power skill */
export function handleIceStorm(refs: GameRefs, setPower: (v: number) => void) {
  if (!refs.hasIceRef.current) return;
  const iceBlock = refs.blocksRef.current.find(b => b.id === refs.iceBoxIndexRef.current + 1);
  if (!iceBlock || iceBlock.destroyed) { refs.hasIceRef.current = false; return; }
  if (refs.powerRef.current < GAME_CONFIG.ICE_STORM_COST) return;

  refs.powerRef.current -= GAME_CONFIG.ICE_STORM_COST;
  setPower(refs.powerRef.current);
  refs.screenShakeRef.current = { x: 0, y: 0, duration: 0.3 };
  refs.iceTelemetryRef.current.stormUses++;

  const stormX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + 80;
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const stormY = groundY - 60;

  spawnParticles(refs.particlePool, stormX, stormY, 'steam', 15);

  // Damage + slow ALL enemies in radius
  let totalDmg = 0;
  refs.enemyPool.getActive().forEach(enemy => {
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
      refs.iceTelemetryRef.current.stormDamageEnemies += GAME_CONFIG.ICE_STORM_DAMAGE;
      enemy.slowTimer = GAME_CONFIG.ICE_STORM_SLOW_DURATION;
      enemy.slowFactor = GAME_CONFIG.ICE_STORM_SLOW_FACTOR;
      spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'sparkle', 2);
    }
  });
  if (totalDmg > 0) {
    spawnFloatingDamage(refs.floatingDamagePool, stormX, stormY - 30, totalDmg, 'hsl(200, 80%, 70%)');
  }

  // Damage gate
  const gate = refs.gateBuildingRef.current;
  if (gate && !gate.isDestroyed) {
    const gdx = gate.x + gate.width / 2 - stormX;
    const gdy = gate.y + gate.height / 2 - stormY;
    const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (gDist < GAME_CONFIG.ICE_STORM_RADIUS + gate.width) {
      gate.hp -= GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
      refs.iceTelemetryRef.current.stormDamageGate += GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
      const si = refs.stageIndexRef.current - 1;
      if (si >= 0 && si < 5) refs.gateDamageDealtRef.current[si] += GAME_CONFIG.ICE_STORM_GATE_DAMAGE;
      spawnParticles(refs.particlePool, gate.x + gate.width / 2, gate.y, 'sparkle', 4);
      spawnFloatingDamage(refs.floatingDamagePool, gate.x + gate.width / 2, gate.y - 10, GAME_CONFIG.ICE_STORM_GATE_DAMAGE, 'hsl(200, 80%, 70%)');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Passive weapon updates (called each frame from gameLoop)
// ─────────────────────────────────────────────────────────────

/** Update all 4 passive weapons + espresso barrage active-mode tick */
export function updateWeaponPassives(refs: GameRefs, deltaTime: number, enemies: Enemy[]) {
  // ── Star passive (melee zone AoE) ──
  if (refs.hasStarRef.current) {
    refs.starPassiveTickRef.current -= deltaTime;
    if (refs.starPassiveTickRef.current <= 0) {
      refs.starPassiveTickRef.current = GAME_CONFIG.STAR_PASSIVE_TICK_INTERVAL;
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
          let starDmg = Math.floor(GAME_CONFIG.STAR_PASSIVE_TICK_DAMAGE * refs.starDamageMultRef.current);
          if (enemy.shieldHp > 0) {
            const absorbed = Math.min(enemy.shieldHp, starDmg);
            enemy.shieldHp -= absorbed; starDmg -= absorbed;
          }
          enemy.hp -= starDmg;
          refs.starTelemetryRef.current.passiveDamage += starDmg;
          spawnParticles(refs.particlePool, enemy.x, enemy.y - enemy.height / 2, 'sparkle', 1);
        }
      });
    }
  }

  // ── Foam passive (sinusoidal sweeping projectiles) ──
  if (refs.hasFoamRef.current) {
    const equippedFoamBlock = refs.blocksRef.current.find(b => b.id === refs.foamBoxIndexRef.current + 1);
    if (!equippedFoamBlock || equippedFoamBlock.destroyed) {
      refs.hasFoamRef.current = false;
    }
  }
  if (refs.hasFoamRef.current) {
    refs.foamPassiveTickRef.current -= deltaTime;
    refs.foamSweepRef.current += GAME_CONFIG.BREW_SWEEP_SPEED * deltaTime;

    if (refs.foamPassiveTickRef.current <= 0) {
      refs.foamPassiveTickRef.current = GAME_CONFIG.BREW_PASSIVE_FIRE_INTERVAL;
      const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
      const foamBlock = refs.foamBoxIndexRef.current >= 0
        ? refs.blocksRef.current.find(b => b.id === refs.foamBoxIndexRef.current + 1 && !b.destroyed)
        : null;
      let originY: number;
      if (foamBlock && foamBlock.id > 0) {
        const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
        const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
        const chassisY = groundY - 30 - chassisHeight;
        const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
        const activeCargoBlocks = refs.blocksRef.current.filter(b => !b.destroyed && b.id > 0).sort((a, b2) => a.id - b2.id);
        const foamCargoIdx = activeCargoBlocks.findIndex(b => b.id === foamBlock.id);
        const visualBlockY = chassisY - (foamCargoIdx + 1) * boxHeight + (foamBlock.collapseOffset || 0);
        originY = visualBlockY + boxHeight / 2;
      } else {
        originY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 50;
      }
      const sweepHalf = (GAME_CONFIG.BREW_SWEEP_ANGLE / 2) * (Math.PI / 180);
      const currentAngle = Math.sin(refs.foamSweepRef.current) * sweepHalf;

      const targetGate = Math.random() < GAME_CONFIG.BREW_PASSIVE_GATE_CHANCE;
      const gate = refs.gateBuildingRef.current;

      let targetX: number;
      let targetY: number;

      if (targetGate && gate && !gate.isDestroyed && refs.playPhaseRef.current === 'SIEGE') {
        targetX = gate.x + gate.width / 2;
        targetY = gate.y + gate.height / 2;
        refs.foamTelemetryRef.current.passiveShotsToGate++;
      } else if (enemies.length > 0) {
        const inRange = enemies.filter(e => {
          const dx = e.x - cartFrontX;
          return dx > 0 && dx < GAME_CONFIG.BREW_PASSIVE_RANGE;
        });
        if (inRange.length > 0) {
          const target = inRange[Math.floor(Math.random() * inRange.length)];
          targetX = target.x;
          targetY = target.y - target.height / 2;
        } else {
          targetX = cartFrontX + Math.cos(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
          targetY = originY + Math.sin(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
        }
      } else {
        targetX = cartFrontX + Math.cos(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
        targetY = originY + Math.sin(currentAngle) * GAME_CONFIG.BREW_PASSIVE_RANGE;
      }

      const proj = refs.projectilePool.acquire();
      if (proj) {
        proj.x = cartFrontX; proj.y = originY;
        proj.targetX = targetX; proj.targetY = targetY;
        proj.speed = GAME_CONFIG.BREW_PASSIVE_SPEED;
        proj.damage = GAME_CONFIG.BREW_PASSIVE_DAMAGE;
        proj.radius = GAME_CONFIG.BREW_PROJECTILE_RADIUS;
        proj.pierce = false; proj.isStar = false; proj.isBrew = true;
        proj.isEspresso = false; proj.isIce = false; proj.hitGate = false;
      }
    }
  }

  // ── Espresso passive (rapid-fire spray) ──
  if (refs.hasEspressoRef.current) {
    const espBlock = refs.blocksRef.current.find(b => b.id === refs.espressoBoxIndexRef.current + 1);
    if (!espBlock || espBlock.destroyed) { refs.hasEspressoRef.current = false; }
  }
  if (refs.hasEspressoRef.current) {
    refs.espressoPassiveTickRef.current -= deltaTime;
    if (refs.espressoPassiveTickRef.current <= 0) {
      refs.espressoPassiveTickRef.current = GAME_CONFIG.ESPRESSO_PASSIVE_FIRE_INTERVAL;
      const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
      const espBlock = refs.blocksRef.current.find(b => b.id === refs.espressoBoxIndexRef.current + 1 && !b.destroyed);
      if (espBlock) {
        const groundY2 = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
        const chassisH = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
        const chassisY2 = groundY2 - 30 - chassisH;
        const boxH = GAME_CONFIG.BLOCK_HEIGHT - 4;
        const activeCargoB = refs.blocksRef.current.filter(b => !b.destroyed && b.id > 0).sort((a, b2) => a.id - b2.id);
        const espIdx = activeCargoB.findIndex(b => b.id === espBlock.id);
        const visY = chassisY2 - (espIdx + 1) * boxH + (espBlock.collapseOffset || 0);
        const originY = visY + boxH / 2;
        const spreadRad = (GAME_CONFIG.ESPRESSO_PASSIVE_SPREAD_DEG / 2) * (Math.PI / 180);
        const angle = (Math.random() - 0.5) * spreadRad * 2;
        const range = GAME_CONFIG.ESPRESSO_PASSIVE_RANGE;
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
        const proj = refs.projectilePool.acquire();
        if (proj) {
          proj.x = cartFrontX; proj.y = originY;
          proj.targetX = tX; proj.targetY = tY;
          proj.speed = GAME_CONFIG.ESPRESSO_PASSIVE_SPEED;
          proj.damage = GAME_CONFIG.ESPRESSO_PASSIVE_DAMAGE;
          proj.radius = GAME_CONFIG.ESPRESSO_PROJECTILE_RADIUS;
          proj.pierce = false; proj.isStar = false; proj.isBrew = false;
          proj.isEspresso = true; proj.isIce = false; proj.hitGate = false;
        }
      }
    }
  }

  // ── Espresso Barrage update (active ability — rapid fire over duration) ──
  if (refs.espressoBarrageRef.current.active) {
    const barrage = refs.espressoBarrageRef.current;
    barrage.timer -= deltaTime;
    const shotsPerSec = GAME_CONFIG.ESPRESSO_BARRAGE_SHOTS / GAME_CONFIG.ESPRESSO_BARRAGE_DURATION;
    const shouldFire = Math.floor(shotsPerSec * (GAME_CONFIG.ESPRESSO_BARRAGE_DURATION - barrage.timer)) > barrage.shotsFired;
    if (shouldFire && barrage.shotsFired < GAME_CONFIG.ESPRESSO_BARRAGE_SHOTS) {
      const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
      const groundYb = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
      const spreadRad = (GAME_CONFIG.ESPRESSO_BARRAGE_SPREAD_DEG / 2) * (Math.PI / 180);
      const angle2 = (Math.random() - 0.5) * spreadRad * 2;
      const range2 = 300;
      let tX = cartFrontX + Math.cos(angle2) * range2;
      let tY = groundYb - 60 + Math.sin(angle2) * range2;
      if (enemies.length > 0) {
        const t = enemies[Math.floor(Math.random() * enemies.length)];
        tX = t.x + (Math.random() - 0.5) * 30; tY = t.y - t.height / 2 + (Math.random() - 0.5) * 20;
      } else if (refs.gateBuildingRef.current && !refs.gateBuildingRef.current.isDestroyed) {
        const g = refs.gateBuildingRef.current;
        tX = g.x + g.width / 2 + (Math.random() - 0.5) * 20;
        tY = g.y + g.height / 2 + (Math.random() - 0.5) * 30;
      }
      const proj = refs.projectilePool.acquire();
      if (proj) {
        proj.x = cartFrontX; proj.y = groundYb - 80;
        proj.targetX = tX; proj.targetY = tY;
        proj.speed = GAME_CONFIG.ESPRESSO_PASSIVE_SPEED * 1.3;
        proj.damage = GAME_CONFIG.ESPRESSO_BARRAGE_DAMAGE;
        proj.radius = GAME_CONFIG.ESPRESSO_PROJECTILE_RADIUS + 1;
        proj.pierce = false; proj.isStar = false; proj.isBrew = false;
        proj.isEspresso = true; proj.isIce = false; proj.hitGate = false;
      }
      barrage.shotsFired++;
    }
    if (barrage.timer <= 0) {
      barrage.active = false;
      const totalDmg = barrage.shotsFired * GAME_CONFIG.ESPRESSO_BARRAGE_DAMAGE;
      if (totalDmg > 0) {
        spawnFloatingDamage(refs.floatingDamagePool, GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 100, totalDmg, 'hsl(25, 70%, 45%)');
      }
    }
  }

  // ── Ice passive (periodic ice drops that slow) ──
  if (refs.hasIceRef.current) {
    const iceBlock = refs.blocksRef.current.find(b => b.id === refs.iceBoxIndexRef.current + 1);
    if (!iceBlock || iceBlock.destroyed) { refs.hasIceRef.current = false; }
  }
  if (refs.hasIceRef.current) {
    refs.icePassiveTickRef.current -= deltaTime;
    if (refs.icePassiveTickRef.current <= 0) {
      refs.icePassiveTickRef.current = GAME_CONFIG.ICE_PASSIVE_FIRE_INTERVAL;
      const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
      const inRange = enemies.filter(e => {
        const dx = e.x - cartFrontX;
        return dx > 0 && dx < GAME_CONFIG.ICE_PASSIVE_RANGE;
      });
      if (inRange.length > 0) {
        const target = inRange[Math.floor(Math.random() * inRange.length)];
        const proj = refs.projectilePool.acquire();
        if (proj) {
          const iceBlock = refs.blocksRef.current.find(b => b.id === refs.iceBoxIndexRef.current + 1 && !b.destroyed);
          const groundY3 = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
          const originY = iceBlock ? iceBlock.y + GAME_CONFIG.BLOCK_HEIGHT / 2 : groundY3 - 60;
          proj.x = cartFrontX; proj.y = originY;
          proj.targetX = target.x; proj.targetY = target.y - target.height / 2;
          proj.speed = GAME_CONFIG.ICE_PASSIVE_SPEED;
          proj.damage = GAME_CONFIG.ICE_PASSIVE_DAMAGE;
          proj.radius = GAME_CONFIG.ICE_PROJECTILE_RADIUS;
          proj.pierce = false; proj.isStar = false; proj.isBrew = false;
          proj.isEspresso = false; proj.isIce = true; proj.hitGate = false;
        }
      }
    }
  }
}
