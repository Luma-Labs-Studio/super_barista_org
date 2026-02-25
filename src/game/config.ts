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
  speederEvery: number;      // spawn a speeder every N enemies (0 = no speeders)
  shieldedEvery: number;     // spawn a shielded every N enemies (0 = no shielded)
  exploderEvery: number;     // spawn an exploder every N enemies (0 = no exploders)
  // Boss-specific
  bossHP?: number;
  bossDropCoins?: number;
  clearBonus?: number;
}

export const STAGES: readonly StageConfig[] = [
  //                                                                                                                    heavy  speeder shielded exploder
  { id: 1, gateHP: 300,   spawnInterval: 900,  enemyHpMult: 1.0,  enemySpeedMult: 1.0,  enemyDropCoins: 1,   gateLumpSum: 40,   heavyEvery: 0,  speederEvery: 0,  shieldedEvery: 0, exploderEvery: 0 },
  { id: 2, gateHP: 400,   spawnInterval: 800,  enemyHpMult: 1.15, enemySpeedMult: 1.05, enemyDropCoins: 2,   gateLumpSum: 80,   heavyEvery: 0,  speederEvery: 5,  shieldedEvery: 0, exploderEvery: 0 },
  { id: 3, gateHP: 1200,  spawnInterval: 700,  enemyHpMult: 1.6,  enemySpeedMult: 1.15, enemyDropCoins: 5,   gateLumpSum: 180,  heavyEvery: 4,  speederEvery: 4,  shieldedEvery: 6, exploderEvery: 0 },
  { id: 4, gateHP: 2500,  spawnInterval: 600,  enemyHpMult: 2.0,  enemySpeedMult: 1.15, enemyDropCoins: 10,  gateLumpSum: 400,  heavyEvery: 5,  speederEvery: 3,  shieldedEvery: 5, exploderEvery: 7 },
  { id: 5, gateHP: 4000,  spawnInterval: 500,  enemyHpMult: 2.5,  enemySpeedMult: 1.20, enemyDropCoins: 20,  gateLumpSum: 800,  heavyEvery: 4,  speederEvery: 3,  shieldedEvery: 4, exploderEvery: 5 },
  { id: 6, isBoss: true,  spawnInterval: 0,    enemyHpMult: 1.0,  enemySpeedMult: 1.0,  enemyDropCoins: 50,  gateLumpSum: 0,    heavyEvery: 0,  speederEvery: 0,  shieldedEvery: 0, exploderEvery: 0, bossHP: 10000, bossDropCoins: 50, clearBonus: 1500 },
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
  TONIC_BOMB_COST: 2,
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
  // LATCHED ENEMY SYSTEM (with stacking)
  // ─────────────────────────────────────────────────────────────
  MAX_LATCHED_ENEMIES: 8,            // increased from 5 for stacking (15 was too deadly)
  LATCHED_TICK_INTERVAL: 0.5,
  LATCHED_TICK_DAMAGE: 4,
  LATCHED_QUEUE_SPACING: 12,
  ENEMY_STACK_SPACING: 28,          // vertical px between stacked enemies (< enemy height = overlap)
  ENEMY_STACK_DAMAGE_FROM_BOTTOM: true, // enemies attack bottom block first, stack upward
  
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
  
  // Power regen upgrade (TDS-style continuous)
  POWER_PIP_PER_EVO: 3,            // legacy: kept for EVO trigger (every 3 upgrades)
  POWER_PIP_BASE_COST: 35,         // legacy
  POWER_PIP_COST_SCALING: 1.4,     // legacy
  POWER_REGEN_BONUS_PER_PIP: 0.15, // legacy
  // NEW continuous upgrade costs
  POWER_UPGRADE_BASE_COST: 9,
  POWER_UPGRADE_STEP: 2,
  POWER_UPGRADE_ACCEL: 0.4,
  POWER_REGEN_PER_UPGRADE: 0.02,   // +0.02/s per upgrade level

  // Damage upgrade (TDS-style continuous)
  DAMAGE_PIP_PER_EVO: 3,           // legacy: kept for EVO trigger
  DAMAGE_PIP_BASE_COST: 40,        // legacy
  DAMAGE_PIP_COST_SCALING: 1.4,    // legacy
  DAMAGE_BONUS_PER_PIP: 0.12,      // legacy
  // NEW continuous upgrade costs
  DAMAGE_UPGRADE_BASE_COST: 9,
  DAMAGE_UPGRADE_STEP: 2.5,
  DAMAGE_UPGRADE_ACCEL: 0.4,
  DAMAGE_FLAT_PER_UPGRADE: 1,      // +1 flat damage per upgrade level
  
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
  // SPEEDER ENEMY (fast customer — morning rush)
  // ─────────────────────────────────────────────────────────────
  SPEEDER_HP_MULT: 0.6,
  SPEEDER_SPEED_MULT: 1.8,
  SPEEDER_TICK_DAMAGE_MULT: 0.8,
  SPEEDER_SIZE_MULT: 0.85,

  // ─────────────────────────────────────────────────────────────
  // SHIELDED ENEMY (sleepless, extra grumpy — armored)
  // ─────────────────────────────────────────────────────────────
  SHIELDED_HP_MULT: 1.5,
  SHIELDED_SPEED_MULT: 0.7,
  SHIELDED_TICK_DAMAGE_MULT: 1.5,
  SHIELDED_SIZE_MULT: 1.1,
  SHIELDED_ARMOR_HP_MULT: 0.5,  // Shield HP = 50% of base HP (must break shield first)

  // ─────────────────────────────────────────────────────────────
  // EXPLODER ENEMY (caffeine overdose — explodes on death)
  // ─────────────────────────────────────────────────────────────
  EXPLODER_HP_MULT: 0.8,
  EXPLODER_SPEED_MULT: 1.1,
  EXPLODER_TICK_DAMAGE_MULT: 1.0,
  EXPLODER_SIZE_MULT: 1.0,
  EXPLODER_BLAST_RADIUS: 60,
  EXPLODER_BLAST_DAMAGE: 30,     // Damage to blocks when exploding

  // ─────────────────────────────────────────────────────────────
  // BOSS
  // ─────────────────────────────────────────────────────────────
  BOSS_SPEED_MULT: 0.6,
  BOSS_SIZE_MULT: 1.4,
  BOSS_TICK_DAMAGE_MULT: 3.0,
  BOSS_LATCH_SLOTS: 2,
  BOSS_ADD_SPAWN_INTERVAL: 0,
  BOSS_INCOMING_BANNER_DURATION: 1.5,

  // Boss Phase System (4 phases based on HP thresholds)
  BOSS_PHASE2_THRESHOLD: 0.75,     // Phase 2 starts at 75% HP
  BOSS_PHASE3_THRESHOLD: 0.50,     // Phase 3 starts at 50% HP
  BOSS_PHASE4_THRESHOLD: 0.25,     // Phase 4 (Enrage) at 25% HP
  // Phase 2: extra enemy spawns
  BOSS_PHASE2_SPAWN_INTERVAL: 1.5, // seconds between add spawns
  BOSS_PHASE2_DAMAGE_MULT: 1.2,    // 20% more boss damage
  // Phase 3: speed + damage increase
  BOSS_PHASE3_SPAWN_INTERVAL: 1.2,
  BOSS_PHASE3_DAMAGE_MULT: 1.5,    // 50% more boss damage
  // Phase 4: Enrage - everything fast and dangerous
  BOSS_PHASE4_SPAWN_INTERVAL: 0.8,
  BOSS_PHASE4_DAMAGE_MULT: 2.0,    // 2x boss damage
  
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
  // ESPRESSO CANNON — rapid-fire espresso rain
  // ─────────────────────────────────────────────────────────────
  // Passive: rapid short-range burst of espresso shots
  ESPRESSO_PASSIVE_RANGE: 200,
  ESPRESSO_PASSIVE_FIRE_INTERVAL: 0.18,     // fast fire rate
  ESPRESSO_PASSIVE_DAMAGE: 3,               // low per-shot damage (high DPS from fire rate)
  ESPRESSO_PASSIVE_SPEED: 500,
  ESPRESSO_PASSIVE_SPREAD_DEG: 15,          // random spread angle for spray pattern
  ESPRESSO_PROJECTILE_RADIUS: 2,

  // Active: Espresso Barrage (power skill — carpet bombardment)
  ESPRESSO_BARRAGE_COST: 10,
  ESPRESSO_BARRAGE_SHOTS: 20,               // total projectiles fired
  ESPRESSO_BARRAGE_DAMAGE: 15,              // per-shot damage (high total)
  ESPRESSO_BARRAGE_DURATION: 1.5,           // seconds
  ESPRESSO_BARRAGE_SPREAD_DEG: 40,          // wide spread

  // Espresso per-box (Garage purchase)
  ESPRESSO_PER_BOX_COST: 750,

  // ─────────────────────────────────────────────────────────────
  // ICE BLENDER — AoE slow + damage
  // ─────────────────────────────────────────────────────────────
  // Passive: periodic ice drops that slow enemies
  ICE_PASSIVE_RANGE: 160,
  ICE_PASSIVE_FIRE_INTERVAL: 0.8,
  ICE_PASSIVE_DAMAGE: 4,
  ICE_PASSIVE_SPEED: 250,
  ICE_PASSIVE_SLOW_FACTOR: 0.5,             // 50% speed while slowed
  ICE_PASSIVE_SLOW_DURATION: 2.0,           // seconds of slow per hit
  ICE_PROJECTILE_RADIUS: 5,

  // Active: Ice Storm (power skill — wide area slow + damage)
  ICE_STORM_COST: 6,
  ICE_STORM_DAMAGE: 40,                     // damage to each enemy hit
  ICE_STORM_GATE_DAMAGE: 25,                // damage to gate
  ICE_STORM_SLOW_FACTOR: 0.3,               // severe slow (30% speed)
  ICE_STORM_SLOW_DURATION: 4.0,             // long slow duration
  ICE_STORM_RADIUS: 140,                    // large AoE radius

  // Ice per-box (Garage purchase)
  ICE_PER_BOX_COST: 1200,

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

// Per-stage travel duration (seconds) - shortened to feel like TDS (was [10,10,16,18,20])
export const TRAVEL_DURATION_BY_STAGE = [3, 4, 4, 5, 5] as const;

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
