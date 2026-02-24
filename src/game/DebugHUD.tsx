import React, { useState } from 'react';
import { GAME_CONFIG } from './config';
import { loadProgression, saveProgression, addDebugCoins } from './persistence';
import type { BossState, GameMode } from './types';

interface DebugHUDProps {
  fps: number;
  activeEnemies: number;
  maxEnemies: number;
  latchedCount: number;
  shotsFired: number;
  shotsHit: number;
  heavyCount: number;
  activeProjectiles: number;
  power: number;
  stageIndex: number;
  gateHpPercent: number;
  gateDamageDealt: number;
  gameMode: GameMode;
  bossState: BossState;
  isVisible: boolean;
  isStressTest: boolean;
  onToggle: () => void;
  onStressTestToggle: () => void;
}

export const DebugHUD: React.FC<DebugHUDProps> = ({
  fps, activeEnemies, maxEnemies, latchedCount,
  shotsFired, shotsHit, heavyCount, activeProjectiles,
  power, stageIndex, gateHpPercent, gateDamageDealt,
  gameMode, bossState,
  isVisible, isStressTest,
  onToggle, onStressTestToggle,
}) => {
  const [isCompact, setIsCompact] = useState(true);
  const [showDevTools, setShowDevTools] = useState(false);

  const getFpsColor = (value: number) => {
    if (value < 30) return 'text-red-400';
    if (value < 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const handleAddCoins = () => {
    const newTotal = addDebugCoins(200);
    alert(`+200 coins! Total: ${newTotal}`);
  };

  return (
    <>
      <button onClick={onToggle}
        className="fixed top-2 left-2 z-50 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono backdrop-blur-sm">
        {isVisible ? '🐛 Hide' : '🐛 Debug'}
      </button>

      {isVisible && (
        <div className="fixed top-10 left-2 z-50 w-[92vw] max-w-[420px] max-h-[35vh] rounded-xl bg-black/75 text-white text-[11px] leading-4 backdrop-blur-sm px-3 py-2 overflow-y-auto pointer-events-auto">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/20">
            <span className="font-bold text-gold">DEBUG</span>
            <div className="flex gap-1">
              <button onClick={() => setIsCompact(!isCompact)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px]">
                {isCompact ? '📖 Full' : '📑 Compact'}
              </button>
              <button onClick={onStressTestToggle}
                className={`px-2 py-0.5 rounded text-[10px] ${isStressTest ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}>
                {isStressTest ? '🔥' : '⚡'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div className={getFpsColor(fps)}>FPS: {fps.toFixed(0)}</div>
            <div>Stage: <span className="text-gold font-bold">{stageIndex}/6</span></div>
            
            <div className={activeEnemies > maxEnemies ? 'text-red-400 font-bold' : ''}>
              Enemies: {activeEnemies}/{maxEnemies}
            </div>
            <div className="text-amber-400">Heavy: {heavyCount}</div>
            
            <div className={latchedCount >= GAME_CONFIG.MAX_LATCHED_ENEMIES ? 'text-red-400 font-bold' : 'text-orange-300'}>
              Latched: {latchedCount}/{GAME_CONFIG.MAX_LATCHED_ENEMIES}
            </div>
            <div className="text-cyan-300">Proj: {activeProjectiles}</div>
            
            <div className="text-cyan-300">Shots: {shotsFired}/{shotsHit}</div>
            <div className="text-energy">Power: {power.toFixed(1)}</div>
            
            <div className="text-warm-orange">Gate HP: {gateHpPercent}%</div>
            <div className="text-warm-orange">Gate DMG: {gateDamageDealt}</div>
            
            {bossState.isActive && (
              <div className="col-span-2 text-red-400 font-bold animate-pulse">
                🔥 Boss HP: {bossState.hp}/{bossState.maxHp} ({Math.round(bossState.hp / bossState.maxHp * 100)}%)
              </div>
            )}
          </div>

          {!isCompact && (
            <div className="mt-2 pt-2 border-t border-white/20 space-y-2">
              <div className="pt-2 border-t border-white/20">
                <button onClick={() => setShowDevTools(!showDevTools)}
                  className="w-full py-1 px-2 rounded text-[10px] font-bold bg-purple-600/80 text-white mb-2">
                  {showDevTools ? '🛠️ Hide Dev Tools' : '🛠️ Dev Tools'}
                </button>
                {showDevTools && (
                  <div className="space-y-2 border border-purple-500/50 rounded p-2 bg-purple-900/30">
                    <button onClick={handleAddCoins}
                      className="w-full py-1 px-2 rounded text-[10px] bg-gold text-coffee-espresso font-bold">
                      💰 +200 Coins
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
