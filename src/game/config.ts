// Game Configuration Constants for Coffee Rush
// TDS-Inspired Reboot: Phase 1 v1.1
// All speeds are in pixels/second, intervals are in milliseconds (ms)

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE DEFINITIONS (HP-based Gate Buildings)
// HP values are PLACEHOLDERS — calibrate via telemetry after first playable build
// Gate1HP = measuredGateDamageBeforeDeath / 0.20
// Gate2-5 HP = Gate1HP * GATE_HP_RATIOS[i]
// ═══════════════════════════════════════════════════════════════════════════════
export interface StageConfig {
  id: number;
  isBoss?: boolean;
  gateHP?: number;          // Gate Building HP (not used for boss stage)
  spawnInterval: number;     // ms between enemy spawns
  enemyHpMult: number;       // enemy HP multiplier for this stage
  enemySpeedMult: number;    // enemy speed multiplier for this stage
  enemyDropCoins: number;    // coins dropped per enemy kill
  gateLumpSum: number;       // coins awarded when gate is destroyed
  heavyEvery: number;        // spawn a heavy every N enemies (0 = no heavies)
  // Boss-specific
  bossHP?: number;
  bossDropCoins?: number;
  clearBonus?: number;
}

export const STAGES: readonly StageConfig[] = [
  { id: 1, gateHP: 300,   spawnInterval: 900,  enemyHpMult: 1.0,  enemySpeedMult: 1.0,  enemyDropCoins: 1,   gateLumpSum: 40,   heavyEvery: 0 },
  { id: 2, gateHP: 400,   spawnInterval: 800,  enemyHpMult: 1.15, enemySpeedMult: 1.05, enemyDropCoins: 2,   gateLumpSum: 80,   heavyEvery: 0 },
  { id: 3, gateHP: 1200,  spawnInterval: 700,  enemyHpMult: 1.6,  enemySpeedMult: 1.15, enemyDropCoins: 5,   gateLumpSum: 180,  heavyEvery: 4 },
  { id: 4, gateHP: 2500,  spawnInterval: 600,  enemyHpMult: 2.0,  enemySpeedMult: 1.15, enemyDropCoins: 10,  gateLumpSum: 400,  heavyEvery: 5 },
  { id: 5, gateHP: 4000,  spawnInterval: 500,  enemyHpMult: 2.5,  enemySpeedMult: 1.20, enemyDropCoins: 20,  gateLumpSum: 800,  heavyEvery: 4 },
  { id: 6, isBoss: true,  spawnInterval: 0,    enemyHpMult: 1.0,  enemySpeedMult: 1.0,  enemyDropCoins: 50,  gateLumpSum: 0,    heavyEvery: 0, bossHP: 10000, bossDropCoins: 50, clearBonus: 1500 },
] as const;

// Gate HP ratios relative to Gate 1 (for easy calibration)
export const GATE_HP_RATIOS = [1.0, 1.33, 4.0, 8.33, 13.33] as const;

