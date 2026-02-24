import React, { useState, useEffect } from 'react';
import { Clock, Coffee, Users, Home, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadProgression } from './persistence';
import { STAGES } from './config';
import { CoinIcon } from './CoinIcon';
import type { GameStats, GameMode } from './types';

interface EndScreenProps {
  stats: GameStats;
  onPlayAgain: () => void;
  onHome: () => void;
  gameMode: GameMode;
}

const INPUT_LOCKOUT_MS = 400;

export const EndScreen: React.FC<EndScreenProps> = ({ stats, onPlayAgain, onHome, gameMode }) => {
  const progression = loadProgression();
  const isChapterClear = stats.isChapterClear;
  const [isLocked, setIsLocked] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLocked(false), INPUT_LOCKOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  
  const handlePlayAgain = () => { if (!isLocked) onPlayAgain(); };
  const handleHome = () => { if (!isLocked) onHome(); };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (isChapterClear) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto bg-gradient-to-b from-gold/20 to-coffee-espresso/95 p-4 pt-8 z-20">
        <div className="mb-4 animate-pop-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-8 h-8 text-gold animate-pulse" />
            <h2 className="text-3xl font-bold text-gold text-center">Chapter 1 Clear!</h2>
            <Star className="w-8 h-8 text-gold animate-pulse" />
          </div>
          <p className="text-coffee-cream text-center text-lg">☕ The Boss has been served! ☕</p>
        </div>
        
        <div className="bg-gold/20 border-2 border-gold rounded-2xl p-4 mb-3 w-full max-w-xs animate-pop-in">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-gold" />
            <span className="text-coffee-cream text-sm">Clear Time</span>
          </div>
          <div className="text-3xl font-bold text-gold text-center">{formatTime(stats.timeSurvived)}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 w-full max-w-xs mb-3">
          <div className="bg-coffee-dark/50 rounded-xl p-2 text-center animate-pop-in">
            <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
            <div className="text-lg font-bold text-coffee-cream">{stats.customersServed}</div>
            <div className="text-[10px] text-coffee-light">Served</div>
          </div>
          <div className="bg-coffee-dark/50 rounded-xl p-2 text-center animate-pop-in">
            <span className="text-base block mb-1">🏁</span>
            <div className="text-lg font-bold text-warm-orange">{stats.stageReached ?? 6}</div>
            <div className="text-[10px] text-coffee-light">Stage</div>
          </div>
        </div>
        
        <div className="bg-gold/30 border border-gold/50 rounded-xl p-3 w-full max-w-xs mb-3 animate-pop-in">
          <div className="flex items-center justify-center gap-3">
            <CoinIcon size={24} />
            <div className="text-center">
              <div className="text-xl font-bold text-gold">+{stats.coinsEarned}</div>
              <div className="text-[10px] text-coffee-cream/70">(Kills + Gates + Clear Bonus)</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-row gap-4 w-full max-w-xs justify-center items-center mt-2 mb-4">
          <Button onClick={handleHome} variant="outline" size="default" disabled={isLocked}
            className="border-coffee-cream/30 text-coffee-cream hover:bg-coffee-dark/30 rounded-lg px-4 py-3 disabled:opacity-50">
            <Home className="w-4 h-4 mr-1" /> Home
          </Button>
          <Button onClick={handlePlayAgain} size="lg" disabled={isLocked}
            className="bg-gold hover:bg-gold/90 text-coffee-espresso text-lg px-6 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50">
            🏆 Play Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto bg-gradient-to-b from-coffee-dark/95 to-coffee-espresso/95 p-4 pt-8 z-20">
      <div className="mb-6 animate-pop-in">
        <h2 className="text-2xl font-bold text-destructive text-center">
          {gameMode === 'CHAPTER' ? 'Chapter Failed! 😴' : 'Game Over! 😴'}
        </h2>
        {gameMode === 'CHAPTER' && (
          <p className="text-coffee-cream/70 text-center mt-2">
            Reached Stage <span className="text-gold font-bold">{stats.stageReached ?? 1}</span>/6
          </p>
        )}
        {stats.isNewRecord && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-gold text-lg font-bold animate-pulse">🏆 NEW RECORD!</span>
          </div>
        )}
      </div>
      
      <div className="bg-coffee-medium/50 rounded-2xl p-5 mb-4 w-full max-w-xs animate-pop-in">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-6 h-6 text-gold" />
          <span className="text-coffee-cream">Time Survived</span>
        </div>
        <div className="text-4xl font-bold text-gold text-center">{formatTime(stats.timeSurvived)}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
        <div className="bg-coffee-dark/50 rounded-xl p-3 text-center animate-pop-in">
          <Users className="w-5 h-5 text-secondary mx-auto mb-1" />
          <div className="text-xl font-bold text-coffee-cream">{stats.customersServed}</div>
          <div className="text-xs text-coffee-light">Served</div>
        </div>
        <div className="bg-coffee-dark/50 rounded-xl p-3 text-center animate-pop-in">
          <CoinIcon size={24} className="block mb-1 mx-auto" />
          <div className="text-xl font-bold text-secondary">+{stats.coinsEarned}</div>
          <div className="text-xs text-coffee-light">Coins</div>
        </div>
      </div>
      
      {/* Gate damage telemetry */}
      {stats.telemetry && (
        <div className="bg-coffee-dark/50 rounded-xl p-3 w-full max-w-xs mb-4 animate-pop-in">
          <div className="text-[10px] text-coffee-cream/60 uppercase mb-1">Gate Damage</div>
          <div className="flex gap-1 text-[10px]">
            {stats.telemetry.gateDamageDealt.map((dmg, i) => (
              <div key={i} className={`flex-1 text-center ${dmg > 0 ? 'text-warm-orange' : 'text-coffee-cream/30'}`}>
                G{i + 1}: {dmg}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-row gap-4 w-full max-w-xs justify-center items-center mt-4 mb-4">
        <Button onClick={handleHome} variant="outline" size="default" disabled={isLocked}
          className="border-coffee-cream/30 text-coffee-cream hover:bg-coffee-dark/30 rounded-lg px-4 py-3 disabled:opacity-50">
          <Home className="w-4 h-4 mr-1" /> Home
        </Button>
        <Button onClick={handlePlayAgain} size="lg" disabled={isLocked}
          className="bg-warm-orange hover:bg-warm-orange/90 text-coffee-foam text-lg px-6 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform disabled:opacity-50">
          ☕ Play Again
        </Button>
      </div>
      
      {progression.blockCountLevel === 0 && !isChapterClear && (
        <div className="bg-warm-orange/20 border border-warm-orange/40 rounded-lg px-3 py-2 mt-4 max-w-xs">
          <p className="text-warm-orange text-xs text-center">
            💡 Tip: Buy your first <strong>Cargo Box</strong> to survive longer!
          </p>
        </div>
      )}
    </div>
  );
};
