// Persistence helper for Coffee Rush progression data
// TDS-Inspired Reboot: Phase 1 v1.1 — Schema v16 (Foam→Brew global rename)

import type { GameMode, WeaponType, WeaponSlot, PurchaseEvent, BoxWeapon } from './types';
import { GAME_CONFIG } from './config';

// ═══════════════════════════════════════════════════════════════════════════
// PURCHASE LOG (separate localStorage key)
// ═══════════════════════════════════════════════════════════════════════════
const PURCHASE_LOG_KEY = 'coffee-rush-purchase-log';

export const logPurchase = (event: PurchaseEvent): void => {
  try {
    const log = getPurchaseLog();
    log.push(event);
    localStorage.setItem(PURCHASE_LOG_KEY, JSON.stringify(log));
  } catch {
    console.warn('Failed to log purchase');
  }
};

export const getPurchaseLog = (): PurchaseEvent[] => {
  try {
    const stored = localStorage.getItem(PURCHASE_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PurchaseEvent[];
  } catch {
    return [];
  }
};

export const clearPurchaseLog = (): void => {
  try {
    localStorage.removeItem(PURCHASE_LOG_KEY);
  } catch {
    console.warn('Failed to clear purchase log');
  }
};

const STORAGE_KEY = 'coffee-rush-progress';
const SAVE_VERSION = 17; // v17: Espresso + Ice weapon types

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESSION DATA SCHEMA (v16)
// ═══════════════════════════════════════════════════════════════════════════
export interface ProgressionData {
  version: number;
  totalCoins: number;
  blockPips: number[];
  blockEvoChoices: string[][];
  weaponSlots: WeaponSlot[];
  weaponPips: number[];
  weaponEvoChoices: string[][];
  powerPips: number;
  powerEvoChoices: string[];
  damagePips: number;
  damageEvoChoices: string[];
  blockCountLevel: number;
  bestTimeSurvivedSeconds: number;
  bestCustomersServed: number;
  chapter1Cleared: boolean;
  bestChapter1Time: number;
  bestStageReached: number;
  starUnlocked: boolean;
  starPerBox: boolean[];
  starPips: number;
  starEvoChoices: string[];
  // Per-box weapon assignment
  boxWeapons: BoxWeapon[];        // e.g. [null, 'star', 'brew'] — one weapon per box
  brewPerBox: boolean[];           // which boxes have brew
  espressoPerBox: boolean[];       // which boxes have espresso cannon
  icePerBox: boolean[];            // which boxes have ice blender
  lastGameMode: GameMode;
  energy: number;
  regenAnchorTs: number | null;
  chapterResetEnabled: boolean;
  meta: {
    diamonds: number;
    backpackGold: number;
    heroCards: string[];
  };
  upgradeLevels: {
    blockCountLevel: number;
    espressoDamageLevel: number;
    energyRegenLevel: number;
  };
  cargoBoxHpLevels: number[];
}

const DEFAULT_PROGRESSION: ProgressionData = {
  version: SAVE_VERSION,
  totalCoins: 0,
  blockPips: [0, 0, 0],
  blockEvoChoices: [[], [], []],
  weaponSlots: [{ weaponType: null, level: 0 }, { weaponType: null, level: 0 }],
  weaponPips: [0, 0],
  weaponEvoChoices: [[], []],
  powerPips: 0,
  powerEvoChoices: [],
  damagePips: 0,
  damageEvoChoices: [],
  blockCountLevel: 0,
  bestTimeSurvivedSeconds: 0,
  bestCustomersServed: 0,
  chapter1Cleared: false,
  bestChapter1Time: 0,
  bestStageReached: 0,
  starUnlocked: false,
  starPerBox: [false, false, false],
  starPips: 0,
  starEvoChoices: [],
  boxWeapons: [null, null, null],
  brewPerBox: [false, false, false],
  espressoPerBox: [false, false, false],
  icePerBox: [false, false, false],
  lastGameMode: 'CHAPTER',
  energy: GAME_CONFIG.ENERGY_MAX,
  regenAnchorTs: null,
  chapterResetEnabled: false,
  meta: { diamonds: 0, backpackGold: 0, heroCards: [] },
  upgradeLevels: { blockCountLevel: 0, espressoDamageLevel: 0, energyRegenLevel: 0 },
  cargoBoxHpLevels: [0, 0, 0],
};

export const loadProgression = (): ProgressionData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PROGRESSION };
    const parsed = JSON.parse(stored);
    // v15 -> v16 migration: rename foamPerBox -> brewPerBox
    if (parsed.version === 15) {
      parsed.brewPerBox = parsed.foamPerBox || [false, false, false];
      delete parsed.foamPerBox;
      parsed.version = 16;
    }
    // v16 -> v17 migration: add espresso + ice per-box
    if (parsed.version === 16) {
      parsed.espressoPerBox = parsed.espressoPerBox || [false, false, false];
      parsed.icePerBox = parsed.icePerBox || [false, false, false];
      parsed.version = 17;
      saveProgression({ ...DEFAULT_PROGRESSION, ...parsed, meta: { ...DEFAULT_PROGRESSION.meta, ...parsed.meta } });
      return { ...DEFAULT_PROGRESSION, ...parsed, meta: { ...DEFAULT_PROGRESSION.meta, ...parsed.meta } };
    }
    if (!parsed.version || parsed.version !== SAVE_VERSION) {
      console.info(`Save version mismatch (${parsed.version} !== ${SAVE_VERSION}), resetting progression`);
      saveProgression({ ...DEFAULT_PROGRESSION });
      return { ...DEFAULT_PROGRESSION };
    }
    return {
      ...DEFAULT_PROGRESSION,
      ...parsed,
      meta: { ...DEFAULT_PROGRESSION.meta, ...parsed.meta },
    };
  } catch {
    console.warn('Failed to load progression, using defaults');
    return { ...DEFAULT_PROGRESSION };
  }
};

