import React from 'react';
import { Clock, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GAME_CONFIG, STAGES } from './config';
import { CoinIcon } from './CoinIcon';
import type { GameMode, BossState, PlayPhase, GateBuilding } from './types';

interface GameHUDProps {
  timeSurvived: number;
  tips: number;
  power: number;
  onTonicBomb: () => void;
  canUseBomb: boolean;
  onStarThrow: () => void;
  canUseStar: boolean;
  hasStar: boolean;
  onBrewBurst: () => void;
  canUseBrew: boolean;
  hasBrew: boolean;
  onEspressoBarrage: () => void;
  canUseEspresso: boolean;
  hasEspresso: boolean;
  onIceStorm: () => void;
  canUseIce: boolean;
  hasIce: boolean;
  onPause: () => void;
  gameMode: GameMode;
  bossState: BossState;
  bossIncomingTimer: number;
  playPhase?: PlayPhase;
  stageIndex?: number;
  gateBuilding?: GateBuilding | null;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  timeSurvived, tips, power,
  onTonicBomb, canUseBomb, onStarThrow, canUseStar, hasStar,
  onBrewBurst, canUseBrew, hasBrew,
  onEspressoBarrage, canUseEspresso, hasEspresso,
  onIceStorm, canUseIce, hasIce,
  onPause,
  gameMode, bossState, bossIncomingTimer,
  playPhase, stageIndex = 1, gateBuilding,
}) => {
  const [gateClearedStage, setGateClearedStage] = React.useState<number | null>(null);
  const gateClearedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const prevPhaseRef = React.useRef<PlayPhase | undefined>(undefined);
  React.useEffect(() => {
    if (playPhase === 'VICTORY' && prevPhaseRef.current !== 'VICTORY') {
      setGateClearedStage(stageIndex);
      if (gateClearedTimerRef.current) clearTimeout(gateClearedTimerRef.current);
      gateClearedTimerRef.current = setTimeout(() => setGateClearedStage(null), 2000);
    }
    prevPhaseRef.current = playPhase;
  }, [playPhase, stageIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skillCost = GAME_CONFIG.TONIC_BOMB_COST;
  const canUseSkill = power >= skillCost;
  const starCost = GAME_CONFIG.STAR_THROW_COST;
  const brewCost = GAME_CONFIG.BREW_BURST_COST;
  const espressoCost = GAME_CONFIG.ESPRESSO_BARRAGE_COST;
  const iceCost = GAME_CONFIG.ICE_STORM_COST;
  
  return (
    <>
      {/* GATE CLEARED Banner */}
      {gateClearedStage !== null && (
        <div className="absolute top-1/4 left-0 right-0 z-30 flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gold/90 text-coffee-espresso px-6 py-3 rounded-xl text-xl font-bold shadow-lg border-2 border-gold/60 flex items-center gap-2">
            <span>🏰</span>
            <span>GATE {gateClearedStage} CLEARED!</span>
            <span>✨</span>
          </div>
        </div>
      )}
      
      {/* BOSS INCOMING Banner */}
      {bossIncomingTimer > 0 && (
        <div className="absolute top-1/3 left-0 right-0 z-30 flex justify-center">
          <div className="bg-red-600/90 text-white px-8 py-4 rounded-xl text-2xl font-bold animate-pulse shadow-2xl border-2 border-red-400">
            👑 BOSS INCOMING! 👑
          </div>
        </div>
      )}
      
      {/* Boss HP Bar */}
      {bossState.isActive && (
        <div className="absolute top-14 left-3 right-3 z-20">
          <div className={`bg-coffee-dark/90 rounded-lg p-2 border ${
            bossState.phase === 4 ? 'border-red-400 animate-pulse' :
            bossState.phase === 3 ? 'border-orange-400/70' :
            bossState.phase === 2 ? 'border-yellow-500/60' :
            'border-red-500/50'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-red-400 font-bold text-sm flex items-center gap-1">
                👑 BOSS
                {bossState.phase >= 2 && (
                  <span className={`text-[10px] ml-1 px-1 rounded ${
                    bossState.phase === 4 ? 'bg-red-500 text-white' :
                    bossState.phase === 3 ? 'bg-orange-500 text-white' :
                    'bg-yellow-500 text-black'
                  }`}>
                    {bossState.phase === 4 ? 'ENRAGE' : bossState.phase === 3 ? 'FURY' : 'ANGRY'}
                  </span>
                )}
              </span>
              <span className="text-red-300 text-xs font-mono">{Math.max(0, Math.round(bossState.hp))}/{bossState.maxHp}</span>
            </div>
            <div className="h-3 bg-hp-bg rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-200 rounded-full ${
                bossState.phase === 4 ? 'bg-red-600' :
                bossState.phase === 3 ? 'bg-orange-500' :
                bossState.phase === 2 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
                style={{ width: `${Math.max(0, (bossState.hp / bossState.maxHp) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}
      
      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 flex flex-col gap-2 p-3 z-10 ${bossState.isActive ? 'bg-red-900/20' : ''}`}>
        {/* Stage Progress Bar */}
        <div className="flex flex-col gap-1 px-1">
          <div className="flex gap-1">
            {STAGES.map((stage, i) => {
              const stageNum = i + 1;
              const isCompleted = stageIndex > stageNum;
              const isCurrent = stageIndex === stageNum;
              const isBossStage = stage.isBoss;
              
              let progress = 0;
              if (isCompleted) progress = 100;
              else if (isCurrent && !isBossStage && gateBuilding) {
                progress = ((gateBuilding.maxHp - gateBuilding.hp) / gateBuilding.maxHp) * 100;
              } else if (isCurrent && isBossStage && bossState.isActive) {
                progress = ((bossState.maxHp - bossState.hp) / bossState.maxHp) * 100;
              }
              
              return (
                <div key={stageNum} className="flex-1 flex flex-col items-center">
                  <div className={`w-full h-2 rounded-full overflow-hidden bg-coffee-dark/60 ${
                    isCurrent && !isBossStage ? 'ring-1 ring-warm-orange' : 
                    isCurrent && isBossStage ? 'ring-1 ring-destructive animate-pulse' : ''}`}>
                    <div className={`h-full transition-all duration-300 ${
                      isBossStage ? 'bg-destructive' : isCompleted ? 'bg-gold' : 'bg-warm-orange'}`}
                      style={{ width: `${progress}%` }} />
                  </div>
                  <span className={`text-[10px] mt-0.5 ${
                    isCompleted ? 'text-gold' : isCurrent ? (isBossStage ? 'text-destructive font-bold' : 'text-warm-orange') : 'text-coffee-cream/40'}`}>
                    {isBossStage ? '👑' : `G${stageNum}`}
                  </span>
                </div>
              );
            })}
          </div>
          
          {playPhase === 'SIEGE' && !bossState.isActive && (
            <div className="flex justify-center">
              <span className="bg-warm-orange/80 text-coffee-foam px-2 py-0.5 rounded-full text-[10px] font-bold">
                ⚔️ SIEGE
              </span>
            </div>
          )}
          {playPhase === 'TRAVEL' && (
            <div className="flex justify-center">
              <span className="bg-coffee-medium/60 text-coffee-foam px-2 py-0.5 rounded-full text-[10px] font-bold">
                🚗 TRAVEL
              </span>
            </div>
          )}
        </div>
        
        {/* Time and Tips */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-coffee-dark/80 rounded-lg px-3 py-2">
            <Clock className="w-5 h-5 text-coffee-cream" />
            <span className="text-lg font-bold text-coffee-cream font-mono">{formatTime(timeSurvived)}</span>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            {bossState.isActive && (
              <div className="bg-red-600 text-coffee-foam px-4 py-1.5 rounded-full text-sm font-bold animate-pulse shadow-lg border border-red-400">
                👑 BOSS PHASE
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-coffee-dark/80 rounded-lg px-3 py-2">
            <CoinIcon size={20} />
            <span className="text-lg font-bold text-gold">{tips}</span>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar - Power + Skills */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-coffee-espresso/80 to-transparent">
        <div className="flex items-center gap-3">
          <Button onClick={onPause} variant="ghost" size="icon"
            className="h-12 w-12 rounded-xl bg-coffee-dark/70 hover:bg-coffee-dark/90 text-coffee-cream border border-coffee-medium/30">
            <Pause className="w-6 h-6" />
          </Button>
          
          {/* Power */}
          <div className="flex-1 bg-coffee-dark/80 rounded-xl p-2 border border-coffee-medium/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-sm text-coffee-cream font-semibold">Power</span>
              <span className="text-lg text-energy font-bold ml-auto">{power.toFixed(1)}</span>
            </div>
          </div>
          
          {/* Star Throw Button */}
          {hasStar && (
            <Button onClick={onStarThrow} disabled={!canUseStar}
              className={`relative h-16 w-16 rounded-xl text-lg font-bold shadow-lg transition-all border-2 ${
                canUseStar ? 'bg-sky-600 hover:bg-sky-500 text-coffee-foam border-sky-400/50 hover:scale-105 active:scale-95' 
                : 'bg-coffee-dark/60 text-coffee-cream/40 border-coffee-dark/30'}`}>
              <span className="text-2xl">⭐</span>
              <div className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                canUseStar ? 'bg-energy text-coffee-espresso' : 'bg-coffee-dark/60 text-coffee-cream/40'}`}>
                {starCost}⚡
              </div>
            </Button>
          )}
          
          {/* Brew Burst Button */}
          {hasBrew && (
            <Button onClick={onBrewBurst} disabled={!canUseBrew}
              className={`relative h-16 w-16 rounded-xl text-lg font-bold shadow-lg transition-all border-2 ${
                canUseBrew ? 'bg-amber-100 hover:bg-amber-50 text-coffee-espresso border-amber-300/50 hover:scale-105 active:scale-95' 
                : 'bg-coffee-dark/60 text-coffee-cream/40 border-coffee-dark/30'}`}>
              <span className="text-2xl">🫧</span>
              <div className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                canUseBrew ? 'bg-energy text-coffee-espresso' : 'bg-coffee-dark/60 text-coffee-cream/40'}`}>
                {brewCost}⚡
              </div>
            </Button>
          )}
          
          {/* Espresso Barrage Button */}
          {hasEspresso && (
            <Button onClick={onEspressoBarrage} disabled={!canUseEspresso}
              className={`relative h-16 w-16 rounded-xl text-lg font-bold shadow-lg transition-all border-2 ${
                canUseEspresso ? 'bg-amber-800 hover:bg-amber-700 text-coffee-foam border-amber-600/50 hover:scale-105 active:scale-95'
                : 'bg-coffee-dark/60 text-coffee-cream/40 border-coffee-dark/30'}`}>
              <span className="text-2xl">☕</span>
              <div className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                canUseEspresso ? 'bg-energy text-coffee-espresso' : 'bg-coffee-dark/60 text-coffee-cream/40'}`}>
                {espressoCost}⚡
              </div>
            </Button>
          )}

          {/* Ice Storm Button */}
          {hasIce && (
            <Button onClick={onIceStorm} disabled={!canUseIce}
              className={`relative h-16 w-16 rounded-xl text-lg font-bold shadow-lg transition-all border-2 ${
                canUseIce ? 'bg-cyan-600 hover:bg-cyan-500 text-coffee-foam border-cyan-400/50 hover:scale-105 active:scale-95'
                : 'bg-coffee-dark/60 text-coffee-cream/40 border-coffee-dark/30'}`}>
              <span className="text-2xl">🧊</span>
              <div className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                canUseIce ? 'bg-energy text-coffee-espresso' : 'bg-coffee-dark/60 text-coffee-cream/40'}`}>
                {iceCost}⚡
              </div>
            </Button>
          )}

          {/* Bomb Button */}
          <Button onClick={onTonicBomb} disabled={!canUseSkill}
            className={`relative h-16 w-16 rounded-xl text-lg font-bold shadow-lg transition-all border-2 ${
              canUseSkill ? 'bg-warm-orange hover:bg-warm-orange/90 text-coffee-foam border-warm-orange/50 hover:scale-105 active:scale-95' 
              : 'bg-coffee-dark/60 text-coffee-cream/40 border-coffee-dark/30'}`}>
            <span className="text-2xl">💣</span>
            <div className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              canUseSkill ? 'bg-energy text-coffee-espresso' : 'bg-coffee-dark/60 text-coffee-cream/40'}`}>
              {skillCost}⚡
            </div>
          </Button>
        </div>
      </div>
    </>
  );
};