export const GAME_CONFIG = {
  // ─────────────────────────────────────────────────────────────
  // CANVAS
  // ─────────────────────────────────────────────────────────────
  CANVAS_WIDTH: 360,
  CANVAS_HEIGHT: 640,
  
  // ─────────────────────────────────────────────────────────────
  // LAYOUT TUNING
  // ─────────────────────────────────────────────────────────────
  CART_X_OFFSET: 0,
  ENEMY_SCALE: 1,
  GROUND_Y_OFFSET: 220,
  UI_SAFE_BOTTOM_PX: 200,
  
  // ─────────────────────────────────────────────────────────────
  // CART (player tower)
  // ─────────────────────────────────────────────────────────────
  CART_X: 70,
  CART_WIDTH: 75,
  BLOCK_HEIGHT: 45,
  BLOCK_MAX_HP: 300,
  BLOCK_COUNT: 1,
  
  // ─────────────────────────────────────────────────────────────
  // ENEMIES
  // ─────────────────────────────────────────────────────────────
  ENEMY_WIDTH: 36,
  ENEMY_HEIGHT: 45,
  ENEMY_BASE_HP: 32,
  ENEMY_BASE_SPEED: 95,
  ENEMY_DAMAGE: 18,
  MAX_ENEMIES: 30,
  
  // ─────────────────────────────────────────────────────────────
  // SPAWNING (stage-based, no time ramp)
  // ─────────────────────────────────────────────────────────────
  MAX_ACTIVE_ENEMIES: 30,
  MIN_SPAWN_INTERVAL: 300,
  
  // ─────────────────────────────────────────────────────────────
  // COMBAT (auto-attack)
  // ─────────────────────────────────────────────────────────────
  AUTO_ATTACK_INTERVAL: 520,
  PROJECTILE_SPEED: 420,
  PROJECTILE_DAMAGE: 12,
  PROJECTILE_RADIUS: 2,
  
  // ─────────────────────────────────────────────────────────────
  // SKILL: Tonic Bomb + Power System (Uncapped)
  // ─────────────────────────────────────────────────────────────
  TONIC_BOMB_COST: 3,
  TONIC_BOMB_RADIUS: 110,
  TONIC_BOMB_DAMAGE: 28,
  POWER_POOL_SOFT_CAP: 999,
  POWER_START_REGEN: 0.35,
  MAX_BOMB_CHARGES: 3,
  
  // ─────────────────────────────────────────────────────────────
  // GATE BUILDING SYSTEM (TDS-style HP objectives)
  // ─────────────────────────────────────────────────────────────
  GATE_BUILDING_X_OFFSET: 60,
  GATE_BUILDING_WIDTH: 50,
  GATE_BUILDING_HEIGHT: 160,
  GATE_BREATHING_THRESHOLDS: [0.75, 0.50, 0.25] as readonly number[],
  GATE_BREATHING_SLOWDOWN_DURATION: 1.0,
  GATE_BREATHING_SPAWN_MULT: 1.5,
  GATE_CLEANUP_DURATION: 0.8,
  
  // Post-Victory Breather
  POST_VICTORY_BREATHER_DURATION: 4.0,
  BREATHER_SPAWN_REDUCTION: 0.40,
  
  // ─────────────────────────────────────────────────────────────
  // TRAVEL
  // ─────────────────────────────────────────────────────────────
  TRAVEL_DURATION: 1.2,
  TRAVEL_DESPAWN_DELAY: 0.5,
  
  // ─────────────────────────────────────────────────────────────
  // TIPS & REWARDS
  // ─────────────────────────────────────────────────────────────
  TIP_FLOAT_SPEED: 80,
  
  // ─────────────────────────────────────────────────────────────
  // SERVED ENEMY ANIMATION
  // ─────────────────────────────────────────────────────────────
  SERVED_EXIT_DURATION: 0.5,
  SERVED_EXIT_SPEED: 200,
  
  // ─────────────────────────────────────────────────────────────
  // LATCHED ENEMY SYSTEM
  // ─────────────────────────────────────────────────────────────
  MAX_LATCHED_ENEMIES: 5,
  LATCHED_TICK_INTERVAL: 0.5,
  LATCHED_TICK_DAMAGE: 4,
  LATCHED_QUEUE_SPACING: 12,
  
  // ─────────────────────────────────────────────────────────────
  // PARTICLES & VFX
  // ─────────────────────────────────────────────────────────────
  MAX_PARTICLES: 100,
  
  // ─────────────────────────────────────────────────────────────
  // STAMINA SYSTEM (Energy)
  // ─────────────────────────────────────────────────────────────
  ENERGY_MAX: 10,
  ENERGY_REGEN_MS: 1800000,
  
  // ─────────────────────────────────────────────────────────────
  // PIP / EVO UPGRADE SYSTEM
  // ─────────────────────────────────────────────────────────────
  BLOCK_PIP_PER_EVO: 3,
  BLOCK_MAX_EVOS: 2,
  BLOCK_PIP_BASE_COST: 30,
  BLOCK_PIP_COST_SCALING: 1.4,
  
  WEAPON_PIP_PER_EVO: 5,
  WEAPON_PIP_BASE_COST: 40,
  WEAPON_PIP_COST_SCALING: 1.3,
  
  // Star weapon upgrades
  STAR_PIP_PER_EVO: 5,
  STAR_PIP_BASE_COST: 250,
  STAR_PIP_COST_SCALING: 1.35,
  STAR_MAX_EVOS_CH1: 2,
  STAR_DAMAGE_BONUS_PER_PIP: 0.10,
  
  // Power regen upgrade pips
  POWER_PIP_PER_EVO: 3,
  POWER_PIP_BASE_COST: 35,
  POWER_PIP_COST_SCALING: 1.4,
  POWER_REGEN_BONUS_PER_PIP: 0.15,
  
  // Damage upgrade pips
  DAMAGE_PIP_PER_EVO: 3,
  DAMAGE_PIP_BASE_COST: 40,
  DAMAGE_PIP_COST_SCALING: 1.4,
  DAMAGE_BONUS_PER_PIP: 0.12,
  
  // Block count (cargo boxes)
  BLOCK_COUNT_MAX_LEVEL: 3,
  BLOCK_COUNT_BASE_COST: 30,
  
  // ─────────────────────────────────────────────────────────────
  // HEAVY ENEMY
  // ─────────────────────────────────────────────────────────────
  HEAVY_HP_MULT: 3.0,
  HEAVY_SPEED_MULT: 0.75,
  HEAVY_TICK_DAMAGE_MULT: 2.0,
  HEAVY_SIZE_MULT: 1.15,
  
  // ─────────────────────────────────────────────────────────────
  // BOSS
  // ─────────────────────────────────────────────────────────────
  BOSS_SPEED_MULT: 0.6,
  BOSS_SIZE_MULT: 1.4,
  BOSS_TICK_DAMAGE_MULT: 3.0,
  BOSS_LATCH_SLOTS: 2,
  BOSS_ADD_SPAWN_INTERVAL: 0,
  BOSS_INCOMING_BANNER_DURATION: 1.5,
  
  // ─────────────────────────────────────────────────────────────
  // WEAPON ABILITIES (Star + Foam + Minigun ability-only)
  // ─────────────────────────────────────────────────────────────
  // Passive Star (melee zone)
  STAR_PASSIVE_RADIUS: 80,
  STAR_PASSIVE_TICK_INTERVAL: 0.35,
  STAR_PASSIVE_TICK_DAMAGE: 4,

  // Active Star Throw (power skill)
  STAR_THROW_COST: 4,
  STAR_THROW_DAMAGE: 100,
  STAR_THROW_SPEED: 260,
  STAR_THROW_LIFETIME: 0.9,
  STAR_THROW_RADIUS: 12,
  
  // Star per-box (Garage purchase)
  STAR_PER_BOX_COST: 140,
  
  // ─────────────────────────────────────────────────────────────
  // BREW WEAPON — kahve köpüğü topu
  // ─────────────────────────────────────────────────────────────
  // Passive Brew Cannon (sinusoidal sweeping, fires brew projectiles)
  BREW_PASSIVE_RANGE: 140,             // px max range (shorter than main shotgun)
  BREW_PASSIVE_FIRE_INTERVAL: 0.65,    // seconds between brew shots
  BREW_PASSIVE_DAMAGE: 6,              // damage per brew projectile
  BREW_PASSIVE_SPEED: 300,             // brew projectile speed (px/s)
  BREW_PASSIVE_GATE_CHANCE: 0.18,      // 18% chance to target gate instead of enemy
  BREW_SWEEP_SPEED: 2.5,              // sinusoidal sweep speed (radians/s)
  BREW_SWEEP_ANGLE: 35,               // degrees, total sweep arc
  BREW_PROJECTILE_RADIUS: 4,          // brew blob radius
  BREW_PROJECTILE_LIFETIME: 0.5,      // seconds before despawn
  
  // Active Brew Burst (power skill — canvas-wide brew wave)
  BREW_BURST_COST: 7,                 // Power cost
  BREW_BURST_DAMAGE: 80,              // damage to each enemy hit (buffed: premium 7-Power ability)
  BREW_BURST_GATE_DAMAGE: 50,         // flat damage to gate (buffed: meaningful vs gate)
  BREW_BURST_DURATION: 2.5,           // seconds of brew wave (extended for premium feel)

  // Brew per-box (Garage purchase)
  BREW_PER_BOX_COST: 350,
  
  // ─────────────────────────────────────────────────────────────
  // MINIGUN (ability-only, Phase 1)
  // ─────────────────────────────────────────────────────────────
  MINIGUN_ABILITY_COST: 10,
  MINIGUN_BURST_COUNT: 15,
  MINIGUN_BURST_DURATION: 2.0,
  
  // ─────────────────────────────────────────────────────────────
  // WEAPON FIRING MODE
  // ─────────────────────────────────────────────────────────────
  WEAPON_MODE: 'shotgun' as 'single' | 'shotgun',
  SHOTGUN_PELLETS: 6,
  SHOTGUN_SPREAD_DEG: 22,
  SHOTGUN_SPREAD_DEG_MIN: 16,
  SHOTGUN_SPREAD_DEG_MAX: 32,
  SHOTGUN_SPREAD_DISTANCE_SCALE: 0.35,
  MUZZLE_Y_OFFSET: 20,
  SHOTGUN_DAMAGE_SPLIT: 'weighted_center' as 'equal' | 'weighted_center',
  
  // ─────────────────────────────────────────────────────────────
  // AIM VARIATION
  // ─────────────────────────────────────────────────────────────
  AIM_Y_JITTER: 10,
  AIM_Y_TILT: -2,
  CROWDING_THRESHOLD: 6,
  CROWDING_RANGE: 220,
  TARGET_WEIGHTS_CROWDED: [0.55, 0.20, 0.05, 0.20] as readonly number[],
  TARGET_WEIGHTS_NORMAL:  [0.40, 0.20, 0.15, 0.25] as readonly number[],
  
  // ─────────────────────────────────────────────────────────────
  // CHAPTER PERSISTENCE
  // ─────────────────────────────────────────────────────────────
  CHAPTER_RESET_ENABLED: false,
  
  // ─────────────────────────────────────────────────────────────
  // TDS LOOP
  // ─────────────────────────────────────────────────────────────
  APPROACH_DURATION: 1.0,
  GATE_START_X: 500,
  STAGE1_WAVE_SIZE: 3,
  STAGE1_WAVE_BREATHER: 1.0,
  STAGE2_WAVE_SIZE: 3,
  STAGE2_WAVE_BREATHER: 0.8,
} as const;

