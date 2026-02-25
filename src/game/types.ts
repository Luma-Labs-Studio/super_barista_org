// Game Types for Coffee Rush
// TDS-Inspired Reboot: Phase 1 v1.1

export type GameState = 'MENU' | 'PLAY' | 'END';
export type GameMode = 'ENDLESS' | 'CHAPTER';

export type PlayPhase = 'TRAVEL' | 'SIEGE' | 'EVO_PICK' | 'BOSS' | 'APPROACH' | 'VICTORY' | 'BREATHER';

// ═══════════════════════════════════════════════════════════════════════════════
// GATE BUILDING
// ═══════════════════════════════════════════════════════════════════════════════
export interface GateBuilding {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isDestroyed: boolean;
  stageIndex: number;
  breathingActive: boolean;
  breathingTimer: number;
  crossedThresholds: number[];
  crumbleTimer: number;
  lastHitTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEAPON SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
export type WeaponType = 'star' | 'brew' | 'espresso' | 'ice' | 'minigun' | null;
export type WeaponAbilityType = 'star_throw' | 'brew_burst' | 'espresso_barrage' | 'ice_storm' | 'bullet_storm';

// Per-box weapon assignment: each box can hold at most one weapon
export type BoxWeapon = 'star' | 'brew' | 'espresso' | 'ice' | null;

export interface WeaponSlot {
  weaponType: WeaponType;
  level: number;
}

export interface WeaponInfo {
  type: WeaponType;
  name: string;
  icon: string;
  description: string;
  baseCost: number;
  upgradeCost: number;
  maxLevel: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIP / EVO UPGRADE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
export interface PipProgress {
  currentPips: number;
  maxPips: number;
  evoTier: number;
  evoChoices: string[];
}

export interface EvoTrait {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'block' | 'weapon' | 'power' | 'damage' | 'star';
  effects: EvoEffect[];
}

export interface EvoEffect {
  type: 'hp_mult' | 'atk_mult' | 'regen_mult' | 'heal_percent' | 'weapon_atk_mult' | 
        'projectile_count' | 'ability_cost_mult' | 'power_regen_mult' | 'damage_mult' |
        'radius_mult' | 'throw_speed_mult' | 'passive_multi_hit';
  value: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ENTITIES
// ═══════════════════════════════════════════════════════════════════════════════
export interface Vector2 {
  x: number;
  y: number;
}

export interface CartBlock {
  id: number;
  hp: number;
  maxHp: number;
  y: number;
  height: number;
  destroyed: boolean;
  collapseOffset: number;   // Visual offset during collapse animation (negative = higher than target)
}

export type EnemyState = 'WALKING' | 'LATCHED' | 'QUEUED' | 'SERVED';
export type EnemyKind = 'NORMAL' | 'HEAVY' | 'BOSS' | 'SPEEDER' | 'SHIELDED' | 'EXPLODER';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  active: boolean;
  isServed: boolean;
  servedTimer: number;
  animationFrame: number;
  state: EnemyState;
  latchedTimer: number;
  queuePosition: number;
  kind: EnemyKind;
  latchOrder: number;      // Order in which enemy latched (lower = earlier = bottom of stack)
  shieldHp: number;        // SHIELDED: extra armor HP that absorbs damage first (0 = no shield)
  slowTimer: number;        // Slow debuff remaining seconds (0 = not slowed)
  slowFactor: number;       // Speed multiplier while slowed (e.g. 0.5 = half speed)
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  active: boolean;
  radius: number;
  pierce: boolean;
  isStar: boolean;
  isBrew: boolean;          // Visual: render as brew blob
  isEspresso: boolean;      // Espresso cannon projectile (rapid fire)
  isIce: boolean;           // Visual: render as ice drop, applies slow on hit
  hitGate: boolean;         // Prevents pierce projectiles from hitting gate twice
}

export interface TipDrop {
  id: number;
  x: number;
  y: number;
  targetY: number;
  value: number;
  active: boolean;
  opacity: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'sparkle' | 'heart' | 'steam' | 'confetti' | 'crumble';
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING DAMAGE NUMBERS (only for big hits: abilities, boss damage, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  color: string;
  fontSize: number;
  active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME STATS & TELEMETRY
// ═══════════════════════════════════════════════════════════════════════════════
export interface GameStats {
  timeSurvived: number;
  customersServed: number;
  totalTips: number;
  coinsEarned: number;
  isNewRecord: boolean;
  isChapterClear?: boolean;
  stageReached?: number;
  telemetry?: RunTelemetry;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE EVENT LOG
// ═══════════════════════════════════════════════════════════════════════════════
export interface PurchaseEvent {
  ts: number;
  type: 'power_pip' | 'damage_pip' | 'cargo_box' | 'block_pip' | 'weapon_pip' | 'select_weapon' | 'evo_choice' | 'star_unlock' | 'star_pip' | 'brew_unlock' | 'espresso_unlock' | 'ice_unlock';
  target: string;
  before: string;
  after: string;
  beforeValue: number;
  afterValue: number;
  coinCost: number;
  coinsBefore: number;
  coinsAfter: number;
}

export interface RunTelemetry {
  // Debug identity
  runId: number;
  telemetryBuiltAt: number;
  
  // Run result
  gameMode: GameMode;
  stageReached: number;
  reachedBoss: boolean;
  bossOutcome: 'not_spawned' | 'spawned' | 'defeated' | 'died_during_boss';
  bossHpPercent: number;
  
  // Upgrade snapshot
  pipLevels: {
    blockPips: number[];
    weaponPips: number[];
    powerPips: number;
    damagePips: number;
    blockCount: number;
    starPips: number;
  };
  
  // Combat data
  shotsFired: number;
  shotsHit: number;
  hitRate: number;
  
  // Pressure
  maxLatchedPeak: number;
  timeAtMaxLatched: number;
  
  // Survivability
  blocksLost: number;
  timeToFirstBlockLost: number;
  tonicBombUses: number;
  
  // Gate telemetry
  gateDamageDealt: number[];
  gateTimeSpent: number[];
  gateHpRemainingByGate: number[];
  shotsToGate: number;
  shotsToEnemies: number;
  bombGateDamageTotal: number;
  bombGateDamageByGate: number[];
  gateDestroyedByGate: boolean[];
  
  // Burst spread telemetry
  burstsTriggered: number;
  
  // Target mode telemetry
  targetModeCounts: { front: number; mid: number; back: number; gate: number };
  
  // Star telemetry
  starPassiveDamageDealt: number;
  starThrowDamageToEnemies: number;
  starThrowDamageToGate: number;
  starThrowUses: number;
  
  // Brew telemetry
  brewPassiveDamageDealt: number;
  brewPassiveShotsToGate: number;
  brewBurstDamageToEnemies: number;
  brewBurstDamageToGate: number;
  brewBurstUses: number;
  brewUnlockedAt: number;
  brewBurstTimestamps: number[];
  brewEquippedBoxIndex: number;
  brewBurstUsedDuringGate: number;
  
  // Phase timing (global totals)
  phaseAtDeath: PlayPhase | null;
  deathStage: number;
  timeInTravel: number;
  timeInSiege: number;
  timeInEvoPick: number;
  timeInBoss: number;
  
  // Per-stage phase timing breakdown
  travelTimeByStage: number[];
  siegeTimeByStage: number[];
  breatherTimeByStage: number[];
  totalTravelTime: number;
  totalSiegeTime: number;
  totalBreatherTime: number;
  
  // Spawn distribution
  enemiesSpawned: { normal: number; heavy: number; boss: number };
  enemiesKilled: { normal: number; heavy: number; boss: number };
  
  // Economy
  coinsStart: number;
  coinsEnd: number;
  coinsEarnedActual: number;
  coinsFromKills: number;
  coinsFromGateLumps: number;
  clearBonusCoins: number;
  coinsTotalBreakdown: number;
  economyDelta: number;
  deltaExplanation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOSS STATE
// ═══════════════════════════════════════════════════════════════════════════════
export type BossPhase = 1 | 2 | 3 | 4;

export interface BossState {
  isActive: boolean;
  hp: number;
  maxHp: number;
  spawnedAt: number;
  addSpawnTimer: number;
  phase: BossPhase;              // Current boss phase (1-4)
  phaseTransitioned: boolean[];  // Which phase transitions have fired [phase2, phase3, phase4]
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPGRADE INFO
// ═══════════════════════════════════════════════════════════════════════════════
export interface UpgradeInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  pipsPerEvo: number;
  baseCost: number;
  costScaling: number;
  maxEvos?: number;
}
