import { GAME_CONFIG, COLORS } from './config';
import type { CartBlock, Enemy, Projectile, TipDrop, Particle, FloatingDamage, BossState, PlayPhase, GateBuilding } from './types';

// Module-level mutable state (reset via resetRendererState on new game)
let parallaxOffset1 = 0;
let parallaxOffset2 = 0;
let wheelRotation = 0;
let starRotation = 0;
let foamSweepAngle = 0;
let foamParticleTimer = 0;
const foamParticles: { x: number; y: number; life: number; vx: number; vy: number; size: number }[] = [];

export function resetRendererState() {
  parallaxOffset1 = 0;
  parallaxOffset2 = 0;
  wheelRotation = 0;
  starRotation = 0;
  foamSweepAngle = 0;
  foamParticleTimer = 0;
  foamParticles.length = 0;
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  blocks: CartBlock[],
  enemies: Enemy[],
  projectiles: Projectile[],
  tips: TipDrop[],
  particles: Particle[],
  screenShake: { x: number; y: number },
  bossState?: BossState,
  bossIncomingTimer?: number,
  playPhase?: PlayPhase,
  deltaTime?: number,
  gateBuilding?: GateBuilding | null,
  currentTime?: number,
  hasStar?: boolean,
  hasBrew?: boolean,
  brewBoxIndex?: number,
  hasEspresso?: boolean,
  espressoBoxIndex?: number,
  hasIce?: boolean,
  iceBoxIndex?: number,
) {
  const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;
  const isTraveling = playPhase === 'TRAVEL' || playPhase === 'BREATHER';
  const isApproaching = playPhase === 'APPROACH';
  
  if (deltaTime) {
    starRotation += 3 * deltaTime;
  }
  
  if (isTraveling && deltaTime) {
    parallaxOffset1 = (parallaxOffset1 + 30 * deltaTime) % 120;
    parallaxOffset2 = (parallaxOffset2 + 80 * deltaTime) % 60;
    wheelRotation += 8 * deltaTime;
  } else if (isApproaching && deltaTime) {
    parallaxOffset1 = (parallaxOffset1 + 15 * deltaTime) % 120;
    parallaxOffset2 = (parallaxOffset2 + 40 * deltaTime) % 60;
    wheelRotation += 4 * deltaTime;
  }
  
  ctx.save();
  ctx.translate(screenShake.x, screenShake.y);
  
  drawBackground(ctx, isTraveling || isApproaching);
  drawGround(ctx, isTraveling || isApproaching);
  
  if (gateBuilding && !gateBuilding.isDestroyed) {
    drawGateBuilding(ctx, gateBuilding, currentTime);
  }
  
  drawCart(ctx, blocks, isTraveling || isApproaching);
  drawBarista(ctx, blocks);
  
  if (hasStar) drawStarSprite(ctx, blocks);
  if (hasBrew) drawFoamZone(ctx, blocks, brewBoxIndex, deltaTime || 0.016);
  if (hasEspresso) drawEspressoZone(ctx, blocks, espressoBoxIndex);
  if (hasIce) drawIceZone(ctx, blocks, iceBoxIndex);

  enemies.forEach(enemy => drawEnemy(ctx, enemy));
  projectiles.forEach(proj => drawProjectile(ctx, proj));
  particles.forEach(particle => drawParticle(ctx, particle));
  tips.forEach(tip => drawTip(ctx, tip));
  
  if (bossIncomingTimer && bossIncomingTimer > 0) {
    drawBossIncomingBanner(ctx);
  }
  if (bossState?.isActive) {
    drawBossEdgeGlow(ctx);
    drawBossHpBar(ctx, bossState);
  }
  
  // Phase label only in dev mode
  if (playPhase && import.meta.env.DEV) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(playPhase, 8, 14);
  }
  
  ctx.restore();
}