export const saveProgression = (data: ProgressionData): void => {
  try {
    data.upgradeLevels = {
      blockCountLevel: data.blockCountLevel,
      espressoDamageLevel: data.damagePips,
      energyRegenLevel: data.powerPips,
    };
    data.cargoBoxHpLevels = data.blockPips;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save progression');
  }
};

export const getPipCost = (currentPips: number, baseCost: number, costScaling: number): number => {
  return Math.floor(baseCost * Math.pow(costScaling, currentPips));
};

// TDS-style continuous upgrade cost: linear + quadratic growth
export const getContinuousUpgradeCost = (level: number, baseCost: number, step: number, accel: number): number => {
  return Math.floor(baseCost + level * step + level * level * accel);
};

export const purchasePowerPip = (cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  const beforeValue = current.powerPips;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.powerPips += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'power_pip', target: 'power', before: `pips:${beforeValue}`, after: `pips:${current.powerPips}`, beforeValue, afterValue: current.powerPips, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseDamagePip = (cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  const beforeValue = current.damagePips;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.damagePips += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'damage_pip', target: 'damage', before: `pips:${beforeValue}`, after: `pips:${current.damagePips}`, beforeValue, afterValue: current.damagePips, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseBlockPip = (slotIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  if (slotIndex < 0 || slotIndex >= current.blockPips.length) return false;
  const beforeValue = current.blockPips[slotIndex];
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.blockPips[slotIndex] += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'block_pip', target: `block_${slotIndex}`, before: `pips:${beforeValue}`, after: `pips:${current.blockPips[slotIndex]}`, beforeValue, afterValue: current.blockPips[slotIndex], coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseWeaponPip = (slotIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  if (slotIndex < 0 || slotIndex >= current.weaponPips.length) return false;
  const beforeValue = current.weaponPips[slotIndex];
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.weaponPips[slotIndex] += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'weapon_pip', target: `weapon_${slotIndex}`, before: `pips:${beforeValue}`, after: `pips:${current.weaponPips[slotIndex]}`, beforeValue, afterValue: current.weaponPips[slotIndex], coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const saveEvoChoice = (category: string, slotIndex: number, traitId: string): void => {
  const current = loadProgression();
  const coinsBefore = current.totalCoins;
  let beforeCount = 0;
  let afterCount = 0;
  if (category === 'block') {
    if (!current.blockEvoChoices[slotIndex]) current.blockEvoChoices[slotIndex] = [];
    beforeCount = current.blockEvoChoices[slotIndex].length;
    current.blockEvoChoices[slotIndex].push(traitId);
    afterCount = current.blockEvoChoices[slotIndex].length;
  } else if (category === 'weapon') {
    if (!current.weaponEvoChoices[slotIndex]) current.weaponEvoChoices[slotIndex] = [];
    beforeCount = current.weaponEvoChoices[slotIndex].length;
    current.weaponEvoChoices[slotIndex].push(traitId);
    afterCount = current.weaponEvoChoices[slotIndex].length;
  } else if (category === 'power') {
    beforeCount = current.powerEvoChoices.length;
    current.powerEvoChoices.push(traitId);
    afterCount = current.powerEvoChoices.length;
  } else if (category === 'damage') {
    beforeCount = current.damageEvoChoices.length;
    current.damageEvoChoices.push(traitId);
    afterCount = current.damageEvoChoices.length;
  }
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'evo_choice', target: `${category}_${slotIndex}`, before: `evos:${beforeCount}`, after: `evos:${afterCount} (+${traitId})`, beforeValue: beforeCount, afterValue: afterCount, coinCost: 0, coinsBefore, coinsAfter: coinsBefore });
};

export const purchaseCargoBox = (cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  if (current.blockCountLevel >= GAME_CONFIG.BLOCK_COUNT_MAX_LEVEL) return false;
  const beforeValue = current.blockCountLevel;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.blockCountLevel += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'cargo_box', target: 'blockCount', before: `level:${beforeValue}`, after: `level:${current.blockCountLevel}`, beforeValue, afterValue: current.blockCountLevel, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const getCargoBoxCost = (level: number): number => {
  return Math.floor(GAME_CONFIG.BLOCK_COUNT_BASE_COST * Math.pow(1.5, level));
};

export const setLastGameMode = (mode: GameMode): void => {
  const current = loadProgression();
  saveProgression({ ...current, lastGameMode: mode });
};

export const updateRecords = (
  timeSurvived: number,
  customersServed: number,
  stageReached: number,
  coinsEarned: number,
): { isNewTimeRecord: boolean } => {
  const current = loadProgression();
  const isNewTimeRecord = timeSurvived > current.bestTimeSurvivedSeconds;
  saveProgression({
    ...current,
    bestTimeSurvivedSeconds: Math.max(current.bestTimeSurvivedSeconds, timeSurvived),
    bestCustomersServed: Math.max(current.bestCustomersServed, customersServed),
    bestStageReached: Math.max(current.bestStageReached, stageReached),
    totalCoins: current.totalCoins + coinsEarned,
  });
  return { isNewTimeRecord };
};

export const updateChapterClear = (timeSurvived: number, coinsEarned: number): { isNewChapterRecord: boolean } => {
  const current = loadProgression();
  const isNewChapterRecord = !current.chapter1Cleared || timeSurvived < current.bestChapter1Time;
  saveProgression({
    ...current,
    chapter1Cleared: true,
    bestChapter1Time: current.bestChapter1Time > 0 ? Math.min(current.bestChapter1Time, timeSurvived) : timeSurvived,
    totalCoins: current.totalCoins + coinsEarned,
  });
  return { isNewChapterRecord };
};

export const resetProgression = (): void => {
  saveProgression({ ...DEFAULT_PROGRESSION });
};

export const applyRegenNow = (): ProgressionData => {
  const prog = loadProgression();
  const now = Date.now();
  if (prog.energy >= GAME_CONFIG.ENERGY_MAX) {
    prog.energy = GAME_CONFIG.ENERGY_MAX;
    prog.regenAnchorTs = null;
    saveProgression(prog);
    return prog;
  }
  if (prog.regenAnchorTs === null) {
    prog.regenAnchorTs = now;
    saveProgression(prog);
    return prog;
  }
  const elapsed = now - prog.regenAnchorTs;
  const gains = Math.floor(elapsed / GAME_CONFIG.ENERGY_REGEN_MS);
  if (gains > 0) {
    prog.energy = Math.min(GAME_CONFIG.ENERGY_MAX, prog.energy + gains);
    if (prog.energy >= GAME_CONFIG.ENERGY_MAX) {
      prog.energy = GAME_CONFIG.ENERGY_MAX;
      prog.regenAnchorTs = null;
    } else {
      prog.regenAnchorTs = prog.regenAnchorTs + (gains * GAME_CONFIG.ENERGY_REGEN_MS);
    }
    saveProgression(prog);
  }
  return prog;
};

export const consumeEnergy = (): { success: boolean; newEnergy: number } => {
  const prog = applyRegenNow();
  if (prog.energy <= 0) return { success: false, newEnergy: 0 };
  prog.energy -= 1;
  if (prog.energy < GAME_CONFIG.ENERGY_MAX && prog.regenAnchorTs === null) {
    prog.regenAnchorTs = Date.now();
  }
  saveProgression(prog);
  return { success: true, newEnergy: prog.energy };
};

export const getEnergyState = (): { energy: number; maxEnergy: number; isRegenerating: boolean; remainingMs: number } => {
  const prog = applyRegenNow();
  const now = Date.now();
  let remainingMs = 0;
  const isRegenerating = prog.energy < GAME_CONFIG.ENERGY_MAX && prog.regenAnchorTs !== null;
  if (isRegenerating && prog.regenAnchorTs !== null) {
    const elapsed = now - prog.regenAnchorTs;
    remainingMs = GAME_CONFIG.ENERGY_REGEN_MS - (elapsed % GAME_CONFIG.ENERGY_REGEN_MS);
  }
  return { energy: prog.energy, maxEnergy: GAME_CONFIG.ENERGY_MAX, isRegenerating, remainingMs };
};

export const formatTimeRemaining = (ms: number): string => {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const addDebugEnergy = (amount: number = 10): number => {
  const prog = loadProgression();
  prog.energy += amount;
  saveProgression(prog);
  return prog.energy;
};

export const purchaseStar = (cost: number): boolean => {
  const current = loadProgression();
  if (current.starUnlocked) return false;
  if (current.bestStageReached < 2) return false;
  if (current.totalCoins < cost) return false;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.starUnlocked = true;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'star_unlock', target: 'star', before: 'locked', after: 'unlocked', beforeValue: 0, afterValue: 1, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseStarForBox = (boxIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.bestStageReached < 2) return false;
  if (!current.starPerBox) current.starPerBox = [false, false, false];
  if (boxIndex < 0 || boxIndex >= current.starPerBox.length) return false;
  if (current.starPerBox[boxIndex]) return false;
  // Per-box weapon lock: check if box already has a weapon
  if (!current.boxWeapons) current.boxWeapons = [null, null, null];
  if (current.boxWeapons[boxIndex] !== null) return false; // box already has a weapon
  if (current.totalCoins < cost) return false;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.starPerBox[boxIndex] = true;
  current.boxWeapons[boxIndex] = 'star';
  current.starUnlocked = current.starPerBox.some(v => v);
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'star_unlock', target: `star_box_${boxIndex}`, before: 'locked', after: 'unlocked', beforeValue: 0, afterValue: 1, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseStarPip = (cost: number): boolean => {
  const current = loadProgression();
  if (current.totalCoins < cost) return false;
  const maxPips = GAME_CONFIG.STAR_PIP_PER_EVO * GAME_CONFIG.STAR_MAX_EVOS_CH1;
  if (current.starPips >= maxPips) return false;
  const beforeValue = current.starPips;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.starPips += 1;
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'star_pip', target: 'star', before: `pips:${beforeValue}`, after: `pips:${current.starPips}`, beforeValue, afterValue: current.starPips, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseBrewForBox = (boxIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.bestStageReached < 3) return false; // Stage 2 Gate must be destroyed
  if (!current.brewPerBox) current.brewPerBox = [false, false, false];
  if (!current.boxWeapons) current.boxWeapons = [null, null, null];
  if (boxIndex < 0 || boxIndex >= current.brewPerBox.length) return false;
  if (current.brewPerBox[boxIndex]) return false;
  // Per-box weapon lock: check if box already has a weapon
  if (current.boxWeapons[boxIndex] !== null) return false;
  if (current.totalCoins < cost) return false;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.brewPerBox[boxIndex] = true;
  current.boxWeapons[boxIndex] = 'brew';
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'brew_unlock', target: `brew_box_${boxIndex}`, before: 'locked', after: 'unlocked', beforeValue: 0, afterValue: 1, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseEspressoForBox = (boxIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.bestStageReached < 4) return false; // Stage 3 Gate must be destroyed
  if (!current.espressoPerBox) current.espressoPerBox = [false, false, false];
  if (!current.boxWeapons) current.boxWeapons = [null, null, null];
  if (boxIndex < 0 || boxIndex >= current.espressoPerBox.length) return false;
  if (current.espressoPerBox[boxIndex]) return false;
  if (current.boxWeapons[boxIndex] !== null) return false; // box already has a weapon
  if (current.totalCoins < cost) return false;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.espressoPerBox[boxIndex] = true;
  current.boxWeapons[boxIndex] = 'espresso';
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'brew_unlock', target: `espresso_box_${boxIndex}`, before: 'locked', after: 'unlocked', beforeValue: 0, afterValue: 1, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const purchaseIceForBox = (boxIndex: number, cost: number): boolean => {
  const current = loadProgression();
  if (current.bestStageReached < 5) return false; // Stage 4 Gate must be destroyed
  if (!current.icePerBox) current.icePerBox = [false, false, false];
  if (!current.boxWeapons) current.boxWeapons = [null, null, null];
  if (boxIndex < 0 || boxIndex >= current.icePerBox.length) return false;
  if (current.icePerBox[boxIndex]) return false;
  if (current.boxWeapons[boxIndex] !== null) return false;
  if (current.totalCoins < cost) return false;
  const coinsBefore = current.totalCoins;
  current.totalCoins -= cost;
  current.icePerBox[boxIndex] = true;
  current.boxWeapons[boxIndex] = 'ice';
  saveProgression(current);
  logPurchase({ ts: Date.now(), type: 'brew_unlock', target: `ice_box_${boxIndex}`, before: 'locked', after: 'unlocked', beforeValue: 0, afterValue: 1, coinCost: cost, coinsBefore, coinsAfter: current.totalCoins });
  return true;
};

export const addDebugCoins = (amount: number = 200): number => {
  const prog = loadProgression();
  prog.totalCoins += amount;
  saveProgression(prog);
  return prog.totalCoins;
};
