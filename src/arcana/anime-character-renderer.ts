// ============================================================================
// SURVIVOR ELEMENTAL — Cel-Shaded Anime Guardians Canvas Renderer
// Renders the 4 authentic Anime Elemental Guardians directly onto the viewport
// ============================================================================

import type { ArcanaClassId } from './types';

export function renderCelShadedGuardian(
  ctx: CanvasRenderingContext2D,
  classId: ArcanaClassId,
  screenX: number,
  screenY: number,
  scale: number,
  facingX: number,
  animTime: number,
  animState: string,
  isAwakened = false,
  stance: 'normal' | 'kyoshi' = 'normal'
): void {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.scale(scale * (facingX < 0 ? -1 : 1), scale);

  const t = animTime;
  const isMoving = animState === 'walk';
  const isAttacking = animState === 'attack';
  const isCasting = animState === 'cast';

  // Ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 28, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isAwakened) {
    ctx.strokeStyle = classId === 'chaos' ? '#ff5400' : classId === 'chrono' ? '#80ffdb' : classId === 'rune' ? '#ffd166' : '#00f5d4';
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 48, 36, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Draw specific hero based on classId:
  // chrono = Kael (Vento / Aang & Kyoshi)
  // chess  = Nerys (Água / Maré & Gelo)
  // chaos  = Iskra (Fogo / Fúria Solar & Magma)
  // rune   = Borak (Terra / Bastião de Basalto)
  if (classId === 'chrono') {
    drawKael(ctx, t, isAttacking, isCasting, isMoving, isAwakened, stance);
  } else if (classId === 'chess') {
    drawNerys(ctx, t, isAttacking, isCasting, isMoving, isAwakened);
  } else if (classId === 'chaos') {
    drawIskra(ctx, t, isAttacking, isCasting, isMoving, isAwakened);
  } else {
    drawBorak(ctx, t, isAttacking, isCasting, isMoving, isAwakened);
  }

  ctx.restore();
}

function drawKael(
  ctx: CanvasRenderingContext2D,
  t: number,
  isAttacking: boolean,
  isCasting: boolean,
  isMoving: boolean,
  awakened: boolean,
  stance: 'normal' | 'kyoshi'
) {
  const walkBob = isMoving ? Math.sin(t * 12) * 5 : 0;
  ctx.translate(0, walkBob);

  if (stance === 'kyoshi') {
    // ================= AVATAR KYOSHI (JADE GOWN, GOLD ARMOR, FANS) =================
    // Legs & Boots
    ctx.fillStyle = '#1b4332';
    ctx.fillRect(-15, 14, 11, 38);
    ctx.fillRect(4, 14, 11, 38);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-17, 40, 14, 14);
    ctx.fillRect(2, 40, 14, 14);

    // Jade Armored Robe
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.moveTo(-22, -32);
    ctx.lineTo(22, -32);
    ctx.lineTo(26, 32);
    ctx.lineTo(-26, 32);
    ctx.closePath();
    ctx.fill();

    // Golden Shoulder Pauldrons
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.roundRect(-30, -36, 16, 14, 4);
    ctx.roundRect(14, -36, 16, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-30, -36, 16, 14);
    ctx.strokeRect(14, -36, 16, 14);

    // Bronze Battle Waist Belt
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(-18, -4, 36, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fill();

    // Dual Kyoshi War Fans
    const fanAngle1 = isAttacking ? Math.sin(t * 22) * 1.5 : -0.25;
    const fanAngle2 = isAttacking ? -Math.sin(t * 22) * 1.5 : 0.45;
    ctx.save(); ctx.translate(16, -16); ctx.rotate(fanAngle1); drawKyoshiFan(ctx); ctx.restore();
    ctx.save(); ctx.translate(-16, -16); ctx.rotate(fanAngle2); drawKyoshiFan(ctx); ctx.restore();

    // Kyoshi Head (Kabuki Makeup & Golden Crown)
    ctx.fillStyle = '#fed7aa'; ctx.fillRect(-6, -42, 12, 14);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -56, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626'; ctx.fillRect(2, -58, 8, 3);
    ctx.fillStyle = '#172554'; ctx.beginPath(); ctx.ellipse(0, -66, 18, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Golden Crown
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(-18, -72); ctx.lineTo(0, -88); ctx.lineTo(18, -72); ctx.lineTo(0, -75); ctx.closePath(); ctx.fill();

  } else {
    // ================= AVATAR AANG (SAFFRON MONK ROBE & GLIDER STAFF) =================
    // Legs & Boots (Burgundy & Amber)
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(-15, 14, 11, 38);
    ctx.fillRect(4, 14, 11, 38);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-17, 36, 14, 16);
    ctx.fillRect(2, 36, 14, 16);

    // Saffron Monk Tunic with Amber Mantle
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.roundRect(-20, -32, 40, 48, 6); ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-22, -30); ctx.lineTo(22, -12); ctx.lineTo(18, 12); ctx.lineTo(-22, -8);
    ctx.closePath(); ctx.fill();

    // Glider Staff in hand
    const staffAngle = isAttacking ? Math.sin(t * 24) * 2.8 : (isMoving ? Math.sin(t * 8) * 0.3 - 0.35 : -0.35);
    ctx.save(); ctx.translate(12, -18); ctx.rotate(staffAngle);
    ctx.fillStyle = '#78350f'; ctx.fillRect(-4, -58, 8, 116);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-6, -58, 12, 12); ctx.fillRect(-6, 46, 12, 12);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(-2, -42, 4, 84);
    ctx.restore();

    // Head with glowing Air Nomad arrow tattoo
    ctx.fillStyle = '#fed7aa'; ctx.fillRect(-6, -42, 12, 14);
    ctx.beginPath(); ctx.ellipse(0, -56, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = awakened ? '#00f5d4' : '#0284c7';
    if (awakened) { ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 12; }
    ctx.beginPath();
    ctx.moveTo(-5, -74); ctx.lineTo(5, -74); ctx.lineTo(5, -60); ctx.lineTo(9, -60);
    ctx.lineTo(0, -50); ctx.lineTo(-9, -60); ctx.lineTo(-5, -60); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(4, -58, 6, 3);
  }
}

