import {FIELD, FONT, MONO_FONT} from './config.js';

export const SCREEN_TITLE = 0, SCREEN_PLAY = 1, SCREEN_PAUSED = 2, SCREEN_OVER = 3;

// Deterministic hash-noise so sparkles, rooftops, windows and foliage are stable per frame.
function hash(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function parseCol(c) {
  if (c[0] === '#') {
    return [
      parseInt(c.slice(1, 3), 16),
      parseInt(c.slice(3, 5), 16),
      parseInt(c.slice(5, 7), 16),
      1,
    ];
  }
  const m = c.match(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2], m.length >= 4 ? +m[3] : 1] : [0, 0, 0, 1];
}

function lerpCol(a, b, t) {
  const ca = parseCol(a), cb = parseCol(b);
  const f = clamp01(t);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * f);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * f);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * f);
  const al = ca[3] + (cb[3] - ca[3]) * f;
  return al < 0.999 ? `rgba(${r},${g},${bl},${al.toFixed(3)})` : `rgb(${r},${g},${bl})`;
}

function mixRgba(c, alpha) {
  const [r, g, b] = parseCol(c);
  return `rgba(${r},${g},${b},${clamp01(alpha).toFixed(3)})`;
}

// Compressed day cycle keyed to run progress (elapsed / limit):
// morning (title ~0.02) -> day (play ~0.27) -> golden hour (rush ~0.58)
// -> dusk -> deep night (end ~0.80) -> dawn (~0.91) -> morning (1.00).
// Fields: [phase, skyTop, skyMid, skyLow, skyHor, sunY, sunA, sunCore, sunRim,
//          moonY, night, cloudLit, cloudShade, groundTop, groundBot, waterTop, waterMid, waterBot, hazeHex]
const DAY_KEYS = [
  [0.00, '#1e5aa8', '#52a7e5', '#9cd7f5', '#ffd8a3', 218, 1.00, '#fff7c8', '#ffd257', 355, 0.00, '#fffef7', '#7aa4cf', '#6eb863', '#2a6f3a', '#48b8dc', '#1b7db3', '#0d4e80', '#ffe3a8'],
  [0.26, '#1458ba', '#3e9de8', '#8cd2f6', '#d4f1ff', 118, 1.00, '#ffffff', '#ffe878', 370, 0.00, '#ffffff', '#6d98c8', '#68b962', '#26723b', '#4ac6e8', '#1b89c2', '#0b588e', '#d6f2ff'],
  [0.48, '#174f9e', '#3687cf', '#83c3e8', '#ffcf94', 185, 1.00, '#fff4b8', '#ffb84d', 360, 0.00, '#ffefd8', '#7d8db5', '#6aa359', '#255c35', '#42aed1', '#1875a8', '#0a4876', '#ffd296'],
  [0.58, '#1b3e82', '#526ca8', '#cb896a', '#ffb76b', 236, 0.96, '#ffe999', '#ff9234', 325, 0.06, '#ffe0be', '#6b6a8c', '#57874f', '#1f492e', '#3c8eb5', '#175a88', '#0a385c', '#ffb673'],
  [0.67, '#1a204d', '#543c7a', '#cf6448', '#ff8748', 298, 0.58, '#ffd080', '#ff642e', 245, 0.34, '#e2a38a', '#443d63', '#39553c', '#152e23', '#27597c', '#123759', '#08213b', '#e87f58'],
  [0.75, '#070f26', '#0e2046', '#1b3662', '#2b4f7d', 345, 0.00, '#ff9040', '#ff5020', 132, 0.92, '#627aa3', '#1e2c4a', '#1b302b', '#0b191b', '#143352', '#0c233c', '#061527', '#355780'],
  [0.81, '#050b1f', '#0b1b3c', '#183158', '#274770', 350, 0.00, '#ff9040', '#ff5020', 112, 0.98, '#5a729c', '#192642', '#172a27', '#0a1619', '#112c48', '#0a1e35', '#051222', '#2e4e74'],
  [0.90, '#1e3566', '#5e76a6', '#d18e6a', '#ffb076', 282, 0.56, '#ffe4a3', '#ff9852', 310, 0.14, '#e0c0ad', '#566485', '#466c49', '#1a3b29', '#317699', '#154b72', '#0a2f4d', '#f2aa7c'],
  [1.00, '#1e5aa8', '#52a7e5', '#9cd7f5', '#ffd8a3', 218, 1.00, '#fff7c8', '#ffd257', 355, 0.00, '#fffef7', '#7aa4cf', '#6eb863', '#2a6f3a', '#48b8dc', '#1b7db3', '#0d4e80', '#ffe3a8'],
];