// Per-stage travel duration (seconds)
export const TRAVEL_DURATION_BY_STAGE = [10, 10, 16, 18, 20] as const;

// Mini-rush config (Stage 2+ travel only)
export const MINI_RUSH_CONFIG = {
  ENABLED_FROM_STAGE: 3,
  DURATION: 2.5,
  SPAWN_MULT: 0.35,
  START_RATIO: 0.25,
} as const;

// Per-stage bomb silence duration (seconds) during SIEGE
export const BOMB_SILENCE_BY_STAGE = [1.5, 1.0, 0.6, 0.6, 0.6] as const;

// Per-stage latched tick damage multiplier
export const LATCH_DAMAGE_MULT_BY_STAGE = [1.0, 1.0, 1.25, 1.5, 1.75] as const;

// Colors (HSL values matching index.css)
export const COLORS = {
  espresso: 'hsl(25, 50%, 20%)',
  darkRoast: 'hsl(25, 45%, 30%)',
  mediumRoast: 'hsl(30, 50%, 45%)',
  lightRoast: 'hsl(35, 55%, 60%)',
  cream: 'hsl(40, 60%, 85%)',
  foam: 'hsl(45, 50%, 95%)',
  warmOrange: 'hsl(25, 80%, 55%)',
  gold: 'hsl(45, 90%, 55%)',
  energyBar: 'hsl(145, 60%, 45%)',
  hpBar: 'hsl(0, 70%, 55%)',
  hpBarBg: 'hsl(0, 20%, 30%)',
  sleepy: 'hsl(220, 10%, 60%)',
  awake: 'hsl(35, 70%, 60%)',
  sparkle: 'hsl(50, 100%, 70%)',
  heart: 'hsl(350, 80%, 60%)',
  steam: 'hsl(0, 0%, 90%)',
  gateBase: 'hsl(0, 40%, 35%)',
  gateDamaged: 'hsl(0, 50%, 45%)',
  gateCrumble: 'hsl(25, 30%, 50%)',
} as const;
