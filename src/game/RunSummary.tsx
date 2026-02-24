import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GAME_CONFIG, STAGES } from './config';
import type { RunTelemetry } from './types';

interface RunSummaryProps {
  telemetry: RunTelemetry;
  timeSurvived: number;
}

export const RunSummary: React.FC<RunSummaryProps> = ({ telemetry, timeSurvived }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getSummaryJSON = () => {
    return JSON.stringify(telemetry, null, 2);
  };
  
  const getCompactSummary = () => {
    const { pipLevels: p } = telemetry;
    return `[${telemetry.gameMode}] ${formatTime(timeSurvived)} Stage${telemetry.stageReached} | Boss:${telemetry.bossOutcome}${telemetry.bossHpPercent > 0 ? `(${telemetry.bossHpPercent}%)` : ''} | Coins:${telemetry.coinsEarnedActual}(B:${telemetry.coinsTotalBreakdown}/D:${telemetry.economyDelta}) | Pips:B${p.blockCount}/P${p.powerPips}/D${p.damagePips}/S${p.starPips ?? 0} | Hit:${telemetry.hitRate}% (${telemetry.shotsHit}/${telemetry.shotsFired}) | Latched:${telemetry.maxLatchedPeak}peak | Blocks:-${telemetry.blocksLost} | Bombs:${telemetry.tonicBombUses}`;
  };
  
  const handleCopy = async (format: 'json' | 'compact') => {
    const text = format === 'json' ? getSummaryJSON() : getCompactSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };
  
  const bossStage = STAGES.find(s => s.isBoss);
  const bossHP = bossStage?.bossHP ?? 10000;
  
  return (
    <div className="bg-coffee-dark/70 border border-coffee-medium/30 rounded-xl overflow-hidden w-full max-w-xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-coffee-medium/20 transition-colors"
      >
        <span className="text-coffee-cream text-sm font-medium">📊 Run Summary</span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-coffee-light" /> : <ChevronDown className="w-4 h-4 text-coffee-light" />}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-4 text-coffee-cream/90 mb-3">
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-1">Run Result</div>
            <div>Mode: <span className="text-gold">{telemetry.gameMode}</span></div>
            <div>Stage: <span className="text-warm-orange">{telemetry.stageReached}</span></div>
            
            <div>Boss: <span className={telemetry.bossOutcome === 'defeated' ? 'text-energy' : 'text-coffee-light'}>{telemetry.bossOutcome}</span></div>
            {telemetry.bossHpPercent > 0 && (
              <div>Boss HP: <span className="text-destructive">{telemetry.bossHpPercent}%</span></div>
            )}
            
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-2">Economy</div>
            <div className="col-span-2">Coins: <span className="text-gold">{telemetry.coinsEarnedActual}</span></div>
            <div className="col-span-2 text-[9px] text-coffee-light/50 pl-2 border-l border-coffee-light/20">
              <div>Kills: {telemetry.coinsFromKills} | Gates: {telemetry.coinsFromGateLumps}</div>
              <div>ClearBonus: {telemetry.clearBonusCoins}</div>
            </div>
            
            <div className="col-span-2 bg-coffee-medium/30 rounded px-2 py-1 mt-1">
              <div className="flex justify-between">
                <span>Delta:</span>
                <span className={telemetry.economyDelta === 0 ? 'text-green-400' : 'text-red-400 font-bold'}>
                  {telemetry.economyDelta === 0 ? '0 ✓' : `⚠️ ${telemetry.economyDelta > 0 ? '+' : ''}${telemetry.economyDelta}`}
                </span>
              </div>
              {telemetry.economyDelta !== 0 && (
                <div className="text-[9px] text-red-300 mt-1 border-t border-coffee-light/20 pt-1">
                  ⚠️ {telemetry.deltaExplanation}
                </div>
              )}
            </div>
            
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-2">Build</div>
            <div className="col-span-2 bg-coffee-medium/30 rounded px-2 py-1">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-coffee-light/50 text-[9px]">Box</div>
                  <div className="text-gold font-bold">{telemetry.pipLevels.blockCount}</div>
                </div>
                <div>
                  <div className="text-coffee-light/50 text-[9px]">Pwr</div>
                  <div className="text-gold font-bold">{telemetry.pipLevels.powerPips}</div>
                </div>
                <div>
                  <div className="text-coffee-light/50 text-[9px]">Dmg</div>
                  <div className="text-gold font-bold">{telemetry.pipLevels.damagePips}</div>
                </div>
              </div>
            </div>
            
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-2">Combat</div>
            <div>Shots: {telemetry.shotsHit}/{telemetry.shotsFired}</div>
            <div>Hit Rate: <span className={telemetry.hitRate >= 80 ? 'text-green-400' : telemetry.hitRate >= 50 ? 'text-warm-orange' : 'text-red-400'}>{telemetry.hitRate}%</span></div>
            <div>Gate Hits: {telemetry.shotsToGate}</div>
            {telemetry.targetModeCounts && (
              <div className="col-span-2 text-[9px] text-coffee-light/50">
                Aim: F{telemetry.targetModeCounts.front}/M{telemetry.targetModeCounts.mid}/B{telemetry.targetModeCounts.back}/G{telemetry.targetModeCounts.gate}
              </div>
            )}
            
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-2">Survivability</div>
            <div>Blocks Lost: <span className={telemetry.blocksLost > 0 ? 'text-red-400' : 'text-green-400'}>{telemetry.blocksLost}</span></div>
            <div>Latched: <span className="text-warm-orange">{telemetry.maxLatchedPeak}</span></div>
            <div>Bombs Used: {telemetry.tonicBombUses}</div>
            
            <div className="col-span-2 text-coffee-light/60 text-[10px] uppercase mt-2">Star</div>
            <div>Passive: <span className="text-sky-400">{telemetry.starPassiveDamageDealt}</span></div>
            <div>Throws: <span className="text-sky-400">{telemetry.starThrowUses}</span></div>
            <div>Throw→Enemy: {telemetry.starThrowDamageToEnemies}</div>
            <div>Throw→Gate: {telemetry.starThrowDamageToGate}</div>
            
            <div className="col-span-2 text-coffee-light/40 text-[9px] mt-2 text-center border-t border-coffee-light/10 pt-1">
              🔧 BOSS_HP={bossHP} | BOMB={GAME_CONFIG.TONIC_BOMB_COST}
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button onClick={() => handleCopy('compact')} size="sm" variant="outline" className="flex-1 text-[10px] h-7 border-coffee-medium/50 text-coffee-cream hover:bg-coffee-medium/30">
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} Line
            </Button>
            <Button onClick={() => handleCopy('json')} size="sm" variant="outline" className="flex-1 text-[10px] h-7 border-coffee-medium/50 text-coffee-cream hover:bg-coffee-medium/30">
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />} JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