function dayAt(p) {
  const x = clamp01(p);
  let i = 0;
  while (i < DAY_KEYS.length - 2 && x > DAY_KEYS[i + 1][0]) i++;
  const A = DAY_KEYS[i], B = DAY_KEYS[i + 1];
  const rawF = (x - A[0]) / Math.max(0.0001, B[0] - A[0]);
  const f = smoothstep(rawF);
  const mix = (j) => lerpCol(A[j], B[j], f);
  const num = (j) => A[j] + (B[j] - A[j]) * f;
  return {
    top: mix(1), mid: mix(2), low: mix(3), hor: mix(4),
    sunY: num(5), sunA: num(6), sunCore: mix(7), sunRim: mix(8),
    moonY: num(9), night: num(10),
    cloudLit: mix(11), cloudShade: mix(12),
    groundTop: mix(13), groundBot: mix(14),
    waterTop: mix(15), waterMid: mix(16), waterBot: mix(17),
    hazeHex: mix(18),
  };
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
    g.addColorStop(0, 'rgba(10,26,46,0.92)');
    g.addColorStop(1, 'rgba(5,16,30,0.90)');
    ctx.fillStyle = g;
    rr(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent || 'rgba(125,223,255,0.55)';
    ctx.lineWidth = 2;
    rr(x, y, w, h, 14);
    ctx.stroke();
  }

  // Volumetric cumulus cloud with flat-ish bottom and layered puffs in a single clipped pass.
  function cloudPath(cx, cy, s, variant = 0) {
    ctx.beginPath();
    const sets = [
      [[0, 0, 30], [32, 6, 22], [-31, 7, 20], [7, -15, 22], [-15, -10, 17], [16, 10, 16], [-16, 11, 15]],
      [[0, 2, 28], [28, 7, 20], [-28, 8, 22], [-8, -14, 21], [14, -10, 18], [44, 11, 14], [-42, 12, 13]],
      [[0, 1, 26], [24, 5, 21], [-24, 5, 19], [2, -16, 19], [20, -6, 15], [-18, -7, 15]],
    ];
    for (const [dx, dy, r] of sets[variant % sets.length]) {
      ctx.moveTo(cx + (dx + r) * s, cy + dy * s);
      ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    }
  }

  function cloud(cx, cy, s, day, variant = 0) {
    ctx.fillStyle = day.cloudLit;
    cloudPath(cx, cy, s, variant);
    ctx.fill();
    ctx.save();
    cloudPath(cx, cy, s, variant);
    ctx.clip();
    const hg = ctx.createRadialGradient(cx + 22 * s, cy - 16 * s, 2, cx + 22 * s, cy - 16 * s, 54 * s);
    hg.addColorStop(0, 'rgba(255,252,236,0.55)');
    hg.addColorStop(1, 'rgba(255,252,236,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(cx - 75 * s, cy - 45 * s, 150 * s, 90 * s);
    const sg = ctx.createLinearGradient(0, cy - 4 * s, 0, cy + 28 * s);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, day.cloudShade);
    ctx.globalAlpha *= 0.42;
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 75 * s, cy - 45 * s, 150 * s, 90 * s);
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
  function planeRear(x, y, bank, scale, pitch = 0, night = 0, t = 0, boost = false) {
    ctx.save();
    ctx.translate(x + bank * 9, y);
    ctx.rotate(bank * 0.36);
    ctx.scale(scale, scale);
    ctx.scale(1, 1 - pitch * 0.13);
    const noseY = -31 - pitch * 5;

    // Night headlight beam + soft ground pool ahead of the nose
    if (night > 0.02) {
      const beam = ctx.createLinearGradient(0, noseY, 0, noseY - 125);
      beam.addColorStop(0, 'rgba(255,246,200,' + (0.34 * night).toFixed(3) + ')');
      beam.addColorStop(1, 'rgba(255,246,200,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-4, noseY);
      ctx.lineTo(4, noseY);
      ctx.lineTo(46, noseY - 125);
      ctx.lineTo(-46, noseY - 125);
      ctx.closePath();
      ctx.fill();

      const hg = ctx.createRadialGradient(0, noseY - 62, 4, 0, noseY - 62, 68);
      hg.addColorStop(0, 'rgba(255,244,190,' + (0.38 * night).toFixed(3) + ')');
      hg.addColorStop(1, 'rgba(255,244,190,0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(0, noseY - 62, 68, 22, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Propeller disc at far nose
    ctx.fillStyle = 'rgba(228,246,255,0.16)';
    ctx.beginPath(); ctx.ellipse(0, noseY, 26, 6.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.58)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, noseY, 26, 6.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(25,45,75,0.45)';
    ctx.beginPath(); ctx.ellipse(0, noseY, 17, 4.2, 0, 0, Math.PI * 2); ctx.stroke();

    // Main wing with dihedral, gold finish and red wingtips
    const wg = ctx.createLinearGradient(-122, 0, 122, 0);
    wg.addColorStop(0, '#e5a100');
    wg.addColorStop(0.25, '#f7b500');
    wg.addColorStop(0.54, '#ffeb82');
    wg.addColorStop(0.8, '#f7b500');
    wg.addColorStop(1, '#e5a100');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(-122, -4); ctx.lineTo(-14, 6); ctx.lineTo(14, 6); ctx.lineTo(122, -4);
    ctx.lineTo(122, 10); ctx.lineTo(14, 17); ctx.lineTo(-14, 17); ctx.lineTo(-122, 10);
    ctx.closePath(); ctx.fill();
    // Subtle wing leading-edge highlight & trailing-edge shade
    ctx.strokeStyle = 'rgba(255,252,220,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-121, -3.5); ctx.lineTo(-14, 6.2); ctx.lineTo(14, 6.2); ctx.lineTo(121, -3.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,65,0,0.45)';
    ctx.beginPath(); ctx.moveTo(-121, 9.6); ctx.lineTo(-14, 16.6); ctx.lineTo(14, 16.6); ctx.lineTo(121, 9.6); ctx.stroke();

    // Red wingtips
    ctx.fillStyle = '#e8322a';
    ctx.beginPath(); ctx.moveTo(-122, -4); ctx.lineTo(-99, -2.1); ctx.lineTo(-99, 11.4); ctx.lineTo(-122, 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(122, -4); ctx.lineTo(99, -2.1); ctx.lineTo(99, 11.4); ctx.lineTo(122, 10); ctx.closePath(); ctx.fill();

    // Panel lines, aileron hinges & dark walkway strips
    ctx.strokeStyle = 'rgba(110,60,0,0.42)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-95, -0.5); ctx.lineTo(-95, 11.5);
    ctx.moveTo(95, -0.5); ctx.lineTo(95, 11.5);
    ctx.moveTo(-60, 2.5); ctx.lineTo(-60, 14);
    ctx.moveTo(60, 2.5); ctx.lineTo(60, 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(35,38,44,0.6)';
    ctx.fillRect(-30, 7.5, 12, 8.5); ctx.fillRect(18, 7.5, 12, 8.5);

    // Navigation lights: port red, starboard green
    ctx.save();
    if (night > 0.02) {
      ctx.globalAlpha = night * (0.80 + 0.20 * Math.sin(t * 6));
      for (const [hx2, hc] of [[-121, 'rgba(255,59,48,'], [121, 'rgba(46,255,106,']]) {
        const ng = ctx.createRadialGradient(hx2, 3, 1, hx2, 3, 21);
        ng.addColorStop(0, hc + '0.68)');
        ng.addColorStop(1, hc + '0)');
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(hx2, 3, 21, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 9 + night * 18;
    ctx.shadowColor = '#ff3b30'; ctx.fillStyle = '#ff5147';
    ctx.beginPath(); ctx.arc(-121, 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#2eff8a'; ctx.fillStyle = '#3dff8f';
    ctx.beginPath(); ctx.arc(121, 3, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Tailplane (horizontal stabiliser)
    ctx.fillStyle = '#f7b500';
    ctx.beginPath();
    ctx.moveTo(-57, 26); ctx.lineTo(0, 21); ctx.lineTo(57, 26);
    ctx.lineTo(57, 36); ctx.lineTo(0, 32); ctx.lineTo(-57, 36);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8322a';
    ctx.fillRect(-57, 32.5, 114, 3.8);

    // Fuselage (short foreshortened taper)
    const fg = ctx.createLinearGradient(-24, 0, 24, 0);
    fg.addColorStop(0, '#9c1710'); fg.addColorStop(0.32, '#ef432d');
    fg.addColorStop(0.58, '#ff7d4e'); fg.addColorStop(1, '#ad1a11');
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

    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(-5, -5, 5.2, 19, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,216,140,0.24)';
    ctx.beginPath(); ctx.ellipse(10, -3, 6.2, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(25,18,65,0.22)';
    ctx.beginPath(); ctx.ellipse(-13.5, 0, 4.5, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,10,5,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-15.5, 13); ctx.lineTo(15.5, 13); ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.fillRect(-11, 20, 22, 4.5);

    // Boost exhaust glow at tail
    if (boost) {
      ctx.save();
      ctx.shadowColor = '#ffb300';
      ctx.shadowBlur = 12;
      const ex = ctx.createRadialGradient(0, 33, 1, 0, 35, 12);
      ex.addColorStop(0, 'rgba(255,250,210,0.95)');
      ex.addColorStop(0.5, 'rgba(255,145,30,0.65)');
      ex.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = ex;
      ctx.beginPath(); ctx.ellipse(0, 35, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Canopy
    const cg = ctx.createLinearGradient(0, -19, 0, 1);
    cg.addColorStop(0, '#0b2645'); cg.addColorStop(1, '#449ee0');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, -9, 10.5, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,235,200,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(218,246,255,0.88)';
    ctx.beginPath(); ctx.ellipse(-3.5, -12.5, 3.6, 5, -0.3, 0, Math.PI * 2); ctx.fill();

    // Vertical fin split on centre line
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

    // Tail strobe at night
    if (night > 0.15) {
      ctx.fillStyle = 'rgba(255,248,215,' + (night * 0.85).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(0, 39, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // Spinner & nose headlight lamp
    ctx.fillStyle = '#263238';
    ctx.beginPath(); ctx.ellipse(0, noseY, 5.5, 3.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(0, noseY, 2, 0, Math.PI * 2); ctx.fill();
    if (night > 0.02) {
      ctx.save();
      ctx.globalAlpha = night;
      ctx.shadowBlur = 15; ctx.shadowColor = '#fff2b0';
      ctx.fillStyle = '#fff9d6';
      ctx.beginPath(); ctx.arc(0, noseY, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function wingTip(s, side) {
    const a = s.bank * 0.36, cos = Math.cos(a), sin = Math.sin(a);
    const lx = side * 122, ly = 3;
    return [
      s.x + s.bank * 9 + (lx * cos - ly * sin) * 1.04,
      s.y + (lx * sin + ly * cos) * 1.04 * (1 - s.pitch * 0.13),
    ];
  }

  function vortexTrails(s) {
    const b = Math.abs(s.bank);
    const wash = clamp01((s.speed - 190) / 55);
    if (b < 0.45 && wash <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const [tx, ty] = wingTip(s, side);
      if (wash > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.12 * wash).toFixed(3) + ')';
        ctx.lineWidth = 6.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(
          tx - side * 8 - s.bank * 20 + Math.sin(s.dist * 6 + side) * 7, ty + 52,
          tx - side * 16 - s.bank * 38, ty + 118);
        ctx.stroke();
      }
      if (b >= 0.45) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.11 + b * 0.14).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + side * 26 - s.bank * 30, ty + 44, tx + side * 44 - s.bank * 55, ty + 104);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- instruments (metric display) ----------
  const altM = ft => Math.round(ft * 0.3048);
  const spdKmh = kt => Math.round(kt * 1.852);
  const distKm = nm => (nm * 1.852).toFixed(1);

  function dial(cx, cy, val, min, max, color, digital, fmt) {
    const r = 44;
    const face = ctx.createRadialGradient(cx - 10, cy - 12, 6, cx, cy, r);
    face.addColorStop(0, '#1a2f47');
    face.addColorStop(1, '#081627');
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, Math.PI * 2); ctx.stroke();

    const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
    const zones = [[0, 0.62, '#2eff8a'], [0.62, 0.84, '#ffd23d'], [0.84, 1, '#ff5252']];
    ctx.lineWidth = 4;
    for (const [f0, f1, c] of zones) {
      ctx.strokeStyle = c;
      ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, r - 10, a0 + f0 * sweep, a0 + f1 * sweep); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#bfeaff';
    ctx.lineWidth = 2;
    for (let k = 0; k <= 10; k++) {
      const a = a0 + (k / 10) * sweep;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
      ctx.lineTo(cx + Math.cos(a) * (r - 13), cy + Math.sin(a) * (r - 13));
      ctx.stroke();
    }
    if (fmt) {
      // Positioned cleanly inside the tick arc, well clear of the centre hub and bottom window
      for (const f of [0, 0.5, 1]) {
        const a = a0 + f * sweep;
        const rad = r - 23;
        const dyOff = f === 0.5 ? -1 : -3;
        textM(String(fmt(min + f * (max - min))), cx + Math.cos(a) * rad, cy + Math.sin(a) * rad + dyOff, 7.5, '#bfeaff');
      }
    }
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
    ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#02070d';
    rr(cx - 30, cy + 24, 60, 17, 4); ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    rr(cx - 30, cy + 24, 60, 17, 4); ctx.stroke();
    ctx.globalAlpha = 1;
    textM(digital, cx, cy + 32.5, 11.5, '#ffffff');
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(cx - 13, cy - 19, 17, 9, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function horizonGauge(cx, cy, s) {
    const r = 44;
    ctx.fillStyle = '#081627';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.clip();
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    for (const [dy, w] of [[-14, 30], [-28, 18], [14, 30], [28, 18]]) {
      ctx.beginPath(); ctx.moveTo(-w / 2, dy); ctx.lineTo(w / 2, dy); ctx.stroke();
    }
    ctx.restore();
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
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 21, cy); ctx.lineTo(cx - 7, cy);
    ctx.moveTo(cx + 7, cy); ctx.lineTo(cx + 21, cy);
    ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(cx - 13, cy - 19, 17, 9, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function compass(cx, cy, heading) {
    ctx.save();
    rr(cx - 152, cy - 17, 304, 34, 8);
    ctx.clip();
    ctx.fillStyle = 'rgba(3,12,24,0.62)';
    ctx.fillRect(cx - 152, cy - 17, 304, 34);
    const names = {0: 'N', 90: 'E', 180: 'S', 270: 'W'};
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

  // ---------- world projection & terrain ----------
  let camPar = 0, gAltF = 0, seaShift = 0;
  function groundPoint(u, d, hor) {
    const y = hor + Math.pow(d, 1.35) * (H + 70 - hor);
    const vx = 640 + camPar * (1 - d);
    const x = vx + u * (70 + d * 1010) * (1 - gAltF * 0.10);
    return [x, y];
  }

  // Multi-peaked smooth mountain ridge, clipped strictly to land side (xMax).
  function ridge(baseY, amp, seed, shadowCol, litCol, alpha, xoff = 0, xMax = W + 140) {
    if (xMax <= -140) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-160, -100, xMax + 160, baseY + 140);
    ctx.clip();

    const pts = [];
    let x = -160 + xoff;
    let i = 0;
    while (x < xMax + 120) {
      const wdt = 85 + hash(seed + i * 1.7) * 140;
      const pk = baseY - (0.35 + 0.65 * hash(seed + i * 3.7)) * amp;
      const sh = baseY - (0.15 + 0.40 * hash(seed + i * 5.1)) * amp;
      const vl = baseY + 4 - hash(seed + i * 1.3) * amp * 0.25;
      pts.push([x + wdt * 0.38, pk, 1]);
      pts.push([x + wdt * 0.64, sh, 1]);
      pts.push([x + wdt, vl, 0]);
      x += wdt;
      i++;
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = shadowCol;
    ctx.beginPath();
    ctx.moveTo(-160 + xoff, baseY + 34);
    for (let k = 0; k < pts.length; k++) {
      const [px, py] = pts[k];
      if (k === 0) ctx.lineTo(px, py);
      else {
        const [prevX, prevY] = pts[k - 1];
        const mx = (prevX + px) * 0.5, my = (prevY + py) * 0.5;
        ctx.quadraticCurveTo(prevX, prevY, mx, my);
      }
    }
    ctx.lineTo(xMax + 120, baseY + 34);
    ctx.closePath();
    ctx.fill();

    // Sunlit right-facing slopes
    ctx.fillStyle = litCol;
    for (let k = 0; k + 2 < pts.length; k += 3) {
      const [px, py] = pts[k];
      const [sx, sy] = pts[k + 1];
      const [vx, vy] = pts[k + 2];
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo((px + sx) * 0.5, (py + sy) * 0.5 + 1, sx, sy);
      ctx.lineTo(vx, vy);
      ctx.lineTo(vx, baseY + 34);
      ctx.lineTo(px, baseY + 34);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Distant city skyline along the land horizon when city zone is active or approaching.
  function citySkyline(hor, cityW, night, day, ridgeMax, xoff) {
    if (cityW <= 0.02 || ridgeMax <= -100) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-150, hor - 95, ridgeMax + 150, 102);
    ctx.clip();
    ctx.globalAlpha = cityW * 0.92;

    const farCol = lerpCol('#5e7694', '#162440', night);
    const nearCol = lerpCol('#3f5570', '#0d1930', night);
    const litEdge = lerpCol('#8ca4bf', '#25395c', night);

    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? 28 : 22;
      const col = layer === 0 ? farCol : nearCol;
      for (let i = 0; i < count; i++) {
        const s = 400 + layer * 97 + i * 19.3;
        const bx = -120 + i * (940 / count) + (hash(s) - 0.5) * 18 + xoff * (0.28 + layer * 0.14);
        if (bx > ridgeMax - 8) continue;
        const bw = 12 + hash(s + 1) * (layer === 0 ? 14 : 20);
        const bh = (layer === 0 ? 18 : 14) + Math.pow(hash(s + 2), 1.4) * (layer === 0 ? 34 : 46);
        ctx.fillStyle = col;
        ctx.fillRect(bx, hor + 4 - bh, bw, bh);
        // Sun/moon right-edge rim
        ctx.fillStyle = litEdge;
        ctx.fillRect(bx + bw - 2.2, hor + 4 - bh, 2.2, bh);
        // Occasional spire / stepped crown
        if (hash(s + 3) > 0.62) {
          ctx.fillStyle = col;
          ctx.fillRect(bx + bw * 0.25, hor + 4 - bh - 5, bw * 0.5, 5);
          if (hash(s + 4) > 0.55) {
            ctx.fillRect(bx + bw * 0.48, hor + 4 - bh - 12, 1.4, 7);
            if (night > 0.25) {
              ctx.fillStyle = 'rgba(255,70,60,' + (night * 0.85).toFixed(2) + ')';
              ctx.fillRect(bx + bw * 0.48 - 0.8, hor + 4 - bh - 13, 2.6, 2.6);
            }
          }
        }
        // Subtle horizon-line window glints at night
        if (night > 0.18 && bh > 16) {
          const cols = Math.max(2, Math.floor(bw / 4.5));
          const rows = Math.max(2, Math.floor((bh - 5) / 5));
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const h = hash(s * 7 + r * 13 + c * 31);
              if (h > 0.52) {
                ctx.fillStyle = h > 0.84
                  ? 'rgba(180,225,255,' + (night * 0.65).toFixed(2) + ')'
                  : 'rgba(255,212,118,' + (night * 0.78).toFixed(2) + ')';
                ctx.fillRect(bx + 2.5 + c * 4, hor + 2 - bh + 3 + r * 4.5, 2.1, 2.1);
              }
            }
          }
        }
      }
    }
    void day;
    ctx.restore();
  }

  function shorePoint(t, hor, shX) {
    const mt = 1 - t;
    return [
      mt * mt * 752 + 2 * mt * t * 864 + t * t * 834 + shX + seaShift,
      mt * mt * (hor + 2) + 2 * mt * t * (hor + 130) + t * t * (H + 70),
    ];
  }

  // Oblique box with optional flat parapet roof, pitched roof, or stepped roof.
  // Returns top-face & front-face geometry for adding windows/rooftop details.
  function drawBox3D(x, y, w, h, dep, wallFront, wallSide, roofCol, pitched = false, night = 0) {
    const dx = dep * 0.56, dy = dep * 0.34;
    // Front wall
    ctx.fillStyle = wallFront;
    ctx.fillRect(x - w / 2, y - h, w, h);

    // Side wall (facing right-back, slightly shaded in daylight, deep slate at night)
    ctx.fillStyle = wallSide;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h);
    ctx.lineTo(x + w / 2 + dx, y - h - dy);
    ctx.lineTo(x + w / 2 + dx, y - dy);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();

    if (pitched) {
      const rh = h * 0.34;
      const rx = dx * 0.5, ry = y - h - dy * 0.5 - rh;
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 - w * 0.04, y - h + 1);
      ctx.lineTo(x + w / 2 + w * 0.04, y - h + 1);
      ctx.lineTo(x + w / 2 + rx, ry);
      ctx.lineTo(x - w / 2 + rx, ry);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + rx, ry);
      ctx.lineTo(x + w / 2 + rx, ry);
      ctx.lineTo(x + w / 2 + dx + w * 0.04, y - h - dy + 1);
      ctx.lineTo(x - w / 2 + dx, y - h - dy + 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,244,210,' + (0.28 * (1 - night * 0.7)).toFixed(2) + ')';
      ctx.fill();
      // Eave shadow under front roof overhang
      ctx.fillStyle = 'rgba(10,18,36,0.22)';
      ctx.fillRect(x - w / 2, y - h, w, Math.max(1.5, h * 0.07));
    } else {
      // Flat roof slab with subtle parapet rim
      ctx.fillStyle = roofCol;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h);
      ctx.lineTo(x + w / 2, y - h);
      ctx.lineTo(x + w / 2 + dx, y - h - dy);
      ctx.lineTo(x - w / 2 + dx, y - h - dy);
      ctx.closePath();
      ctx.fill();
      // Parapet highlight edge
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.24 - night * 0.16).toFixed(2) + ')';
      ctx.lineWidth = Math.max(1, w * 0.025);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h);
      ctx.lineTo(x + w / 2, y - h);
      ctx.lineTo(x + w / 2 + dx, y - h - dy);
      ctx.stroke();
    }
    return {dx, dy};
  }

  // Pick a calm, non-flickering window fill for day (glass) or night (warm/cool lights).
  function windowColor(seed, night, warmBias, litRate) {
    const h = hash(seed);
    if (night > 0.12) {
      const isLit = h < litRate;
      if (!isLit) {
        return lerpCol('#304359', '#0e1828', night);
      }
      const temp = hash(seed * 2.3 + 7.1);
      let litHex = '#ffd778';
      if (temp > warmBias) {
        litHex = temp > warmBias + 0.12 ? '#ccecff' : '#e6f5ff';
      } else if (temp < 0.25) {
        litHex = '#ffbe58';
      } else if (temp > warmBias - 0.15) {
        litHex = '#ffebb0';
      }
      return lerpCol('#688aa8', litHex, clamp01((night - 0.10) * 1.45));
    }
    // Daytime glass: sky reflection tones with slight panel-to-panel variation
    if (h < 0.32) return '#8ec3e2';
    if (h < 0.72) return '#6ea5c9';
    return '#a8d6ef';
  }

  // City building renderer with 6 distinct architectural archetypes, glass vs night windows,
  // side-wall windows, setbacks, penthouse/HVAC/antennas/rooftop signs.
  function drawCityBuilding(id, x, y, sc, w, h, alpha, night, d) {
    const arch = Math.floor(hash(id * 11.3) * 6); // 0..5
    const wallPal = [
      ['#cfd8e0', '#8fa2b2', '#647687'], // concrete cool grey
      ['#b5c9d8', '#7591a8', '#4e657a'], // steel blue-grey
      ['#dfd5c5', '#a99c88', '#7a6f60'], // warm limestone
      ['#c99c88', '#8f6252', '#664338'], // terracotta brick
      ['#9eb2c4', '#5c758c', '#3d5166'], // slate blue
      ['#d6dce2', '#97a3b0', '#636f7d'], // light architectural grey
    ];
    const pal = wallPal[Math.floor(hash(id * 5.7) * wallPal.length)];
    const nightShade = clamp01(night * 0.78);
    const frontCol = lerpCol(pal[0], '#1b273b', nightShade);
    const sideCol = lerpCol(pal[1], '#111a2b', nightShade);
    const roofCol = lerpCol(pal[2], '#152033', nightShade);

    const widthMul = arch === 5 ? 1.48 : arch === 3 ? 1.28 : arch === 0 ? 1.12 : 1.20;
    const heightMul = arch === 0 ? 3.9 : arch === 1 ? 3.2 : arch === 4 ? 3.5 : arch === 2 ? 2.55 : arch === 3 ? 2.15 : 1.60;
    const boostScale = d < 0.35 ? 1.18 : 1.0;
    const bw = w * widthMul * boostScale * (0.9 + hash(id * 3.1) * 0.25);
    const bh = h * heightMul * boostScale * (0.85 + hash(id * 7.9) * 0.38);
    const dep = (12 + hash(id * 13.7) * 7) * sc * boostScale;

    // Ground contact shadow
    ctx.save();
    ctx.globalAlpha = alpha * (0.28 + night * 0.14);
    ctx.fillStyle = '#09121e';
    ctx.beginPath();
    ctx.ellipse(x + dep * 0.2, y + 2 * sc, bw * 0.65, 4.2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const isLowLod = d < 0.24 || bw < 14;
    const {dx, dy} = drawBox3D(x, y, bw, bh, dep, frontCol, sideCol, roofCol, false, night);

    // Architectural windows: office bands vs residential grid vs glass curtain
    const warmBias = (arch === 0 || arch === 1) ? 0.58 : 0.86;
    const litRate = arch === 3 ? 0.68 : arch === 2 ? 0.52 : 0.44;

    if (arch === 0) {
      // Glass curtain-wall skyscraper with vertical mullions and horizontal spandrel bands
      const floors = isLowLod ? 4 : Math.max(4, Math.min(8, Math.round(bh / (8.5 * sc))));
      const cols = isLowLod ? 2 : Math.max(3, Math.min(5, Math.round(bw / (8 * sc))));
      const padX = bw * 0.10, padY = bh * 0.08;
      const cw = (bw - padX * 2) / cols;
      const fh = (bh * 0.84) / floors;
      for (let r = 0; r < floors; r++) {
        const wy = y - bh + padY + r * fh;
        for (let c = 0; c < cols; c++) {
          const wx = x - bw / 2 + padX + c * cw;
          ctx.fillStyle = windowColor(id * 71 + r * 17 + c * 29, night, warmBias, litRate);
          ctx.fillRect(wx + 0.8, wy + 0.8, Math.max(1.5, cw - 1.6), Math.max(1.5, fh * 0.66));
        }
        // Day diagonal glass sheen
        if (night < 0.4 && !isLowLod && r % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.18 * (1 - night * 2)).toFixed(2) + ')';
          ctx.fillRect(x - bw / 2 + padX, wy + 1, bw * 0.28, Math.max(1, fh * 0.55));
        }
      }
      // Side wall window strips
      if (!isLowLod && dx > 4) {
        for (let r = 0; r < floors; r++) {
          const wy = y - bh + padY + r * fh;
          ctx.fillStyle = windowColor(id * 89 + r * 19, night, warmBias, litRate * 0.85);
          ctx.beginPath();
          ctx.moveTo(x + bw / 2 + dx * 0.18, wy + 1 - dy * 0.18);
          ctx.lineTo(x + bw / 2 + dx * 0.82, wy + 1 - dy * 0.82);
          ctx.lineTo(x + bw / 2 + dx * 0.82, wy + fh * 0.6 - dy * 0.82);
          ctx.lineTo(x + bw / 2 + dx * 0.18, wy + fh * 0.6 - dy * 0.18);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (arch === 1 || arch === 4) {
      // Modern office / stepped tower with horizontal window bands
      const floors = isLowLod ? 3 : Math.max(3, Math.min(7, Math.round(bh / (9.5 * sc))));
      const cols = isLowLod ? 2 : Math.max(3, Math.min(4, Math.round(bw / (9 * sc))));
      const padX = bw * 0.11, padY = bh * 0.09;
      const cw = (bw - padX * 2) / cols;
      const fh = (bh * 0.80) / floors;
      for (let r = 0; r < floors; r++) {
        const wy = y - bh + padY + r * fh;
        // Dark window sill band
        if (!isLowLod) {
          ctx.fillStyle = 'rgba(15,28,44,0.28)';
          ctx.fillRect(x - bw / 2 + padX * 0.8, wy, bw - padX * 1.6, fh * 0.62);
        }
        for (let c = 0; c < cols; c++) {
          const wx = x - bw / 2 + padX + c * cw;
          ctx.fillStyle = windowColor(id * 53 + r * 23 + c * 11, night, warmBias, litRate);
          ctx.fillRect(wx + 0.8, wy + 0.8, Math.max(1.5, cw - 1.8), Math.max(1.5, fh * 0.52));
        }
      }
      // Side facade windows
      if (!isLowLod && dx > 4) {
        for (let r = 0; r < floors; r += 1) {
          const wy = y - bh + padY + r * fh;
          ctx.fillStyle = windowColor(id * 67 + r * 13, night, warmBias, litRate * 0.8);
          ctx.beginPath();
          ctx.moveTo(x + bw / 2 + dx * 0.22, wy + 1 - dy * 0.22);
          ctx.lineTo(x + bw / 2 + dx * 0.78, wy + 1 - dy * 0.78);
          ctx.lineTo(x + bw / 2 + dx * 0.78, wy + fh * 0.48 - dy * 0.78);
          ctx.lineTo(x + bw / 2 + dx * 0.22, wy + fh * 0.48 - dy * 0.22);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else {
      // Residential apartment / commercial / brick block: discrete framed windows
      const floors = isLowLod ? 2 : Math.max(2, Math.min(5, Math.round(bh / (11 * sc))));
      const cols = isLowLod ? 2 : Math.max(2, Math.min(4, Math.round(bw / (10 * sc))));
      const padX = bw * 0.14, padY = bh * 0.11;
      const cw = (bw - padX * 2) / cols;
      const fh = (bh * 0.72) / floors;
      for (let r = 0; r < floors; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = x - bw / 2 + padX + c * cw + cw * 0.16;
          const wy = y - bh + padY + r * fh;
          const ww = Math.max(1.6, cw * 0.64), wh = Math.max(1.8, fh * 0.56);
          if (!isLowLod) {
            ctx.fillStyle = 'rgba(20,30,45,0.35)';
            ctx.fillRect(wx - 0.6, wy - 0.6, ww + 1.2, wh + 1.2);
          }
          ctx.fillStyle = windowColor(id * 41 + r * 31 + c * 17, night, warmBias, litRate);
          ctx.fillRect(wx, wy, ww, wh);
        }
      }
      // Side facade windows
      if (!isLowLod && dx > 4.5) {
        for (let r = 0; r < floors; r++) {
          const wy = y - bh + padY + r * fh;
          ctx.fillStyle = windowColor(id * 61 + r * 29, night, warmBias, litRate * 0.85);
          ctx.fillRect(x + bw / 2 + dx * 0.36, wy - dy * 0.36, Math.max(1.5, dx * 0.26), Math.max(1.8, fh * 0.48));
        }
      }
      // Ground-floor storefront glow for commercial buildings (arch 3 & 5)
      if ((arch === 3 || arch === 5) && !isLowLod) {
        const storeCol = night > 0.15
          ? lerpCol('#7fa6c2', '#ffd478', clamp01(night * 1.4))
          : '#5a88aa';
        ctx.fillStyle = storeCol;
        ctx.fillRect(x - bw * 0.36, y - bh * 0.15, bw * 0.72, bh * 0.11);
      }
    }

    // Rooftop crowns: setback penthouse (0,4), HVAC/water tank (1,2), neon/lit billboard (3), antenna
    if (arch === 0 || arch === 4) {
      const pw = bw * 0.56, ph = bh * 0.16;
      const px = x - bw * 0.05, py = y - bh - dy * 0.22;
      drawBox3D(px, py, pw, ph, dep * 0.55, frontCol, sideCol, roofCol, false, night);
      // Spire + aviation obstruction light at night
      const antX = px + pw * 0.12, antY = py - ph - dy * 0.2;
      ctx.strokeStyle = lerpCol('#708499', '#3a4b63', night);
      ctx.lineWidth = Math.max(1, 1.4 * sc);
      ctx.beginPath(); ctx.moveTo(antX, antY); ctx.lineTo(antX, antY - 11 * sc); ctx.stroke();
      if (night > 0.15) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,72,64,' + (night * 0.95).toFixed(2) + ')';
        ctx.shadowColor = '#ff443a';
        ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(antX, antY - 11 * sc, Math.max(1.4, 2.0 * sc), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (arch === 3 && !isLowLod) {
      // Rooftop illuminated billboard / sign
      const signCols = ['#ff6b4a', '#ffd23d', '#4ce0ff', '#ff80ab'];
      const scCol = signCols[Math.floor(hash(id * 19.1) * signCols.length)];
      const sw = bw * 0.62, sh = Math.max(3, 6.5 * sc);
      const sx = x - sw / 2 + dx * 0.25, sy = y - bh - dy * 0.25 - sh;
      ctx.fillStyle = '#243242';
      ctx.fillRect(sx + 2, sy + sh, 1.5, 3 * sc);
      ctx.fillRect(sx + sw - 3.5, sy + sh, 1.5, 3 * sc);
      ctx.save();
      if (night > 0.15) {
        ctx.shadowColor = scCol;
        ctx.shadowBlur = 9 * night;
      }
      ctx.fillStyle = night > 0.15 ? scCol : lerpCol(scCol, '#ffffff', 0.25);
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
    } else if (!isLowLod && (arch === 1 || arch === 2)) {
      // Rooftop mechanical penthouse / water tower
      const mw = bw * 0.32, mh = Math.max(3, 5.5 * sc);
      drawBox3D(x - bw * 0.12 + dx * 0.25, y - bh - dy * 0.25, mw, mh, dep * 0.4,
        lerpCol('#8fa0b0', '#243247', night), lerpCol('#657687', '#182436', night), roofCol, false, night);
    }
  }

  // Forest cluster: 3-5 layered trees (conifers + broadleaves), varied greens + occasional autumn/rock/cabin.
  function drawForestCluster(id, x, y, sc, night) {
    const trees = 3 + Math.floor(hash(id * 9.3) * 2.5);
    const conifPals = [
      ['#1b4d2e', '#26683f', '#388a55'],
      ['#1f5438', '#2d724c', '#459666'],
      ['#1a4532', '#265e44', '#397d5c'],
    ];
    const broadPals = [
      ['#245e2b', '#38853c', '#5cb356'],
      ['#366828', '#528f36', '#79b84e'],
      ['#2a5c3b', '#3e7f52', '#5ea671'],
      ['#785224', '#a87028', '#d49538'], // occasional golden-amber autumn crown
    ];

    // Cluster shadow on forest floor
    ctx.fillStyle = 'rgba(10,30,18,' + (0.28 + night * 0.12).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(x + 2 * sc, y + 2 * sc, 28 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let t = 0; t < trees; t++) {
      const ts = id * 37 + t * 13.7;
      const ox = (t - (trees - 1) * 0.5) * 11 * sc + (hash(ts + 1) - 0.5) * 8 * sc;
      const oy = (hash(ts + 2) - 0.5) * 6 * sc;
      const tSc = sc * (0.95 + hash(ts + 3) * 0.52);
      const isConifer = hash(ts + 4) > 0.42;
      const tx = x + ox, ty = y + oy;

      // Trunk
      ctx.fillStyle = lerpCol('#4e3629', '#1f1814', night * 0.7);
      ctx.fillRect(tx - 1.7 * tSc, ty - 7 * tSc, 3.4 * tSc, 7.5 * tSc);

      if (isConifer) {
        const cp = conifPals[Math.floor(hash(ts + 5) * conifPals.length)];
        const cDark = lerpCol(cp[0], '#0d2219', night * 0.72);
        const cMid = lerpCol(cp[1], '#143024', night * 0.72);
        const cLit = lerpCol(cp[2], '#1d4233', night * 0.72);
        for (let tier = 0; tier < 3; tier++) {
          const wTier = (11.5 - tier * 2.5) * tSc;
          const yBase = ty - (5 + tier * 7.5) * tSc;
          const yTip = yBase - (11 - tier * 1.2) * tSc;
          ctx.fillStyle = tier === 0 ? cDark : tier === 1 ? cMid : cLit;
          ctx.beginPath();
          ctx.moveTo(tx - wTier, yBase);
          ctx.lineTo(tx, yTip);
          ctx.lineTo(tx + wTier, yBase);
          ctx.closePath();
          ctx.fill();
          // Right-side sun rim on pine tier
          ctx.fillStyle = cLit;
          ctx.beginPath();
          ctx.moveTo(tx, yTip);
          ctx.lineTo(tx + wTier, yBase);
          ctx.lineTo(tx + wTier * 0.15, yBase);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const bIdx = hash(ts + 5) > 0.88 ? 3 : Math.floor(hash(ts + 6) * 3);
        const bp = broadPals[bIdx];
        const bDark = lerpCol(bp[0], '#0f2419', night * 0.72);
        const bMid = lerpCol(bp[1], '#163324', night * 0.72);
        const bLit = lerpCol(bp[2], '#204532', night * 0.72);
        ctx.fillStyle = bDark;
        ctx.beginPath(); ctx.ellipse(tx, ty - 12 * tSc, 11.5 * tSc, 8.5 * tSc, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bMid;
        ctx.beginPath(); ctx.ellipse(tx - 4 * tSc, ty - 15 * tSc, 8 * tSc, 6.2 * tSc, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx + 5 * tSc, ty - 14 * tSc, 7.5 * tSc, 5.8 * tSc, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bLit;
        ctx.beginPath(); ctx.ellipse(tx + 2 * tSc, ty - 17.5 * tSc, 5.5 * tSc, 4.0 * tSc, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Rare woodland cabin with warm lit window at night
    if (hash(id * 23.1) > 0.88) {
      const cx = x + 11 * sc, cy = y + 2 * sc;
      drawBox3D(cx, cy, 13 * sc, 8 * sc, 7 * sc,
        lerpCol('#b58963', '#362920', night * 0.7),
        lerpCol('#876244', '#241b15', night * 0.7),
        lerpCol('#6d4c41', '#2b1e19', night * 0.7), true, night);
      ctx.fillStyle = night > 0.18 ? '#ffd875' : '#6c92ab';
      ctx.fillRect(cx - 2.5 * sc, cy - 5.2 * sc, 3.2 * sc, 3.0 * sc);
    }
  }

  // Harbour suburb house / farmstead with varied walls, chimneys, multi-windows and garden hedges.
  function drawSuburbHouse(id, x, y, sc, w, h, roof, night) {
    const wallCols = ['#f4ede0', '#eae4d7', '#f0dfd1', '#dde6ec', '#e9d8be'];
    const sideCols = ['#cfc5b4', '#c2baa8', '#c8b4a4', '#b5c2cc', '#c4b094'];
    const wi = Math.floor(hash(id * 7.1) * wallCols.length);
    const isBarn = hash(id * 17.3) > 0.86;
    const bw = w * (isBarn ? 1.25 : (0.88 + hash(id * 3.3) * 0.24));
    const bh = h * (isBarn ? 1.15 : (0.90 + hash(id * 4.7) * 0.26));
    const dep = (10 + hash(id * 5.9) * 5) * sc;

    const frontCol = lerpCol(isBarn ? '#b83b2e' : wallCols[wi], '#262e3d', night * 0.72);
    const sideCol = lerpCol(isBarn ? '#88271e' : sideCols[wi], '#19202e', night * 0.72);
    const roofCol = lerpCol(isBarn ? '#5c463c' : roof, '#211c24', night * 0.72);

    // Ground shadow
    ctx.fillStyle = 'rgba(20,45,25,' + (0.26 + night * 0.10).toFixed(2) + ')';
    ctx.beginPath();
    ctx.ellipse(x + 3 * sc, y + 2.5 * sc, bw * 0.68, 4.2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chimney on half the houses
    if (!isBarn && hash(id * 13.1) > 0.45) {
      ctx.fillStyle = lerpCol('#7d4f44', '#2b2022', night * 0.7);
      ctx.fillRect(x + bw * 0.16, y - bh * 1.48, 3.5 * sc, bh * 0.45);
    }

    drawBox3D(x, y, bw, bh, dep, frontCol, sideCol, roofCol, true, night);

    // Front windows & door
    const winCol1 = windowColor(id * 19 + 1, night, 0.92, 0.72);
    const winCol2 = windowColor(id * 19 + 2, night, 0.92, 0.72);
    ctx.fillStyle = winCol1;
    ctx.fillRect(x - bw * 0.30, y - bh * 0.66, 4.4 * sc, 4.2 * sc);
    ctx.fillStyle = winCol2;
    ctx.fillRect(x + bw * 0.08, y - bh * 0.66, 4.4 * sc, 4.2 * sc);
    // Door
    ctx.fillStyle = lerpCol('#5e4033', '#231918', night * 0.7);
    ctx.fillRect(x - bw * 0.10, y - bh * 0.36, 3.8 * sc, bh * 0.36);

    // Garden tree or hedge beside house
    if (hash(id * 29.7) > 0.35) {
      const gx = x + bw * 0.78, gy = y;
      ctx.fillStyle = lerpCol('#296e31', '#112a1c', night * 0.72);
      ctx.beginPath(); ctx.ellipse(gx, gy - 3 * sc, 7.5 * sc, 5.5 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lerpCol('#46a14b', '#193d29', night * 0.72);
      ctx.beginPath(); ctx.ellipse(gx - 1.5 * sc, gy - 5.5 * sc, 5.2 * sc, 4.2 * sc, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function townElement(i, x, y, sc, w, h, zone, alpha, roof, night, d) {
    if (alpha <= 0.01 || zone === 1) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (zone === 2) {
      drawCityBuilding(i, x, y, sc, w, h, alpha, night, d);
    } else if (zone === 3) {
      drawForestCluster(i, x, y, sc, night);
    } else {
      drawSuburbHouse(i, x, y, sc, w, h, roof, night);
    }
    ctx.restore();
  }

  // Storm cell: tall cumulonimbus silhouette, dark anvil base, branched bolt & rain curtain.
  function stormCloud(x, y, sc) {
    const cur = ctx.createLinearGradient(0, y + 16 * sc, 0, y + 66 * sc);
    cur.addColorStop(0, 'rgba(145,188,235,0.38)');
    cur.addColorStop(1, 'rgba(145,188,235,0)');
    ctx.fillStyle = cur;
    ctx.beginPath();
    ctx.moveTo(x - 36 * sc, y + 16 * sc);
    ctx.lineTo(x + 36 * sc, y + 16 * sc);
    ctx.lineTo(x + 48 * sc, y + 66 * sc);
    ctx.lineTo(x - 48 * sc, y + 66 * sc);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(205,234,255,0.48)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(x + i * 10 * sc, y + 20 * sc);
      ctx.lineTo(x + i * 10 * sc - 6 * sc, y + 54 * sc);
    }
    ctx.stroke();

    const g = ctx.createLinearGradient(0, y - 54 * sc, 0, y + 26 * sc);
    g.addColorStop(0, '#8598b0');
    g.addColorStop(0.45, '#4b5b73');
    g.addColorStop(1, '#202b3d');
    ctx.fillStyle = g;
    ctx.beginPath();
    const towers = [[-30, 8, 21], [-12, -16, 24], [8, -30, 22], [26, -12, 20], [36, 8, 17], [0, 6, 30], [-38, 16, 15], [40, 16, 14]];
    for (const [dx, dy, r] of towers) {
      ctx.moveTo(x + (dx + r) * sc, y + dy * sc);
      ctx.arc(x + dx * sc, y + dy * sc, r * sc, 0, Math.PI * 2);
    }
    ctx.fill();

    // Rim highlight on sunlit upper-right dome
    ctx.fillStyle = 'rgba(220,235,255,0.16)';
    ctx.beginPath(); ctx.arc(x + 11 * sc, y - 28 * sc, 16 * sc, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(10,16,28,0.38)';
    ctx.beginPath(); ctx.ellipse(x, y + 17 * sc, 45 * sc, 9.5 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,205,255,0.34)';
    ctx.beginPath(); ctx.ellipse(x - 6 * sc, y + 2 * sc, 21 * sc, 10.5 * sc, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.shadowColor = '#7ec3ff';
    ctx.shadowBlur = 14;
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

  function boat(x, y, sc, flip, kind = 0, night = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * flip, sc);
    // Wake foam V-trail
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.58 - night * 0.25).toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 6); ctx.lineTo(-48, 17);
    ctx.moveTo(-16, 6); ctx.lineTo(-42, -2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,245,255,' + (0.28 - night * 0.12).toFixed(2) + ')';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-18, 7); ctx.lineTo(-34, 12);
    ctx.stroke();

    if (kind === 1) {
      // Offshore cargo / coastal vessel
      ctx.fillStyle = lerpCol('#304152', '#172230', night * 0.7);
      ctx.beginPath();
      ctx.moveTo(-26, -1); ctx.lineTo(28, -1); ctx.lineTo(22, 10); ctx.lineTo(-22, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = lerpCol('#c94030', '#5e211b', night * 0.65);
      ctx.fillRect(-25, 7, 48, 3);
      // Stacked deck containers
      ctx.fillStyle = lerpCol('#e67e22', '#6b3e17', night * 0.6);
      ctx.fillRect(-16, -7, 11, 6);
      ctx.fillStyle = lerpCol('#2980b9', '#1b4868', night * 0.6);
      ctx.fillRect(-4, -7, 10, 6);
      // Bridge superstructure
      ctx.fillStyle = lerpCol('#f0f4f8', '#68798c', night * 0.6);
      ctx.fillRect(9, -12, 10, 11);
      if (night > 0.15) {
        ctx.fillStyle = '#ffe082';
        ctx.fillRect(11, -10, 6, 3);
        ctx.fillStyle = '#ff5252';
        ctx.beginPath(); ctx.arc(-22, -3, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(14, -15, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // Harbour sailboat
      ctx.fillStyle = lerpCol('#f4f6f8', '#738599', night * 0.6);
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(20, 0); ctx.lineTo(14, 9); ctx.lineTo(-12, 9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = lerpCol('#e8322a', '#6b1d19', night * 0.6);
      ctx.fillRect(-18, -2, 38, 3);
      ctx.fillStyle = lerpCol('#2471a3', '#163b57', night * 0.6);
      ctx.fillRect(-4, -10, 13, 8);
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(4, -25); ctx.stroke();
      ctx.fillStyle = lerpCol('#ffffff', '#8fa3ba', night * 0.55);
      ctx.beginPath();
      ctx.moveTo(4, -25); ctx.lineTo(4, -11); ctx.lineTo(16, -11);
      ctx.closePath(); ctx.fill();
      if (night > 0.15) {
        ctx.fillStyle = '#ffdf78';
        ctx.fillRect(-1, -8, 6, 3);
        ctx.fillStyle = '#2eff8a';
        ctx.beginPath(); ctx.arc(17, -2, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- main draw ----------
  function draw(s, screen, best) {
    const altF = clamp01((s.alt - 420) / 2380);
    const hor = 300 + s.pitch * 22 - altF * 30;
    camPar = (640 - s.x) * 0.55;
    gAltF = altF;
    const shX = camPar * 0.85;

    // ===== scenery zones along the route =====
    const ZONE_LEN = 12, LOOKAHEAD = 1.2;
    function zoneAt(route) {
      const p = ((route / ZONE_LEN) % 4 + 4) % 4;
      const a = Math.floor(p), fr = p - a;
      const bl = clamp01((fr - 0.82) / 0.18);
      const f = bl * bl * (3 - 2 * bl);
      const b = (a + 1) % 4;
      return {a, b, f, wSea: a === 1 ? 1 - f : b === 1 ? f : 0};
    }
    const pMix = (cols, z) => z.f <= 0 ? cols[z.a] : lerpCol(cols[z.a], cols[z.b], z.f);
    const camZ = zoneAt(s.dist);
    const aheadZ = zoneAt(s.dist + LOOKAHEAD * 0.72);
    const seaW = camZ.wSea;
    const wts = [0, 0, 0, 0];
    wts[camZ.a] = 1 - camZ.f;
    wts[camZ.b] += camZ.f;
    const cityW = (aheadZ.a === 2 ? 1 - aheadZ.f : aheadZ.b === 2 ? aheadZ.f : 0) * 0.65 + wts[2] * 0.35;
    const forestW = (aheadZ.a === 3 ? 1 - aheadZ.f : aheadZ.b === 3 ? aheadZ.f : 0) * 0.55 + wts[3] * 0.45;
    seaShift = -seaW * 1200;

    // Day cycle driven by run progress
    const prog = s.time + s.left > 0 ? clamp01(s.time / (s.time + s.left)) : 0;
    const day = dayAt(prog);

    // ===== world, rolled slightly with bank around the horizon =====
    ctx.save();
    ctx.translate(640, hor);
    ctx.rotate(-s.bank * 0.10);
    ctx.translate(-640, -hor);

    // 1. Sky gradient
    let g = ctx.createLinearGradient(0, -120, 0, hor + 42);
    g.addColorStop(0, day.top);
    g.addColorStop(0.45, day.mid);
    g.addColorStop(0.78, day.low);
    g.addColorStop(1, day.hor);
    ctx.fillStyle = g;
    ctx.fillRect(-140, -120, W + 280, hor + 162);

    // Night stars with subtle size and colour-temperature variation
    if (day.night > 0.03) {
      for (let i = 0; i < 68; i++) {
        const sx = hash(i * 3.9) * (W + 220) - 110;
        const sy = hash(i * 7.7) * Math.max(40, hor - 65);
        const sz = 1.1 + hash(i * 5.3) * 1.6;
        const st = hash(i * 9.1);
        const col = st > 0.72 ? '210,232,255' : st < 0.25 ? '255,235,205' : '255,255,255';
        ctx.fillStyle = `rgba(${col},${(day.night * (0.45 + 0.50 * hash(i * 2.1))).toFixed(3)})`;
        ctx.fillRect(sx, sy, sz, sz);
      }
    }

    // Sun on upper-right sky
    const sunX = 1052;
    if (day.sunA > 0.01) {
      ctx.save();
      ctx.globalAlpha = day.sunA;
      const sun = ctx.createRadialGradient(sunX, day.sunY, 8, sunX, day.sunY, 260);
      sun.addColorStop(0, mixRgba(day.sunCore, 0.92));
      sun.addColorStop(0.26, mixRgba(day.sunRim, 0.45));
      sun.addColorStop(1, mixRgba(day.sunRim, 0));
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - 270, day.sunY - 220, 540, 480);
      ctx.fillStyle = day.sunRim;
      ctx.beginPath(); ctx.arc(sunX, day.sunY, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = day.sunCore;
      ctx.beginPath(); ctx.arc(sunX, day.sunY, 41, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Moon on the upper-right open sky (clear of clouds and HUD) so its reflection falls cleanly on the sea
    const moonX = 1138;
    if (day.night > 0.22) {
      ctx.save();
      ctx.globalAlpha = clamp01((day.night - 0.22) * 1.35);
      const mg = ctx.createRadialGradient(moonX, day.moonY, 8, moonX, day.moonY, 120);
      mg.addColorStop(0, 'rgba(220,236,255,0.55)');
      mg.addColorStop(0.4, 'rgba(180,210,248,0.20)');
      mg.addColorStop(1, 'rgba(180,210,248,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(moonX - 125, day.moonY - 125, 250, 250);
      ctx.fillStyle = '#edf3fc';
      ctx.beginPath(); ctx.arc(moonX, day.moonY, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cfdbe8';
      ctx.beginPath(); ctx.arc(moonX - 8, day.moonY - 7, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 9, day.moonY + 8, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 5, day.moonY - 10, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 2. Clouds (far hazy layer + near volumetric layer; respects cloudShift)
    const csh = s.cloudShift || 0;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 251 + s.dist * 22 + csh * 0.6) % 1560) - 140, cy = 42 + (i % 3) * 35;
      ctx.save();
      ctx.globalAlpha = 0.46;
      cloud(cx, cy, 0.62, day, i);
      ctx.restore();
    }
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 173 + s.dist * 46 + csh) % 1540) - 130, cy = 54 + (i % 3) * 52;
      cloud(cx, cy, 0.94, day, i + 1);
    }

    // 3. Far ridgelines on LAND side only (never over open sea)
    const ridgeMax = 746 + shX + seaShift;
    if (seaW < 0.99) {
      const nMix = day.night * 0.78;
      ridge(hor + 4, 62, 11.3, lerpCol('#7098be', '#12213b', nMix), lerpCol('#9ac0e0', '#1c3154', nMix), 0.72 * (1 - seaW), camPar * 0.16, ridgeMax);
      ridge(hor + 6, 84, 47.9, lerpCol('#517c60', '#0e1e2c', nMix), lerpCol('#79a87d', '#183042', nMix), 0.88 * (1 - seaW), camPar * 0.28, ridgeMax);
      ridge(hor + 8, 54, 83.1, lerpCol('#386948', '#0b1821', nMix), lerpCol('#589460', '#142936', nMix), 1 - seaW, camPar * 0.40, ridgeMax);
      // City horizon skyline silhouette (land side only)
      citySkyline(hor + 2, cityW * (1 - seaW), day.night, day, ridgeMax, camPar);
    }

    // Horizon atmospheric haze band
    const hz = ctx.createLinearGradient(0, hor - 28, 0, hor + 16);
    hz.addColorStop(0, mixRgba(day.hazeHex, 0));
    hz.addColorStop(1, mixRgba(day.hazeHex, 0.34 * (1 - day.night * 0.45)));
    ctx.fillStyle = hz;
    ctx.fillRect(-140, hor - 28, W + 280, 44);

    // 4. Ground base (blended with zone and day-cycle palette)
    let gTop = day.groundTop, gBot = day.groundBot;
    if (wts[2] > 0.01) {
      gTop = lerpCol(gTop, lerpCol('#6e7573', '#151c29', day.night * 0.85), wts[2] * 0.75);
      gBot = lerpCol(gBot, lerpCol('#4c5457', '#0e131e', day.night * 0.85), wts[2] * 0.85);
    }
    if (forestW > 0.01) {
      gTop = lerpCol(gTop, lerpCol('#357042', '#0b1c17', day.night * 0.82), forestW * 0.55);
      gBot = lerpCol(gBot, lerpCol('#1e4f2d', '#071411', day.night * 0.82), forestW * 0.55);
    }
    g = ctx.createLinearGradient(0, hor, 0, H + 70);
    g.addColorStop(0, gTop);
    g.addColorStop(0.35, lerpCol(gTop, gBot, 0.45));
    g.addColorStop(1, gBot);
    ctx.fillStyle = g;
    ctx.fillRect(-140, hor, W + 280, H + 70 - hor);

    // Soft drifting cloud shadows on terrain
    ctx.fillStyle = 'rgba(10,30,25,' + (0.12 * (1 - day.night * 0.7)).toFixed(3) + ')';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 317 + s.dist * 90) % 1510) - 120, cy = hor + 70 + (i % 3) * 130;
      ctx.beginPath(); ctx.ellipse(cx, cy, 92, 20, 0, 0, Math.PI * 2); ctx.fill();
    }

    // 5. Zone-specific ground surfaces (all receding toward vanishing point, never diagonal drift)
    // Urban waterfront apron extending to the shore in Zone 2
    if (wts[2] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[2] * 0.92;
      const [ua, uay] = groundPoint(-0.18, 0.02, hor), [ub, uby] = groundPoint(0.55, 0.02, hor);
      const [uc, ucy] = groundPoint(0.55, 1.05, hor), [ud, udy] = groundPoint(-0.18, 1.05, hor);
      ctx.fillStyle = lerpCol('#727980', '#161e2b', day.night * 0.82);
      ctx.beginPath();
      ctx.moveTo(ua, uay); ctx.lineTo(ub, uby); ctx.lineTo(uc, ucy); ctx.lineTo(ud, udy);
      ctx.closePath();
      ctx.fill();
      // Waterfront promenade curb & trees/lamps along shore edge
      ctx.strokeStyle = lerpCol('#9aa3ab', '#2a374d', day.night * 0.78);
      ctx.lineWidth = 3;
      const [pa, pay] = groundPoint(0.18, 0.04, hor), [pb, pby] = groundPoint(0.24, 1.02, hor);
      ctx.beginPath(); ctx.moveTo(pa, pay); ctx.lineTo(pb, pby); ctx.stroke();
      ctx.restore();
    }

    const fieldPals = [
      ['#e5b83b', '#d49a2a', '#b9cf5a', '#7fb84e', '#edd05c', '#98c44d'],
      ['#e5b83b', '#d49a2a', '#b9cf5a', '#7fb84e', '#edd05c', '#98c44d'],
      ['#696f73', '#5c6268', '#636a6e', '#52585e', '#70767a', '#596065'],
      ['#2f753e', '#266235', '#3a8446', '#21552f', '#428f4d', '#245831'],
    ];
    const fscroll = (s.dist * 0.045) % 0.185;
    const fcycle = Math.floor(s.dist * 0.045 / 0.185);
    for (let row = 0; row < 5; row++) {
      const d0 = 0.06 + row * 0.185 + fscroll, d1 = d0 + 0.165;
      const [ax, ay] = groundPoint(-1.14, d0, hor), [bx, by] = groundPoint(-0.17, d0, hor);
      const [cx2, cy2] = groundPoint(-0.17, d1, hor), [dx2, dy2] = groundPoint(-1.14, d1, hor);
      const rowZ = zoneAt(s.dist + (1 - (d0 + d1) / 2) * LOOKAHEAD);
      const ci = (row + 1 + fcycle) % 6;
      const dayField = pMix(fieldPals.map(p => p[ci]), rowZ);
      const rowCityW = rowZ.a === 2 ? 1 - rowZ.f : rowZ.b === 2 ? rowZ.f : 0;
      const rowForestW = rowZ.a === 3 ? 1 - rowZ.f : rowZ.b === 3 ? rowZ.f : 0;
      // In forest zone, draw soft organic meadow glades instead of rigid rectangular farm blocks
      if (rowForestW > 0.45) {
        ctx.save();
        ctx.globalAlpha = 0.38 * (1 - rowZ.wSea) * rowForestW;
        const [gx, gy] = groundPoint(-0.66 + (hash(ci * 3.7) - 0.5) * 0.45, (d0 + d1) * 0.5, hor);
        const rx = (110 + d0 * 160), ry = (16 + d0 * 24);
        ctx.fillStyle = lerpCol(dayField, '#131a26', day.night * 0.78);
        ctx.beginPath(); ctx.ellipse(gx, gy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = lerpCol(dayField, '#131a26', day.night * 0.78);
        ctx.globalAlpha = 0.92 * (1 - rowZ.wSea) * (1 - rowForestW);
        ctx.beginPath();
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.lineTo(dx2, dy2);
        ctx.closePath(); ctx.fill();
      }

      // Zone 0 farmland furrow lines + hedgerow borders; Zone 2 urban street grid & parks; Zone 3 forest glades
      if (rowCityW > 0.35) {
        // Urban block paved border & occasional park patch
        ctx.globalAlpha = (1 - rowZ.wSea) * rowCityW;
        if (ci % 3 === 0) {
          const [px1, py1] = groundPoint(-0.60, d0 + 0.02, hor), [px2, py2] = groundPoint(-0.22, d0 + 0.02, hor);
          const [px3, py3] = groundPoint(-0.22, d1 - 0.02, hor), [px4, py4] = groundPoint(-0.60, d1 - 0.02, hor);
          ctx.fillStyle = lerpCol('#3f7a47', '#0f2419', day.night * 0.78);
          ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.lineTo(px3, py3); ctx.lineTo(px4, py4); ctx.closePath(); ctx.fill();
        }
        // Cross avenue separating urban blocks
        const [sx1, sy1] = groundPoint(-1.16, d1 - 0.015, hor), [sx2, sy2] = groundPoint(-0.15, d1 - 0.015, hor);
        const [sx3, sy3] = groundPoint(-0.15, d1 + 0.012, hor), [sx4, sy4] = groundPoint(-1.16, d1 + 0.012, hor);
        ctx.fillStyle = lerpCol('#353c45', '#151b26', day.night * 0.7);
        ctx.beginPath(); ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2); ctx.lineTo(sx3, sy3); ctx.lineTo(sx4, sy4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = lerpCol('rgba(220,225,235,0.45)', 'rgba(150,170,200,0.28)', day.night);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([7, 9]);
        const [mx1, my1] = groundPoint(-1.14, d1 - 0.001, hor), [mx2, my2] = groundPoint(-0.17, d1 - 0.001, hor);
        ctx.beginPath(); ctx.moveTo(mx1, my1); ctx.lineTo(mx2, my2); ctx.stroke();
        ctx.setLineDash([]);
      } else if (rowForestW <= 0.45) {
        // Farmland furrows (Zone 0)
        ctx.globalAlpha = (1 - rowZ.wSea) * (1 - rowCityW) * (1 - rowForestW);
        ctx.strokeStyle = lerpCol('#6e4e18', '#141a18', day.night * 0.8);
        ctx.globalAlpha *= 0.28;
        ctx.lineWidth = 1.5;
        for (let rI = 1; rI < 4; rI++) {
          const [lx, ly] = groundPoint(-1.12 + rI * 0.02, d0 + (d1 - d0) * rI / 4, hor);
          const [rx2, ry2] = groundPoint(-0.19, d0 + (d1 - d0) * rI / 4, hor);
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx2, ry2); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Urban longitudinal avenues (Zone 2): receding straight to the horizon between building columns
    if (wts[2] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[2];
      for (const [uL, uR, hasMedian] of [[-0.86, -0.78, true], [-0.47, -0.39, true], [-0.17, -0.10, false]]) {
        ctx.fillStyle = lerpCol('#363e47', '#131924', day.night * 0.72);
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const [rx, ry] = groundPoint(uL, 0.04 + (k / 6) * 1.04, hor);
          if (k === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        for (let k = 6; k >= 0; k--) {
          const [rx, ry] = groundPoint(uR, 0.04 + (k / 6) * 1.04, hor);
          ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        if (hasMedian) {
          ctx.strokeStyle = day.night > 0.25 ? 'rgba(255,212,115,0.55)' : 'rgba(255,255,255,0.58)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([8, 11]);
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) {
            const [rx, ry] = groundPoint((uL + uR) * 0.5, 0.04 + (k / 6) * 1.04, hor);
            if (k === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // Night streetlights + traffic headlights/taillights along city avenues
        if (day.night > 0.15) {
          for (let k = 0; k < 7; k++) {
            const ld = 0.12 + ((k / 7 + (s.dist * 0.03) % (1 / 7)) % 0.90);
            const [lx, ly] = groundPoint(uL - 0.008, ld, hor);
            const [rx, ry] = groundPoint(uR + 0.008, ld, hor);
            const rad = 4 + ld * 9;
            for (const [ptx, pty] of [[lx, ly], [rx, ry]]) {
              const lg = ctx.createRadialGradient(ptx, pty, 0.5, ptx, pty, rad);
              lg.addColorStop(0, 'rgba(255,210,120,' + (0.45 * day.night).toFixed(2) + ')');
              lg.addColorStop(1, 'rgba(255,190,90,0)');
              ctx.fillStyle = lg;
              ctx.beginPath(); ctx.ellipse(ptx, pty, rad, rad * 0.45, 0, 0, Math.PI * 2); ctx.fill();
            }
            if (k % 2 === 0 && hasMedian) {
              const [cxA, cyA] = groundPoint(uL + 0.02, ld, hor);
              const [cxB, cyB] = groundPoint(uR - 0.02, (ld + 0.08) % 0.96, hor);
              ctx.fillStyle = 'rgba(255,246,200,' + (0.85 * day.night).toFixed(2) + ')';
              ctx.beginPath(); ctx.arc(cxA, cyA, 1.3 + ld * 1.8, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = 'rgba(255,70,60,' + (0.85 * day.night).toFixed(2) + ')';
              ctx.beginPath(); ctx.arc(cxB, cyB, 1.3 + ld * 1.8, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
      }
      ctx.restore();
    }

    // Suburb road (Zone 0)
    if (wts[0] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[0];
      ctx.fillStyle = lerpCol('rgba(78,82,88,0.82)', 'rgba(22,28,38,0.88)', day.night);
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
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.65 - day.night * 0.25).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const [rx3, ry3] = groundPoint(-0.705, 0.05 + (i / 6) * 1.03, hor);
        if (i === 0) ctx.moveTo(rx3, ry3); else ctx.lineTo(rx3, ry3);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (day.night > 0.15) {
        for (let k = 0; k < 5; k++) {
          const ld = 0.16 + ((k / 5 + (s.dist * 0.02) % 0.2) % 0.80);
          const [lx, ly] = groundPoint(-0.745, ld, hor);
          const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 8 + ld * 10);
          lg.addColorStop(0, 'rgba(255,212,125,' + (0.5 * day.night).toFixed(2) + ')');
          lg.addColorStop(1, 'rgba(255,190,90,0)');
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.arc(lx, ly, 8 + ld * 10, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // 6. Recycled terrain parts in two depth tiers (far dense + near bold), sorted far -> near
    const roofs = ['#c0392b', '#e67e22', '#7d3c98', '#2471a3', '#a93226', '#ba681e'];
    const parts = [];
    // Far-to-mid tier (26 parts: smaller & denser in the background)
    const farCols = [-1.14, -0.96, -0.66, -0.52, -0.32, -0.18];
    for (let i = 0; i < 26; i++) {
      const col = farCols[i % farCols.length] + (hash(i * 7.3) - 0.5) * 0.07;
      const d = 0.08 + ((Math.floor(i / farCols.length) * 0.064 + hash(i * 3.1) * 0.025 + s.dist * 0.008) % 0.28);
      parts.push({id: i + 100, u: col, d, tier: 0});
    }
    // Mid-to-near tier (20 parts: larger & spaced along blocks/lanes; includes waterfront column for city/forest)
    const nearCols = [-1.05, -0.92, -0.60, -0.28, -0.02];
    for (let i = 0; i < 20; i++) {
      const colBase = nearCols[i % nearCols.length];
      const col = colBase + (hash(i * 11.7) - 0.5) * 0.07;
      const d = 0.34 + ((Math.floor(i / nearCols.length) * 0.145 + hash(i * 5.3) * 0.04 + s.dist * 0.008) % 0.64);
      parts.push({id: i, u: col, d, tier: 1, edgeOnly: colBase > -0.10});
    }
    parts.sort((a, b) => a.d - b.d);

    for (const p of parts) {
      const [hx, hy] = groundPoint(p.u, p.d, hor);
      const sc = p.tier === 0 ? (0.34 + p.d * 1.15) : (0.48 + p.d * 1.52);
      const w = 25 * sc, h = 16 * sc;
      const pz = zoneAt(s.dist + (1 - p.d) * LOOKAHEAD);
      // Skip the waterfront column in Zone 0 where the runway sits
      if (!p.edgeOnly || pz.a === 2 || pz.a === 3) {
        townElement(p.id, hx, hy, sc, w, h, pz.a, p.edgeOnly && pz.a !== 2 && pz.a !== 3 ? 0 : 1 - pz.f, roofs[p.id % roofs.length], day.night, p.d);
      }
      if (pz.f > 0 && (!p.edgeOnly || pz.b === 2 || pz.b === 3)) {
        townElement(p.id, hx, hy, sc, w, h, pz.b, pz.f, roofs[p.id % roofs.length], day.night, p.d);
      }
    }

    // 7. Harbour warehouses, stacked containers and dock crane (Zone 0)
    if (wts[0] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[0];
      const nS = day.night * 0.75;
      const [w1x, w1y] = groundPoint(0.24, 0.66, hor);
      drawBox3D(w1x, w1y, 58, 22, 24, lerpCol('#b8ae9e', '#26303d', nS), lerpCol('#8f8678', '#1a222d', nS), lerpCol('#7d4c3b', '#2b1e1c', nS), true, day.night);
      const [w2x, w2y] = groundPoint(0.30, 0.50, hor);
      drawBox3D(w2x, w2y, 52, 19, 22, lerpCol('#a4b6c1', '#222d3a', nS), lerpCol('#788994', '#161f2a', nS), lerpCol('#5d6d7e', '#1a2430', nS), true, day.night);
      // Dockside shipping containers
      const [ct1x, ct1y] = groundPoint(0.22, 0.44, hor);
      drawBox3D(ct1x, ct1y, 20, 8, 9, lerpCol('#d35400', '#4d2308', nS), lerpCol('#9c3c00', '#331705', nS), lerpCol('#e67e22', '#5c2b0a', nS), false, day.night);
      drawBox3D(ct1x + 1, ct1y - 8, 18, 7, 8, lerpCol('#2471a3', '#123147', nS), lerpCol('#194e73', '#0b2030', nS), lerpCol('#3498db', '#18405c', nS), false, day.night);
      // Harbour gantry crane
      const [crx, cry] = groundPoint(0.30, 0.55, hor);
      ctx.strokeStyle = lerpCol('#37474f', '#1a242e', nS);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(crx - 4, cry); ctx.lineTo(crx, cry - 58); ctx.lineTo(crx + 4, cry);
      ctx.moveTo(crx - 3, cry - 58); ctx.lineTo(crx + 46, cry - 58);
      ctx.moveTo(crx, cry - 58); ctx.lineTo(crx - 16, cry - 45);
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(crx + 38, cry - 58); ctx.lineTo(crx + 38, cry - 38); ctx.stroke();
      ctx.fillStyle = lerpCol('#e67e22', '#6b3a12', nS);
      ctx.fillRect(crx + 32, cry - 38, 12, 8);
      if (day.night > 0.15) {
        ctx.fillStyle = 'rgba(255,75,65,' + (day.night * 0.9).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(crx, cry - 60, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ===== 8. Sea & Harbour Water =====
    const waterPath = new Path2D();
    waterPath.moveTo(752 + seaShift + shX, hor + 2);
    waterPath.quadraticCurveTo(864 + seaShift + shX, hor + 130, 834 + seaShift + shX, H + 70);
    waterPath.lineTo(1420, H + 70);
    waterPath.lineTo(1420, hor - 8);
    waterPath.quadraticCurveTo(1120 + seaShift * 0.4 + shX, hor + 26, 996 + seaShift * 0.4 + shX, hor + 1);
    waterPath.closePath();

    const wg2 = ctx.createLinearGradient(760, hor, 1120, H + 60);
    wg2.addColorStop(0, day.waterTop);
    wg2.addColorStop(0.5, day.waterMid);
    wg2.addColorStop(1, day.waterBot);
    ctx.fillStyle = wg2;
    ctx.fill(waterPath);

    // Horizon islands (multi-peaked silhouettes with mist and shore rim)
    const islCol = lerpCol('#4e758f', '#132238', day.night * 0.85);
    const islLit = lerpCol('#6e99a8', '#1d324e', day.night * 0.85);
    function drawIsland(cx, baseY, hw, peakH, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = islCol;
      ctx.beginPath();
      ctx.moveTo(cx - hw, baseY);
      ctx.quadraticCurveTo(cx - hw * 0.45, baseY - peakH * 0.9, cx - hw * 0.1, baseY - peakH * 0.65);
      ctx.quadraticCurveTo(cx + hw * 0.25, baseY - peakH * 1.15, cx + hw, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = islLit;
      ctx.beginPath();
      ctx.moveTo(cx + hw * 0.15, baseY - peakH * 0.78);
      ctx.quadraticCurveTo(cx + hw * 0.45, baseY - peakH * 0.9, cx + hw, baseY);
      ctx.lineTo(cx + hw * 0.15, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    drawIsland(1238 + seaShift * 0.4 + shX, hor + 3, 98, 28, 0.85);
    if (seaW > 0.01) {
      drawIsland(675 + shX * 0.5, hor + 3, 64, 16, seaW * 0.88);
      drawIsland(942 + shX * 0.5, hor + 3, 44, 12, seaW * 0.85);
      drawIsland(440 + shX * 0.4, hor + 3, 52, 14, seaW * 0.72);
    }

    // Water surface details clipped strictly inside waterPath
    ctx.save();
    ctx.clip(waterPath);

    // Three-tier coastal shallows (turquoise -> mint)
    if (seaW < 0.98) {
      ctx.strokeStyle = lerpCol('rgba(72,224,205,0.22)', 'rgba(35,105,120,0.18)', day.night);
      ctx.lineWidth = 42;
      ctx.beginPath();
      for (let i = 0; i <= 22; i++) {
        const [fx, fy] = shorePoint(i / 22, hor, shX + 18);
        if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
      ctx.strokeStyle = lerpCol('rgba(130,242,220,0.24)', 'rgba(55,130,145,0.18)', day.night);
      ctx.lineWidth = 18;
      ctx.beginPath();
      for (let i = 0; i <= 22; i++) {
        const [fx, fy] = shorePoint(i / 22, hor, shX + 8);
        if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
    }

    // Scrolling ocean swell bands (gives depth & wave motion across the entire sea)
    const swellPhase = (s.dist * 0.35) % 1;
    for (let i = 0; i < 16; i++) {
      const sd = 0.06 + ((i + swellPhase) / 16) * 0.94;
      const sy = hor + Math.pow(sd, 1.35) * (H + 55 - hor);
      const sw = (34 + sd * 155) * (0.65 + hash(i * 4.7) * 0.7);
      const sx = 830 + seaShift * 0.55 + shX * (1 - sd * 0.4) + (hash(i * 9.3) - 0.15) * 460;
      ctx.fillStyle = i % 2 === 0
        ? 'rgba(180,238,255,' + ((0.06 + sd * 0.07) * (1 - day.night * 0.65)).toFixed(3) + ')'
        : 'rgba(8,38,72,' + (0.09 + sd * 0.08).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw, 1.6 + sd * 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sun reflection path (golden dashes under sunX, fading out at night)
    const glintK = Math.max(0, 1 - day.night * 0.92) * Math.max(0.25, day.sunA);
    if (glintK > 0.02) {
      for (let i = 0; i < 28; i++) {
        const t = i / 27;
        const gy = hor + 16 + t * (H - hor - 4);
        const gw = (12 + t * 96) * (0.45 + hash(i * 7.3) * 0.85);
        const gx = sunX + shX * 0.3 + Math.sin(i * 2.4 + s.dist * 0.8) * 10 + (hash(i * 5) - 0.5) * 28;
        ctx.fillStyle = mixRgba(day.sunCore, (0.15 + 0.32 * (1 - t) * hash(i * 3.1 + 0.4)) * glintK);
        ctx.beginPath();
        ctx.ellipse(gx, gy, gw * 0.52, 1.4 + t * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hash(i * 11) > 0.55) {
          ctx.beginPath();
          ctx.ellipse(gx + gw * 0.62, gy + 1.5, gw * 0.22, 1.1 + t * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Moon reflection path (silvery-blue shimmer under moonX on the sea)
    if (day.night > 0.04) {
      for (let i = 0; i < 24; i++) {
        const t = i / 23;
        const gy = hor + 18 + t * (H - hor - 6);
        const gw = (10 + t * 76) * (0.45 + hash(i * 6.1 + 0.7) * 0.85);
        const gx = moonX + shX * 0.3 + Math.sin(i * 2.1 + 1 + s.dist * 0.7) * 8 + (hash(i * 4.3 + 0.3) - 0.5) * 24;
        ctx.fillStyle = 'rgba(215,235,255,' + ((0.16 + 0.34 * (1 - t) * hash(i * 3.7 + 0.6)) * day.night).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(gx, gy, gw * 0.5, 1.4 + t * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp surface sparkles
    ctx.fillStyle = 'rgba(255,255,255,' + (0.68 - day.night * 0.35).toFixed(2) + ')';
    for (let i = 0; i < 24; i++) {
      const sx = 790 + seaShift * 0.5 + shX + hash(i * 3 + Math.floor(s.dist * 2)) * 460;
      const sy = hor + 24 + hash(i * 7 + Math.floor(s.dist * 2)) * 390;
      ctx.fillRect(sx, sy, 3 + hash(i) * 7, 1.8);
    }
    ctx.restore();

    // Shoreline foam (double-line surf)
    if (seaW < 0.98) {
      ctx.save();
      ctx.globalAlpha = 1 - seaW;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.76 - day.night * 0.35).toFixed(2) + ')';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const [bx, by] = shorePoint(t, hor, shX);
        const fx = bx + 3 + Math.sin(t * 26) * 2.5, fy = by + Math.cos(t * 26) * 1.6;
        if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(210,245,255,' + (0.36 - day.night * 0.18).toFixed(2) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const [bx, by] = shorePoint(t, hor, shX + 10);
        const fx = bx + Math.cos(t * 20) * 2.2, fy = by + Math.sin(t * 20) * 1.4;
        if (i === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Pier (Zone 0) with timber deck, pilings & T-head dock
    if (wts[0] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[0];
      const pierT = 0.54 + ((s.dist * 0.01) % 0.08);
      const [qx, qy] = shorePoint(pierT, hor, shX);
      const px0 = qx - 20, py0 = qy + 4, px1 = qx + 124, py1 = qy + 13;
      ctx.fillStyle = lerpCol('#704e42', '#261b18', day.night * 0.72);
      ctx.beginPath();
      ctx.moveTo(px0, py0 - 6); ctx.lineTo(px1, py1 - 4);
      ctx.lineTo(px1, py1 + 4); ctx.lineTo(px0, py0 + 7);
      ctx.closePath(); ctx.fill();
      // T-head mooring platform
      ctx.fillRect(px1 - 6, py1 - 14, 11, 28);
      ctx.strokeStyle = lerpCol('#4e342e', '#17100e', day.night * 0.72);
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        ctx.lineWidth = 3.2 - t * 1.1;
        ctx.beginPath();
        ctx.moveTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t - 2);
        ctx.lineTo(px0 + (px1 - px0) * t, py0 + (py1 - py0) * t + 8 - t * 3);
        ctx.stroke();
      }
      ctx.fillStyle = day.night > 0.15 ? '#ffd23d' : '#cfd8dc';
      ctx.beginPath(); ctx.arc(px1 - 1, py1 - 12, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px1 - 1, py1 + 12, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Boats on water
    const [b1x, b1y] = groundPoint(1.02 - ((s.dist * 0.010) % 0.45), 0.42, hor);
    boat(b1x, b1y, 0.9, 1, 0, day.night);
    const [b2x, b2y] = groundPoint(0.66 + ((s.dist * 0.006) % 0.30), 0.20, hor);
    boat(b2x, b2y, 0.54, -1, seaW > 0.3 ? 1 : 0, day.night);
    if (seaW > 0.2) {
      ctx.save();
      ctx.globalAlpha = seaW;
      const [b3x, b3y] = groundPoint(0.28 + ((s.dist * 0.008) % 0.35), 0.28, hor);
      boat(b3x, b3y, 0.65, 1, 1, day.night);
      ctx.restore();
    }

    // Lighthouse (Zone 0) with rotating searchlight beam at dusk/night
    if (wts[0] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[0];
      const [lx2, ly2] = groundPoint(0.47, 0.30, hor);
      const lh = 56;
      if (day.night > 0.08) {
        const ang = (s.time * 0.5) % (Math.PI * 2);
        const beamLen = 150;
        const bg = ctx.createLinearGradient(lx2, ly2 - lh + 8, lx2 + Math.cos(ang) * beamLen, ly2 - lh + Math.sin(ang) * 30);
        bg.addColorStop(0, 'rgba(255,244,175,' + (0.42 * day.night).toFixed(2) + ')');
        bg.addColorStop(1, 'rgba(255,244,175,0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(lx2, ly2 - lh + 8);
        ctx.lineTo(lx2 + Math.cos(ang - 0.14) * beamLen, ly2 - lh + 8 + Math.sin(ang - 0.14) * 32);
        ctx.lineTo(lx2 + Math.cos(ang + 0.14) * beamLen, ly2 - lh + 8 + Math.sin(ang + 0.14) * 32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,235,160,' + (0.28 + day.night * 0.32).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(lx2, ly2 - lh + 8, 20 + day.night * 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lerpCol('#f4f6f8', '#798b9e', day.night * 0.65);
      ctx.beginPath();
      ctx.moveTo(lx2 - 7.5, ly2); ctx.lineTo(lx2 - 4.8, ly2 - lh + 12);
      ctx.lineTo(lx2 + 4.8, ly2 - lh + 12); ctx.lineTo(lx2 + 7.5, ly2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = lerpCol('#e8322a', '#701b17', day.night * 0.6);
      ctx.fillRect(lx2 - 6.0, ly2 - lh + 23, 12.0, 8.5);
      ctx.fillRect(lx2 - 4.8, ly2 - lh + 12, 9.6, 6);
      ctx.fillStyle = '#37474f';
      ctx.fillRect(lx2 - 5.2, ly2 - lh + 4, 10.4, 8);
      ctx.fillStyle = '#ffe45e';
      ctx.fillRect(lx2 - 3, ly2 - lh + 6, 6, 4);
      ctx.restore();
    }

    // ===== 9. Runway (Zone 0) =====
    if (wts[0] > 0.01) {
      ctx.save();
      ctx.globalAlpha = wts[0];
      const rTopX = 640 + camPar, rBotX = 640;
      ctx.fillStyle = lerpCol('#303a44', '#161d26', day.night * 0.65);
      ctx.beginPath();
      ctx.moveTo(rTopX - 58, hor + 14); ctx.lineTo(rTopX + 58, hor + 14);
      ctx.lineTo(rBotX + 218, H + 62); ctx.lineTo(rBotX - 218, H + 62);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = lerpCol('#434d58', '#202833', day.night * 0.65);
      ctx.beginPath();
      ctx.moveTo(rTopX - 40, hor + 14); ctx.lineTo(rTopX + 40, hor + 14);
      ctx.lineTo(rBotX + 152, H + 62); ctx.lineTo(rBotX - 152, H + 62);
      ctx.closePath(); ctx.fill();

      // White edge markings
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.42 - day.night * 0.16).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rTopX - 38, hor + 14); ctx.lineTo(rBotX - 144, H + 62);
      ctx.moveTo(rTopX + 38, hor + 14); ctx.lineTo(rBotX + 144, H + 62);
      ctx.stroke();

      // Threshold piano keys
      ctx.fillStyle = 'rgba(255,255,255,' + (0.92 - day.night * 0.22).toFixed(2) + ')';
      const kw = (70 + 0.155 * 1010) * (1 - gAltF * 0.10);
      for (let i = 0; i < 6; i++) {
        const [px, py] = groundPoint(-0.082 + i * 0.0328, 0.155, hor);
        ctx.save();
        ctx.translate(px, py);
        ctx.transform(1, 0, -camPar * 0.0006, 0.62, 0, 0);
        ctx.fillRect(-kw * 0.011, 0, kw * 0.022, 15);
        ctx.restore();
      }
      // "09" designator
      const [nx, ny] = groundPoint(0, 0.30, hor);
      ctx.save();
      ctx.translate(nx, ny);
      ctx.scale(1.45, 0.72);
      ctx.globalAlpha *= (0.90 - day.night * 0.20);
      text('09', 0, 0, 30, '#ffffff');
      ctx.restore();

      // Centreline dashes
      const phase = (s.dist * 1.4) % 1;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.94 - day.night * 0.22).toFixed(2) + ')';
      for (let i = 0; i < 7; i++) {
        const d = ((i + phase) / 7) * 0.92 + 0.05;
        const [dx3, dy3] = groundPoint(0, d, hor);
        const wdt = 3 + d * 13;
        ctx.fillRect(dx3 - wdt / 2, dy3, wdt, 5 + d * 30);
      }
      // Edge lights
      ctx.save();
      ctx.shadowColor = 'rgba(255,210,61,0.95)';
      ctx.shadowBlur = 7 + day.night * 8;
      ctx.fillStyle = '#ffd23d';
      for (let i = 0; i < 8; i++) {
        const d = 0.05 + (i / 7) * 0.95;
        const [ex, ey] = groundPoint(-0.185, d, hor);
        const [fx2, fy2] = groundPoint(0.185, d, hor);
        ctx.beginPath(); ctx.arc(ex, ey, 2 + d * 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(fx2, fy2, 2 + d * 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.restore();
    }

    // ===== 10. Items, far to near =====
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
        const squash = 1 - Math.min(0.20, Math.abs(it.lane) * 0.18);
        if (prevRing) {
          ctx.save();
          ctx.strokeStyle = 'rgba(160,230,255,0.42)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([3, 11]);
          ctx.beginPath(); ctx.moveTo(prevRing.x, prevRing.y); ctx.lineTo(x, y); ctx.stroke();
          ctx.restore();
        }
        prevRing = {x, y};
        ctx.save();
        ctx.strokeStyle = '#c77400';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(x - it.lane * 7, y - 4, rr2, rr2 * squash, 0, 0, Math.PI * 2); ctx.stroke();
        const mem = ctx.createRadialGradient(x, y, rr2 * 0.1, x, y, rr2);
        mem.addColorStop(0, 'rgba(150,230,255,0.05)');
        mem.addColorStop(0.8, 'rgba(150,230,255,0.14)');
        mem.addColorStop(1, 'rgba(150,230,255,0)');
        ctx.fillStyle = mem;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = 'rgba(255,170,0,0.92)';
        ctx.shadowBlur = 22 * t + 5;
        const rg = ctx.createLinearGradient(x - rr2, y - rr2, x + rr2, y + rr2);
        rg.addColorStop(0, '#ffe97a'); rg.addColorStop(0.5, '#ffb300'); rg.addColorStop(1, '#ff8f00');
        ctx.strokeStyle = rg;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(200,245,255,0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(x, y, rr2 - lw * 0.52, (rr2 - lw * 0.52) * squash, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,250,205,0.95)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(x, y, rr2, rr2 * squash, 0, -2.5, -0.8); ctx.stroke();
        ctx.restore();
        if (it.z < 200) nearRing = {x, y, r: rr2, lw, squash};
      } else if (it.kind === 'star') {
        const rs = r * 0.52;
        ctx.save();
        const glow = ctx.createRadialGradient(x, y, rs * 0.2, x, y, rs * 2.0);
        glow.addColorStop(0, 'rgba(255,138,20,0.44)');
        glow.addColorStop(1, 'rgba(255,138,20,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(x, y, rs * 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,196,130,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, rs * 1.28, 0, Math.PI * 2); ctx.stroke();
        const sph = ctx.createRadialGradient(x + rs * 0.35, y - rs * 0.35, rs * 0.1, x, y, rs);
        sph.addColorStop(0, '#ffdca3'); sph.addColorStop(0.55, '#ff8c1a'); sph.addColorStop(1, '#dd5a00');
        ctx.fillStyle = sph;
        ctx.beginPath(); ctx.arc(x, y, rs, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3d6';
        starPath(x, y, rs * 0.55);
        ctx.fill();
        ctx.strokeStyle = '#7a2800';
        ctx.lineWidth = Math.max(1.2, rs * 0.06);
        starPath(x, y, rs * 0.55);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.ellipse(x + rs * 0.34, y - rs * 0.38, rs * 0.16, rs * 0.10, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        stormCloud(x, y, (r / 46) * 1.15);
      }
    }

    // Ground shadow of plane
    const shY = s.y + 92 + altF * 30;
    const shX2 = s.x - 26 - altF * 46 + s.bank * 22;
    const shAlpha = 1 - day.night * 0.6;
    ctx.fillStyle = 'rgba(10,30,20,' + ((0.10 - altF * 0.05) * shAlpha).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(shX2, shY, (104 - altF * 38) * 1.3, (13 - altF * 4) * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10,30,20,' + ((0.25 - altF * 0.15) * shAlpha).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(shX2, shY, 104 - altF * 38, 13 - altF * 4, 0, 0, Math.PI * 2);
    ctx.fill();

    vortexTrails(s);
    planeRear(s.x, s.y, s.bank, 1.04, s.pitch, day.night, s.time, s.boost);

    // Near ring front rim over plane
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

    // Floating score popups & spark bursts
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
        const size = f.kind === 'perfect' ? 30 : f.kind === 'fuel' ? 20 : 23;
        const col = f.kind === 'perfect' ? '#ffd23d' : f.kind === 'fuel' ? '#4dff9a' : '#ffffff';
        ctx.font = '800 ' + size + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(6,20,38,0.85)';
        ctx.lineWidth = 4.5;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = col;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
    }

    if (s.flash > 0) {
      ctx.fillStyle = 'rgba(255,220,60,' + (s.flash * 0.35) + ')';
      ctx.fillRect(-140, -120, W + 280, H + 190);
    }
    ctx.restore(); // end world roll

    // Mild atmospheric night veil (terrain & sky already use night palette, so lights pop)
    if (day.night > 0.02) {
      ctx.fillStyle = 'rgba(7,14,42,' + (day.night * 0.12).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // Subtle cinematic vignette
    const vg = ctx.createRadialGradient(640, 360, 350, 640, 360, 770);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(8,16,42,0.24)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Radial speed lines when boosting / high speed
    if (screen === SCREEN_PLAY && s.speed > 210) {
      const str = clamp01((s.speed - 210) / 50);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.32 * str).toFixed(3) + ')';
      ctx.lineWidth = 2.4;
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

    // ===== HUD (unimpacted by night tint for crisp legibility) =====
    const onTitle = screen === SCREEN_TITLE;
    const hudStat = (label, value, x, color) => {
      text(label, x, 31, 10.5, '#9fd8ff', 'left', 700);
      textM(value, x, 54, 21, color, 'left');
    };
    if (onTitle) {
      panel(18, 14, 216, 58, 'rgba(255,210,61,0.65)');
      hudStat('ALT', altM(s.alt) + ' m', 38, '#7dffcb');
      panel(1046, 14, 216, 58, 'rgba(255,210,61,0.65)');
      hudStat('SPD', spdKmh(s.speed) + ' km/h', 1066, '#7dffcb');
    } else {
      panel(18, 14, 452, 58, 'rgba(255,210,61,0.65)');
      hudStat('SCORE', String(s.score), 34, '#ffd23d');
      hudStat('RINGS', s.rings + '/12', 148, '#ffffff');
      text('STARS', 238, 31, 10.5, '#9fd8ff', 'left', 700);
      ctx.fillStyle = '#fff3d6';
      starPath(246, 50, 8);
      ctx.fill();
      ctx.strokeStyle = '#7a2800';
      ctx.lineWidth = 1.2;
      starPath(246, 50, 8);
      ctx.stroke();
      textM(String(s.stars), 260, 54, 21, '#ffb35c', 'left');
      hudStat('TIME', Math.ceil(s.left) + 's', 336, s.left < 15 ? '#ff8a80' : '#ffffff');
      panel(810, 14, 452, 58, 'rgba(125,223,255,0.55)');
      hudStat('ALT', altM(s.alt) + ' m', 830, '#7dffcb');
      hudStat('SPD', spdKmh(s.speed) + ' km/h', 984, '#7dffcb');
      hudStat('DIST', distKm(s.dist) + ' km', 1120, '#ffffff');
    }
    compass(640, 43, s.heading);

    // Nighttime warm cockpit glow behind bottom panels
    if (day.night > 0.02) {
      for (const gp of [[204, 652], [1043, 652]]) {
        const cg = ctx.createRadialGradient(gp[0], gp[1], 10, gp[0], gp[1], 260);
        cg.addColorStop(0, 'rgba(255,186,92,' + (day.night * 0.22).toFixed(3) + ')');
        cg.addColorStop(1, 'rgba(255,186,92,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(gp[0] - 260, gp[1] - 130, 520, 260);
      }
    }

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
          ctx.beginPath(); ctx.ellipse(118 + i * 30, 674, 3, 2, -0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.save();
      if (s.boost) { ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 12; }
      ctx.fillStyle = s.boost ? '#ffb300' : 'rgba(255,179,0,0.22)';
      ctx.beginPath(); ctx.arc(272, 678, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      text('BOOST', 290, 678, 13, s.boost ? '#ffd23d' : '#9fd8ff', 'left');
    }

    // Instrument cluster
    panel(824, 592, 438, 120, 'rgba(255,210,61,0.5)');
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(838, 599); ctx.lineTo(1248, 599); ctx.stroke();
    for (const [rx, ry] of [[836, 604], [1250, 604], [836, 700], [1250, 700]]) {
      ctx.fillStyle = '#5b7a94';
      ctx.beginPath(); ctx.arc(rx, ry, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(rx - 1, ry - 1, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    horizonGauge(886, 650, s);
    dial(1024, 650, s.speed, 100, 280, '#ffd23d', spdKmh(s.speed) + ' km/h', v => spdKmh(v));
    dial(1162, 650, s.alt, 0, 3000, '#7dffcb', altM(s.alt) + ' m', v => altM(v));
    text('ATT', 886, 705, 10, '#9fd8ff');
    text('SPD', 1024, 705, 10, '#9fd8ff');
    text('ALT', 1162, 705, 10, '#9fd8ff');

    // ===== screens =====
    if (screen === SCREEN_TITLE) {
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
      const bg = ctx.createLinearGradient(0, 160, 0, 200);
      bg.addColorStop(0, '#ffe97a'); bg.addColorStop(1, '#f7a500');
      ctx.fillStyle = bg;
      rr(452, 160, 376, 40, 8); ctx.fill();
      text('R I N G S', 640, 181, 25, '#5b3a00');
      text('Thread the 12 golden rings over the harbor!', 640, 224, 20, '#eaf7ff');

      ctx.fillStyle = 'rgba(5,28,56,0.68)';
      rr(372, 240, 536, 27, 13); ctx.fill();
      text('Arrows / WASD steer · Shift boost · Ctrl brake · P pause', 640, 254, 14.5, '#d8f4ff');

      ctx.fillStyle = 'rgba(5,28,56,0.68)';
      rr(262, 284, 756, 36, 18); ctx.fill();
      ctx.save();
      ctx.shadowColor = 'rgba(255,170,0,0.9)';
      ctx.shadowBlur = 8;
      const lrg = ctx.createLinearGradient(336, 290, 360, 314);
      lrg.addColorStop(0, '#ffe97a'); lrg.addColorStop(0.5, '#ffb300'); lrg.addColorStop(1, '#ff8f00');
      ctx.strokeStyle = lrg;
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.ellipse(348, 302, 12, 11, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      text('Ring — fly through +100', 370, 302, 14.5, '#eaf7ff', 'left');

      ctx.strokeStyle = 'rgba(255,196,130,0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(578, 302, 14, 0, Math.PI * 2); ctx.stroke();
      const lsg = ctx.createRadialGradient(582, 298, 1, 578, 302, 11);
      lsg.addColorStop(0, '#ffdca3'); lsg.addColorStop(0.55, '#ff8c1a'); lsg.addColorStop(1, '#dd5a00');
      ctx.fillStyle = lsg;
      ctx.beginPath(); ctx.arc(578, 302, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3d6';
      starPath(578, 302, 6);
      ctx.fill();
      ctx.strokeStyle = '#7a2800';
      ctx.lineWidth = 1;
      starPath(578, 302, 6);
      ctx.stroke();
      text('Star orb — bonus +50', 600, 302, 14.5, '#eaf7ff', 'left');

      stormCloud(784, 301, 0.26);
      text('Storm — avoid!', 806, 302, 14.5, '#eaf7ff', 'left');

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
      const ringPts = s.rings * 100, starPts = s.stars * 50;
      const timeBonus = Math.ceil(s.left) * 10, fuelBonus = Math.round(s.fuel) * 2;
      const rank = s.score >= 1600 ? 'S' : s.score >= 1300 ? 'A' : s.score >= 1000 ? 'B' : 'C';
      panel(330, 84, 620, 272, '#ffd23d');
      ctx.save();
      ctx.translate(408, 120);
      ctx.strokeStyle = '#ffd23d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.lineTo(26, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, 12); ctx.lineTo(13, 12); ctx.stroke();
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath(); ctx.ellipse(0, 2, 6, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      text('FLIGHT COMPLETE', 640, 120, 36, '#ffd23d');

      ctx.save();
      ctx.shadowColor = 'rgba(255,170,0,0.8)';
      ctx.shadowBlur = 12;
      const bg2 = ctx.createRadialGradient(884, 104, 3, 884, 112, 30);
      bg2.addColorStop(0, '#fff3b0'); bg2.addColorStop(1, '#f7a500');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(884, 112, 27, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(884, 112, 27, 0, Math.PI * 2); ctx.stroke();
      text('RANK', 884, 100, 10, '#7a4d00');
      text(rank, 884, 118, 24, '#7a4d00');
      ctx.strokeStyle = 'rgba(255,210,61,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(366, 148); ctx.lineTo(914, 148); ctx.stroke();
      text('SCORE  ' + s.score, 640, 182, 36, '#ffffff');
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
