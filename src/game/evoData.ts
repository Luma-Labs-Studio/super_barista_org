// EVO Trait Definitions for Coffee Rush
// Phase 1: Small trait pool (2 choices per EVO, expandable in Phase 2)

import type { EvoTrait } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK EVO TRAITS
// Block upgrade cycle: 3 pips → EVO popup (2 choices) → 3 pips → EVO → MAX
// ═══════════════════════════════════════════════════════════════════════════════

// EVO 1 choices (after first 3 pips)
export const BLOCK_EVO_1: EvoTrait[] = [
  {
    id: 'throne',
    name: 'Throne',
    icon: '👑',
    description: '+20% Block HP, +10% ATK',
    category: 'block',
    effects: [
      { type: 'hp_mult', value: 1.20 },
      { type: 'atk_mult', value: 1.10 },
    ],
  },
  {
    id: 'repair',
    name: 'Repair Kit',
    icon: '🔧',
    description: 'Heal 15% HP on gate clear',
    category: 'block',
    effects: [
      { type: 'heal_percent', value: 0.15 },
    ],
  },
];

// EVO 2 choices (after second 3 pips)
export const BLOCK_EVO_2: EvoTrait[] = [
  {
    id: 'battery',
    name: 'Battery',
    icon: '🔋',
    description: '+15% Power regen',
    category: 'block',
    effects: [
      { type: 'power_regen_mult', value: 1.15 },
    ],
  },
  {
    id: 'arsenal',
    name: 'Arsenal',
    icon: '⚔️',
    description: '+10% Weapon ATK',
    category: 'block',
    effects: [
      { type: 'weapon_atk_mult', value: 1.10 },
    ],
  },
];

// All block EVO tiers in order
export const BLOCK_EVO_TIERS: EvoTrait[][] = [BLOCK_EVO_1, BLOCK_EVO_2];

// ═══════════════════════════════════════════════════════════════════════════════
// WEAPON EVO TRAITS
// Weapon upgrade cycle: 5 pips → EVO popup (2 choices), repeating
// ═══════════════════════════════════════════════════════════════════════════════

// Star weapon EVOs
export const STAR_EVO_WEAPON: EvoTrait[] = [
  {
    id: 'star_extra_proj',
    name: 'Twin Blades',
    icon: '⭐',
    description: '+1 Star projectile',
    category: 'weapon',
    effects: [
      { type: 'projectile_count', value: 1 },
    ],
  },
  {
    id: 'star_cheap_ability',
    name: 'Efficient Throw',
    icon: '⚡',
    description: '-25% Star Throw cost',
    category: 'weapon',
    effects: [
      { type: 'ability_cost_mult', value: 0.75 },
    ],
  },
];

// Flame weapon EVOs
export const FLAME_EVO_1: EvoTrait[] = [
  {
    id: 'flame_wide',
    name: 'Inferno',
    icon: '🔥',
    description: '+30% Flame Burst damage',
    category: 'weapon',
    effects: [
      { type: 'damage_mult', value: 1.30 },
    ],
  },
  {
    id: 'flame_cheap',
    name: 'Fuel Saver',
    icon: '💧',
    description: '-20% Flame Burst cost',
    category: 'weapon',
    effects: [
      { type: 'ability_cost_mult', value: 0.80 },
    ],
  },
];

// Minigun weapon EVOs (ability-only in Phase 1)
export const MINIGUN_EVO_1: EvoTrait[] = [
  {
    id: 'minigun_extra',
    name: 'Extended Mag',
    icon: '🎯',
    description: '+5 burst projectiles',
    category: 'weapon',
    effects: [
      { type: 'projectile_count', value: 5 },
    ],
  },
  {
    id: 'minigun_cheap',
    name: 'Quick Load',
    icon: '⚡',
    description: '-20% Bullet Storm cost',
    category: 'weapon',
    effects: [
      { type: 'ability_cost_mult', value: 0.80 },
    ],
  },
];