function drawKyoshiFan(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(0, 0, 32, -0.85, 0.85); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1;
  for (let r = -0.7; r <= 0.7; r += 0.35) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(r) * 32, Math.sin(r) * 32); ctx.stroke();
  }
}

function drawNerys(
  ctx: CanvasRenderingContext2D,
  t: number,
  isAttacking: boolean,
  isCasting: boolean,
  isMoving: boolean,
  awakened: boolean
) {
  const walkBob = isMoving ? Math.sin(t * 12) * 5 : 0;
  ctx.translate(0, walkBob);

  const bWave = Math.sin(t * (isAttacking ? 8 : 3.5)) * (isAttacking ? 14 : 7);

  // Long dark braid with turquoise hair ties
  ctx.lineWidth = 8; ctx.strokeStyle = '#1e1b4b'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-22, -24); ctx.quadraticCurveTo(-38 + bWave, 18, -32 + bWave * 1.4, 55); ctx.stroke();
  ctx.fillStyle = '#00f5d4'; ctx.beginPath(); ctx.arc(-32 + bWave * 1.4, 42, 5, 0, Math.PI * 2); ctx.fill();

  // Arctic Water Tribe Boots with White Fur Cuffs
  ctx.fillStyle = '#0c4a6e';
  ctx.roundRect(-16, 14, 12, 38, 5); ctx.roundRect(4, 14, 12, 38, 5); ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-18, 38, 16, 12); ctx.fillRect(2, 38, 16, 12);

  // Deep Ocean-Blue Tunic
  ctx.fillStyle = '#0369a1';
  ctx.beginPath(); ctx.roundRect(-22, -32, 44, 48, 6); ctx.fill();

  // White Fur Trim Collar around Neck
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath(); ctx.roundRect(-24, -36, 48, 14, 6); ctx.fill();

  // Jade Water Medallion
  ctx.fillStyle = '#00f5d4'; ctx.beginPath(); ctx.arc(0, -22, 6, 0, Math.PI * 2); ctx.fill();

  // Liquid Water Whips extending from hands when attacking
  if (isAttacking || isCasting) {
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.95)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const wave = Math.sin(t * 22) * 18;
    ctx.beginPath();
    ctx.moveTo(18, -14);
    ctx.quadraticCurveTo(45, -30 + wave, 75, -15 - wave);
    ctx.stroke();
    // Water droplets
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(75, -15 - wave, 5, 0, Math.PI * 2); ctx.fill();
  }

  drawStandardHead(ctx, '#fed7aa', '#172554', '#00f5d4');
}

