/**
 * Factory & reset functions for pooled game objects.
 * Extracted from CoffeeRushGame.tsx — zero logic change.
 */
import { GAME_CONFIG, COLORS, STAGES } from '../config';
import type {
  Enemy,
  Projectile,
  TipDrop,
  Particle,
  FloatingDamage,
} from '../types';

// ─────────────────────────────────────────────────────────────
// Factory functions (called by useObjectPool to create new objects)
// ─────────────────────────────────────────────────────────────

export const createEnemy = (id: number): Enemy => ({
  id,
  x: 0, y: 0,
  hp: GAME_CONFIG.ENEMY_BASE_HP,
  maxHp: GAME_CONFIG.ENEMY_BASE_HP,
  speed: GAME_CONFIG.ENEMY_BASE_SPEED,
  width: GAME_CONFIG.ENEMY_WIDTH,
  height: GAME_CONFIG.ENEMY_HEIGHT,
  active: false,
  isServed: false,
  servedTimer: 0,
  animationFrame: 0,
  state: 'WALKING',
  latchedTimer: 0,
  queuePosition: 0,
  kind: 'NORMAL',
  latchOrder: 0,
  shieldHp: 0,
  slowTimer: 0,
  slowFactor: 1,
});

export const createProjectile = (id: number): Projectile => ({
  id,
  x: 0, y: 0,
  targetX: 0, targetY: 0,
  speed: GAME_CONFIG.PROJECTILE_SPEED,
  damage: GAME_CONFIG.PROJECTILE_DAMAGE,
  active: false,
  radius: GAME_CONFIG.PROJECTILE_RADIUS,
  pierce: false,
  isStar: false,
  isBrew: false,
  isEspresso: false,
  isIce: false,
  hitGate: false,
});

export const createTip = (id: number): TipDrop => ({
  id,
  x: 0, y: 0,
  targetY: 0,
  value: 1,
  active: false,
  opacity: 1,
});

export const createParticle = (id: number): Particle => ({
  id,
  x: 0, y: 0,
  vx: 0, vy: 0,
  life: 0, maxLife: 1,
  color: COLORS.sparkle,
  size: 5,
  type: 'sparkle',
  active: false,
});

export const createFloatingDamage = (id: number): FloatingDamage => ({
  id,
  x: 0, y: 0,
  value: 0,
  life: 0, maxLife: 1.0,
  color: '#ffffff',
  fontSize: 16,
  active: false,
});

// ─────────────────────────────────────────────────────────────
// Reset functions (clear stale data when reusing pooled objects)
// ─────────────────────────────────────────────────────────────

export const resetProjectile = (p: Projectile) => {
  p.x = 0; p.y = 0; p.targetX = 0; p.targetY = 0;
  p.speed = 0; p.damage = 0; p.radius = GAME_CONFIG.PROJECTILE_RADIUS;
  p.pierce = false; p.isStar = false; p.isBrew = false;
  p.isEspresso = false; p.isIce = false; p.hitGate = false;
};

export const resetEnemy = (e: Enemy) => {
  e.x = 0; e.y = 0; e.hp = 0; e.maxHp = 0; e.speed = 0;
  e.isServed = false; e.servedTimer = 0; e.state = 'WALKING';
  e.latchedTimer = 0; e.queuePosition = 0; e.kind = 'NORMAL';
  e.latchOrder = 0; e.shieldHp = 0; e.slowTimer = 0; e.slowFactor = 1;
};

export const resetParticle = (p: Particle) => {
  p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
  p.life = 0; p.maxLife = 1; p.type = 'sparkle'; p.size = 5;
};

export const resetTip = (t: TipDrop) => {
  t.x = 0; t.y = 0; t.targetY = 0; t.value = 0; t.opacity = 1;
};

export const resetFloatingDamage = (f: FloatingDamage) => {
  f.x = 0; f.y = 0; f.value = 0; f.life = 0; f.maxLife = 1;
  f.fontSize = 16; f.color = '#ffffff';
};

// ─────────────────────────────────────────────────────────────
// Stage helper
// ─────────────────────────────────────────────────────────────

/** Get stage config (1-indexed, clamped to max) */
export const getStage = (index: number) => STAGES[Math.min(index - 1, STAGES.length - 1)];