// Map weapon type to EVO tiers
export const WEAPON_EVO_TIERS: Record<string, EvoTrait[][]> = {
  star: [STAR_EVO_WEAPON],
  flame: [FLAME_EVO_1],
  minigun: [MINIGUN_EVO_1],
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAR WEAPON EVO TRAITS
// Star upgrade cycle: 5 pips → EVO popup (2 choices), max E2 for Chapter 1
// ═══════════════════════════════════════════════════════════════════════════════
export const STAR_EVO_1: EvoTrait[] = [
  {
    id: 'star_wider_passive',
    name: 'Wide Orbit',
    icon: '🌀',
    description: '+25% passive radius',
    category: 'star',
    effects: [
      { type: 'radius_mult', value: 1.25 },
    ],
  },
  {
    id: 'star_faster_throw',
    name: 'Shooting Star',
    icon: '💫',
    description: '+30% throw speed & range',
    category: 'star',
    effects: [
      { type: 'throw_speed_mult', value: 1.30 },
    ],
  },
];

export const STAR_EVO_2: EvoTrait[] = [
  {
    id: 'star_double_tick',
    name: 'Twin Stars',
    icon: '✨',
    description: 'Passive hits twice per tick',
    category: 'star',
    effects: [
      { type: 'passive_multi_hit', value: 2 },
    ],
  },
  {
    id: 'star_cheap_throw',
    name: 'Star Saver',
    icon: '⚡',
    description: '-40% throw Power cost',
    category: 'star',
    effects: [
      { type: 'ability_cost_mult', value: 0.60 },
    ],
  },
];

export const STAR_EVO_TIERS: EvoTrait[][] = [STAR_EVO_1, STAR_EVO_2];

// ═══════════════════════════════════════════════════════════════════════════════
// POWER REGEN EVO TRAITS (shared for power upgrade path)
// ═══════════════════════════════════════════════════════════════════════════════
export const POWER_EVO_1: EvoTrait[] = [
  {
    id: 'power_surge',
    name: 'Power Surge',
    icon: '⚡',
    description: '+25% Power regen speed',
    category: 'power',
    effects: [
      { type: 'power_regen_mult', value: 1.25 },
    ],
  },
  {
    id: 'power_reserve',
    name: 'Deep Reserve',
    icon: '🔋',
    description: '+20% all damage',
    category: 'power',
    effects: [
      { type: 'damage_mult', value: 1.20 },
    ],
  },
];

export const POWER_EVO_TIERS: EvoTrait[][] = [POWER_EVO_1];

// ═══════════════════════════════════════════════════════════════════════════════
// DAMAGE EVO TRAITS
// ═══════════════════════════════════════════════════════════════════════════════
export const DAMAGE_EVO_1: EvoTrait[] = [
  {
    id: 'damage_crit',
    name: 'Critical Brew',
    icon: '☕',
    description: '+20% Espresso damage',
    category: 'damage',
    effects: [
      { type: 'damage_mult', value: 1.20 },
    ],
  },
  {
    id: 'damage_pierce',
    name: 'Deep Impact',
    icon: '💥',
    description: '+15% all damage, +10% Power regen',
    category: 'damage',
    effects: [
      { type: 'damage_mult', value: 1.15 },
      { type: 'power_regen_mult', value: 1.10 },
    ],
  },
];

export const DAMAGE_EVO_TIERS: EvoTrait[][] = [DAMAGE_EVO_1];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get EVO options for a given category and tier
// ═══════════════════════════════════════════════════════════════════════════════
export function getEvoOptions(category: 'block' | 'power' | 'damage', tier: number): EvoTrait[] {
  switch (category) {
    case 'block':
      return BLOCK_EVO_TIERS[tier] ?? [];
    case 'power':
      return POWER_EVO_TIERS[tier] ?? [];
    case 'damage':
      return DAMAGE_EVO_TIERS[tier] ?? [];
    default:
      return [];
  }
}

export function getWeaponEvoOptions(weaponType: string, tier: number): EvoTrait[] {
  const tiers = WEAPON_EVO_TIERS[weaponType];
  if (!tiers) return [];
  // Cycle through tiers if higher than available (repeating EVOs)
  return tiers[tier % tiers.length] ?? [];
}
