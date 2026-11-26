import {FIELD, FONT, MONO_FONT} from './config.js';

export const SCREEN_TITLE = 0, SCREEN_PLAY = 1, SCREEN_PAUSED = 2, SCREEN_OVER = 3;

// Deterministic hash-noise so sparkles / rooftops / field tones are stable per frame.
function hash(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const W = FIELD.width, H = FIELD.height;

  // ---------- small drawing helpers ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function text(t, x, y, size, color, align = 'center', bold = 800) {
    ctx.fillStyle = color;
    ctx.font = bold + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  function textM(t, x, y, size, color, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = '700 ' + size + 'px ' + MONO_FONT;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  function panel(x, y, w, h, accent) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(10,26,46,0.90)');
    g.addColorStop(1, 'rgba(5,16,30,0.88)');
    ctx.fillStyle = g;
    rr(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent || 'rgba(125,223,255,0.55)';
    ctx.lineWidth = 2;
    rr(x, y, w, h, 14);
    ctx.stroke();
  }

  // One path made of overlapping puffs, filled in a SINGLE pass so the
  // overlaps never compound alpha (the old Venn-diagram cloud bug).
  function cloudPath(cx, cy, s) {
    ctx.beginPath();
    const puffs = [[0, 0, 30], [32, 5, 23], [-32, 6, 20], [6, -14, 21], [-14, -9, 17]];
    for (const [dx, dy, r] of puffs) ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, 7);
  }

  function cloud(cx, cy, s, fill, belly) {
    ctx.fillStyle = fill;
    cloudPath(cx, cy, s);
    ctx.fill();
    if (belly) {
      ctx.fillStyle = belly;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 15 * s, 42 * s, 10 * s, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  function starPath(cx, cy, r, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = rot + k * Math.PI / 5;
      const rad = k % 2 ? r * 0.48 : r;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function heartPath(cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.85);
    ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.1, cx - s * 0.72, cy - s * 0.95, cx, cy - s * 0.3);
    ctx.bezierCurveTo(cx + s * 0.72, cy - s * 0.95, cx + s * 1.25, cy + s * 0.1, cx, cy + s * 0.85);
    ctx.closePath();
  }

  // ---------- the plane: rear chase view (seen from behind-above) ----------
  // Forward is up-screen (-y): prop disc at the far nose, fuselage tapering
  // away, canopy back, main wing as a dihedral rear section, tailplane and
  // the vertical fin facing the camera at the near end.
  function planeRear(x, y, bank, scale) {
    ctx.save();
    ctx.translate(x + bank * 9, y);
    ctx.rotate(bank * 0.36);
    ctx.scale(scale, scale);

    // propeller: translucent blur disc at the far nose, wider than fuselage
    ctx.fillStyle = 'rgba(228,246,255,0.15)';
    ctx.beginPath(); ctx.ellipse(0, -50, 37, 9.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -50, 37, 9.5, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(25,45,75,0.45)';
    ctx.beginPath(); ctx.ellipse(0, -50, 25, 6, 0, 0, 7); ctx.stroke();

    // main wing: rear section with dihedral (tips rise), gold, red tips
    const wg = ctx.createLinearGradient(-122, 0, 122, 0);
    wg.addColorStop(0, '#f7b500'); wg.addColorStop(0.5, '#ffe97a'); wg.addColorStop(1, '#f7b500');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(-122, -2); ctx.lineTo(-14, 7); ctx.lineTo(14, 7); ctx.lineTo(122, -2);
    ctx.lineTo(122, 13); ctx.lineTo(14, 19); ctx.lineTo(-14, 19); ctx.lineTo(-122, 13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.beginPath(); ctx.moveTo(-122, -2); ctx.lineTo(-100, -0.5); ctx.lineTo(-100, 14.5); ctx.lineTo(-122, 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(122, -2); ctx.lineTo(100, -0.5); ctx.lineTo(100, 14.5); ctx.lineTo(122, 13); ctx.closePath(); ctx.fill();
    // aileron hinge lines + dark walkway strips at the root
    ctx.strokeStyle = 'rgba(120,70,0,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-96, 2); ctx.lineTo(-96, 15); ctx.moveTo(96, 2); ctx.lineTo(96, 15); ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,46,0.55)';
    ctx.fillRect(-30, 8, 12, 10); ctx.fillRect(18, 8, 12, 10);
    // navigation lights on the wingtips
    ctx.save();
    ctx.shadowBlur = 9;
    ctx.shadowColor = '#ff3b30'; ctx.fillStyle = '#ff5147';
    ctx.beginPath(); ctx.arc(-121, 5, 3.6, 0, 7); ctx.fill();
    ctx.shadowColor = '#2eff8a'; ctx.fillStyle = '#3dff8f';
    ctx.beginPath(); ctx.arc(121, 5, 3.6, 0, 7); ctx.fill();
    ctx.restore();

    // tailplane (horizontal stabiliser) at the near end
    ctx.fillStyle = '#f7b500';
    ctx.beginPath();
    ctx.moveTo(-54, 36); ctx.lineTo(0, 31); ctx.lineTo(54, 36);
    ctx.lineTo(54, 46); ctx.lineTo(0, 42); ctx.lineTo(-54, 46);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.fillRect(-54, 42, 108, 4);

    // fuselage: bulges at the cabin, tapers to the nose (far) and tail (near)
    const fg = ctx.createLinearGradient(-24, 0, 24, 0);
    fg.addColorStop(0, '#a01810'); fg.addColorStop(0.32, '#f0442e');
    fg.addColorStop(0.58, '#ff7a4d'); fg.addColorStop(1, '#b31b12');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -57);
    ctx.quadraticCurveTo(15, -44, 20, -18);
    ctx.quadraticCurveTo(24, 4, 19, 26);
    ctx.quadraticCurveTo(15, 44, 9, 52);
    ctx.lineTo(-9, 52);
    ctx.quadraticCurveTo(-15, 44, -19, 26);
    ctx.quadraticCurveTo(-24, 4, -20, -18);
    ctx.quadraticCurveTo(-15, -44, 0, -57);
    ctx.closePath(); ctx.fill();
    // spine highlight + panel line + belly stripe
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(-6, -6, 6.5, 38, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,10,5,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, 20); ctx.lineTo(18, 20); ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.fillRect(-13, 30, 26, 5);

    // canopy: glass back seen from behind-above
    const cg = ctx.createLinearGradient(0, -34, 0, 2);
    cg.addColorStop(0, '#0d2c4d'); cg.addColorStop(1, '#3f96d4');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, -15, 13.5, 19, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(215,245,255,0.85)';
    ctx.beginPath(); ctx.ellipse(-4.5, -23, 5, 9.5, -0.3, 0, 7); ctx.fill();

    // vertical fin facing the camera at the tail
    const fin = ctx.createLinearGradient(0, 26, 0, 58);
    fin.addColorStop(0, '#f0442e'); fin.addColorStop(1, '#c22418');
    ctx.fillStyle = fin;
    ctx.beginPath();
    ctx.moveTo(-4.5, 27); ctx.lineTo(4.5, 27); ctx.lineTo(9.5, 57); ctx.lineTo(-9.5, 57);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, 36, 4, 13);

    // spinner at the hub of the prop disc
    ctx.fillStyle = '#263238';
    ctx.beginPath(); ctx.ellipse(0, -50, 6.5, 4.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(0, -50, 2.4, 0, 7); ctx.fill();

    ctx.restore();
  }

  // wingtip vortex trails while banking hard
  function vortexTrails(s) {
    const b = Math.abs(s.bank);
    if (b < 0.5) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 + b * 0.12).toFixed(3) + ')';
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      const tx = s.x + side * 116, ty = s.y + 4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + side * 26 - s.bank * 30, ty + 44, tx + side * 44 - s.bank * 55, ty + 104);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- instruments ----------
  // Round dial normalised on [min,max], 270-degree sweep starting at the
  // lower-left (aviation style). The needle can never reach the digital
  // window: the sweep gap sits at the bottom where the window lives, and
  // the needle is shorter than the window's top edge in every position.
  function dial(cx, cy, val, min, max, color, digital) {
    const r = 44;
    const face = ctx.createRadialGradient(cx - 10, cy - 12, 6, cx, cy, r);
    face.addColorStop(0, '#1a2f47');
    face.addColorStop(1, '#081627');
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, 7); ctx.stroke();

    const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
    // coloured operating arcs: green / amber / red
    const zones = [[0, 0.62, '#2eff8a'], [0.62, 0.84, '#ffd23d'], [0.84, 1, '#ff5252']];
    ctx.lineWidth = 4;
    for (const [f0, f1, c] of zones) {
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, r - 10, a0 + f0 * sweep, a0 + f1 * sweep); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // ticks
    ctx.strokeStyle = '#bfeaff';
    ctx.lineWidth = 2;
    for (let k = 0; k <= 10; k++) {
      const a = a0 + (k / 10) * sweep;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 19), cy + Math.sin(a) * (r - 19));
      ctx.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
      ctx.stroke();
    }
    // needle
    const a = a0 + clamp01((val - min) / (max - min)) * sweep;
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * 6, cy - Math.sin(a) * 6);
    ctx.lineTo(cx + Math.cos(a) * (r - 21), cy + Math.sin(a) * (r - 21));
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, 7); ctx.fill();
    // digital window the needle cannot cross
    ctx.fillStyle = '#02070d';
    rr(cx - 30, cy + 24, 60, 17, 4); ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    rr(cx - 30, cy + 24, 60, 17, 4); ctx.stroke();
    ctx.globalAlpha = 1;
    textM(digital, cx, cy + 32.5, 11.5, '#ffffff');
    // glass highlight
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(cx - 13, cy - 19, 17, 9, -0.6, 0, 7); ctx.fill();
  }

  // Artificial horizon: the sky/ground split rolls with the bank and
  // shifts with pitch, behind a fixed aircraft symbol and roll pointer.
  function horizonGauge(cx, cy, s) {
    const r = 44;
    ctx.fillStyle = '#081627';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, 7); ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-s.bank * 0.5);
    ctx.translate(0, s.pitch * 20);
    const sky = ctx.createLinearGradient(0, -70, 0, 0);
    sky.addColorStop(0, '#2f7fc4'); sky.addColorStop(1, '#7cc4f2');
    ctx.fillStyle = sky;
    ctx.fillRect(-72, -72, 144, 72);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-72, 0, 144, 72);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-72, 26, 144, 46);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-72, 0); ctx.lineTo(72, 0); ctx.stroke();
    // pitch ladder
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    for (const [dy, w] of [[-14, 30], [-28, 18], [14, 30], [28, 18]]) {
      ctx.beginPath(); ctx.moveTo(-w / 2, dy); ctx.lineTo(w / 2, dy); ctx.stroke();
    }
    ctx.restore();
    // roll scale ticks + pointer
    ctx.strokeStyle = '#bfeaff';
    ctx.lineWidth = 2;
    for (const deg of [-60, -30, 0, 30, 60]) {
      const a = -Math.PI / 2 + deg * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
      ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-s.bank * 0.5);
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.moveTo(0, -r + 11); ctx.lineTo(-5, -r + 2); ctx.lineTo(5, -r + 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // fixed aircraft symbol
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 21, cy); ctx.lineTo(cx - 7, cy);
    ctx.moveTo(cx + 7, cy); ctx.lineTo(cx + 21, cy);
    ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(cx - 13, cy - 19, 17, 9, -0.6, 0, 7); ctx.fill();
  }

  // Heading compass ribbon: ticks scroll past a fixed centre marker.
  function compass(cx, cy, heading) {
    ctx.save();
    rr(cx - 152, cy - 17, 304, 34, 8);
    ctx.clip();
    ctx.fillStyle = 'rgba(3,12,24,0.55)';
    ctx.fillRect(cx - 152, cy - 17, 304, 34);
    const names = {0: 'N', 90: 'E', 180: 'S', 270: 'W'};
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Iterate absolute degrees (multiples of 5) so ticks land on the
    // ribbon whatever the heading; offsets are relative to the heading.
    const start = Math.ceil((heading - 55) / 5) * 5;
    for (let deg = start; deg <= heading + 55; deg += 5) {
      const x = cx + (deg - heading) * 3.1;
      if (x < cx - 150 || x > cx + 150) continue;
      const dm = ((deg % 360) + 360) % 360;
      const major = dm % 30 === 0;
      ctx.strokeStyle = 'rgba(191,234,255,0.8)';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, cy + 12); ctx.lineTo(x, cy + (major ? 3 : 7));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = names[dm] ? '#ffd23d' : '#bfeaff';
        ctx.font = '700 12px ' + MONO_FONT;
        ctx.fillText(names[dm] || String(dm / 10).padStart(2, '0'), x, cy - 7);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(125,223,255,0.5)';
    ctx.lineWidth = 1;
    rr(cx - 152, cy - 17, 304, 34, 8); ctx.stroke();
    // fixed marker + digital heading box
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 19); ctx.lineTo(cx - 6, cy + 11); ctx.lineTo(cx + 6, cy + 11);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#02070d';
    rr(cx - 27, cy - 30, 54, 16, 4); ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    rr(cx - 27, cy - 30, 54, 16, 4); ctx.stroke();
    textM(String(Math.round(heading)).padStart(3, '0') + '°', cx, cy - 22, 11.5, '#ffffff');
  }

  // ---------- world pieces ----------
  // Ground projection: depth d in [0,1] (0 = horizon, 1 = past the bottom
  // edge), lateral u in runway-centred units. Returns screen [x, y].
  function groundPoint(u, d, hor) {
    const y = hor + Math.pow(d, 1.35) * (H + 70 - hor);
    const x = 640 + u * (70 + d * 1010);
    return [x, y];
  }

  function ridge(baseY, amp, seed, color, alpha) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(-140, baseY + 30);
    let x = -140;
    let i = 0;
    while (x < W + 140) {
      const wdt = 90 + hash(seed + i) * 150;
      const peak = baseY - hash(seed + i * 3.7) * amp;
      ctx.lineTo(x + wdt * 0.45, peak);
      ctx.lineTo(x + wdt, baseY + 6 - hash(seed + i * 1.3) * amp * 0.3);
      x += wdt;
      i++;
    }
    ctx.lineTo(W + 140, baseY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function stormCloud(x, y, sc) {
    const g = ctx.createLinearGradient(0, y - 34 * sc, 0, y + 30 * sc);
    g.addColorStop(0, '#66788f');
    g.addColorStop(0.55, '#43536a');
    g.addColorStop(1, '#2c394d');
    ctx.fillStyle = g;
    cloudPath(x, y, sc);
    ctx.fill();
    // internal lightning glow
    ctx.fillStyle = 'rgba(160,205,255,0.30)';
    ctx.beginPath(); ctx.ellipse(x - 6 * sc, y + 4 * sc, 20 * sc, 10 * sc, 0, 0, 7); ctx.fill();
    // bolt: bright core with blue halo
    ctx.save();
    ctx.shadowColor = '#7ec3ff';
    ctx.shadowBlur = 13;
    ctx.fillStyle = '#fff6ae';
    ctx.beginPath();
    ctx.moveTo(x - 2 * sc, y + 10 * sc);
    ctx.lineTo(x + 8 * sc, y + 10 * sc);
    ctx.lineTo(x + 1 * sc, y + 24 * sc);
    ctx.lineTo(x + 7 * sc, y + 24 * sc);
    ctx.lineTo(x - 9 * sc, y + 44 * sc);
    ctx.lineTo(x - 2 * sc, y + 27 * sc);
    ctx.lineTo(x - 9 * sc, y + 27 * sc);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // rain streaks
    ctx.strokeStyle = 'rgba(190,225,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(x + i * 13 * sc, y + 30 * sc);
      ctx.lineTo(x + i * 13 * sc - 5 * sc, y + 44 * sc);
    }
    ctx.stroke();
  }

  function boat(x, y, sc, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * flip, sc);
    // wake
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 6); ctx.lineTo(-44, 16);
    ctx.moveTo(-16, 6); ctx.lineTo(-40, -2);
    ctx.stroke();
    // hull + cabin + mast
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.lineTo(20, 0); ctx.lineTo(14, 9); ctx.lineTo(-12, 9);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.fillRect(-18, -2, 38, 3);
    ctx.fillStyle = '#2471a3';
    ctx.fillRect(-4, -10, 13, 8);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(4, -24); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(4, -24); ctx.lineTo(4, -11); ctx.lineTo(15, -11);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------- main draw ----------
  function draw(s, screen, best) {
    const hor = 300 + s.pitch * 22;

    // ===== world, rolled slightly with the bank around the horizon =====
    ctx.save();
    ctx.translate(640, hor);
    ctx.rotate(-s.bank * 0.10);
    ctx.translate(-640, -hor);

    // sky
    let g = ctx.createLinearGradient(0, -120, 0, hor + 40);
    g.addColorStop(0, '#1668c4'); g.addColorStop(0.45, '#3f9be0');
    g.addColorStop(0.78, '#8fd0f2'); g.addColorStop(1, '#ffe3a1');
    ctx.fillStyle = g;
    ctx.fillRect(-140, -120, W + 280, hor + 162);
    const sun = ctx.createRadialGradient(1085, 88, 8, 1085, 88, 195);
    sun.addColorStop(0, 'rgba(255,246,190,0.95)');
    sun.addColorStop(0.25, 'rgba(255,224,120,0.55)');
    sun.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(850, -60, 440, 330);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(1085, 88, 42, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe45e';
    ctx.beginPath(); ctx.arc(1085, 88, 34, 0, 7); ctx.fill();

    // clouds: far hazy layer, then near layer with shaded bellies
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 251 + s.dist * 22) % 1560) - 140, cy = 40 + (i % 3) * 36;
      ctx.globalAlpha = 0.5;
      cloud(cx, cy, 0.62, '#eaf7ff');
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 173 + s.dist * 46) % 1540) - 130, cy = 54 + (i % 3) * 52;
      cloud(cx, cy, 0.95, '#ffffff', 'rgba(140,180,215,0.5)');
    }

    // layered mountain ridgelines with haze (no more triangle pair)
    ridge(hor + 4, 66, 11.3, '#8fb6d9', 0.75);
    ridge(hor + 6, 88, 47.9, '#6f9e7a', 0.9);
    ridge(hor + 8, 58, 83.1, '#4f8459', 1);
    // golden haze band on the horizon
    const hz = ctx.createLinearGradient(0, hor - 26, 0, hor + 16);
    hz.addColorStop(0, 'rgba(255,227,161,0)');
    hz.addColorStop(1, 'rgba(255,227,161,0.35)');
    ctx.fillStyle = hz;
    ctx.fillRect(-140, hor - 26, W + 280, 42);

    // ground base
    g = ctx.createLinearGradient(0, hor, 0, H + 70);
    g.addColorStop(0, '#79c26d'); g.addColorStop(0.35, '#4da653'); g.addColorStop(1, '#2c7a3e');
    ctx.fillStyle = g;
    ctx.fillRect(-140, hor, W + 280, H + 70 - hor);
    // drifting cloud shadows
    ctx.fillStyle = 'rgba(20,60,40,0.13)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 317 + s.dist * 90) % 1510) - 120, cy = hor + 70 + (i % 3) * 130;
      ctx.beginPath(); ctx.ellipse(cx, cy, 92, 20, 0, 0, 7); ctx.fill();
    }

    // patchwork fields, left, in ground perspective
    const fieldCols = ['#f2c230', '#e8a91c', '#cfe06a', '#9ccf5a', '#f4d35e', '#d9e021'];
    for (let row = 0; row < 5; row++) {
      const d0 = 0.06 + row * 0.185, d1 = d0 + 0.165;
      const [ax, ay] = groundPoint(-1.12, d0, hor), [bx, by] = groundPoint(-0.17, d0, hor);
      const [cx2, cy2] = groundPoint(-0.17, d1, hor), [dx2, dy2] = groundPoint(-1.12, d1, hor);
      ctx.fillStyle = fieldCols[(row + 1) % fieldCols.length];
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx2, dy2);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(120,84,20,0.30)';
      ctx.lineWidth = 1.6;
      for (let rI = 1; rI < 4; rI++) {
        const [lx, ly] = groundPoint(-1.10 + rI * 0.02, d0 + (d1 - d0) * rI / 4, hor);
        const [rx2, ry2] = groundPoint(-0.19, d0 + (d1 - d0) * rI / 4, hor);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx2, ry2); ctx.stroke();
      }
    }

    // town, lower-left: houses shrink toward the horizon, each with a shadow
    const roofs = ['#c0392b', '#e67e22', '#8e44ad', '#2471a3', '#b03a2e', '#ca6f1e'];
    for (let i = 0; i < 16; i++) {
      const u = -1.02 + (i % 4) * 0.21 + hash(i * 7) * 0.05;
      const d = 0.34 + Math.floor(i / 4) * 0.17 + hash(i * 3) * 0.05;
      const [hx, hy] = groundPoint(u, d, hor);
      const sc = 0.45 + d * 1.5;
      const w = 26 * sc, h = 16 * sc;
      ctx.fillStyle = 'rgba(30,60,30,0.25)';
      ctx.beginPath(); ctx.ellipse(hx + 3, hy + 3, w * 0.62, 4 * sc, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f5efe0';
      ctx.fillRect(hx - w / 2, hy - h, w, h);
      ctx.fillStyle = roofs[i % roofs.length];
      ctx.beginPath();
      ctx.moveTo(hx - w / 2 - 3, hy - h);
      ctx.lineTo(hx, hy - h - 8 * sc);
      ctx.lineTo(hx + w / 2 + 3, hy - h);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(hx - w * 0.22, hy - h * 0.62, 4.5 * sc, 4.5 * sc);
    }
    // road sweeping through the town toward the runway
    ctx.strokeStyle = 'rgba(90,90,90,0.6)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-20, H + 30);
    ctx.quadraticCurveTo(280, hor + 250, 500, hor + 74);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(-20, H + 30);
    ctx.quadraticCurveTo(280, hor + 250, 500, hor + 74);
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== harbor: real water to the horizon on the right =====
    const wg2 = ctx.createLinearGradient(760, hor, 1120, H + 60);
    wg2.addColorStop(0, '#4fc3e8'); wg2.addColorStop(0.5, '#1f8fc4'); wg2.addColorStop(1, '#14639c');
    ctx.fillStyle = wg2;
    ctx.beginPath();
    ctx.moveTo(752, hor + 2);
    ctx.quadraticCurveTo(930, hor + 130, 852, H + 70);
    ctx.lineTo(1420, H + 70);
    ctx.lineTo(1420, hor - 8);
    ctx.quadraticCurveTo(1120, hor + 26, 996, hor + 1);
    ctx.closePath(); ctx.fill();
    // island silhouette on the horizon
    ctx.fillStyle = 'rgba(70,110,140,0.75)';
    ctx.beginPath();
    ctx.moveTo(1150, hor + 3);
    ctx.quadraticCurveTo(1235, hor - 26, 1330, hor + 3);
    ctx.closePath(); ctx.fill();
    // shoreline foam: scalloped white edge along the water line
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const fx = 752 + (852 - 752) * t + Math.sin(t * 22) * 5;
      const fy = hor + 4 + (H + 56 - hor) * Math.pow(t, 1.6);
      if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.stroke();
    // sun glint path on the water
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const gy = hor + 22 + t * (H - hor - 6);
      const gw = 16 + t * 74 + hash(i * 9) * 22;
      const gx = 1066 + Math.sin(i * 2.4) * 9 + (hash(i * 5) - 0.5) * 16;
      ctx.fillStyle = 'rgba(255,240,170,' + (0.16 + 0.30 * (1 - t)).toFixed(3) + ')';
      ctx.fillRect(gx - gw / 2, gy, gw, 3.4);
    }
    // sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 26; i++) {
      const sx = 800 + hash(i * 3 + Math.floor(s.dist * 2)) * 420;
      const sy = hor + 26 + hash(i * 7 + Math.floor(s.dist * 2)) * 380;
      ctx.fillRect(sx, sy, 3 + hash(i) * 7, 2);
    }
    // pier reaching into the harbor
    const [px0, py0] = groundPoint(0.62, 0.52, hor);
    const [px1, py1] = groundPoint(1.05, 0.60, hor);
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px1, py1); ctx.stroke();
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t - 3);
      ctx.lineTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t + 7);
      ctx.stroke();
    }
    // boats with wakes
    const [b1x, b1y] = groundPoint(0.95, 0.42, hor);
    boat(b1x, b1y, 0.9, 1);
    const [b2x, b2y] = groundPoint(0.72, 0.20, hor);
    boat(b2x, b2y, 0.5, -1);
    // lighthouse on the shore point
    const [lx2, ly2] = groundPoint(0.47, 0.30, hor);
    const lh = 54;
    ctx.fillStyle = 'rgba(255,235,160,0.30)';
    ctx.beginPath(); ctx.arc(lx2, ly2 - lh, 21, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4f6f8';
    ctx.beginPath();
    ctx.moveTo(lx2 - 7, ly2); ctx.lineTo(lx2 - 4.6, ly2 - lh + 12);
    ctx.lineTo(lx2 + 4.6, ly2 - lh + 12); ctx.lineTo(lx2 + 7, ly2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.fillRect(lx2 - 5.8, ly2 - lh + 22, 11.6, 8);
    ctx.fillRect(lx2 - 4.6, ly2 - lh + 12, 9.2, 6);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(lx2 - 5, ly2 - lh + 4, 10, 8);
    ctx.fillStyle = '#ffe45e';
    ctx.fillRect(lx2 - 3, ly2 - lh + 6, 6, 4);

    // ===== runway: through the bottom edge, perspective markings =====
    ctx.fillStyle = '#333d47';
    ctx.beginPath();
    ctx.moveTo(582, hor + 14); ctx.lineTo(698, hor + 14);
    ctx.lineTo(858, H + 62); ctx.lineTo(422, H + 62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#454f59';
    ctx.beginPath();
    ctx.moveTo(600, hor + 14); ctx.lineTo(680, hor + 14);
    ctx.lineTo(792, H + 62); ctx.lineTo(488, H + 62);
    ctx.closePath(); ctx.fill();
    // threshold piano keys
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) ctx.fillRect(592 + i * 17.5, hor + 19, 9, 15);
    // "09" designator, stretched by perspective
    ctx.save();
    ctx.translate(640, hor + 62);
    ctx.scale(1, 1.9);
    ctx.globalAlpha = 0.92;
    text('09', 0, 0, 17, '#ffffff');
    ctx.restore();
    ctx.globalAlpha = 1;
    // centreline dashes scrolling with distance flown
    const phase = (s.dist * 1.4) % 1;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 7; i++) {
      const d = ((i + phase) / 7) * 0.92 + 0.05;
      const [dx3, dy3] = groundPoint(0, d, hor);
      const wdt = 3 + d * 13;
      ctx.fillRect(dx3 - wdt / 2, dy3, wdt, 5 + d * 30);
    }
    // edge lights with glow
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,61,0.9)';
    ctx.shadowBlur = 7;
    ctx.fillStyle = '#ffd23d';
    for (let i = 0; i < 8; i++) {
      const d = 0.05 + (i / 7) * 0.95;
      const [ex, ey] = groundPoint(-0.115, d, hor);
      const [fx2, fy2] = groundPoint(0.115, d, hor);
      ctx.beginPath(); ctx.arc(ex, ey, 2 + d * 3.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(fx2, fy2, 2 + d * 3.4, 0, 7); ctx.fill();
    }
    ctx.restore();

    // ===== items, far to near =====
    const items = [...s.items].sort((a, b) => b.z - a.z);
    let nearRing = null;
    for (const it of items) {
      const t = Math.max(0.08, 1 - it.z / 1400);
      const x = 640 + it.lane * 520 * t + (640 - s.x) * (t * 0.25);
      const y = (hor + 60) + (it.h * 90 + 70) * t + (330 - s.y) * t * 0.2;
      const r = 18 + t * 88;
      if (it.kind === 'ring') {
        const lw = 7 + t * 15;
        ctx.save();
        ctx.shadowColor = 'rgba(255,170,0,0.9)';
        ctx.shadowBlur = 22 * t + 5;
        const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        rg.addColorStop(0, '#ffe97a'); rg.addColorStop(0.5, '#ffb300'); rg.addColorStop(1, '#ff8f00');
        ctx.strokeStyle = rg;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(200,245,255,0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(x, y, r - lw * 0.52, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,250,205,0.95)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(x, y, r, -2.5, -0.8); ctx.stroke();
        ctx.restore();
        if (it.z < 200) nearRing = {x, y, r, lw};
      } else if (it.kind === 'star') {
        const rs = r * 0.5;
        ctx.save();
        ctx.shadowColor = 'rgba(255,220,40,0.95)';
        ctx.shadowBlur = 18;
        // faceted star: alternating light / shade points
        ctx.fillStyle = '#ffe93d';
        starPath(x, y, rs);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f7b500';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rs * 0.48, y + rs * 0.36);
        ctx.lineTo(x, y + rs);
        ctx.lineTo(x - rs * 0.48, y + rs * 0.36);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 2;
        for (const a of [0.5, 2.7]) {
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * (rs + 5), y + Math.sin(a) * (rs + 5));
          ctx.lineTo(x + Math.cos(a) * (rs + 14), y + Math.sin(a) * (rs + 14));
          ctx.stroke();
        }
        ctx.restore();
      } else {
        stormCloud(x, y, (r / 46) * 1.15);
      }
    }

    // ground shadow of the plane, offset by altitude, never rotating
    const altF = clamp01((s.alt - 420) / 2380);
    const shY = s.y + 96 + (1 - altF) * 10 + altF * 26;
    ctx.fillStyle = 'rgba(10,40,25,' + (0.24 - altF * 0.11).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(s.x + 30 + s.bank * 22, shY, 100 - altF * 22, 13 - altF * 3, 0, 0, 7);
    ctx.fill();

    vortexTrails(s);
    planeRear(s.x, s.y, s.bank, 1.04);

    // near ring: redraw its front arc over the plane so the plane reads
    // as threading the ring
    if (nearRing) {
      const {x, y, r, lw} = nearRing;
      const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      rg.addColorStop(0, '#ffe97a'); rg.addColorStop(0.5, '#ffb300'); rg.addColorStop(1, '#ff8f00');
      ctx.strokeStyle = rg;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,245,255,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(x, y, r - lw * 0.52, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    }

    if (s.flash > 0) {
      ctx.fillStyle = 'rgba(255,220,60,' + (s.flash * 0.35) + ')';
      ctx.fillRect(-140, -120, W + 280, H + 190);
    }
    ctx.restore(); // end world roll

    // cinematic vignette + warm grade
    const vg = ctx.createRadialGradient(640, 360, 330, 640, 360, 760);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,20,50,0.26)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,170,60,0.05)';
    ctx.fillRect(0, 0, W, H);

    // ===== HUD =====
    const onTitle = screen === SCREEN_TITLE;
    panel(18, 16, 1244, 62, 'rgba(255,210,61,0.65)');
    if (onTitle) {
      // minimal telemetry only: ALT / compass / SPD
      text('ALT ' + Math.round(s.alt) + ' ft', 40, 47, 21, '#7dffcb', 'left');
      text('SPD ' + Math.round(s.speed) + ' kt', 1112, 47, 21, '#7dffcb', 'left');
    } else {
      text('SCORE ' + s.score, 40, 47, 24, '#ffd23d', 'left');
      text('RINGS ' + s.rings + '/12', 268, 47, 20, '#ffffff', 'left');
      text('ALT ' + Math.round(s.alt) + ' ft', 812, 47, 20, '#7dffcb', 'left');
      text('SPD ' + Math.round(s.speed) + ' kt', 972, 47, 20, '#7dffcb', 'left');
      text('TIME ' + Math.ceil(s.left) + 's', 1132, 47, 20, s.left < 15 ? '#ff8a80' : '#ffffff', 'left');
    }
    compass(640, 47, s.heading);

    // bottom-left status panel (hidden on the title screen)
    if (!onTitle) {
      panel(18, 592, 420, 120);
      text('FUEL', 42, 624, 15, '#9fd8ff', 'left');
      ctx.fillStyle = '#1b2a38';
      rr(102, 613, 304, 22, 10); ctx.fill();
      ctx.fillStyle = s.fuel < 25 ? '#ff5252' : '#2eff8a';
      if (s.fuel > 0) { rr(102, 613, 304 * Math.max(0, s.fuel) / 100, 22, 10); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      rr(102, 613, 304, 22, 10); ctx.stroke();
      text('LIVES', 42, 678, 15, '#9fd8ff', 'left');
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? '#ff5a52' : 'rgba(255,90,82,0.25)';
        heartPath(122 + i * 30, 678, 10);
        ctx.fill();
        if (i < s.lives) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.ellipse(118 + i * 30, 674, 3, 2, -0.5, 0, 7); ctx.fill();
        }
      }
      text('DIST ' + s.dist.toFixed(1) + ' nm', 268, 678, 16, '#ffffff', 'left');
    }

    // gauge cluster: one aligned metallic panel, backlit gauges
    panel(824, 592, 438, 120, 'rgba(255,210,61,0.5)');
    horizonGauge(886, 650, s);
    dial(1024, 650, s.speed, 100, 280, '#ffd23d', Math.round(s.speed) + ' kt');
    dial(1162, 650, s.alt, 0, 3000, '#7dffcb', String(Math.round(s.alt)));
    text('ATT', 886, 705, 10, '#9fd8ff');
    text('SPD', 1024, 705, 10, '#9fd8ff');
    text('ALT', 1162, 705, 10, '#9fd8ff');

    // ===== screens =====
    if (screen === SCREEN_TITLE) {
      // emblem-style title floating on the sky, no generic box
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      const tg = ctx.createLinearGradient(0, 96, 0, 158);
      tg.addColorStop(0, '#fff3b0'); tg.addColorStop(0.55, '#ffd23d'); tg.addColorStop(1, '#f7a500');
      text('SKY HARBOR', 640, 128, 62, tg);
      ctx.restore();
      // wing motifs flanking the title
      ctx.fillStyle = '#ffd23d';
      for (const m of [-1, 1]) {
        ctx.save();
        ctx.translate(640 + m * 336, 128);
        ctx.scale(m, 1);
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(86, -4); ctx.lineTo(88, 3); ctx.lineTo(6, 2);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 6); ctx.lineTo(70, 12); ctx.lineTo(71, 18); ctx.lineTo(8, 15);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // gold RINGS band
      const bg = ctx.createLinearGradient(0, 160, 0, 200);
      bg.addColorStop(0, '#ffe97a'); bg.addColorStop(1, '#f7a500');
      ctx.fillStyle = bg;
      rr(452, 160, 376, 40, 8); ctx.fill();
      text('R I N G S', 640, 181, 25, '#5b3a00');
      text('Thread the 12 golden rings over the harbor!', 640, 224, 20, '#eaf7ff');
      // controls pill in the open sky, clear of ring and runway
      ctx.fillStyle = 'rgba(5,28,56,0.62)';
      rr(372, 240, 536, 27, 13); ctx.fill();
      text('Arrows / WASD steer · Shift boost · Ctrl brake · P pause', 640, 254, 14.5, '#d8f4ff');
      // start button low, in the gap between the bottom panels
      ctx.fillStyle = '#e8322a';
      rr(482, 622, 316, 52, 14); ctx.fill();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      rr(482, 622, 316, 52, 14); ctx.stroke();
      text('PRESS SPACE TO FLY', 640, 648, 20, '#ffffff');
    }

    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      text('PAUSED', 640, 340, 52, '#fff');
    }

    if (screen === SCREEN_OVER) {
      // logbook-style result card
      panel(330, 92, 620, 238, '#ffd23d');
      // small vector plane icon (rear view glyph)
      ctx.save();
      ctx.translate(408, 128);
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.lineTo(26, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, 12); ctx.lineTo(13, 12); ctx.stroke();
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath(); ctx.ellipse(0, 2, 6, 14, 0, 0, 7); ctx.fill();
      ctx.restore();
      text('FLIGHT COMPLETE', 668, 128, 38, '#ffd23d');
      ctx.strokeStyle = 'rgba(255,210,61,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(366, 156); ctx.lineTo(914, 156); ctx.stroke();
      text('SCORE  ' + s.score, 640, 192, 38, '#ffffff');
      // rings group
      ctx.save();
      ctx.strokeStyle = '#ffb300';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(408, 240, 11, 0, 7); ctx.stroke();
      ctx.restore();
      text('Rings ' + s.rings + '/12', 428, 241, 20, '#d8f4ff', 'left');
      // stars group
      ctx.fillStyle = '#ffe93d';
      starPath(612, 240, 12);
      ctx.fill();
      text('Stars ' + s.stars, 632, 241, 20, '#d8f4ff', 'left');
      text('Best ' + Math.max(best, s.score), 800, 241, 20, '#d8f4ff', 'left');
      text(s.rings >= 8 ? 'Harbor Master — superb flying!' : s.rings >= 4 ? 'Great flight, pilot!' : 'Keep practicing, pilot!', 640, 288, 21, '#7dffcb');
      ctx.fillStyle = '#e8322a';
      rr(490, 352, 300, 52, 14); ctx.fill();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      rr(490, 352, 300, 52, 14); ctx.stroke();
      text('FLY AGAIN — SPACE', 640, 378, 18, '#fff');
    }
  }

  return {draw};
}