function drawIskra(
  ctx: CanvasRenderingContext2D,
  t: number,
  isAttacking: boolean,
  isCasting: boolean,
  isMoving: boolean,
  awakened: boolean
) {
  const walkBob = isMoving ? Math.sin(t * 12) * 5 : 0;
  ctx.translate(0, walkBob);

  const b1 = Math.sin(t * 4.2) * 8; const b2 = Math.cos(t * 4.2) * 8;

  // Twin Braids with Gold Fire Clasps
  ctx.lineWidth = 7; ctx.strokeStyle = '#18181b'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, -42); ctx.quadraticCurveTo(-38 + b1, -10, -32 + b1 * 1.3, 36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -42); ctx.quadraticCurveTo(38 + b2, -10, 32 + b2 * 1.3, 36); ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(-32 + b1 * 1.3, 22, 5, 0, Math.PI * 2); ctx.arc(32 + b2 * 1.3, 22, 5, 0, Math.PI * 2); ctx.fill();

  // Obsidian Pants & Crimson Battle Coat with Golden Trim
  ctx.fillStyle = '#09090b'; ctx.fillRect(-14, 16, 10, 36); ctx.fillRect(4, 16, 10, 36);
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(20, -30); ctx.lineTo(26, 32); ctx.lineTo(-26, 32); ctx.closePath(); ctx.fill();

  // Gold Fire Nation Trim & Shoulder Plates
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.roundRect(-26, -34, 12, 10, 3); ctx.roundRect(14, -34, 12, 10, 3); ctx.fill();

  // Martial Dragon Fire Punch Pose
  if (isAttacking || isCasting) {
    ctx.fillStyle = '#ff5400';
    ctx.beginPath(); ctx.arc(28, -14, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(28, -14, 7, 0, Math.PI * 2); ctx.fill();
  }

  drawStandardHead(ctx, '#fed7aa', '#18181b', '#ff5400');
}

function drawBorak(
  ctx: CanvasRenderingContext2D,
  t: number,
  isAttacking: boolean,
  isCasting: boolean,
  isMoving: boolean,
  awakened: boolean
) {
  const walkBob = isMoving ? Math.sin(t * 12) * 5 : 0;
  ctx.translate(0, walkBob);

  // 4 floating rotating crystal blades
  for (let i = 0; i < 4; i++) {
    const dAngle = t * 2.5 + i * (Math.PI * 0.5);
    ctx.save();
    ctx.translate(-28 + Math.cos(dAngle) * 18, -48 + Math.sin(dAngle) * 32);
    ctx.rotate(dAngle); ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(4, 0); ctx.lineTo(0, 14); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Black Tunic & Terracotta Scarf
  ctx.fillStyle = '#1c1917'; ctx.fillRect(-16, 14, 12, 38); ctx.fillRect(4, 14, 12, 38);
  ctx.fillStyle = '#b55232'; ctx.fillRect(-18, 38, 15, 16); ctx.fillRect(2, 38, 15, 16);

  ctx.fillStyle = '#292524'; ctx.beginPath(); ctx.roundRect(-22, -32, 44, 48, 6); ctx.fill();
  ctx.fillStyle = '#c16238'; ctx.beginPath(); ctx.moveTo(-24, -28); ctx.lineTo(24, 0); ctx.lineTo(20, 16); ctx.lineTo(-24, -12); ctx.closePath(); ctx.fill();

  // Stone Quartz Gauntlet Punch
  const punchArmX = isAttacking ? 34 : 12;
  ctx.fillStyle = '#c68b59'; ctx.fillRect(-24, -28, 10, 24); ctx.fillRect(punchArmX - 10, -20, 14, 24);
  ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.roundRect(punchArmX - 12, -8, 22, 18, 4); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();

  drawStandardHead(ctx, '#c68b59', '#1c1917', '#ffd166');
}

function drawStandardHead(
  ctx: CanvasRenderingContext2D,
  skinCol: string,
  hairCol: string,
  bandCol: string
) {
  ctx.fillStyle = skinCol; ctx.fillRect(-6, -42, 12, 14);
  ctx.beginPath(); ctx.ellipse(0, -56, 18, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hairCol; ctx.beginPath();
  ctx.moveTo(-18, -68); ctx.quadraticCurveTo(0, -78, 18, -68); ctx.quadraticCurveTo(22, -50, 16, -44);
  ctx.lineTo(8, -50); ctx.lineTo(0, -46); ctx.lineTo(-8, -50); ctx.lineTo(-16, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = bandCol; ctx.fillRect(-16, -65, 32, 5);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(4, -58, 6, 3);
  ctx.fillStyle = bandCol; ctx.fillRect(5, -57, 4, 3);
}