// Draw menu scene (blocks and cart)
export function drawMenuScene(ctx: CanvasRenderingContext2D, blockCount: number) {
  const { CANVAS_HEIGHT, BLOCK_HEIGHT, BLOCK_MAX_HP } = GAME_CONFIG;
  drawBackground(ctx);
  drawGround(ctx);
  const groundY = CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const blocks: CartBlock[] = Array.from({ length: blockCount }, (_, i) => ({
    id: i, hp: BLOCK_MAX_HP, maxHp: BLOCK_MAX_HP,
    y: groundY - 30 - (i + 1) * BLOCK_HEIGHT,
    height: BLOCK_HEIGHT, destroyed: false, collapseOffset: 0,
  }));
  drawCart(ctx, blocks);
  drawBarista(ctx, blocks);
}

// ═══════════════════════════════════════════════════════════════════════
// GATE BUILDING
// ═══════════════════════════════════════════════════════════════════════
function drawGateBuilding(ctx: CanvasRenderingContext2D, gate: GateBuilding, currentTime?: number) {
  const hpPercent = gate.hp / gate.maxHp;
  
  const r = Math.floor(140 + (1 - hpPercent) * 60);
  const g = Math.floor(60 - (1 - hpPercent) * 30);
  const b = Math.floor(50 - (1 - hpPercent) * 20);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.beginPath();
  roundRect(ctx, gate.x, gate.y, gate.width, gate.height, 6);
  ctx.fill();
  
  if (currentTime !== undefined && gate.lastHitTime && (currentTime - gate.lastHitTime) < 0.15) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    roundRect(ctx, gate.x, gate.y, gate.width, gate.height, 6);
    ctx.fill();
  }
  
  ctx.fillStyle = 'hsla(0, 0%, 100%, 0.8)';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`G${gate.stageIndex}`, gate.x + gate.width / 2, gate.y + gate.height / 2 - 10);
  
  if (hpPercent < 0.75) {
    ctx.strokeStyle = 'hsla(0, 0%, 20%, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gate.x + 10, gate.y + 20);
    ctx.lineTo(gate.x + gate.width / 2, gate.y + gate.height / 3);
    ctx.stroke();
  }
  if (hpPercent < 0.50) {
    ctx.beginPath();
    ctx.moveTo(gate.x + gate.width - 10, gate.y + 10);
    ctx.lineTo(gate.x + gate.width / 2, gate.y + gate.height / 2);
    ctx.stroke();
  }
  if (hpPercent < 0.25) {
    ctx.beginPath();
    ctx.moveTo(gate.x + 15, gate.y + gate.height - 15);
    ctx.lineTo(gate.x + gate.width - 15, gate.y + 15);
    ctx.stroke();
  }
  
  const barWidth = gate.width + 10;
  const barHeight = 6;
  const barX = gate.x - 5;
  const barY = gate.y - 12;
  
  ctx.fillStyle = COLORS.hpBarBg;
  roundRect(ctx, barX, barY, barWidth, barHeight, 3);
  ctx.fill();
  
  ctx.fillStyle = hpPercent > 0.5 ? 'hsl(0, 70%, 50%)' : hpPercent > 0.25 ? 'hsl(30, 80%, 50%)' : 'hsl(45, 90%, 55%)';
  roundRect(ctx, barX, barY, barWidth * hpPercent, barHeight, 3);
  ctx.fill();
  
  ctx.fillStyle = 'hsl(0, 0%, 100%)';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${gate.hp}`, gate.x + gate.width / 2, barY - 3);
  
  if (gate.breathingActive) {
    ctx.fillStyle = 'hsla(145, 60%, 45%, 0.3)';
    ctx.beginPath();
    ctx.arc(gate.x + gate.width / 2, gate.y - 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'hsl(145, 60%, 45%)';
    ctx.font = '10px sans-serif';
    ctx.fillText('💨', gate.x + gate.width / 2 - 5, gate.y - 16);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PASSIVE STAR ZONE (visual)
// ═══════════════════════════════════════════════════════════════════════
function drawStarSprite(ctx: CanvasRenderingContext2D, blocks: CartBlock[]) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;
  
  const sawCenterX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH + GAME_CONFIG.STAR_PASSIVE_RADIUS * 0.5;
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const sawCenterY = groundY - 60;
  
  ctx.save();
  ctx.translate(sawCenterX, sawCenterY);
  ctx.rotate(starRotation);
  const starRadius = 18;
  const innerRadius = 8;
  const points = 5;
  ctx.fillStyle = 'hsla(200, 50%, 60%, 0.7)';
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? starRadius : innerRadius;
    if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'hsla(200, 40%, 40%, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// PASSIVE FOAM ZONE (sweeping cannon visual — white/cream)
// ═══════════════════════════════════════════════════════════════════════

function drawFoamZone(ctx: CanvasRenderingContext2D, blocks: CartBlock[], foamBoxIndex?: number, dt: number = 0.016) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;
  
  const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  // Anchor to equipped box Y position
  const foamBlock = foamBoxIndex !== undefined && foamBoxIndex >= 0
    ? blocks.find(b => b.id === foamBoxIndex + 1 && !b.destroyed)
    : null;
  // If the equipped box is destroyed, don't draw foam zone
  if (!foamBlock) return;
  // Use visual Y position (index-based positioning matching drawCart rendering)
  const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
  // Find the foam block's visual cargo slot index (not block.id)
  const activeCargoBlocks = activeBlocks.filter(b => b.id > 0).sort((a, b) => a.id - b.id);
  const foamCargoIndex = activeCargoBlocks.findIndex(b => b.id === foamBlock.id);
  const visualBlockY = chassisY - (foamCargoIndex + 1) * boxHeight + (foamBlock.collapseOffset || 0);
  const cannonOriginY = visualBlockY + boxHeight / 2;
  const range = GAME_CONFIG.BREW_PASSIVE_RANGE;
  
  // Update sweep angle
  foamSweepAngle += GAME_CONFIG.BREW_SWEEP_SPEED * dt;
  const sweepHalf = (GAME_CONFIG.BREW_SWEEP_ANGLE / 2) * (Math.PI / 180);
  const currentAngle = Math.sin(foamSweepAngle) * sweepHalf;
  
  // Draw sweeping beam indicator (thick, bright for visibility)
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = 'hsl(200, 70%, 75%)';
  ctx.beginPath();
  ctx.moveTo(cartFrontX, cannonOriginY);
  const beamEndX = cartFrontX + Math.cos(currentAngle) * range;
  const beamEndY = cannonOriginY + Math.sin(currentAngle) * range;
  const perpX = -Math.sin(currentAngle) * 28;
  const perpY = Math.cos(currentAngle) * 28;
  ctx.lineTo(beamEndX + perpX, beamEndY + perpY);
  ctx.lineTo(beamEndX - perpX, beamEndY - perpY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Range indicator arc (brighter)
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = 'hsl(200, 65%, 70%)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cartFrontX, cannonOriginY, range, -sweepHalf, sweepHalf);
  ctx.stroke();
  ctx.restore();
  
  // Foam particles (denser, brighter, larger blobs)
  foamParticleTimer += dt;
  if (foamParticleTimer > 0.05 && foamParticles.length < 18) {
    foamParticleTimer = 0;
    const dist = Math.random() * range * 0.7 + 10;
    foamParticles.push({
      x: cartFrontX + Math.cos(currentAngle) * dist,
      y: cannonOriginY + Math.sin(currentAngle) * dist,
      life: 1.0,
      vx: Math.cos(currentAngle) * 25,
      vy: -12 - Math.random() * 18,
      size: 5 + Math.random() * 6,
    });
  }
  
  for (let i = foamParticles.length - 1; i >= 0; i--) {
    const p = foamParticles[i];
    p.life -= 1.375 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.size *= 0.985;
    if (p.life <= 0) { foamParticles.splice(i, 1); continue; }
    
    ctx.save();
    ctx.globalAlpha = p.life * 0.9;
    // Outer glow
    ctx.fillStyle = `hsla(200, 55%, 85%, ${p.life * 0.3})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Main blob
    ctx.fillStyle = `hsl(200, ${50 + (1 - p.life) * 20}%, ${90 - (1 - p.life) * 10}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ESPRESSO CANNON VISUAL (rapid-fire zone indicator — dark brown)
// ═══════════════════════════════════════════════════════════════════════

function drawEspressoZone(ctx: CanvasRenderingContext2D, blocks: CartBlock[], espressoBoxIndex?: number) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;

  const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  const espBlock = espressoBoxIndex !== undefined && espressoBoxIndex >= 0
    ? blocks.find(b => b.id === espressoBoxIndex + 1 && !b.destroyed)
    : null;
  if (!espBlock) return;

  const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
  const activeCargoBlocks = activeBlocks.filter(b => b.id > 0).sort((a, b) => a.id - b.id);
  const espCargoIndex = activeCargoBlocks.findIndex(b => b.id === espBlock.id);
  const visualBlockY = chassisY - (espCargoIndex + 1) * boxHeight + (espBlock.collapseOffset || 0);
  const cannonOriginY = visualBlockY + boxHeight / 2;
  const range = GAME_CONFIG.ESPRESSO_PASSIVE_RANGE;

  // Draw cone-shaped fire zone
  ctx.save();
  ctx.globalAlpha = 0.15;
  const spreadRad = (GAME_CONFIG.ESPRESSO_PASSIVE_SPREAD_DEG / 2) * (Math.PI / 180);
  ctx.fillStyle = 'hsl(25, 70%, 40%)';
  ctx.beginPath();
  ctx.moveTo(cartFrontX, cannonOriginY);
  ctx.arc(cartFrontX, cannonOriginY, range, -spreadRad, spreadRad);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cannon nozzle
  ctx.save();
  ctx.fillStyle = 'hsl(25, 50%, 30%)';
  ctx.fillRect(cartFrontX - 2, cannonOriginY - 4, 12, 8);
  ctx.fillStyle = 'hsl(25, 60%, 45%)';
  ctx.fillRect(cartFrontX + 8, cannonOriginY - 3, 4, 6);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// ICE BLENDER VISUAL (frost aura indicator — blue/cyan)
// ═══════════════════════════════════════════════════════════════════════

function drawIceZone(ctx: CanvasRenderingContext2D, blocks: CartBlock[], iceBoxIndex?: number) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;

  const cartFrontX = GAME_CONFIG.CART_X + GAME_CONFIG.CART_WIDTH;
  const iceBlock = iceBoxIndex !== undefined && iceBoxIndex >= 0
    ? blocks.find(b => b.id === iceBoxIndex + 1 && !b.destroyed)
    : null;
  if (!iceBlock) return;

  const chassisHeight = Math.floor(GAME_CONFIG.BLOCK_HEIGHT * 0.4);
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = GAME_CONFIG.BLOCK_HEIGHT - 4;
  const activeCargoBlocks = activeBlocks.filter(b => b.id > 0).sort((a, b) => a.id - b.id);
  const iceCargoIndex = activeCargoBlocks.findIndex(b => b.id === iceBlock.id);
  const visualBlockY = chassisY - (iceCargoIndex + 1) * boxHeight + (iceBlock.collapseOffset || 0);
  const cannonOriginY = visualBlockY + boxHeight / 2;
  const range = GAME_CONFIG.ICE_PASSIVE_RANGE;

  // Draw frost aura circle
  ctx.save();
  ctx.globalAlpha = 0.12;
  const gradient = ctx.createRadialGradient(cartFrontX, cannonOriginY, 0, cartFrontX, cannonOriginY, range);
  gradient.addColorStop(0, 'hsla(195, 80%, 70%, 0.4)');
  gradient.addColorStop(0.7, 'hsla(195, 80%, 80%, 0.2)');
  gradient.addColorStop(1, 'hsla(195, 80%, 90%, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cartFrontX, cannonOriginY, range, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Range indicator arc
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = 'hsl(195, 70%, 70%)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(cartFrontX, cannonOriginY, range, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Blender device icon
  ctx.save();
  ctx.fillStyle = 'hsl(195, 60%, 50%)';
  ctx.fillRect(cartFrontX - 2, cannonOriginY - 6, 10, 12);
  ctx.fillStyle = 'hsl(195, 70%, 70%)';
  ctx.beginPath();
  ctx.arc(cartFrontX + 3, cannonOriginY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// BACKGROUND, GROUND, CART, BARISTA
// ═══════════════════════════════════════════════════════════════════════
function drawBackground(ctx: CanvasRenderingContext2D, isTraveling = false) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
  gradient.addColorStop(0, 'hsl(30, 40%, 70%)');
  gradient.addColorStop(0.6, 'hsl(35, 50%, 80%)');
  gradient.addColorStop(1, 'hsl(40, 60%, 85%)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
  
  ctx.fillStyle = 'hsla(0, 0%, 100%, 0.6)';
  const cloudOffset = isTraveling ? parallaxOffset1 : 0;
  drawCloud(ctx, (50 + cloudOffset) % (GAME_CONFIG.CANVAS_WIDTH + 80) - 40, 80, 40);
  drawCloud(ctx, (200 + cloudOffset * 0.7) % (GAME_CONFIG.CANVAS_WIDTH + 60) - 30, 50, 30);
  drawCloud(ctx, (300 + cloudOffset * 0.5) % (GAME_CONFIG.CANVAS_WIDTH + 70) - 35, 100, 35);
  
  if (isTraveling) {
    ctx.fillStyle = 'hsla(35, 40%, 70%, 0.15)';
    for (let i = 0; i < 5; i++) {
      const streakX = ((i * 80 + parallaxOffset2 * 3) % (GAME_CONFIG.CANVAS_WIDTH + 40)) - 20;
      const streakY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET - 30 - (i * 15);
      ctx.fillRect(streakX, streakY, 35, 3);
    }
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, isTraveling = false) {
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  ctx.fillStyle = COLORS.darkRoast;
  ctx.fillRect(0, groundY, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_Y_OFFSET);
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, groundY, GAME_CONFIG.CANVAS_WIDTH, 4);
  
  if (isTraveling) {
    ctx.fillStyle = 'hsla(40, 50%, 80%, 0.4)';
    for (let i = 0; i < 6; i++) {
      const lineX = ((i * 70 + parallaxOffset2 * 4) % (GAME_CONFIG.CANVAS_WIDTH + 50)) - 25;
      ctx.fillRect(lineX, groundY + 20 + (i * 12), 40, 2);
    }
  }
}

function drawCart(ctx: CanvasRenderingContext2D, blocks: CartBlock[], isTraveling = false) {
  const activeBlocks = blocks.filter(b => !b.destroyed).sort((a, b) => a.id - b.id);
  const { CART_X, CART_WIDTH, BLOCK_HEIGHT } = GAME_CONFIG;
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  
  const wheelY = groundY - 15;
  ctx.fillStyle = COLORS.espresso;
  
  [CART_X + 20, CART_X + CART_WIDTH - 20].forEach(wx => {
    ctx.save();
    ctx.translate(wx, wheelY);
    ctx.rotate(isTraveling ? wheelRotation : 0);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.cream;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    if (isTraveling) {
      ctx.strokeStyle = COLORS.cream; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
      ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = COLORS.espresso;
  });
  
  const chassisHeight = Math.floor(BLOCK_HEIGHT * 0.4);
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = BLOCK_HEIGHT - 4;
  
  let cargoSlotIndex = 0;
  activeBlocks.forEach((block) => {
    const offset = block.collapseOffset || 0;
    if (block.id === 0) {
      const drawY = chassisY + offset;
      ctx.fillStyle = 'hsl(25, 30%, 18%)';
      ctx.beginPath(); roundRect(ctx, CART_X - 3, drawY, CART_WIDTH + 6, chassisHeight, 4); ctx.fill();
      ctx.fillStyle = 'hsla(30, 20%, 40%, 0.4)';
      ctx.fillRect(CART_X, drawY + 2, CART_WIDTH, 4);
      const hpBarWidth = CART_WIDTH - 10, hpBarHeight = 4;
      const hpBarX = CART_X + 5, hpBarY = drawY + chassisHeight - 8;
      ctx.fillStyle = COLORS.hpBarBg;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 2); ctx.fill();
      const hpPercent = block.hp / block.maxHp;
      ctx.fillStyle = hpPercent > 0.3 ? COLORS.energyBar : COLORS.hpBar;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight, 2); ctx.fill();
    } else {
      // Index-based positioning: use cargoSlotIndex instead of block.id
      const blockY = chassisY - (cargoSlotIndex + 1) * boxHeight + offset;
      const colors = [COLORS.darkRoast, COLORS.mediumRoast, COLORS.lightRoast];
      ctx.fillStyle = colors[cargoSlotIndex + 1] || COLORS.mediumRoast;
      ctx.beginPath(); roundRect(ctx, CART_X, blockY, CART_WIDTH, boxHeight, 8); ctx.fill();
      ctx.fillStyle = 'hsla(0, 0%, 100%, 0.2)';
      ctx.fillRect(CART_X + 5, blockY + 5, CART_WIDTH - 10, 8);
      const hpBarWidth = CART_WIDTH - 20, hpBarHeight = 6;
      const hpBarX = CART_X + 10, hpBarY = blockY + boxHeight - 11;
      ctx.fillStyle = COLORS.hpBarBg;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 3); ctx.fill();
      const hpPercent = block.hp / block.maxHp;
      ctx.fillStyle = hpPercent > 0.3 ? COLORS.energyBar : COLORS.hpBar;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight, 3); ctx.fill();
      cargoSlotIndex++;
    }
  });
}

function drawBarista(ctx: CanvasRenderingContext2D, blocks: CartBlock[]) {
  const activeBlocks = blocks.filter(b => !b.destroyed);
  if (activeBlocks.length === 0) return;
  const { CART_X, CART_WIDTH, BLOCK_HEIGHT } = GAME_CONFIG;
  const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_Y_OFFSET;
  const chassisHeight = Math.floor(BLOCK_HEIGHT * 0.4);
  const chassisY = groundY - 30 - chassisHeight;
  const boxHeight = BLOCK_HEIGHT - 4;
  const cargoBlockCount = activeBlocks.filter(b => b.id > 0).length;
  // Use collapse offset from topmost block for smooth barista animation
  const topBlock = activeBlocks[activeBlocks.length - 1];
  const topBlockOffset = topBlock?.collapseOffset || 0;
  const topY = chassisY - (cargoBlockCount * boxHeight) + topBlockOffset;
  const baristaX = CART_X + CART_WIDTH / 2;
  const baristaY = topY - 25;
  
  ctx.fillStyle = COLORS.cream;
  ctx.beginPath(); ctx.arc(baristaX, baristaY, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'hsl(140, 60%, 45%)';
  ctx.beginPath();
  ctx.moveTo(baristaX - 12, baristaY - 10); ctx.lineTo(baristaX + 12, baristaY - 10);
  ctx.lineTo(baristaX + 8, baristaY - 25); ctx.lineTo(baristaX - 8, baristaY - 25);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.espresso;
  ctx.beginPath();
  ctx.arc(baristaX - 5, baristaY - 2, 2, 0, Math.PI * 2);
  ctx.arc(baristaX + 5, baristaY - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.warmOrange;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(baristaX, baristaY + 3, 4, 0, Math.PI);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════════
// ENEMIES, PROJECTILES, PARTICLES, TIPS, BOSS
// ═══════════════════════════════════════════════════════════════════════
function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  if (!enemy.active || (enemy.state === 'SERVED' && enemy.servedTimer <= 0)) return;

  const x = enemy.x;
  const y = enemy.y;
  const w = enemy.width;
  const h = enemy.height;

  if (enemy.state === 'SERVED') {
    ctx.globalAlpha = enemy.servedTimer / GAME_CONFIG.SERVED_EXIT_DURATION;
  }

  const isHeavy = enemy.kind === 'HEAVY';
  const isBoss = enemy.kind === 'BOSS';
  const isSpeeder = enemy.kind === 'SPEEDER';
  const isShielded = enemy.kind === 'SHIELDED';
  const isExploder = enemy.kind === 'EXPLODER';

  // Body color based on kind
  ctx.fillStyle = isBoss ? 'hsl(0, 60%, 35%)'
    : isHeavy ? 'hsl(280, 40%, 40%)'
    : isSpeeder ? 'hsl(50, 70%, 55%)' // yellow-orange (morning rush)
    : isShielded ? 'hsl(210, 30%, 50%)' // steel blue (armored)
    : isExploder ? 'hsl(15, 80%, 45%)' // red-orange (volatile)
    : enemy.state === 'LATCHED' ? COLORS.awake : COLORS.sleepy;
  ctx.beginPath();
  roundRect(ctx, x - w / 2, y - h, w, h, 8);
  ctx.fill();

  // Slow effect tint overlay
  if (enemy.slowTimer > 0) {
    ctx.fillStyle = 'hsla(200, 80%, 70%, 0.3)';
    ctx.beginPath();
    roundRect(ctx, x - w / 2, y - h, w, h, 8);
    ctx.fill();
  }

  // Boss crown
  if (isBoss) {
    ctx.fillStyle = 'hsl(45, 90%, 55%)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑', x, y - h - 5);
  }

  // Heavy border glow (purple)
  if (isHeavy) {
    ctx.strokeStyle = 'hsla(280, 60%, 60%, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, x - w / 2 - 2, y - h - 2, w + 4, h + 4, 10);
    ctx.stroke();
  }

  // Speeder: speed lines trailing behind
  if (isSpeeder && enemy.state === 'WALKING') {
    ctx.strokeStyle = 'hsla(50, 80%, 65%, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const lineY = y - h * 0.3 - i * 8;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 4, lineY);
      ctx.lineTo(x + w / 2 + 14 + i * 4, lineY);
      ctx.stroke();
    }
  }

  // Shielded: armor plate overlay + shield HP bar
  if (isShielded && enemy.shieldHp > 0) {
    ctx.strokeStyle = 'hsla(210, 50%, 70%, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    roundRect(ctx, x - w / 2 - 1, y - h - 1, w + 2, h + 2, 9);
    ctx.stroke();
    // Shield emblem
    ctx.fillStyle = 'hsla(210, 60%, 75%, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡', x, y - h * 0.35);
  }

  // Exploder: pulsing glow + danger icon
  if (isExploder) {
    ctx.strokeStyle = 'hsla(15, 90%, 55%, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, x - w / 2 - 2, y - h - 2, w + 4, h + 4, 10);
    ctx.stroke();
    ctx.fillStyle = 'hsla(45, 90%, 55%, 0.9)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💥', x, y - h - 4);
  }

  // HP bar
  const hpPercent = enemy.hp / enemy.maxHp;
  const barWidth = w - 4;
  const barHeight = 4;
  const barX = x - barWidth / 2;
  const barY = y - h - (isExploder ? 14 : 6);
  ctx.fillStyle = COLORS.hpBarBg;
  roundRect(ctx, barX, barY, barWidth, barHeight, 2);
  ctx.fill();
  ctx.fillStyle = hpPercent > 0.5 ? COLORS.energyBar : COLORS.hpBar;
  roundRect(ctx, barX, barY, barWidth * hpPercent, barHeight, 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = COLORS.espresso;
  const eyeY = y - h * 0.6;
  ctx.beginPath();
  ctx.arc(x - 6, eyeY, 3, 0, Math.PI * 2);
  ctx.arc(x + 6, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  // Latched exclamation
  if (enemy.state === 'LATCHED') {
    ctx.fillStyle = COLORS.warmOrange;
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - h * 0.3);
  }

  ctx.globalAlpha = 1;
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  if (!proj.active) return;
  
  if (proj.isStar) {
    // Star projectile: blue spinning star
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(starRotation * 2);
    const r = proj.radius;
    ctx.fillStyle = 'hsl(200, 70%, 60%)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (proj.isIce) {
    // Ice projectile: blue-white crystalline drop with frost glow
    ctx.save();
    ctx.globalAlpha = 0.9;
    // Outer frost glow
    ctx.fillStyle = 'hsla(195, 90%, 80%, 0.4)';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 3.0, 0, Math.PI * 2);
    ctx.fill();
    // Main ice drop (diamond shape)
    ctx.fillStyle = 'hsl(195, 85%, 70%)';
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y - proj.radius * 2);
    ctx.lineTo(proj.x + proj.radius * 1.3, proj.y);
    ctx.lineTo(proj.x, proj.y + proj.radius * 2);
    ctx.lineTo(proj.x - proj.radius * 1.3, proj.y);
    ctx.closePath();
    ctx.fill();
    // Inner highlight
    ctx.fillStyle = 'hsl(195, 60%, 92%)';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y - proj.radius * 0.3, proj.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (proj.isBrew) {
    // Brew projectile: large bright cream/white blob with glow
    ctx.save();
    ctx.globalAlpha = 1.0;
    // Outer glow (bigger)
    ctx.fillStyle = 'hsla(200, 60%, 80%, 0.5)';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Main blob (bigger, brighter)
    ctx.fillStyle = 'hsl(200, 65%, 75%)';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 2.0, 0, Math.PI * 2);
    ctx.fill();
    // Inner highlight
    ctx.fillStyle = 'hsl(200, 40%, 92%)';
    ctx.beginPath();
    ctx.arc(proj.x - 1, proj.y - 1, proj.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Normal coffee projectile
    ctx.fillStyle = COLORS.espresso;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.cream;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius + 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  if (!particle.active || particle.life <= 0) return;
  const alpha = particle.life / particle.maxLife;
  ctx.globalAlpha = alpha;
  
  if (particle.type === 'heart') {
    ctx.fillStyle = particle.color || COLORS.heart;
    ctx.font = `${particle.size}px sans-serif`;
    ctx.fillText('💚', particle.x, particle.y);
  } else if (particle.type === 'steam') {
    ctx.fillStyle = COLORS.steam;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.type === 'confetti') {
    ctx.fillStyle = particle.color || COLORS.sparkle;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size * 0.6);
  } else if (particle.type === 'crumble') {
    ctx.fillStyle = particle.color || COLORS.gateCrumble;
    ctx.beginPath();
    roundRect(ctx, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = particle.color || COLORS.sparkle;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTip(ctx: CanvasRenderingContext2D, tip: TipDrop) {
  if (!tip.active) return;
  ctx.globalAlpha = tip.opacity;
  // Gold coin circle
  const cx = tip.x - 8;
  const cy = tip.y - 6;
  const r = 7;
  ctx.fillStyle = 'hsl(43, 80%, 50%)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'hsl(45, 90%, 62%)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'hsla(50, 100%, 85%, 0.6)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Value text
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${tip.value}`, tip.x + 2, tip.y);
  ctx.globalAlpha = 1;
}

