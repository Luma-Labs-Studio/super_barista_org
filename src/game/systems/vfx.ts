/**
 * VFX System — particle spawning, tip drops, floating damage, screen shake.
 * Extracted from CoffeeRushGame.tsx.
 */
import { GAME_CONFIG, COLORS } from '../config';
import type { Particle, TipDrop, FloatingDamage } from '../types';
import type { ObjectPool, GameRefs } from './gameRefs';

// ─────────────────────────────────────────────────────────────
// Spawn functions (used by combat, weapons, abilities, etc.)
// ─────────────────────────────────────────────────────────────

export function spawnParticles(
  pool: ObjectPool<Particle>,
  x: number,
  y: number,
  type: Particle['type'],
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const p = pool.acquire();
    if (!p) break;
    p.x = x; p.y = y;
    p.type = type;
    p.life = 0.5 + Math.random() * 0.5;
    p.maxLife = p.life;
    p.size = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 50;
    if (type === 'confetti') {
      const colors = ['hsl(25, 80%, 55%)', 'hsl(45, 90%, 55%)', 'hsl(350, 80%, 60%)', 'hsl(0, 0%, 95%)'];
      p.color = colors[Math.floor(Math.random() * colors.length)];
    } else if (type === 'crumble') {
      p.color = COLORS.gateCrumble;
      p.size = 6 + Math.random() * 8;
    }
  }
}

export function spawnTip(
  pool: ObjectPool<TipDrop>,
  x: number,
  y: number,
  value: number,
) {
  const tip = pool.acquire();
  if (!tip) return;
  tip.x = x; tip.y = y;
  tip.targetY = 60;
  tip.opacity = 1;
  tip.value = value;
}

export function spawnFloatingDamage(
  pool: ObjectPool<FloatingDamage>,
  x: number,
  y: number,
  value: number,
  color?: string,
) {
  const fd = pool.acquire();
  if (!fd) return;
  fd.x = x + (Math.random() - 0.5) * 20; // Slight horizontal scatter
  fd.y = y;
  fd.value = Math.round(value);
  fd.life = 1.0;
  fd.maxLife = 1.0;
  // Font size scales with damage value
  fd.fontSize = value >= 200 ? 24 : value >= 100 ? 20 : value >= 50 ? 17 : 14;
  // Color based on damage source
  fd.color = color || '#ffffff';
}

// ─────────────────────────────────────────────────────────────
// Update (called once per frame from gameLoop)
// ─────────────────────────────────────────────────────────────

export function updateVFX(refs: GameRefs, deltaTime: number) {
  // Update tips
  refs.tipPool.getActive().forEach(tip => {
    tip.y -= GAME_CONFIG.TIP_FLOAT_SPEED * deltaTime;
    tip.opacity = Math.max(0, tip.opacity - deltaTime * 0.5);
    if (tip.y < tip.targetY || tip.opacity <= 0) {
      refs.tipPool.release(tip);
    }
  });

  // Update particles
  refs.particlePool.getActive().forEach(p => {
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.vy += 100 * deltaTime;
    p.life -= deltaTime;
    if (p.life <= 0) refs.particlePool.release(p);
  });

  // Update floating damage numbers
  refs.floatingDamagePool.getActive().forEach(fd => {
    fd.y -= 40 * deltaTime; // Float upward
    fd.life -= deltaTime;
    if (fd.life <= 0) refs.floatingDamagePool.release(fd);
  });

  // Screen shake
  if (refs.screenShakeRef.current.duration > 0) {
    refs.screenShakeRef.current.duration -= deltaTime;
    refs.screenShakeRef.current.x = (Math.random() - 0.5) * 10;
    refs.screenShakeRef.current.y = (Math.random() - 0.5) * 10;
  } else {
    refs.screenShakeRef.current.x = 0;
    refs.screenShakeRef.current.y = 0;
  }
}
