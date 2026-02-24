import React, { useState, useEffect } from 'react';
import { Shield, Zap, Package, Coffee, Lock, Swords, ShoppingBag, User, Wrench, Castle, ChevronDown, Check, Award, BatteryFull, RotateCcw, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadProgression, purchasePowerPip, purchaseDamagePip, purchaseBlockPip, purchaseCargoBox, getCargoBoxCost, getPipCost, setLastGameMode, resetProgression, getEnergyState, consumeEnergy, formatTimeRemaining, addDebugEnergy, purchaseStar, purchaseStarForBox, purchaseStarPip, purchaseBrewForBox } from './persistence';
import { GAME_CONFIG } from './config';
import { CoinIcon } from './CoinIcon';
import { toast } from 'sonner';
import type { GameMode } from './types';
import { ShopScreen } from './ShopScreen';

interface GarageOverlayProps {
  onPlay: (mode: GameMode) => void;
  blockCount: number;
  onProgressionChange?: () => void;
}

type FooterTabId = 'battle' | 'shop' | 'hero' | 'weapons' | 'tower';

const FOOTER_TABS: { id: FooterTabId; label: string; icon: typeof Swords; unlocked: boolean }[] = [
  { id: 'battle', label: 'Battle', icon: Swords, unlocked: true },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, unlocked: true },
  { id: 'hero', label: 'Hero', icon: User, unlocked: false },
  { id: 'weapons', label: 'Weapons', icon: Wrench, unlocked: false },
  { id: 'tower', label: 'Tower', icon: Castle, unlocked: false },
];

interface PipTileProps {
  name: string;
  icon: React.ReactNode;
  currentPips: number;
  pipsPerEvo: number;
  maxEvos?: number;
  evoCount: number;
  cost: number;
  coins: number;
  onPurchase: () => void;
}

const PipTile: React.FC<PipTileProps> = ({ name, icon, currentPips, pipsPerEvo, maxEvos, evoCount, cost, coins, onPurchase }) => {
  const isMaxed = maxEvos !== undefined && evoCount >= maxEvos;
  const canAfford = coins >= cost;
  const pipsInCurrentTier = currentPips % pipsPerEvo;
  
  return (
    <button
      onClick={onPurchase}
      disabled={isMaxed || !canAfford}
      className={`flex-1 flex items-center gap-2 p-2 rounded-xl border-2 transition-all duration-200
        ${isMaxed ? 'bg-coffee-dark/60 border-coffee-medium/30 opacity-60' 
          : canAfford ? 'bg-coffee-dark/80 border-warm-orange/50 hover:border-warm-orange active:scale-95'
          : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}
    >
      <div className={`p-1.5 rounded-lg ${isMaxed ? 'bg-coffee-medium/20' : 'bg-warm-orange/20'}`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <span className="text-xs text-coffee-cream/80">{name}</span>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="flex gap-0.5">
            {Array.from({ length: pipsPerEvo }, (_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < pipsInCurrentTier ? 'bg-warm-orange' : 'bg-coffee-medium/40'}`} />
            ))}
          </div>
          {evoCount > 0 && (
            <span className="text-[9px] text-gold font-bold ml-1">EV{evoCount}</span>
          )}
        </div>
      </div>
      {isMaxed ? (
        <div className="flex items-center gap-0.5">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400">MAX</span>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <CoinIcon size={16} />
          <span className={`text-sm font-bold ${canAfford ? 'text-gold' : 'text-coffee-cream/50'}`}>{cost}</span>
        </div>
      )}
    </button>
  );
};