function drawBossIncomingBanner(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'hsla(0, 60%, 40%, 0.3)';
  ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
}

function drawBossEdgeGlow(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'hsla(0, 70%, 50%, 0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, GAME_CONFIG.CANVAS_WIDTH - 4, GAME_CONFIG.CANVAS_HEIGHT - 4);
}

function drawBossHpBar(ctx: CanvasRenderingContext2D, bossState: BossState) {
  // Boss HP bar is drawn in HUD overlay
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════════════
// FLOATING DAMAGE NUMBERS (for big hits only: abilities, bombs, etc.)
// ═══════════════════════════════════════════════════════════════════════
export function drawFloatingDamageNumbers(
  ctx: CanvasRenderingContext2D,
  floatingDamages: FloatingDamage[],
  screenShake: { x: number; y: number },
) {
  ctx.save();
  ctx.translate(screenShake.x, screenShake.y);

  floatingDamages.forEach(fd => {
    if (!fd.active) return;
    const lifeRatio = fd.life / fd.maxLife;
    // Fade out in last 30% of life
    const alpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1.0;
    // Scale up slightly at spawn, then shrink
    const scale = lifeRatio > 0.8 ? 1.0 + (lifeRatio - 0.8) * 2.5 : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(fd.x, fd.y);
    ctx.scale(scale, scale);

    // Text shadow for readability
    ctx.font = `bold ${fd.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dark outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(`${fd.value}`, 0, 0);

    // Colored fill
    ctx.fillStyle = fd.color;
    ctx.fillText(`${fd.value}`, 0, 0);

    ctx.restore();
  });

  ctx.restore();
}
