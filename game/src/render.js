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

  // Cloud with real shading: one base fill, then (clipped to the same
  // single-pass path) a warm highlight toward the sun (upper right) and
  // a blue-grey shade settling along the bottom.
  function cloud(cx, cy, s, fill) {
    ctx.fillStyle = fill;
    cloudPath(cx, cy, s);
    ctx.fill();
    ctx.save();
    cloudPath(cx, cy, s);
    ctx.clip();
    const hg = ctx.createRadialGradient(cx + 20 * s, cy - 13 * s, 3, cx + 20 * s, cy - 13 * s, 52 * s);
    hg.addColorStop(0, 'rgba(255,250,228,0.65)');
    hg.addColorStop(1, 'rgba(255,250,228,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(cx - 70 * s, cy - 40 * s, 140 * s, 80 * s);
    const sg = ctx.createLinearGradient(0, cy - 4 * s, 0, cy + 26 * s);
    sg.addColorStop(0, 'rgba(110,150,195,0)');
    sg.addColorStop(1, 'rgba(110,150,195,0.5)');
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 70 * s, cy - 40 * s, 140 * s, 80 * s);
    ctx.restore();
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

  // ---------- the plane: rear chase view ----------
  // The camera sits close behind and slightly above, so the airframe
  // is heavily foreshortened: the fuselage is a short taper receding
  // to a small prop disc at the far end, the wide main wing dominates
  // the middle, and the tailplane and fin — nearest the camera —
  // anchor the bottom of the sprite. Forward is up-screen (-y) but
  // the nose sits level, at cruise attitude: the plane flies away
  // from the camera, it does not stand on its tail.
  function planeRear(x, y, bank, scale, pitch = 0) {
    ctx.save();
    ctx.translate(x + bank * 9, y);
    ctx.rotate(bank * 0.36);
    ctx.scale(scale, scale);
    // pitch foreshortening: nose-up squashes the (already short)
    // airframe a touch more and lifts the prop disc, nose-down
    // stretches it and drops the disc
    ctx.scale(1, 1 - pitch * 0.13);
    const noseY = -31 - pitch * 5;

    // propeller: small translucent blur disc at the far nose — the
    // far end of a foreshortened airframe, so barely wider than the
    // fuselage and squashed nearly flat
    ctx.fillStyle = 'rgba(228,246,255,0.15)';
    ctx.beginPath(); ctx.ellipse(0, noseY, 25, 6.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, noseY, 25, 6.5, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(25,45,75,0.45)';
    ctx.beginPath(); ctx.ellipse(0, noseY, 17, 4.2, 0, 0, 7); ctx.stroke();

    // main wing: the dominant shape — a wide rear section with
    // dihedral (tips rise), gold with red tips, sitting low on the
    // fuselage toward the camera end
    const wg = ctx.createLinearGradient(-122, 0, 122, 0);
    wg.addColorStop(0, '#f7b500'); wg.addColorStop(0.5, '#ffe97a'); wg.addColorStop(1, '#f7b500');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(-122, -4); ctx.lineTo(-14, 6); ctx.lineTo(14, 6); ctx.lineTo(122, -4);
    ctx.lineTo(122, 10); ctx.lineTo(14, 17); ctx.lineTo(-14, 17); ctx.lineTo(-122, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.beginPath(); ctx.moveTo(-122, -4); ctx.lineTo(-100, -2.2); ctx.lineTo(-100, 11.3); ctx.lineTo(-122, 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(122, -4); ctx.lineTo(100, -2.2); ctx.lineTo(100, 11.3); ctx.lineTo(122, 10); ctx.closePath(); ctx.fill();
    // aileron hinge lines + dark walkway strips at the root
    ctx.strokeStyle = 'rgba(120,70,0,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-96, 0); ctx.lineTo(-96, 11.5); ctx.moveTo(96, 0); ctx.lineTo(96, 11.5); ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,46,0.55)';
    ctx.fillRect(-30, 7.5, 12, 8.5); ctx.fillRect(18, 7.5, 12, 8.5);
    // navigation lights on the wingtips
    ctx.save();
    ctx.shadowBlur = 9;
    ctx.shadowColor = '#ff3b30'; ctx.fillStyle = '#ff5147';
    ctx.beginPath(); ctx.arc(-121, 3, 3.6, 0, 7); ctx.fill();
    ctx.shadowColor = '#2eff8a'; ctx.fillStyle = '#3dff8f';
    ctx.beginPath(); ctx.arc(121, 3, 3.6, 0, 7); ctx.fill();
    ctx.restore();

    // tailplane (horizontal stabiliser) at the near end
    ctx.fillStyle = '#f7b500';
    ctx.beginPath();
    ctx.moveTo(-57, 26); ctx.lineTo(0, 21); ctx.lineTo(57, 26);
    ctx.lineTo(57, 36); ctx.lineTo(0, 32); ctx.lineTo(-57, 36);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.fillRect(-57, 32.5, 114, 3.8);

    // fuselage: short and strongly tapered — it bulges briefly at
    // the cabin, then narrows fast toward the far nose and the near
    // tail cone, so only a hint of its top shows from behind
    const fg = ctx.createLinearGradient(-24, 0, 24, 0);
    fg.addColorStop(0, '#a01810'); fg.addColorStop(0.32, '#f0442e');
    fg.addColorStop(0.58, '#ff7a4d'); fg.addColorStop(1, '#b31b12');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.quadraticCurveTo(13, -27, 17, -10);
    ctx.quadraticCurveTo(20, 3, 16, 15);
    ctx.quadraticCurveTo(12.5, 25, 8, 30);
    ctx.lineTo(-8, 30);
    ctx.quadraticCurveTo(-12.5, 25, -16, 15);
    ctx.quadraticCurveTo(-20, 3, -17, -10);
    ctx.quadraticCurveTo(-13, -27, 0, -36);
    ctx.closePath(); ctx.fill();
    // spine highlight + panel line + belly stripe
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(-5, -5, 5.5, 20, 0, 0, 7); ctx.fill();
    // sunlight from the upper right: warm sheen on the sun side of the
    // fuselage, cool rim shadow on the far side
    ctx.fillStyle = 'rgba(255,216,140,0.22)';
    ctx.beginPath(); ctx.ellipse(10, -3, 6.5, 18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(30,20,70,0.20)';
    ctx.beginPath(); ctx.ellipse(-13.5, 0, 4.5, 15, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,10,5,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-15.5, 13); ctx.lineTo(15.5, 13); ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.fillRect(-11, 20, 22, 4.5);

    // canopy: just a small glass bump ahead of the wing — the top of
    // the cabin glimpsed from behind, not a full top-down oval
    const cg = ctx.createLinearGradient(0, -19, 0, 1);
    cg.addColorStop(0, '#0d2c4d'); cg.addColorStop(1, '#3f96d4');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, -9, 10.5, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(215,245,255,0.85)';
    ctx.beginPath(); ctx.ellipse(-3.5, -12.5, 3.6, 5, -0.3, 0, 7); ctx.fill();

    // vertical fin facing the camera at the tail: two faces split on the
    // centre line, the sun side brighter, so it reads as a solid fin
    // standing up off the fuselage rather than a flat sticker
    ctx.fillStyle = '#c22418';
    ctx.beginPath();
    ctx.moveTo(0, 13); ctx.lineTo(-4.5, 15); ctx.lineTo(-10, 39); ctx.lineTo(0, 39);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4532f';
    ctx.beginPath();
    ctx.moveTo(0, 13); ctx.lineTo(4.5, 15); ctx.lineTo(10, 39); ctx.lineTo(0, 39);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, 23, 4, 11);

    // spinner at the hub of the prop disc
    ctx.fillStyle = '#263238';
    ctx.beginPath(); ctx.ellipse(0, noseY, 5.5, 3.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(0, noseY, 2, 0, 7); ctx.fill();

    ctx.restore();
  }

  // Screen position of a wingtip, replicating planeRear's transform
  // (translate, bank rotation, scale, pitch squash) so trails and
  // ribbons start exactly on the tips, banked or not.
  function wingTip(s, side) {
    const a = s.bank * 0.36, cos = Math.cos(a), sin = Math.sin(a);
    const lx = side * 122, ly = 3;
    return [
      s.x + s.bank * 9 + (lx * cos - ly * sin) * 1.04,
      s.y + (lx * sin + ly * cos) * 1.04 * (1 - s.pitch * 0.13),
    ];
  }

  // Wingtip vortex trails while banking hard, plus a faint prop-wash
  // ribbon streaming off both tips at speed.
  function vortexTrails(s) {
    const b = Math.abs(s.bank);
    const wash = clamp01((s.speed - 195) / 55);
    if (b < 0.5 && wash <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const [tx, ty] = wingTip(s, side);
      if (wash > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 * wash).toFixed(3) + ')';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(
          tx - side * 8 - s.bank * 20 + Math.sin(s.dist * 6 + side) * 7, ty + 52,
          tx - side * 16 - s.bank * 38, ty + 118);
        ctx.stroke();
      }
      if (b >= 0.5) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.10 + b * 0.12).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + side * 26 - s.bank * 30, ty + 44, tx + side * 44 - s.bank * 55, ty + 104);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- instruments ----------
  // Display units are metric; the simulation itself still runs in
  // feet, knots and nautical miles, so every readout converts on the
  // way out (needle positions are computed from the raw values and
  // are unaffected).
  const altM = ft => Math.round(ft * 0.3048);
  const spdKmh = kt => Math.round(kt * 1.852);
  const distKm = nm => (nm * 1.852).toFixed(1);

  // Round dial normalised on [min,max], 270-degree sweep starting at the
  // lower-left (aviation style). The needle can never reach the digital
  // window: the sweep gap sits at the bottom where the window lives, and
  // the needle is shorter than the window's top edge in every position.
  // fmt, when given, converts a raw scale value to its printed scale
  // number (min / mid / max) in the display units.
  function dial(cx, cy, val, min, max, color, digital, fmt) {
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
    // scale numbers at min / mid / max, in the display units, sitting
    // inside the tick ring at the same angles the needle reads
    if (fmt) {
      for (const f of [0, 0.5, 1]) {
        const a = a0 + f * sweep;
        textM(String(fmt(min + f * (max - min))), cx + Math.cos(a) * (r - 29), cy + Math.sin(a) * (r - 29), 8.5, '#bfeaff');
      }
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
  // camPar shifts the vanishing point with the plane's lateral position
  // (full at the horizon, zero in the foreground) and gAltF narrows the
  // spread as altitude grows; both are set at the top of draw().
  let camPar = 0, gAltF = 0;
  function groundPoint(u, d, hor) {
    const y = hor + Math.pow(d, 1.35) * (H + 70 - hor);
    const vx = 640 + camPar * (1 - d);
    const x = vx + u * (70 + d * 1010) * (1 - gAltF * 0.10);
    return [x, y];
  }

  // Ridgeline with two-tone faces: the whole silhouette is filled with
  // the shadow tone, then each peak's sun-facing slope (the sun is on
  // the right, so slopes descending to the right catch the light) is
  // overpainted with the lit tone down to the base line.
  function ridge(baseY, amp, seed, shadowCol, litCol, alpha, xoff = 0) {
    const pts = [];
    let x = -140 + xoff;
    let i = 0;
    while (x < W + 140) {
      const wdt = 90 + hash(seed + i) * 150;
      pts.push([x + wdt * 0.45, baseY - hash(seed + i * 3.7) * amp]);
      pts.push([x + wdt, baseY + 6 - hash(seed + i * 1.3) * amp * 0.3]);
      x += wdt;
      i++;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = shadowCol;
    ctx.beginPath();
    ctx.moveTo(-140 + xoff, baseY + 30);
    for (const [px, py] of pts) ctx.lineTo(px, py);
    ctx.lineTo(W + 140, baseY + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = litCol;
    for (let k = 0; k + 1 < pts.length; k += 2) {
      const [px, py] = pts[k], [vx, vy] = pts[k + 1];
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(vx, vy);
      ctx.lineTo(vx, baseY + 30);
      ctx.lineTo(px, baseY + 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Point on the harbour shoreline: the same quadratic bezier the water
  // path is built from, so foam, shallows and the pier all sit exactly
  // on the coast instead of drifting across the land. The curve is kept
  // nearly straight — a gentle bow, little top-to-bottom drift — so the
  // coast reads as running away from the viewer toward the horizon,
  // not as a diagonal sliding across the frame.
  function shorePoint(t, hor, shX) {
    const mt = 1 - t;
    return [
      mt * mt * 752 + 2 * mt * t * 864 + t * t * 834 + shX,
      mt * mt * (hor + 2) + 2 * mt * t * (hor + 130) + t * t * (H + 70),
    ];
  }

  // Simple oblique-projection box: front wall, shaded side wall, and a
  // pitched roof of two slabs meeting on a ridge (back slab sunlit).
  function isoBox(x, y, w, h, dep, wall, roof) {
    const dx = dep * 0.55, dy = dep * 0.34, rh = h * 0.32;
    // front wall
    ctx.fillStyle = wall;
    ctx.fillRect(x - w / 2, y - h, w, h);
    // side wall, shaded
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 + dx, y - h - dy);
    ctx.lineTo(x + w / 2 + dx, y - dy); ctx.lineTo(x + w / 2, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,20,50,0.25)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 + dx, y - h - dy);
    ctx.lineTo(x + w / 2 + dx, y - dy); ctx.lineTo(x + w / 2, y);
    ctx.closePath(); ctx.fill();
    // roof: front slab, then the sunlit back slab up to the rear edge
    const rx = dx * 0.5, ry = y - h - dy * 0.5 - rh;
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y - h);
    ctx.lineTo(x + w / 2 + rx, ry); ctx.lineTo(x - w / 2 + rx, ry);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + rx, ry); ctx.lineTo(x + w / 2 + rx, ry);
    ctx.lineTo(x + w / 2 + dx, y - h - dy); ctx.lineTo(x - w / 2 + dx, y - h - dy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.28)';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + rx, ry); ctx.lineTo(x + w / 2 + rx, ry);
    ctx.lineTo(x + w / 2 + dx, y - h - dy); ctx.lineTo(x - w / 2 + dx, y - h - dy);
    ctx.closePath(); ctx.fill();
  }

  // Storm cell: its own tall, irregular cumulonimbus silhouette (not
  // the fair-weather cloud path), a dark anvil base, a branched bolt
  // and a translucent rain curtain under the cell.
  function stormCloud(x, y, sc) {
    // rain curtain first, so the cell sits on top of it
    const cur = ctx.createLinearGradient(0, y + 16 * sc, 0, y + 62 * sc);
    cur.addColorStop(0, 'rgba(150,190,230,0.34)');
    cur.addColorStop(1, 'rgba(150,190,230,0)');
    ctx.fillStyle = cur;
    ctx.beginPath();
    ctx.moveTo(x - 34 * sc, y + 16 * sc);
    ctx.lineTo(x + 34 * sc, y + 16 * sc);
    ctx.lineTo(x + 44 * sc, y + 62 * sc);
    ctx.lineTo(x - 44 * sc, y + 62 * sc);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(200,230,255,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(x + i * 10 * sc, y + 20 * sc);
      ctx.lineTo(x + i * 10 * sc - 6 * sc, y + 52 * sc);
    }
    ctx.stroke();
    // silhouette: stacked uneven towers, single pass
    const g = ctx.createLinearGradient(0, y - 52 * sc, 0, y + 26 * sc);
    g.addColorStop(0, '#7d90a8');
    g.addColorStop(0.5, '#4a5a70');
    g.addColorStop(1, '#232f42');
    ctx.fillStyle = g;
    ctx.beginPath();
    const towers = [[-30, 8, 21], [-12, -16, 24], [8, -30, 22], [26, -12, 20], [36, 8, 17], [0, 6, 30], [-38, 16, 15], [40, 16, 14]];
    for (const [dx, dy, r] of towers) ctx.arc(x + dx * sc, y + dy * sc, r * sc, 0, 7);
    ctx.fill();
    // dark base shadow under the cell
    ctx.fillStyle = 'rgba(10,16,28,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 17 * sc, 44 * sc, 9 * sc, 0, 0, 7); ctx.fill();
    // internal lightning glow
    ctx.fillStyle = 'rgba(160,205,255,0.30)';
    ctx.beginPath(); ctx.ellipse(x - 6 * sc, y + 2 * sc, 20 * sc, 10 * sc, 0, 0, 7); ctx.fill();
    // bolt: bright core with blue halo, plus a thinner branch
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
    ctx.strokeStyle = '#fff6ae';
    ctx.lineWidth = 2.2 * sc;
    ctx.beginPath();
    ctx.moveTo(x + 1 * sc, y + 24 * sc);
    ctx.lineTo(x + 13 * sc, y + 33 * sc);
    ctx.lineTo(x + 11 * sc, y + 42 * sc);
    ctx.stroke();
    ctx.restore();
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
    // altitude lifts the horizon and narrows the ground spread; the
    // vanishing point parallaxes against the plane's lateral position
    const altF = clamp01((s.alt - 420) / 2380);
    const hor = 300 + s.pitch * 22 - altF * 30;
    camPar = (640 - s.x) * 0.55;
    gAltF = altF;
    const shX = camPar * 0.85;

    // ===== world, rolled slightly with the bank around the horizon =====
    ctx.save();
    ctx.translate(640, hor);
    ctx.rotate(-s.bank * 0.10);
    ctx.translate(-640, -hor);

    // sky: late-afternoon grade — deep cobalt zenith, clear cyan mid,
    // warm apricot settling on the horizon
    let g = ctx.createLinearGradient(0, -120, 0, hor + 40);
    g.addColorStop(0, '#0d4f9e'); g.addColorStop(0.45, '#2f8fd6');
    g.addColorStop(0.78, '#7cc4ea'); g.addColorStop(1, '#ffcf99');
    ctx.fillStyle = g;
    ctx.fillRect(-140, -120, W + 280, hor + 162);
    // sun: low and large, fully clear of the HUD pills up top
    const sun = ctx.createRadialGradient(1052, 168, 8, 1052, 168, 245);
    sun.addColorStop(0, 'rgba(255,246,190,0.95)');
    sun.addColorStop(0.25, 'rgba(255,224,120,0.55)');
    sun.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(800, -30, 500, 450);
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(1052, 168, 54, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe45e';
    ctx.beginPath(); ctx.arc(1052, 168, 44, 0, 7); ctx.fill();

    // clouds: far hazy layer, then the near layer; cloudShift lets the
    // screenshot scenes park the clouds away from the title lettering
    const csh = s.cloudShift || 0;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 251 + s.dist * 22 + csh * 0.6) % 1560) - 140, cy = 40 + (i % 3) * 36;
      ctx.globalAlpha = 0.5;
      cloud(cx, cy, 0.62, '#eaf7ff');
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 173 + s.dist * 46 + csh) % 1540) - 130, cy = 54 + (i % 3) * 52;
      cloud(cx, cy, 0.95, '#ffffff');
    }

    // layered mountain ridgelines: two-tone faces, hazier with distance,
    // drifting slightly against the camera for parallax
    ridge(hor + 4, 66, 11.3, '#7ea8cc', '#a8c8e4', 0.75, camPar * 0.18);
    ridge(hor + 6, 88, 47.9, '#5d8a68', '#84b184', 0.9, camPar * 0.30);
    ridge(hor + 8, 58, 83.1, '#3f7350', '#5f9c66', 1, camPar * 0.42);
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

    // patchwork fields, left, in ground perspective; the rows scroll
    // toward the viewer with distance flown and cycle their colours
    const fieldCols = ['#f2c230', '#e8a91c', '#cfe06a', '#9ccf5a', '#f4d35e', '#d9e021'];
    const fscroll = (s.dist * 0.045) % 0.185;
    const fcycle = Math.floor(s.dist * 0.045 / 0.185);
    for (let row = 0; row < 5; row++) {
      const d0 = 0.06 + row * 0.185 + fscroll, d1 = d0 + 0.165;
      const [ax, ay] = groundPoint(-1.12, d0, hor), [bx, by] = groundPoint(-0.17, d0, hor);
      const [cx2, cy2] = groundPoint(-0.17, d1, hor), [dx2, dy2] = groundPoint(-1.12, d1, hor);
      ctx.fillStyle = fieldCols[(row + 1 + fcycle) % fieldCols.length];
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

    // town, lower-left: isometric houses that shrink toward the horizon
    // and drift slowly past with distance flown, each with a shadow and
    // a lit window; tree clumps fill the gaps between rows
    const roofs = ['#c0392b', '#e67e22', '#8e44ad', '#2471a3', '#b03a2e', '#ca6f1e'];
    for (let i = 0; i < 16; i++) {
      const u = -1.02 + (i % 4) * 0.21 + hash(i * 7) * 0.05;
      const d = 0.30 + ((Math.floor(i / 4) * 0.17 + hash(i * 3) * 0.05 + s.dist * 0.008) % 0.66);
      const [hx, hy] = groundPoint(u, d, hor);
      const sc = 0.45 + d * 1.5;
      const w = 26 * sc, h = 16 * sc;
      ctx.fillStyle = 'rgba(30,60,30,0.25)';
      ctx.beginPath(); ctx.ellipse(hx + 3, hy + 3, w * 0.62, 4 * sc, 0, 0, 7); ctx.fill();
      isoBox(hx, hy, w, h, 12 * sc, '#f5efe0', roofs[i % roofs.length]);
      ctx.fillStyle = '#ffd76a';
      ctx.fillRect(hx - w * 0.22, hy - h * 0.62, 4.5 * sc, 4.5 * sc);
      if (i % 3 === 0) {
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.ellipse(hx + w * 0.85, hy - 3 * sc, 8 * sc, 6 * sc, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#43a047';
        ctx.beginPath(); ctx.ellipse(hx + w * 0.72, hy - 6 * sc, 5.5 * sc, 4.5 * sc, 0, 0, 7); ctx.fill();
      }
    }
    // harbour warehouses and a dock crane on the shore side of the runway
    const [w1x, w1y] = groundPoint(0.24, 0.66, hor);
    isoBox(w1x, w1y, 56, 22, 24, '#b0a696', '#7a4a3a');
    const [w2x, w2y] = groundPoint(0.30, 0.50, hor);
    isoBox(w2x, w2y, 52, 19, 22, '#9fb2bd', '#5d6d7e');
    const [crx, cry] = groundPoint(0.30, 0.55, hor);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(crx, cry); ctx.lineTo(crx, cry - 56);
    ctx.lineTo(crx + 44, cry - 56); ctx.moveTo(crx, cry - 56); ctx.lineTo(crx - 14, cry - 44);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(crx + 38, cry - 56); ctx.lineTo(crx + 38, cry - 38); ctx.stroke();
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(crx + 33, cry - 38, 10, 8);
    // road through the town: a ground-projected strip at constant u,
    // threaded between two house columns, so it recedes straight to
    // the vanishing point like the runway does — the old diagonal
    // sweep across the frame made the ground read as sliding sideways
    ctx.fillStyle = 'rgba(90,90,90,0.6)';
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const [rx3, ry3] = groundPoint(-0.74, 0.05 + (i / 6) * 1.03, hor);
      if (i === 0) ctx.moveTo(rx3, ry3); else ctx.lineTo(rx3, ry3);
    }
    for (let i = 6; i >= 0; i--) {
      const [rx3, ry3] = groundPoint(-0.67, 0.05 + (i / 6) * 1.03, hor);
      ctx.lineTo(rx3, ry3);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const [rx3, ry3] = groundPoint(-0.705, 0.05 + (i / 6) * 1.03, hor);
      if (i === 0) ctx.moveTo(rx3, ry3); else ctx.lineTo(rx3, ry3);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // ===== harbor: real water to the horizon on the right =====
    const waterPath = new Path2D();
    waterPath.moveTo(752 + shX, hor + 2);
    waterPath.quadraticCurveTo(864 + shX, hor + 130, 834 + shX, H + 70);
    waterPath.lineTo(1420, H + 70);
    waterPath.lineTo(1420, hor - 8);
    waterPath.quadraticCurveTo(1120 + shX, hor + 26, 996 + shX, hor + 1);
    waterPath.closePath();
    const wg2 = ctx.createLinearGradient(760, hor, 1120, H + 60);
    wg2.addColorStop(0, '#57c7e8'); wg2.addColorStop(0.5, '#1f8fc4'); wg2.addColorStop(1, '#0f5f96');
    ctx.fillStyle = wg2;
    ctx.fill(waterPath);
    // island silhouette on the horizon
    ctx.fillStyle = 'rgba(70,110,140,0.75)';
    ctx.beginPath();
    ctx.moveTo(1150 + shX, hor + 3);
    ctx.quadraticCurveTo(1235 + shX, hor - 26, 1330 + shX, hor + 3);
    ctx.closePath(); ctx.fill();
    // everything wet stays inside the water from here on
    ctx.save();
    ctx.clip(waterPath);
    // turquoise shallows hugging the shore
    ctx.strokeStyle = 'rgba(64,224,208,0.20)';
    ctx.lineWidth = 34;
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const [fx, fy] = shorePoint(i / 22, hor, shX + 15);
      if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.stroke();
    // golden sun-path: irregular dashes under the sun, fine and dense
    // far away, broader and broken up close in
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const gy = hor + 20 + t * (H - hor - 2);
      const gw = (12 + t * 96) * (0.45 + hash(i * 7.3) * 0.9);
      const gx = 1052 + shX * 0.3 + Math.sin(i * 2.4) * 10 + (hash(i * 5) - 0.5) * 30;
      ctx.fillStyle = 'rgba(255,226,150,' + (0.14 + 0.30 * (1 - t) * hash(i * 3.1 + 0.4)).toFixed(3) + ')';
      ctx.fillRect(gx - gw / 2, gy, gw, 3 + t * 1.6);
      if (hash(i * 11) > 0.55) ctx.fillRect(gx + gw * 0.62, gy, gw * 0.4, 3 + t * 1.6);
    }
    // sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 26; i++) {
      const sx = 800 + shX + hash(i * 3 + Math.floor(s.dist * 2)) * 420;
      const sy = hor + 26 + hash(i * 7 + Math.floor(s.dist * 2)) * 380;
      ctx.fillRect(sx, sy, 3 + hash(i) * 7, 2);
    }
    ctx.restore();
    // shoreline foam: scalloped white edge sampled from the very bezier
    // the water is bounded by, nudged a few px onto the water side
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const [bx, by] = shorePoint(t, hor, shX);
      const fx = bx + 3 + Math.sin(t * 26) * 2.5, fy = by + Math.cos(t * 26) * 1.6;
      if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.stroke();
    // pier: rooted on the land side of the shoreline, tapering as it
    // reaches out over the water; its footing drifts slowly with dist
    const pierT = 0.54 + ((s.dist * 0.01) % 0.08);
    const [qx, qy] = shorePoint(pierT, hor, shX);
    const px0 = qx - 20, py0 = qy + 4, px1 = qx + 128, py1 = qy + 14;
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.moveTo(px0, py0 - 6); ctx.lineTo(px1, py1 - 4);
    ctx.lineTo(px1, py1 + 4); ctx.lineTo(px0, py0 + 7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4e342e';
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      ctx.lineWidth = 3.4 - t * 1.2;
      ctx.beginPath();
      ctx.moveTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t - 2);
      ctx.lineTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t + 8 - t * 3);
      ctx.stroke();
    }
    // boats with wakes, creeping along their lanes as distance passes
    const [b1x, b1y] = groundPoint(1.02 - ((s.dist * 0.010) % 0.45), 0.42, hor);
    boat(b1x, b1y, 0.9, 1);
    const [b2x, b2y] = groundPoint(0.66 + ((s.dist * 0.006) % 0.30), 0.20, hor);
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
    // The strip converges on the parallaxed vanishing point up top and
    // stays centred on 640 where it leaves the bottom edge.
    const rTopX = 640 + camPar, rBotX = 640;
    ctx.fillStyle = '#333d47';
    ctx.beginPath();
    ctx.moveTo(rTopX - 58, hor + 14); ctx.lineTo(rTopX + 58, hor + 14);
    ctx.lineTo(rBotX + 218, H + 62); ctx.lineTo(rBotX - 218, H + 62);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#454f59';
    ctx.beginPath();
    ctx.moveTo(rTopX - 40, hor + 14); ctx.lineTo(rTopX + 40, hor + 14);
    ctx.lineTo(rBotX + 152, H + 62); ctx.lineTo(rBotX - 152, H + 62);
    ctx.closePath(); ctx.fill();
    // threshold piano keys, laid across the strip at a fixed depth
    ctx.fillStyle = '#ffffff';
    {
      const [kx, ky] = groundPoint(0, 0.155, hor);
      const kw = (70 + 0.155 * 1010) * (1 - gAltF * 0.10);
      for (let i = 0; i < 6; i++) {
        const [px, py] = groundPoint(-0.082 + i * 0.0328, 0.155, hor);
        ctx.save();
        ctx.translate(px, py);
        ctx.transform(1, 0, -camPar * 0.0006, 0.62, 0, 0);
        ctx.fillRect(-kw * 0.011, 0, kw * 0.022, 15);
        ctx.restore();
      }
      void kx; void ky;
    }
    // "09" designator at mid-strip: widened by perspective but SQUASHED
    // vertically with depth, the way real runway paint reads
    {
      const [nx, ny] = groundPoint(0, 0.30, hor);
      ctx.save();
      ctx.translate(nx, ny);
      ctx.scale(1.45, 0.72);
      ctx.globalAlpha = 0.92;
      text('09', 0, 0, 30, '#ffffff');
      ctx.restore();
      ctx.globalAlpha = 1;
    }
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
      const [ex, ey] = groundPoint(-0.185, d, hor);
      const [fx2, fy2] = groundPoint(0.185, d, hor);
      ctx.beginPath(); ctx.arc(ex, ey, 2 + d * 3.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(fx2, fy2, 2 + d * 3.4, 0, 7); ctx.fill();
    }
    ctx.restore();

    // ===== items, far to near =====
    const items = [...s.items].sort((a, b) => b.z - a.z);
    let nearRing = null;
    let prevRing = null;
    for (const it of items) {
      const t = Math.max(0.08, 1 - it.z / 1400);
      const x = 640 + it.lane * 520 * t + (640 - s.x) * (t * 0.25);
      const y = (hor + 60) + (it.h * 90 + 70) * t + (330 - s.y) * t * 0.2;
      const r = 18 + t * 88;
      if (it.kind === 'ring') {
        const rr2 = it.big ? r * 1.5 : r;
        const lw = (7 + t * 15) * (it.big ? 1.3 : 1);
        // rings off to the side read as ellipses, and the rim is drawn
        // twice — a darker back rim offset up-stream and the bright
        // front rim — so the torus has real thickness
        const squash = 1 - Math.min(0.20, Math.abs(it.lane) * 0.18);
        // faint dotted guide line chaining the course together
        if (prevRing) {
          ctx.save();
          ctx.strokeStyle = 'rgba(160,230,255,0.40)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([3, 11]);
          ctx.beginPath(); ctx.moveTo(prevRing.x, prevRing.y); ctx.lineTo(x, y); ctx.stroke();
          ctx.restore();
        }
        prevRing = {x, y};
        ctx.save();
        ctx.strokeStyle = '#c77400';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(x - it.lane * 7, y - 4, rr2, rr2 * squash, 0, 0, 7); ctx.stroke();
        // thin light membrane across the opening
        const mem = ctx.createRadialGradient(x, y, rr2 * 0.1, x, y, rr2);
        mem.addColorStop(0, 'rgba(150,230,255,0.05)');
        mem.addColorStop(0.8, 'rgba(150,230,255,0.13)');
        mem.addColorStop(1, 'rgba(150,230,255,0)');
        ctx.fillStyle = mem;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, 0, 7); ctx.fill();
        ctx.shadowColor = 'rgba(255,170,0,0.9)';
        ctx.shadowBlur = 22 * t + 5;
        const rg = ctx.createLinearGradient(x - rr2, y - rr2, x + rr2, y + rr2);
        rg.addColorStop(0, '#ffe97a'); rg.addColorStop(0.5, '#ffb300'); rg.addColorStop(1, '#ff8f00');
        ctx.strokeStyle = rg;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, 0, 7); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(200,245,255,0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(x, y, rr2 - lw * 0.52, (rr2 - lw * 0.52) * squash, 0, 0, 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,250,205,0.95)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, -2.5, -0.8); ctx.stroke();
        ctx.restore();
        if (it.z < 200) nearRing = {x, y, r: rr2, lw, squash};
      } else if (it.kind === 'star') {
        // checkpoint orb: a glossy AMBER-ORANGE sphere in a thin ring
        // of light — orange by hue, so it separates at a glance from
        // the yellow-gold rings; the star glyph is pale cream with a
        // dark outline, so it stays readable on the orange face
        const rs = r * 0.52;
        ctx.save();
        const glow = ctx.createRadialGradient(x, y, rs * 0.2, x, y, rs * 2.0);
        glow.addColorStop(0, 'rgba(255,138,20,0.40)');
        glow.addColorStop(1, 'rgba(255,138,20,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, rs * 2.0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,196,130,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, rs * 1.28, 0, 7); ctx.stroke();
        const sph = ctx.createRadialGradient(x + rs * 0.35, y - rs * 0.35, rs * 0.1, x, y, rs);
        sph.addColorStop(0, '#ffdca3'); sph.addColorStop(0.55, '#ff8c1a'); sph.addColorStop(1, '#dd5a00');
        ctx.fillStyle = sph;
        ctx.beginPath(); ctx.arc(x, y, rs, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff3d6';
        starPath(x, y, rs * 0.55);
        ctx.fill();
        ctx.strokeStyle = '#7a2800';
        ctx.lineWidth = Math.max(1.2, rs * 0.06);
        starPath(x, y, rs * 0.55);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.ellipse(x + rs * 0.34, y - rs * 0.38, rs * 0.16, rs * 0.10, -0.5, 0, 7); ctx.fill();
        ctx.restore();
      } else {
        stormCloud(x, y, (r / 46) * 1.15);
      }
    }

    // ground shadow of the plane: the sun is up on the right, so the
    // shadow falls down-LEFT, shrinking and fading as altitude grows
    const shY = s.y + 92 + altF * 30;
    const shX2 = s.x - 26 - altF * 46 + s.bank * 22;
    ctx.fillStyle = 'rgba(10,40,25,' + (0.10 - altF * 0.05).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(shX2, shY, (104 - altF * 38) * 1.3, (13 - altF * 4) * 1.5, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,40,25,' + (0.25 - altF * 0.15).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(shX2, shY, 104 - altF * 38, 13 - altF * 4, 0, 0, 7);
    ctx.fill();

    vortexTrails(s);
    planeRear(s.x, s.y, s.bank, 1.04, s.pitch);

    // near ring: redraw its front arc over the plane so the plane reads
    // as threading the ring
    if (nearRing) {
      const {x, y, r, lw, squash} = nearRing;
      const rg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      rg.addColorStop(0, '#ffe97a'); rg.addColorStop(0.5, '#ffb300'); rg.addColorStop(1, '#ff8f00');
      ctx.strokeStyle = rg;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * squash, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,245,255,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(x, y, r - lw * 0.52, (r - lw * 0.52) * squash, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    }

    // floating score popups and ring-pass spark bursts (world.js fx)
    if (s.fx) {
      for (const f of s.fx) {
        const a = Math.max(0, 1 - f.t);
        if (f.burst) {
          ctx.save();
          ctx.globalAlpha = a * 0.9;
          ctx.strokeStyle = '#ffd23d';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          for (let k = 0; k < 8; k++) {
            const ang = k * Math.PI / 4 + (f.seed || 0);
            const r0 = 12 + f.t * 42, r1 = r0 + 13;
            ctx.beginPath();
            ctx.moveTo(f.x + Math.cos(ang) * r0, f.y + Math.sin(ang) * r0);
            ctx.lineTo(f.x + Math.cos(ang) * r1, f.y + Math.sin(ang) * r1);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowColor = 'rgba(0,20,40,0.75)';
        ctx.shadowBlur = 6;
        const size = f.kind === 'perfect' ? 30 : f.kind === 'fuel' ? 20 : 23;
        const col = f.kind === 'perfect' ? '#ffd23d' : f.kind === 'fuel' ? '#2eff8a' : '#ffffff';
        text(f.text, f.x, f.y, size, col);
        ctx.restore();
      }
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
    ctx.fillStyle = 'rgba(255,170,60,0.06)';
    ctx.fillRect(0, 0, W, H);

    // radial speed lines at the frame edges when really moving
    if (screen === SCREEN_PLAY && s.speed > 210) {
      const str = clamp01((s.speed - 210) / 50);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.34 * str).toFixed(3) + ')';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let k = 0; k < 14; k++) {
        const ang = hash(k * 3.7) * Math.PI * 2;
        const r0 = 470 + hash(k * 9.1) * 130;
        const len = 46 + str * 80 + hash(k * 5.3) * 30;
        ctx.beginPath();
        ctx.moveTo(640 + Math.cos(ang) * r0, 360 + Math.sin(ang) * r0 * 0.72);
        ctx.lineTo(640 + Math.cos(ang) * (r0 + len), 360 + Math.sin(ang) * (r0 + len) * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ===== HUD: compact pills instead of one full-width bar, so the
    // sky stays open; every number is set in the mono face =====
    const onTitle = screen === SCREEN_TITLE;
    const hudStat = (label, value, x, color) => {
      text(label, x, 31, 10.5, '#9fd8ff', 'left', 700);
      textM(value, x, 54, 21, color, 'left');
    };
    if (onTitle) {
      // minimal telemetry only: ALT pill / compass / SPD pill
      panel(18, 14, 216, 58, 'rgba(255,210,61,0.65)');
      hudStat('ALT', altM(s.alt) + ' m', 38, '#7dffcb');
      panel(1046, 14, 216, 58, 'rgba(255,210,61,0.65)');
      hudStat('SPD', spdKmh(s.speed) + ' km/h', 1066, '#7dffcb');
    } else {
      panel(18, 14, 452, 58, 'rgba(255,210,61,0.65)');
      hudStat('SCORE', String(s.score), 34, '#ffd23d');
      hudStat('RINGS', s.rings + '/12', 148, '#ffffff');
      // star tally beside the rings count: the orb's cream star glyph
      // at pill scale, with the collected count from the world state
      text('STARS', 238, 31, 10.5, '#9fd8ff', 'left', 700);
      ctx.fillStyle = '#fff3d6';
      starPath(246, 48, 8);
      ctx.fill();
      ctx.strokeStyle = '#7a2800';
      ctx.lineWidth = 1.2;
      starPath(246, 48, 8);
      ctx.stroke();
      textM(String(s.stars), 260, 54, 21, '#ffb35c', 'left');
      hudStat('TIME', Math.ceil(s.left) + 's', 336, s.left < 15 ? '#ff8a80' : '#ffffff');
      panel(810, 14, 452, 58, 'rgba(125,223,255,0.55)');
      hudStat('ALT', altM(s.alt) + ' m', 830, '#7dffcb');
      hudStat('SPD', spdKmh(s.speed) + ' km/h', 984, '#7dffcb');
      hudStat('DIST', distKm(s.dist) + ' km', 1120, '#ffffff');
    }
    compass(640, 43, s.heading);

    // bottom-left status panel (hidden on the title screen)
    if (!onTitle) {
      panel(18, 592, 372, 120);
      text('FUEL', 42, 620, 13, '#9fd8ff', 'left');
      textM(Math.round(s.fuel) + '%', 374, 620, 15, '#ffffff', 'right');
      ctx.fillStyle = '#1b2a38';
      rr(100, 609, 238, 22, 10); ctx.fill();
      ctx.fillStyle = s.fuel < 25 ? '#ff5252' : '#2eff8a';
      if (s.fuel > 0) { rr(100, 609, 238 * Math.max(0, s.fuel) / 100, 22, 10); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      rr(100, 609, 238, 22, 10); ctx.stroke();
      text('LIVES', 42, 678, 13, '#9fd8ff', 'left');
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? '#ff5a52' : 'rgba(255,90,82,0.25)';
        heartPath(122 + i * 30, 678, 10);
        ctx.fill();
        if (i < s.lives) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.ellipse(118 + i * 30, 674, 3, 2, -0.5, 0, 7); ctx.fill();
        }
      }
      // boost lamp: lit amber while the throttle is open
      ctx.save();
      if (s.boost) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 12; }
      ctx.fillStyle = s.boost ? '#ffb300' : 'rgba(255,179,0,0.22)';
      ctx.beginPath(); ctx.arc(272, 678, 9, 0, 7); ctx.fill();
      ctx.restore();
      text('BOOST', 290, 678, 13, s.boost ? '#ffd23d' : '#9fd8ff', 'left');
    }

    // gauge cluster: one aligned metallic panel, backlit gauges,
    // corner rivets and a bezel highlight
    panel(824, 592, 438, 120, 'rgba(255,210,61,0.5)');
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(838, 599); ctx.lineTo(1248, 599); ctx.stroke();
    for (const [rx, ry] of [[836, 604], [1250, 604], [836, 700], [1250, 700]]) {
      ctx.fillStyle = '#5b7a94';
      ctx.beginPath(); ctx.arc(rx, ry, 3.2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(rx - 1, ry - 1, 1.1, 0, 7); ctx.fill();
    }
    horizonGauge(886, 650, s);
    dial(1024, 650, s.speed, 100, 280, '#ffd23d', spdKmh(s.speed) + ' km/h', v => spdKmh(v));
    dial(1162, 650, s.alt, 0, 3000, '#7dffcb', altM(s.alt) + ' m', v => altM(v));
    text('ATT', 886, 705, 10, '#9fd8ff');
    text('SPD', 1024, 705, 10, '#9fd8ff');
    text('ALT', 1162, 705, 10, '#9fd8ff');

    // ===== screens =====
    if (screen === SCREEN_TITLE) {
      // emblem-style title floating on the sky, no generic box: gold
      // gradient fill keyed by a dark navy stroke so the lettering
      // stays crisp over sky and cloud alike
      ctx.save();
      ctx.font = '800 62px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = '#0b2a4a';
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.strokeText('SKY HARBOR', 640, 128);
      ctx.shadowColor = 'transparent';
      const tg = ctx.createLinearGradient(0, 96, 0, 158);
      tg.addColorStop(0, '#fff3b0'); tg.addColorStop(0.55, '#ffd23d'); tg.addColorStop(1, '#f7a500');
      ctx.fillStyle = tg;
      ctx.fillText('SKY HARBOR', 640, 128);
      ctx.restore();
      // wing motifs grown into the emblem, reaching in toward the text
      ctx.fillStyle = '#ffd23d';
      ctx.strokeStyle = '#0b2a4a';
      ctx.lineWidth = 2;
      for (const m of [-1, 1]) {
        ctx.save();
        ctx.translate(640 + m * 272, 128);
        ctx.scale(m, 1);
        ctx.beginPath();
        ctx.moveTo(-34, -14); ctx.lineTo(86, -4); ctx.lineTo(88, 3); ctx.lineTo(-28, 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-30, 6); ctx.lineTo(70, 12); ctx.lineTo(71, 18); ctx.lineTo(-26, 15);
        ctx.closePath(); ctx.fill(); ctx.stroke();
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
      // legend row: what the three course elements mean, drawn as
      // miniatures in the same style as the course itself
      ctx.fillStyle = 'rgba(5,28,56,0.62)';
      rr(262, 284, 756, 36, 18); ctx.fill();
      // mini ring: gold torus with the course ring's gradient and glow
      ctx.save();
      ctx.shadowColor = 'rgba(255,170,0,0.9)';
      ctx.shadowBlur = 8;
      const lrg = ctx.createLinearGradient(336, 290, 360, 314);
      lrg.addColorStop(0, '#ffe97a'); lrg.addColorStop(0.5, '#ffb300'); lrg.addColorStop(1, '#ff8f00');
      ctx.strokeStyle = lrg;
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.ellipse(348, 302, 12, 11, 0, 0, 7); ctx.stroke();
      ctx.restore();
      text('Ring — fly through +100', 370, 302, 14.5, '#eaf7ff', 'left');
      // mini orb: the checkpoint sphere with its contrast star —
      // same amber-orange body and cream glyph as the course orb
      ctx.strokeStyle = 'rgba(255,196,130,0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(578, 302, 14, 0, 7); ctx.stroke();
      const lsg = ctx.createRadialGradient(582, 298, 1, 578, 302, 11);
      lsg.addColorStop(0, '#ffdca3'); lsg.addColorStop(0.55, '#ff8c1a'); lsg.addColorStop(1, '#dd5a00');
      ctx.fillStyle = lsg;
      ctx.beginPath(); ctx.arc(578, 302, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff3d6';
      starPath(578, 302, 6);
      ctx.fill();
      ctx.strokeStyle = '#7a2800';
      ctx.lineWidth = 1;
      starPath(578, 302, 6);
      ctx.stroke();
      text('Star orb — bonus +50', 600, 302, 14.5, '#eaf7ff', 'left');
      // mini storm: the real storm cell at legend scale
      stormCloud(784, 301, 0.26);
      text('Storm — avoid!', 806, 302, 14.5, '#eaf7ff', 'left');
      // start button low, in the gap between the bottom panels:
      // 3D gradient, top gloss, and a key chip as the hint
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      const sg2 = ctx.createLinearGradient(0, 622, 0, 674);
      sg2.addColorStop(0, '#ff6b5e'); sg2.addColorStop(0.5, '#e8322a'); sg2.addColorStop(1, '#b31b12');
      ctx.fillStyle = sg2;
      rr(482, 622, 316, 52, 14); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      rr(494, 627, 292, 16, 8); ctx.fill();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      rr(482, 622, 316, 52, 14); ctx.stroke();
      text('PRESS', 556, 648, 19, '#ffffff');
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      rr(592, 634, 76, 28, 6); ctx.fill();
      ctx.strokeStyle = '#7a0f08';
      ctx.lineWidth = 1.5;
      rr(592, 634, 76, 28, 6); ctx.stroke();
      textM('SPACE', 630, 649, 14, '#b31b12');
      text('TO FLY', 724, 648, 19, '#ffffff');
    }

    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      text('PAUSED', 640, 340, 52, '#fff');
    }

    if (screen === SCREEN_OVER) {
      // logbook-style result card with a rank badge and an itemised
      // breakdown that adds up to the score on the card
      const ringPts = s.rings * 100, starPts = s.stars * 50;
      const timeBonus = Math.ceil(s.left) * 10, fuelBonus = Math.round(s.fuel) * 2;
      const rank = s.score >= 1600 ? 'S' : s.score >= 1300 ? 'A' : s.score >= 1000 ? 'B' : 'C';
      panel(330, 84, 620, 272, '#ffd23d');
      // small vector plane icon (rear view glyph)
      ctx.save();
      ctx.translate(408, 120);
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.lineTo(26, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, 12); ctx.lineTo(13, 12); ctx.stroke();
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath(); ctx.ellipse(0, 2, 6, 14, 0, 0, 7); ctx.fill();
      ctx.restore();
      text('FLIGHT COMPLETE', 640, 120, 36, '#ffd23d');
      // rank badge
      ctx.save();
      ctx.shadowColor = 'rgba(255,170,0,0.8)';
      ctx.shadowBlur = 12;
      const bg2 = ctx.createRadialGradient(884, 104, 3, 884, 112, 30);
      bg2.addColorStop(0, '#fff3b0'); bg2.addColorStop(1, '#f7a500');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(884, 112, 27, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(884, 112, 27, 0, 7); ctx.stroke();
      text('RANK', 884, 100, 10, '#7a4d00');
      text(rank, 884, 118, 24, '#7a4d00');
      ctx.strokeStyle = 'rgba(255,210,61,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(366, 148); ctx.lineTo(914, 148); ctx.stroke();
      text('SCORE  ' + s.score, 640, 182, 36, '#ffffff');
      // breakdown rows: label left, points right, all mono numbers
      const rows = [
        ['Rings ' + s.rings + '/12', '+' + ringPts],
        ['Stars ' + s.stars, '+' + starPts],
        ['Time bonus (' + Math.ceil(s.left) + 's left)', '+' + timeBonus],
        ['Fuel bonus (' + Math.round(s.fuel) + '% left)', '+' + fuelBonus],
      ];
      rows.forEach(([label, pts], i) => {
        const y = 222 + i * 27;
        text(label, 420, y, 17, '#d8f4ff', 'left');
        textM(pts, 860, y, 17, '#ffd23d', 'right');
      });
      text('Best ' + Math.max(best, s.score) + (rank === 'S' ? '  ·  Harbor Master — superb flying!' : rank === 'A' ? '  ·  Great flight, pilot!' : '  ·  Keep practicing, pilot!'), 640, 338, 16, '#7dffcb');
      // fly-again button with the same 3D treatment as the start button
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      const fg2 = ctx.createLinearGradient(0, 380, 0, 432);
      fg2.addColorStop(0, '#ff6b5e'); fg2.addColorStop(0.5, '#e8322a'); fg2.addColorStop(1, '#b31b12');
      ctx.fillStyle = fg2;
      rr(490, 380, 300, 52, 14); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      rr(502, 385, 276, 16, 8); ctx.fill();
      ctx.strokeStyle = '#ffb3ab';
      ctx.lineWidth = 2;
      rr(490, 380, 300, 52, 14); ctx.stroke();
      text('FLY AGAIN — SPACE', 640, 406, 18, '#fff');
    }
  }

  return {draw};
}