export const GarageOverlay: React.FC<GarageOverlayProps> = ({ onPlay, blockCount, onProgressionChange }) => {
  const [progression, setProgression] = useState(loadProgression());
  const [selectedMode, setSelectedMode] = useState<GameMode>(progression.lastGameMode || 'CHAPTER');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<FooterTabId>('battle');
  const [energyState, setEnergyState] = useState(getEnergyState());
  
  useEffect(() => {
    const interval = setInterval(() => setEnergyState(getEnergyState()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => { setEnergyState(getEnergyState()); }, [progression]);

  const handlePowerPip = () => {
    const cost = getPipCost(progression.powerPips, GAME_CONFIG.POWER_PIP_BASE_COST, GAME_CONFIG.POWER_PIP_COST_SCALING);
    if (purchasePowerPip(cost)) {
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  const handleDamagePip = () => {
    const cost = getPipCost(progression.damagePips, GAME_CONFIG.DAMAGE_PIP_BASE_COST, GAME_CONFIG.DAMAGE_PIP_COST_SCALING);
    if (purchaseDamagePip(cost)) {
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  const handleStarPip = () => {
    const cost = getPipCost(progression.starPips, GAME_CONFIG.STAR_PIP_BASE_COST, GAME_CONFIG.STAR_PIP_COST_SCALING);
    if (purchaseStarPip(cost)) {
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  const handleBlockPip = (boxIdx: number) => {
    const cost = getPipCost(progression.blockPips[boxIdx], GAME_CONFIG.BLOCK_PIP_BASE_COST, GAME_CONFIG.BLOCK_PIP_COST_SCALING);
    if (purchaseBlockPip(boxIdx, cost)) {
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  const handleCargoBox = () => {
    const cost = getCargoBoxCost(progression.blockCountLevel);
    if (purchaseCargoBox(cost)) {
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  const handlePlay = () => {
    const energy = getEnergyState();
    if (energy.energy <= 0) {
      toast.error('Out of Energy!', {
        description: `Next energy in ${formatTimeRemaining(energy.remainingMs)}.`,
        icon: '⚡',
      });
      return;
    }
    setIsTransitioning(true);
    setLastGameMode(selectedMode);
    setTimeout(() => {
      onPlay(selectedMode);
      setEnergyState(getEnergyState());
    }, 300);
  };

  const handleTabClick = (tabId: FooterTabId) => {
    const tab = FOOTER_TABS.find(t => t.id === tabId);
    if (!tab?.unlocked) {
      toast('Coming Soon!', { description: 'This feature will be available soon.', icon: '🔒' });
      return;
    }
    setActiveTab(tabId);
  };

  const handleReset = () => {
    if (confirm('Reset all progress? This cannot be undone!')) {
      resetProgression();
      setProgression(loadProgression());
      onProgressionChange?.();
    }
  };

  // Cargo tile positioning
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
  const cargoBlockCount = blockCount - 1;
  const topY = chassisY - (cargoBlockCount * boxHeight);
  const baristaY = topY - 25;
  const cartRightEdge = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  const cargoMaxed = progression.blockCountLevel >= GAME_CONFIG.BLOCK_COUNT_MAX_LEVEL;

  if (activeTab === 'shop') {
    return (
      <>
        <ShopScreen onBack={() => setActiveTab('battle')} totalCoins={progression.totalCoins} />
        <div className="absolute bottom-0 left-0 right-0 bg-coffee-dark/90 border-t border-coffee-medium/30 z-30">
          <div className="flex justify-around py-2 px-1">
            {FOOTER_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === tab.id ? 'text-warm-orange' : !tab.unlocked ? 'text-coffee-cream/30' : 'text-coffee-cream/60 hover:text-coffee-cream/80'}`}>
                  <div className="relative">
                    <TabIcon className="w-5 h-5" />
                    {!tab.unlocked && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-coffee-cream/50" />}
                  </div>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`absolute inset-0 flex flex-col z-20 transition-all duration-300 ${isTransitioning ? 'animate-fade-out' : ''}`}>
      {/* Top Bar */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-coffee-dark/60 flex items-center justify-center border border-coffee-medium/30">
              <User className="w-5 h-5 text-coffee-cream/70" />
            </div>
            <div className="text-xs text-coffee-cream/60">
              <span className="text-coffee-cream font-semibold">Lv.1</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-coffee-dark/40 rounded-full px-2 py-1">
              <BatteryFull className="w-3.5 h-3.5 text-energy" />
              <span className="text-energy text-xs font-bold">{energyState.energy}</span>
              <span className="text-coffee-cream/40 text-xs">/{energyState.maxEnergy}</span>
              {energyState.isRegenerating && (
                <span className="text-[9px] text-coffee-cream/50 ml-0.5">+1 in {formatTimeRemaining(energyState.remainingMs)}</span>
              )}
              {import.meta.env.DEV && (
                <button onClick={() => { addDebugEnergy(10); setEnergyState(getEnergyState()); }}
                  className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-energy/20 hover:bg-energy/40 text-energy rounded transition-colors">+10</button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-coffee-dark/40 rounded-full px-2 py-1">
              <CoinIcon size={16} />
              <span className="text-gold font-bold text-xs">{progression.totalCoins}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowModeModal(true)}
          className="mt-2 flex items-center gap-1 bg-coffee-dark/40 hover:bg-coffee-dark/60 rounded-full py-1 px-3 ml-auto transition-colors">
          <span className="text-sm">☕</span>
          <span className="text-xs text-coffee-cream">Dawn Rush</span>
          <ChevronDown className="w-3 h-3 text-coffee-cream/60" />
        </button>
      </div>

      {/* Cargo tile next to cart */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute pointer-events-auto"
          style={{ top: baristaY + 25 - 38, left: cartRightEdge + 6 }}>
          <button onClick={handleCargoBox} disabled={cargoMaxed || progression.totalCoins < getCargoBoxCost(progression.blockCountLevel)}
            className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[38px] transition-all duration-200
              ${cargoMaxed ? 'bg-coffee-dark/60 border-coffee-medium/30 opacity-60' 
                : progression.totalCoins >= getCargoBoxCost(progression.blockCountLevel) 
                  ? 'bg-coffee-dark/80 border-warm-orange/50 hover:border-warm-orange active:scale-95'
                  : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}>
            <Package className={`w-3.5 h-3.5 ${cargoMaxed ? 'text-coffee-cream/50' : 'text-warm-orange'}`} />
            <div className="flex gap-px mt-0.5">
              {Array.from({ length: GAME_CONFIG.BLOCK_COUNT_MAX_LEVEL }, (_, i) => (
                <div key={i} className={`w-1 h-1 rounded-full ${i < progression.blockCountLevel ? 'bg-warm-orange' : 'bg-coffee-medium/40'}`} />
              ))}
            </div>
            {cargoMaxed ? <span className="text-[6px] text-green-400 mt-0.5">MAX</span>
              : <span className="text-[7px] mt-0.5 text-gold">🪙{getCargoBoxCost(progression.blockCountLevel)}</span>}
          </button>
        </div>
        
        {/* Per-box HP (Shield) upgrade buttons on left side of cart */}
        {Array.from({ length: progression.blockCountLevel }, (_, boxIdx) => {
          const blockPips = progression.blockPips || [0, 0, 0];
          const currentPips = blockPips[boxIdx] || 0;
          const blockEvoCount = (progression.blockEvoChoices?.[boxIdx] || []).length;
          const blockMaxEvos = GAME_CONFIG.BLOCK_MAX_EVOS;
          const blockIsMaxed = blockEvoCount >= blockMaxEvos;
          const blockPipsInTier = currentPips % GAME_CONFIG.BLOCK_PIP_PER_EVO;
          const blockPipCost = getPipCost(currentPips, GAME_CONFIG.BLOCK_PIP_BASE_COST, GAME_CONFIG.BLOCK_PIP_COST_SCALING);
          const canAffordBlock = progression.totalCoins >= blockPipCost;
          const boxY = chassisY - ((boxIdx + 1) * boxHeight);

          return (
            <div key={`hp-${boxIdx}`} className="absolute pointer-events-auto"
              style={{ top: boxY, left: GAME_CONFIG.CART_X - 40 }}>
              <button
                onClick={() => handleBlockPip(boxIdx)}
                disabled={blockIsMaxed || !canAffordBlock}
                className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[46px] transition-all duration-200
                  ${blockIsMaxed ? 'bg-coffee-dark/60 border-coffee-medium/30 opacity-60'
                    : canAffordBlock ? 'bg-coffee-dark/80 border-warm-orange/50 hover:border-warm-orange active:scale-95'
                    : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}>
                <Shield className={`w-3.5 h-3.5 ${blockIsMaxed ? 'text-coffee-cream/50' : 'text-warm-orange'}`} />
                <div className="flex gap-px mt-0.5">
                  {Array.from({ length: GAME_CONFIG.BLOCK_PIP_PER_EVO }, (_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${i < blockPipsInTier ? 'bg-warm-orange' : 'bg-coffee-medium/40'}`} />
                  ))}
                  {blockEvoCount > 0 && <span className="text-[6px] text-gold font-bold ml-0.5">E{blockEvoCount}</span>}
                </div>
                {blockIsMaxed ? <Check className="w-2.5 h-2.5 text-green-400 mt-0.5" />
                  : <span className="text-[7px] mt-0.5 text-gold">🪙{blockPipCost}</span>}
              </button>
            </div>
          );
        })}

        {/* Per-box Star buttons next to each cargo box */}
        {progression.bestStageReached >= 2 && Array.from({ length: progression.blockCountLevel }, (_, boxIdx) => {
          const starPerBox = progression.starPerBox || [false, false, false];
          const isStarred = starPerBox[boxIdx] || false;
          const canAffordStar = progression.totalCoins >= GAME_CONFIG.STAR_PER_BOX_COST;
          const boxY = chassisY - ((boxIdx + 1) * boxHeight);
          
          // Star pip upgrade (only if star is purchased for this box)
          const hasAnyStar = starPerBox.some(v => v);
          const starPipCost = getPipCost(progression.starPips, GAME_CONFIG.STAR_PIP_BASE_COST, GAME_CONFIG.STAR_PIP_COST_SCALING);
          const starMaxEvos = GAME_CONFIG.STAR_MAX_EVOS_CH1;
          const starEvoCount = progression.starEvoChoices?.length || 0;
          const starIsMaxed = starEvoCount >= starMaxEvos;
          const starPipsInTier = progression.starPips % GAME_CONFIG.STAR_PIP_PER_EVO;

          // Per-box weapon lock
          const boxWeapons = progression.boxWeapons || [null, null, null];
          const boxWeapon = boxWeapons[boxIdx];

          // Brew per-box
          const brewPerBox = progression.brewPerBox || [false, false, false];
          const isBrewed = brewPerBox[boxIdx] || false;
          const canAffordBrew = progression.totalCoins >= GAME_CONFIG.BREW_PER_BOX_COST;
          const showBrew = progression.bestStageReached >= 3;
          
          return (
            <div key={`weapons-${boxIdx}`} className="absolute pointer-events-auto flex gap-1"
              style={{ top: boxY, left: cartRightEdge + 6 }}>
              {/* Star button (hidden if box has brew) */}
              {boxWeapon !== 'brew' && (!isStarred ? (
                <button
                  onClick={() => {
                    if (purchaseStarForBox(boxIdx, GAME_CONFIG.STAR_PER_BOX_COST)) {
                      setProgression(loadProgression());
                      onProgressionChange?.();
                      toast.success('Star Equipped!', { icon: '⭐' });
                    }
                  }}
                  disabled={!canAffordStar}
                  className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[38px] transition-all duration-200
                    ${canAffordStar ? 'bg-coffee-dark/80 border-sky-400/50 hover:border-sky-400 active:scale-95'
                    : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}>
                  <Star className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[7px] mt-0.5 text-gold">🪙{GAME_CONFIG.STAR_PER_BOX_COST}</span>
                </button>
              ) : hasAnyStar && boxIdx === 0 ? (
                <button
                  onClick={handleStarPip}
                  disabled={starIsMaxed || progression.totalCoins < starPipCost}
                  className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[46px] transition-all duration-200
                    ${starIsMaxed ? 'bg-sky-900/60 border-sky-500/50 opacity-60'
                      : progression.totalCoins >= starPipCost ? 'bg-coffee-dark/80 border-sky-400/50 hover:border-sky-400 active:scale-95'
                      : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}>
                  <Star className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                  <div className="flex gap-px mt-0.5">
                    {Array.from({ length: GAME_CONFIG.STAR_PIP_PER_EVO }, (_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${i < starPipsInTier ? 'bg-sky-400' : 'bg-coffee-medium/40'}`} />
                    ))}
                    {starEvoCount > 0 && <span className="text-[6px] text-sky-300 font-bold ml-0.5">E{starEvoCount}</span>}
                  </div>
                  {starIsMaxed ? <span className="text-[6px] text-green-400 mt-0.5">MAX</span>
                    : <span className="text-[7px] mt-0.5 text-gold">🪙{starPipCost}</span>}
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[38px] bg-sky-900/60 border-sky-500/50">
                  <Star className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                  <Check className="w-2.5 h-2.5 text-sky-400 mt-0.5" />
                </div>
              ))}

              {/* Brew button (hidden if box has star) */}
              {showBrew && boxWeapon !== 'star' && (
                !isBrewed ? (
                  <button
                    onClick={() => {
                      if (purchaseBrewForBox(boxIdx, GAME_CONFIG.BREW_PER_BOX_COST)) {
                        setProgression(loadProgression());
                        onProgressionChange?.();
                        toast.success('Brew Equipped!', { icon: '🫧' });
                      }
                    }}
                    disabled={!canAffordBrew}
                    className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[38px] transition-all duration-200
                      ${canAffordBrew ? 'bg-coffee-dark/80 border-amber-500/50 hover:border-amber-500 active:scale-95'
                      : 'bg-coffee-dark/60 border-coffee-medium/30 opacity-70'}`}>
                    <span className="text-sm">🫧</span>
                    <span className="text-[7px] mt-0.5 text-gold">🪙{GAME_CONFIG.BREW_PER_BOX_COST}</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center p-1 rounded-md border min-w-[32px] h-[38px] bg-amber-900/60 border-amber-500/50">
                    <span className="text-sm">🫧</span>
                    <Check className="w-2.5 h-2.5 text-amber-400 mt-0.5" />
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Bottom Section */}
      <div className="p-3 space-y-2">
        {/* Upgrade Row */}
        <div className="flex gap-2">
          <PipTile name="Power" icon={<Zap className="w-4 h-4 text-energy" />}
            currentPips={progression.powerPips} pipsPerEvo={GAME_CONFIG.POWER_PIP_PER_EVO}
            evoCount={progression.powerEvoChoices?.length || 0}
            cost={getPipCost(progression.powerPips, GAME_CONFIG.POWER_PIP_BASE_COST, GAME_CONFIG.POWER_PIP_COST_SCALING)}
            coins={progression.totalCoins} onPurchase={handlePowerPip} />
          <PipTile name="Damage" icon={<Coffee className="w-4 h-4 text-warm-orange" />}
            currentPips={progression.damagePips} pipsPerEvo={GAME_CONFIG.DAMAGE_PIP_PER_EVO}
            evoCount={progression.damageEvoChoices?.length || 0}
            cost={getPipCost(progression.damagePips, GAME_CONFIG.DAMAGE_PIP_BASE_COST, GAME_CONFIG.DAMAGE_PIP_COST_SCALING)}
            coins={progression.totalCoins} onPurchase={handleDamagePip} />
        </div>
        
        {/* Play + Reset row */}
        <div className="flex gap-2 items-center">
          <button onClick={handlePlay}
            className="flex-1 bg-warm-orange hover:bg-warm-orange/90 text-coffee-foam text-lg font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-warm-orange/50">
            <Play className="w-6 h-6" />
            BATTLE
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1 text-[10px] text-coffee-cream/40 hover:text-coffee-cream/70 transition-colors">
            <RotateCcw className="w-3 h-3" />
            Reset Progress
          </button>
        </div>
      </div>
      
      {/* Footer Tabs */}
      <div className="bg-coffee-dark/90 border-t border-coffee-medium/30">
        <div className="flex justify-around py-2 px-1">
          {FOOTER_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === tab.id ? 'text-warm-orange' : !tab.unlocked ? 'text-coffee-cream/30' : 'text-coffee-cream/60 hover:text-coffee-cream/80'}`}>
                <div className="relative">
                  <TabIcon className="w-5 h-5" />
                  {!tab.unlocked && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-coffee-cream/50" />}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Selection Modal */}
      {showModeModal && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setShowModeModal(false)}>
          <div className="bg-coffee-dark/95 rounded-2xl p-4 max-w-xs w-full mx-4 border border-coffee-medium/50 space-y-3"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-coffee-cream font-bold text-center">Select Mode</h3>
            
            <button onClick={() => { setSelectedMode('CHAPTER'); setShowModeModal(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                selectedMode === 'CHAPTER' ? 'bg-warm-orange/20 border-warm-orange' : 'bg-coffee-dark/30 border-coffee-dark/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedMode === 'CHAPTER' ? 'bg-warm-orange' : 'bg-coffee-dark/50'}`}>
                {selectedMode === 'CHAPTER' && <Check className="w-4 h-4 text-coffee-foam" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-coffee-cream font-semibold text-sm">☕ Dawn Rush</div>
                <div className="text-coffee-cream/60 text-xs">5 Gates + Boss • Chapter 1</div>
              </div>
            </button>
            
            <button onClick={() => { setSelectedMode('ENDLESS'); setShowModeModal(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                selectedMode === 'ENDLESS' ? 'bg-warm-orange/20 border-warm-orange' : 'bg-coffee-dark/30 border-coffee-dark/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedMode === 'ENDLESS' ? 'bg-warm-orange' : 'bg-coffee-dark/50'}`}>
                {selectedMode === 'ENDLESS' && <Check className="w-4 h-4 text-coffee-foam" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-coffee-cream font-semibold text-sm">♾️ Endless</div>
                <div className="text-coffee-cream/60 text-xs">Survive as long as you can</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
