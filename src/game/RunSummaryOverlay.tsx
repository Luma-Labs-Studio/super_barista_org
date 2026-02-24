import React, { useRef, useCallback } from 'react';
import { GAME_CONFIG, STAGES } from './config';
import type { GameStats, PurchaseEvent } from './types';

interface RunSummaryOverlayProps {
  stats: GameStats;
  purchaseLog: PurchaseEvent[];
  onContinue: () => void;
}

const fmt = (n: number, decimals = 1) => Number(n).toFixed(decimals);

export const RunSummaryOverlay: React.FC<RunSummaryOverlayProps> = ({ stats, purchaseLog, onContinue }) => {
  const contentRef = useRef<HTMLPreElement>(null);
  const [copyLabel, setCopyLabel] = React.useState('📋 Copy All');
  const [continueEnabled, setContinueEnabled] = React.useState(false);
  const t = stats.telemetry;

  React.useEffect(() => {
    const timer = setTimeout(() => setContinueEnabled(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const buildText = useCallback(() => {
    const lines: string[] = [];
    const hr = '════════════════════════════════════════';

    // 1. CORE RUN INFO
    lines.push(hr);
    lines.push('1. CORE RUN INFO');
    lines.push(hr);
    lines.push(`Run ID: ${t?.runId ?? 'N/A'}`);
    lines.push(`DEBUG telemetryBuiltAt: ${t?.telemetryBuiltAt ?? 'N/A'}`);
    lines.push(`Duration: ${fmt(stats.timeSurvived)}s`);
    lines.push(`Stage Reached: ${stats.stageReached ?? t?.stageReached ?? '?'}/6`);
    lines.push(`Boss: ${t?.bossOutcome ?? 'not_spawned'}`);
    if (t?.bossOutcome === 'died_during_boss') lines.push(`  Boss HP remaining: ${t.bossHpPercent}%`);
    lines.push('');

    // 2. DEATH INFO
    lines.push(hr);
    lines.push('2. DEATH INFO');
    lines.push(hr);
    lines.push(`Death Phase: ${t?.phaseAtDeath ?? 'N/A'}`);
    lines.push(`Death Stage: ${t?.deathStage ?? '?'}`);
    lines.push('');

    // 3. PER-STAGE PHASE TIMING
    lines.push(hr);
    lines.push('3. PER-STAGE PHASE TIMING');
    lines.push(hr);
    for (let i = 0; i < 5; i++) {
      const stageReached = t?.stageReached ?? 1;
      if (stageReached <= i) {
        lines.push(`S${i + 1}: [unreached]`);
      } else {
        const travel = fmt(t?.travelTimeByStage?.[i] ?? 0, 1);
        const siege = fmt(t?.siegeTimeByStage?.[i] ?? 0, 1);
        const breather = fmt(t?.breatherTimeByStage?.[i] ?? 0, 1);
        lines.push(`S${i + 1}: travel=${travel}s | siege=${siege}s | breather=${breather}s`);
      }
    }
    lines.push(`Totals: travel=${fmt(t?.totalTravelTime ?? 0, 1)}s | siege=${fmt(t?.totalSiegeTime ?? 0, 1)}s | breather=${fmt(t?.totalBreatherTime ?? 0, 1)}s`);
    lines.push('');

    // 4. STAGE & GATE BREAKDOWN
    lines.push(hr);
    lines.push('4. STAGE & GATE BREAKDOWN');
    lines.push(hr);
    for (let i = 0; i < 5; i++) {
      const stage = STAGES[i];
      const maxHp = stage.gateHP ?? 0;
      const remaining = t?.gateHpRemainingByGate?.[i] ?? maxHp;
      const dealt = t?.gateDamageDealt?.[i] ?? 0;
      const bombDmg = t?.bombGateDamageByGate?.[i] ?? 0;
      const bulletDmg = dealt - bombDmg;
      const pct = maxHp > 0 ? fmt((dealt / maxHp) * 100, 1) : '0.0';
      const time = fmt(t?.gateTimeSpent?.[i] ?? 0, 1);
      const stageReached = t?.stageReached ?? 1;
      const destroyed = t?.gateDestroyedByGate?.[i] ?? false;
      const status = stageReached <= i ? '[unreached]' : destroyed ? 'YES' : 'NO';
      lines.push(`G${i + 1}: HP rem: ${remaining}/${maxHp} | Dealt: ${dealt} (${pct}%) [bullets: ${bulletDmg}, bomb: ${bombDmg}] | Time: ${time}s | Destroyed: ${status}`);
    }
    lines.push('');

    // 5. LINE-OF-SIGHT & DAMAGE FLOW
    lines.push(hr);
    lines.push('5. LINE-OF-SIGHT & DAMAGE FLOW');
    lines.push(hr);
    lines.push(`Shots: ${t?.shotsFired ?? 0} fired, ${t?.shotsHit ?? 0} hit (${t?.hitRate ?? 0}%)`);
    lines.push(`To Enemies: ${t?.shotsToEnemies ?? 0} | To Gate: ${t?.shotsToGate ?? 0}`);
    if (GAME_CONFIG.WEAPON_MODE === 'shotgun') {
      lines.push(`Shotgun Bursts: ${t?.burstsTriggered ?? 0} (${GAME_CONFIG.SHOTGUN_PELLETS} pellets, ${GAME_CONFIG.SHOTGUN_SPREAD_DEG}° cone, ${GAME_CONFIG.SHOTGUN_DAMAGE_SPLIT})`);
      const tmc = t?.targetModeCounts ?? { front: 0, mid: 0, back: 0, gate: 0 };
      lines.push(`Target Modes: front=${tmc.front} mid=${tmc.mid} back=${tmc.back} gate=${tmc.gate}`);
    }
    lines.push(`Bomb Gate Damage Total: ${t?.bombGateDamageTotal ?? 0}`);
    const bgd = t?.bombGateDamageByGate ?? [0, 0, 0, 0, 0];
    lines.push(`  G1: ${bgd[0]} | G2: ${bgd[1]} | G3: ${bgd[2]} | G4: ${bgd[3]} | G5: ${bgd[4]}`);
    lines.push(`Star Throw: ${t?.starThrowUses ?? 0} uses | Dmg to Enemies: ${t?.starThrowDamageToEnemies ?? 0} | Dmg to Gate: ${t?.starThrowDamageToGate ?? 0} | Passive: ${t?.starPassiveDamageDealt ?? 0}`);
    lines.push(`Brew Burst: ${t?.brewBurstUses ?? 0} uses | Dmg to Enemies: ${t?.brewBurstDamageToEnemies ?? 0} | Dmg to Gate: ${t?.brewBurstDamageToGate ?? 0} | Passive: ${t?.brewPassiveDamageDealt ?? 0}`);
    lines.push(`  Brew Box Index: ${t?.brewEquippedBoxIndex ?? -1} | Burst During Gate: ${t?.brewBurstUsedDuringGate ?? 0}`);
    if ((t?.brewUnlockedAt ?? -1) >= 0) lines.push(`  Brew unlocked at: ${fmt(t?.brewUnlockedAt ?? 0)}s`);
    if (t?.brewBurstTimestamps && t.brewBurstTimestamps.length > 0) lines.push(`  Brew Burst timestamps: ${t.brewBurstTimestamps.map(ts => fmt(ts, 1)).join(', ')}`);
    lines.push('');

    // 6. PRESSURE / SURVIVAL
    lines.push(hr);
    lines.push('6. PRESSURE / SURVIVAL');
    lines.push(hr);
    lines.push(`Max Latched: ${t?.maxLatchedPeak ?? 0} peak | Time at max: ${fmt(t?.timeAtMaxLatched ?? 0)}s`);
    lines.push(`Blocks Lost: ${t?.blocksLost ?? 0} | First block lost: ${t?.timeToFirstBlockLost === -1 ? 'N/A' : fmt(t?.timeToFirstBlockLost ?? 0) + 's'}`);
    lines.push(`Bomb Uses: ${t?.tonicBombUses ?? 0} | Star Throws: ${t?.starThrowUses ?? 0} | Brew Bursts: ${t?.brewBurstUses ?? 0}`);
    lines.push('');

    // 7. ECONOMY TRACE
    lines.push(hr);
    lines.push('7. ECONOMY TRACE');
    lines.push(hr);
    lines.push(`Coins Start (wallet): ${t?.coinsStart ?? 0}`);
    lines.push(`+ Kills: ${t?.coinsFromKills ?? 0}`);
    lines.push(`+ Gate Lumps: ${t?.coinsFromGateLumps ?? 0}`);
    lines.push(`+ Clear Bonus: ${t?.clearBonusCoins ?? 0}`);
    lines.push(`= Earned this run: ${t?.coinsEarnedActual ?? stats.coinsEarned}`);
    lines.push(`Coins End (wallet): ${t?.coinsEnd ?? 0}`);
    const delta = t?.economyDelta ?? 0;
    lines.push(`Delta: ${delta}${Math.abs(delta) > 1 ? ' ⚠️' : ''}`);
    if (t?.deltaExplanation) lines.push(`  ${t.deltaExplanation}`);
    const walletDelta = (t?.coinsEnd ?? 0) - (t?.coinsStart ?? 0);
    const runEarned = (t?.coinsFromKills ?? 0) + (t?.coinsFromGateLumps ?? 0) + (t?.clearBonusCoins ?? 0);
    lines.push(`Wallet delta = ${walletDelta}`);
    lines.push(`Run earned = ${t?.coinsFromKills ?? 0} + ${t?.coinsFromGateLumps ?? 0} + ${t?.clearBonusCoins ?? 0} = ${runEarned}`);
    lines.push('');

    // 8. GARAGE / UPGRADE TRACE
    lines.push(hr);
    lines.push('8. GARAGE / UPGRADE TRACE');
    lines.push(hr);
    if (purchaseLog.length === 0) {
      lines.push('[No upgrades purchased before this run]');
    } else {
      let totalSpent = 0;
      for (const p of purchaseLog) {
        lines.push(`${p.type} | ${p.target} | ${p.before}->${p.after} | cost: ${p.coinCost} | wallet: ${p.coinsBefore}->${p.coinsAfter}`);
        totalSpent += p.coinCost;
      }
      lines.push(`Total Spent: ${totalSpent}`);
      const lastEntry = purchaseLog[purchaseLog.length - 1];
      lines.push(`Remaining: ${lastEntry.coinsAfter}`);
    }
    lines.push('');

    // 9. CONFIG SNAPSHOT
    lines.push(hr);
    lines.push('9. CONFIG SNAPSHOT');
    lines.push(hr);
    lines.push(`AUTO_ATTACK_INTERVAL: ${GAME_CONFIG.AUTO_ATTACK_INTERVAL}`);
    lines.push(`PROJECTILE_DAMAGE: ${GAME_CONFIG.PROJECTILE_DAMAGE}`);
    lines.push(`POWER_START_REGEN: ${GAME_CONFIG.POWER_START_REGEN}`);
    lines.push(`BLOCK_MAX_HP: ${GAME_CONFIG.BLOCK_MAX_HP}`);
    lines.push(`LATCHED_TICK_DAMAGE: ${GAME_CONFIG.LATCHED_TICK_DAMAGE}`);
    lines.push(`LATCHED_TICK_INTERVAL: ${GAME_CONFIG.LATCHED_TICK_INTERVAL}`);
    lines.push(`TONIC_BOMB_DAMAGE: ${GAME_CONFIG.TONIC_BOMB_DAMAGE}`);
    lines.push(`TONIC_BOMB_COST: ${GAME_CONFIG.TONIC_BOMB_COST}`);
    lines.push(`WEAPON_MODE: ${GAME_CONFIG.WEAPON_MODE}`);
    if (GAME_CONFIG.WEAPON_MODE === 'shotgun') {
      lines.push(`SHOTGUN: ${GAME_CONFIG.SHOTGUN_PELLETS} pellets | ${GAME_CONFIG.SHOTGUN_SPREAD_DEG}° (${GAME_CONFIG.SHOTGUN_SPREAD_DEG_MIN}-${GAME_CONFIG.SHOTGUN_SPREAD_DEG_MAX}) | split: ${GAME_CONFIG.SHOTGUN_DAMAGE_SPLIT} | radius: ${GAME_CONFIG.PROJECTILE_RADIUS}`);
      lines.push(`AIM: jitter=${GAME_CONFIG.AIM_Y_JITTER} tilt=${GAME_CONFIG.AIM_Y_TILT} | crowdThresh=${GAME_CONFIG.CROWDING_THRESHOLD} range=${GAME_CONFIG.CROWDING_RANGE}`);
    }
    lines.push('');
    const maxStage = t?.stageReached ?? 1;
    for (let i = 0; i < Math.max(maxStage, 1) && i < STAGES.length; i++) {
      const s = STAGES[i];
      if (s.isBoss) {
        lines.push(`Stage ${s.id} (BOSS): bossHP=${s.bossHP} drop=${s.enemyDropCoins} clearBonus=${s.clearBonus}`);
      } else {
        lines.push(`Stage ${s.id}: gateHP=${s.gateHP} spawn=${s.spawnInterval} hpMult=${s.enemyHpMult} spdMult=${s.enemySpeedMult} drop=${s.enemyDropCoins} lump=${s.gateLumpSum} heavyEvery=${s.heavyEvery}`);
      }
    }

    return lines.join('\n');
  }, [stats, t, purchaseLog]);

  const handleCopy = useCallback(() => {
    const text = buildText();
    navigator.clipboard.writeText(text).then(() => {
      setCopyLabel('Copied ✅');
      setTimeout(() => setCopyLabel('📋 Copy All'), 1200);
    }).catch(() => {
      setCopyLabel('Copy failed ❌');
      setTimeout(() => setCopyLabel('📋 Copy All'), 1200);
      if (contentRef.current) {
        const range = document.createRange();
        range.selectNodeContents(contentRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }, [buildText]);

  const text = buildText();

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.92)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}>
        <span style={{ color: '#FFD700', fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold' }}>
          RUN SUMMARY (DEV)
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {copyLabel}
        </button>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 12px',
        WebkitOverflowScrolling: 'touch',
      }}>
        <pre
          ref={contentRef}
          style={{
            color: '#E0E0E0',
            fontFamily: 'monospace',
            fontSize: '10px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            userSelect: 'text',
          }}
        >
          {text}
        </pre>
      </div>

      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}>
        <button
          onClick={continueEnabled ? onContinue : undefined}
          disabled={!continueEnabled}
          style={{
            width: 'auto',
            background: continueEnabled ? '#FFD700' : 'rgba(255,215,0,0.3)',
            color: continueEnabled ? '#000' : 'rgba(0,0,0,0.4)',
            border: 'none',
            padding: '6px 20px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: continueEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          {continueEnabled ? 'Continue →' : 'Wait...'}
        </button>
      </div>
    </div>
  );
};
