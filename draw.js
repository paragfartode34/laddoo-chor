// draw.js: the look of "Laddoo Chor" (Natkhat Chhora vs the Cockroach Gang), drawn in code like the channel's cartoon:
// cream line-art with dark brown outlines that "boil" 8 times a second. The boy with the orange pagdi, the Cockroach
// Gang (a boss in a backwards red cap, a cool one in shades, a baby with a pink bow), Mota Chuha the rat, laddoos on a
// steel thali, the kitchen, a chappal, the sweet box, a paper cat and comic stickers. All original designs.
'use strict';
const INK = '#3b2a21', FILL = '#fffcf3', LW = 6;
const FONT = '"Lilita One", "Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", "Mangal", sans-serif';
let BOIL = 0, LWF = 1;                       // LWF: line weight factor (thicker lines on small screens)
function setBoil(t) { BOIL = Math.floor(t * 8); }

function hash(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + BOIL * 7919, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hashS(a, b) {                       // the same, but steady (no boil)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0), 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const jit = (seed, i, amp) => (hash(seed, i) - .5) * 2 * amp;

// ───────── easing and maths ─────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const easeOut = u => { u = clamp(u); return 1 - (1 - u) ** 3; };
const easeIn = u => { u = clamp(u); return u ** 3; };
const backOut = u => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ───────── hand-drawn shapes ─────────
// a smooth path through points (midpoint quadratics), each point jittered by the boil
function smoothPath(ctx, pts, closed, seed, amp, sharp = false) {
  const P = pts.map((p, i) => [p[0] + jit(seed, i * 2, amp), p[1] + jit(seed, i * 2 + 1, amp)]);
  const n = P.length;
  ctx.beginPath();
  if (sharp) { ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(P[i][0], P[i][1]); if (closed) ctx.closePath(); return; }
  if (closed) {
    ctx.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    ctx.closePath();
  } else {
    ctx.moveTo(P[0][0], P[0][1]);
    if (n === 2) { ctx.lineTo(P[1][0], P[1][1]); return; }
    for (let i = 1; i < n - 1; i++) { const p = P[i], q = P[i + 1]; ctx.quadraticCurveTo(p[0], p[1], i === n - 2 ? q[0] : (p[0] + q[0]) / 2, i === n - 2 ? q[1] : (p[1] + q[1]) / 2); }
  }
}
function shape(ctx, pts, fill, seed, o = {}) {
  const lw = o.lw ?? LW, amp = o.amp ?? 1.3, closed = o.closed ?? true;
  smoothPath(ctx, pts, closed, seed, amp, o.sharp);
  if (fill && closed) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw * LWF; ctx.strokeStyle = o.stroke || INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
function line(ctx, pts, seed, lw = LW, color = INK, amp = 1.1) { shape(ctx, pts, null, seed, { lw, amp, closed: false, stroke: color }); }
function ellPts(cx, cy, rx, ry, n = 16, rot = 0) {
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    P.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return P;
}
function blob(ctx, cx, cy, rx, ry, fill, seed, o = {}) { shape(ctx, ellPts(cx, cy, rx, ry, o.n || 16, o.rot || 0), fill, seed, o); }
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
// an outlined tube (limbs): the ink stroke, then the fill stroke on top
function tube(ctx, pts, w, seed, fill = FILL, lw = LW) {
  const P = pts.map((p, i) => [p[0] + jit(seed, i * 2, .9), p[1] + jit(seed, i * 2 + 1, .9)]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    if (P.length === 3) ctx.quadraticCurveTo(P[1][0], P[1][1], P[2][0], P[2][1]);
    else for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  };
  path(); ctx.strokeStyle = INK; ctx.lineWidth = w + lw * 2 * LWF; ctx.stroke();
  path(); ctx.strokeStyle = fill; ctx.lineWidth = w; ctx.stroke();
}
function heart(ctx, x, y, s, fill, seed = 7, lw = 0) {
  const P = [[0, .35], [-.25, .1], [-.5, -.18], [-.48, -.45], [-.25, -.55], [0, -.35], [.25, -.55], [.48, -.45], [.5, -.18], [.25, .1]]
    .map(p => [x + p[0] * s, y + p[1] * s]);
  shape(ctx, P, fill, seed, { lw, amp: s * .02 });
}
function star(ctx, x, y, r, fill, rot = 0, seed = 3, lw = 4) {
  const P = [];
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  shape(ctx, P, fill, seed, { lw, amp: .6 });
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ───────── text ─────────
function setFont(ctx, size) { ctx.font = `${Math.round(size * 100) / 100}px ${FONT}`; }
// the largest size (up to `size`) at which `text` fits in maxW
function fitSize(ctx, text, size, maxW) {
  setFont(ctx, size); const w = ctx.measureText(text).width;
  return w > maxW ? size * maxW / w : size;
}
// text with a thick ink outline (comic captions and stickers)
function inkText(ctx, text, x, y, o = {}) {
  let size = o.size || 64;
  if (o.maxW) size = fitSize(ctx, text, size, o.maxW);
  ctx.save();
  setFont(ctx, size);
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const lw = o.lw || size * .16;
  if (o.shadow !== false) {
    ctx.lineWidth = lw + 2; ctx.strokeStyle = 'rgba(40,25,15,.28)'; ctx.fillStyle = 'rgba(40,25,15,.28)';
    ctx.strokeText(text, x + size * .05, y + size * .07);
  }
  if (o.outer) { ctx.lineWidth = lw + size * .14; ctx.strokeStyle = o.outer; ctx.strokeText(text, x, y); }
  ctx.lineWidth = lw; ctx.strokeStyle = o.stroke || INK; ctx.strokeText(text, x, y);
  if (o.grad) {
    const g = ctx.createLinearGradient(0, y - size * .45, 0, y + size * .45);
    o.grad.forEach((c, i) => g.addColorStop(i / (o.grad.length - 1), c));
    ctx.fillStyle = g;
  } else ctx.fillStyle = o.fill || '#fff';
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}
// plain text (no outline), for small print on cards
function plainText(ctx, text, x, y, o = {}) {
  let size = o.size || 40;
  if (o.maxW) size = fitSize(ctx, text, size, o.maxW);
  ctx.save(); setFont(ctx, size); ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.fill || INK; ctx.fillText(text, x, y); ctx.restore();
  return size;
}
function popScale(u) { return u < 0 ? 0 : u < .16 ? backOut(u / .16) : 1 + .03 * Math.sin(u * 12) * Math.exp(-u * 3); }

// ───────── laddoos and the thali ─────────
function laddoo(ctx, x, y, r = 22, seed = 700) {
  blob(ctx, x, y, r, r * .95, '#ffb52e', seed, { lw: 4, amp: .5 });
  for (let k = 0; k < 7; k++) { const a = k * 2.4 + seed * .37, rr = r * (.2 + .5 * ((k * 37) % 10) / 10); dot(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * .13, '#e8890f'); }
  dot(ctx, x - r * .35, y - r * .4, r * .2, 'rgba(255,255,255,.55)');
}
// up to ten laddoos in a 4-3-2-1 pyramid on a steel thali (the top one goes first)
const LAD10 = [[-78, -20], [-26, -20], [26, -20], [78, -20], [-52, -58], [0, -58], [52, -58], [-26, -96], [26, -96], [0, -134]];
function thali(ctx, x, y, n, crumbs = 0) {
  blob(ctx, x, y, 134, 22, '#cfd5dc', 710, { lw: 5, amp: .6 }); blob(ctx, x, y - 3, 108, 14, '#eef1f5', 711, { lw: 0, amp: .4 });
  for (let k = 0; k < crumbs; k++) dot(ctx, x - 80 + hashS(k, 713) * 160, y - 6 + hashS(k, 714) * 8, 3.5, '#e8890f');
  for (let k = 0; k < Math.min(n, 10); k++) laddoo(ctx, x + LAD10[k][0], y + LAD10[k][1], 25, 720 + k);
}

// ───────── the Cockroach Gang ─────────
// o: kind 0 boss (red cap) | 1 cool (shades) | 2 baby (pink bow); face ±1; run 0..1 (gait); speed (steps per s);
// eyes 'dot' | 'smug' | 'happy' | 'closed' | 'shock' | 'xx'; mouth 'grin' | 'o' | 'laugh' | 'eat' | 'smile';
// arms 'down' | 'up' | 'wave' | 'laugh' | 'eat' | 'sneak' | 'climb'; squash; rot; look; capOff
const SHELL = ['#8a4b2a', '#70391f', '#a8643c'];
function roach(ctx, x, y, s, t, o = {}) {
  const kind = o.kind || 0, seed = 720 + kind * 50, col = SHELL[kind], f = o.face || 1, run = o.run || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s * (1 - (o.squash || 0))); ctx.rotate(o.rot || 0);
  const ph = 2 * Math.PI * t * (o.speed || 2.5) + kind, sp = Math.sin(ph);
  // hind legs: it stands up on them
  const fl = [-18 - 22 * sp * run, -16 * Math.max(0, sp) * run], fr = [18 + 22 * sp * run, -16 * Math.max(0, -sp) * run];
  line(ctx, [[-12, -46], [-28, -24], fl], seed, 6); line(ctx, [[12, -46], [28, -24], fr], seed + 1, 6);
  blob(ctx, fl[0] - 7, fl[1] - 2, 12, 5, INK, seed + 2, { lw: 0 }); blob(ctx, fr[0] + 7, fr[1] - 2, 12, 5, INK, seed + 3, { lw: 0 });
  const arms = o.arms || 'down';
  const H = {
    down: [[-46, -98], [46, -98]], up: [[-24, -216], [24, -216]], wave: [[-46, -98], [56 + 10 * Math.sin(t * 14), -190]],
    laugh: [[-26, -78], [26, -78]], eat: [[-14, -148], [14, -148]],
    sneak: [[-42, -150 + 8 * sp], [46, -160 - 8 * sp]], climb: [[-30, -206 + 22 * sp], [30, -206 - 22 * sp]],
  }[arms] || [[-46, -98], [46, -98]];
  const armLine = (side, h, sd) => {
    const sx = side * 30, sy = -128, ex = (sx + h[0]) / 2 + side * 18, ey = (sy + h[1]) / 2 + 8;
    line(ctx, [[sx, sy], [ex, ey], h], seed + sd, 5); dot(ctx, h[0], h[1], 6.5, INK);
  };
  // the shell (folded wings) with its parting line and a shine, then the middle legs
  blob(ctx, 0, -94, 40, 62, col, seed + 6, { lw: 5 });
  line(ctx, [[0, -150], [0, -38]], seed + 7, 4, 'rgba(40,20,10,.55)');
  blob(ctx, -16, -118, 7, 20, 'rgba(255,225,195,.35)', seed + 8, { lw: 0 });
  line(ctx, [[-36, -86], [-58, -74 + 6 * sp * run], [-68, -54]], seed + 9, 5); line(ctx, [[36, -86], [58, -74 - 6 * sp * run], [68, -54]], seed + 10, 5);
  // head and antennae
  blob(ctx, 0, -170, 33, 29, col, seed + 11, { lw: 5 });
  const sw = Math.sin(t * 5 + kind * 2) * 8;
  line(ctx, [[-10, -194], [-26, -232], [-48 + sw, -258], [-72 + sw, -254]], seed + 12, 4);
  line(ctx, [[10, -194], [26, -232], [48 + sw, -258], [72 + sw, -254]], seed + 13, 4);
  roachFace(ctx, o, t, seed + 20, kind, col);
  armLine(-1, H[0], 4); armLine(1, H[1], 5);
  if (arms === 'eat') laddoo(ctx, 0, -150, 17, seed + 33);
  if (kind === 0 && !o.capOff) {             // a red cap, worn backwards
    shape(ctx, [[-31, -182], [-28, -200], [-12, -210], [12, -210], [28, -200], [31, -182]], '#e23b3b', seed + 40);
    shape(ctx, [[-30, -190], [-58, -188], [-56, -179], [-30, -181]], '#e23b3b', seed + 41);
  }
  if (kind === 1) {                          // shades (pushed up onto the head when it is surprised or laughing)
    const up = ['shock', 'xx', 'happy', 'closed'].includes(o.eyes) ? -26 : 0;
    shape(ctx, [[-30, -182 + up], [-4, -182 + up], [-6, -164 + up], [-28, -164 + up]], '#222', seed + 42, { lw: 3, sharp: true });
    shape(ctx, [[4, -182 + up], [30, -182 + up], [28, -164 + up], [6, -164 + up]], '#222', seed + 43, { lw: 3, sharp: true });
    line(ctx, [[-4, -178 + up], [4, -178 + up]], seed + 44, 3); line(ctx, [[-24, -178 + up], [-16, -170 + up]], seed + 45, 2.5, 'rgba(255,255,255,.7)');
  }
  if (kind === 2) {                          // a pink bow
    shape(ctx, [[-4, -200], [-27, -216], [-25, -190]], '#ff6fa8', seed + 46, { lw: 3 });
    shape(ctx, [[4, -200], [27, -216], [25, -190]], '#ff6fa8', seed + 47, { lw: 3 }); dot(ctx, 0, -201, 5, '#ff3d8a');
  }
  ctx.restore();
}
function roachFace(ctx, o, t, seed, kind, col) {
  const e = o.eyes || 'dot', lk = (o.look || 0) * 3, big = kind === 2 ? 1.18 : 1;
  const blink = (e === 'dot' || e === 'smug') && (t * 1.3 + kind * .37) % 3 < .09;
  for (const sd of [-1, 1]) {
    const ex = sd * 13, ey = -176;
    if (e === 'happy' || e === 'closed' || blink) {
      const c = e === 'closed' || blink;
      line(ctx, [[ex - 8, ey + (c ? 1 : 3)], [ex, ey - (c ? -1 : 4)], [ex + 8, ey + (c ? 1 : 3)]], seed + sd, 3.5); continue;
    }
    if (e === 'xx') { line(ctx, [[ex - 7, ey - 7], [ex + 7, ey + 7]], seed + sd, 3.5); line(ctx, [[ex + 7, ey - 7], [ex - 7, ey + 7]], seed + 2 + sd, 3.5); continue; }
    const r = (e === 'shock' ? 13 : 10.5) * big;
    blob(ctx, ex, ey, r, r * 1.12, '#fff', seed + 4 + sd, { lw: 3, amp: .3 });
    dot(ctx, ex + lk, ey + 2, e === 'shock' ? 3 : 5.2 * big, INK);
    if (e === 'smug') shape(ctx, [[ex - r - 1, ey], [ex - r * .7, ey - r * 1.05], [ex + r * .7, ey - r * 1.05], [ex + r + 1, ey]], col, seed + 6 + sd, { lw: 3, amp: .3 });
  }
  const m = o.mouth || 'grin', my = -152;
  if (m === 'grin') { shape(ctx, [[-15, my - 3], [15, my - 3], [9, my + 8], [-9, my + 8]], '#5a1f1f', seed + 10, { lw: 3, amp: .3 }); ctx.fillStyle = '#fff'; ctx.fillRect(-11, my - 2, 22, 4); }
  else if (m === 'o') blob(ctx, 0, my + 2, 6, 7, '#5a1f1f', seed + 11, { lw: 3, amp: .3 });
  else if (m === 'laugh') shape(ctx, [[-16, my - 4], [16, my - 4], [10, my + 13], [-10, my + 13]], '#5a1f1f', seed + 12, { lw: 3, amp: .3 });
  else if (m === 'eat') { blob(ctx, -15, my, 8, 7, col, seed + 13, { lw: 3 }); blob(ctx, 15, my, 8, 7, col, seed + 14, { lw: 3 }); line(ctx, [[-6, my + 2], [6, my + 2]], seed + 15, 3); }
  else line(ctx, [[-10, my - 1], [0, my + 5], [10, my - 1]], seed + 16, 3.5);
}
// the boss's red cap on its own (it flies off at the first hit)
function capAlone(ctx, x, y, rot, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  shape(ctx, [[-31, 14], [-28, -4], [-12, -14], [12, -14], [28, -4], [31, 14]], '#e23b3b', 760);
  shape(ctx, [[-30, 6], [-58, 8], [-56, 17], [-30, 15]], '#e23b3b', 761);
  ctx.restore();
}
function darkEyes(ctx, x, y, t, k, s = 1) {   // only eyes, blinking in the dark of a crack
  const bl = (t * 1.7 + k * .45) % 1.6 < .12 ? .15 : 1;
  for (const sd of [-1, 1]) { ctx.save(); ctx.translate(x + sd * 16 * s, y); ctx.scale(s, s * bl); blob(ctx, 0, 0, 12, 14, '#fff', 960 + k * 3 + sd, { lw: 0, amp: .3 }); dot(ctx, 2, 2, 5, INK); ctx.restore(); }
}

// ───────── Mota Chuha, the rat (a plump grey rat with a bandit's mask, red eyes, buck teeth and a long pink tail) ─────────
const RAT_GREY = '#9aa1ab', RAT_DARK = '#7d8490', RAT_BELLY = '#dcd7d2', RAT_PINK = '#ffb3c6';
function ratTail(ctx, P, w0, w1) {
  ctx.save(); ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) for (let k = 0; k < P.length - 1; k++) {
    const u = k / (P.length - 1), w = lerp(w0, w1, u);
    ctx.lineWidth = pass ? w : w + 8 * LWF; ctx.strokeStyle = pass ? '#f2a6b4' : INK;
    ctx.beginPath(); ctx.moveTo(P[k][0], P[k][1]); ctx.lineTo(P[k + 1][0], P[k + 1][1]); ctx.stroke();
  }
  ctx.restore();
}
// o: face ±1, run 0..1, speed, eyes 'red' | 'shock' | 'happy' | 'closed', mouth 'grin' | 'laugh' | 'o' | 'eat',
// arms 'down' | 'up' | 'hold' | 'shrug', scared 0..1 (fur on end), tailUp 0..1, rot, squash
function rat(ctx, x, y, s, t, o = {}) {
  const f = o.face || 1, run = o.run || 0, ph = 2 * Math.PI * t * (o.speed || 3.5), sp = Math.sin(ph), sc = o.scared || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s * (1 - (o.squash || 0))); ctx.rotate(o.rot || 0);
  const sw = Math.sin(t * 4) * 14, up = o.tailUp || 0;
  const TP = []; for (let k = 0; k <= 12; k++) { const v = k / 12; TP.push([40 + v * lerp(220, 40, up) + v * sw, -40 - lerp(50 * Math.sin(v * 2.8 + .4), 300 * v, up) + v * v * sw * .6]); }
  ratTail(ctx, TP, 16, 5);
  const fl = [-32 - 20 * sp * run, -12 * Math.max(0, sp) * run], fr = [32 + 20 * sp * run, -12 * Math.max(0, -sp) * run];
  blob(ctx, fl[0], fl[1] - 8, 26, 12, RAT_PINK, 3201, { lw: 4 }); blob(ctx, fr[0], fr[1] - 8, 26, 12, RAT_PINK, 3202, { lw: 4 });
  if (sc > 0) for (let k = 0; k < 18; k++) {                      // fur standing on end
    const a = k / 18 * Math.PI * 2, r1 = 70, r2 = 70 + 30 * sc * (k % 2 ? 1 : .6);
    line(ctx, [[Math.cos(a) * r1 * .95, -96 + Math.sin(a) * r1 * 1.15], [Math.cos(a) * r2, -96 + Math.sin(a) * r2 * 1.2]], 3260 + k, 5, RAT_DARK);
  }
  blob(ctx, 0, -96, 68, 84, RAT_GREY, 3203, { lw: 5 });
  blob(ctx, 0, -80, 42, 56, RAT_BELLY, 3204, { lw: 0, amp: 1 });
  for (const sd of [-1, 1]) { blob(ctx, sd * 54, -252 - (sc ? 10 : 0), 36, 36, RAT_GREY, 3210 + sd, { lw: 5 }); blob(ctx, sd * 54, -250 - (sc ? 10 : 0), 23, 23, RAT_PINK, 3212 + sd, { lw: 0 }); }
  blob(ctx, 0, -198, 62, 54, RAT_GREY, 3214, { lw: 5 });
  blob(ctx, 0, -168, 36, 25, RAT_BELLY, 3215, { lw: 4 });
  shape(ctx, [[-60, -226], [60, -226], [62, -200], [-62, -200]], '#1b1d28', 3216, { lw: 3 });   // the bandit's mask
  shape(ctx, [[60, -222], [84, -232], [80, -214]], '#1b1d28', 3217, { lw: 2 });
  const e = o.eyes || 'red';
  for (const sd of [-1, 1]) {
    const ex = sd * 24, ey = -213;
    if (e === 'happy' || e === 'closed') { line(ctx, [[ex - 10, ey + 3], [ex, ey - (e === 'happy' ? 5 : -2)], [ex + 10, ey + 3]], 3218 + sd, 4, '#ffffff'); continue; }
    if (e === 'shock') { blob(ctx, ex, ey, 15, 17, '#ffffff', 3220 + sd, { lw: 3 }); dot(ctx, ex, ey + 2, 4, INK); continue; }
    blob(ctx, ex, ey, 11, 10, '#ff3b3b', 3222 + sd, { lw: 0, amp: .3 }); dot(ctx, ex - 3, ey - 3, 3.5, '#ffffff');
  }
  dot(ctx, 0, -180, 10, '#ff7a9a');
  for (const sd of [-1, 1]) for (const [dy, len] of [[-8, 70], [4, 76], [16, 66]]) line(ctx, [[sd * 30, -172 + dy * .3], [sd * (30 + len), -176 + dy]], 3224 + sd * 3 + dy, 2.5, 'rgba(59,42,33,.8)');
  const m = o.mouth || 'grin';
  if (m === 'laugh' || m === 'o') shape(ctx, m === 'o' ? ellPts(0, -150, 12, 14, 12) : [[-22, -160], [22, -160], [14, -138], [-14, -138]], '#5a1f1f', 3230, { lw: 3, amp: .3 });
  else if (m === 'eat') { blob(ctx, -26, -160, 14, 12, RAT_GREY, 3233, { lw: 3 }); blob(ctx, 26, -160, 14, 12, RAT_GREY, 3234, { lw: 3 }); }
  else line(ctx, [[-22, -160], [-8, -154], [8, -154], [22, -160]], 3235, 3.5);
  if (m !== 'o') for (const sd of [-1, 1]) shape(ctx, [[sd * 1, -156], [sd * 11, -156], [sd * 10, -140], [sd * 2, -140]], '#ffffff', 3236 + sd, { lw: 3, sharp: true });   // buck teeth
  const Hh = { down: [[-64, -100], [64, -100]], up: [[-40, -238], [40, -238]], hold: [[-40, -206], [40, -206]], shrug: [[-96, -150], [96, -150]] }[o.arms || 'down'];
  for (const [sd, h] of [[-1, Hh[0]], [1, Hh[1]]]) {
    tube(ctx, [[sd * 46, -134], [(sd * 46 + h[0]) / 2 + sd * 12, (-134 + h[1]) / 2 + 8], h], 15, 3240 + sd, RAT_GREY, 5);
    blob(ctx, h[0], h[1], 12, 11, RAT_PINK, 3242 + sd, { lw: 3 });
  }
  ctx.restore();
}

// ───────── the boy (the natkhat chhora: messy hair, orange pagdi with a fan, tee and shorts) ─────────
const ORANGE = '#f5902a', ORANGE_D = '#c8620e', BLUSH = 'rgba(255,128,142,', MOUTH = '#6b2b2b', TONGUE = '#ff8f9a';
const POSE0 = {
  x: 0, y: 0, s: 1, face: 1, rot: 0, bob: 0, sq: 0, headTilt: 0, headX: 0, headY: 0,
  armL: [-.22, -.12], armR: [.22, .12], legL: [-.05, 0], legR: [.05, 0],
  eyes: 'happy', mouth: 'smile', open: 0, brows: null, blush: 1, look: 0,
  handL: null, handR: null, sweat: 0, hold: null, holdL: null, stars: 0, tears: 0,
};
const pose = o => Object.assign({}, POSE0, o);
// a two-link arm reaching for a hand target (local px); out = -1 bends the elbow to the left, +1 to the right
function ikArm(S, H, l1, l2, out) {
  let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy);
  const dmax = l1 + l2 - .5, dmin = Math.abs(l1 - l2) + 6;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) { dx *= dmin / Math.max(d, 1e-3); dy *= dmin / Math.max(d, 1e-3); d = dmin; }
  const th = Math.atan2(dx, dy), al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const c = [th + al, th - al].map(a1 => [S[0] + Math.sin(a1) * l1, S[1] + Math.cos(a1) * l1]);
  const E = (c[0][0] - c[1][0]) * out > 0 ? c[0] : c[1];
  return [S, E, [S[0] + dx, S[1] + dy]];
}
function armPts(sx, sy, a, l1 = 52, l2 = 48) {
  const ex = sx + Math.sin(a[0]) * l1, ey = sy + Math.cos(a[0]) * l1, b = a[0] + a[1];
  return [[sx, sy], [ex, ey], [ex + Math.sin(b) * l2, ey + Math.cos(b) * l2]];
}
function eyes(ctx, type, seed) {
  ctx.lineCap = 'round';
  switch (type) {
    case 'dot': blob(ctx, 0, 0, 9, 12, INK, seed, { lw: 0, amp: .4 }); dot(ctx, -3, -4, 3.2, '#fff'); break;
    case 'shock': blob(ctx, 0, 0, 17, 19, '#fff', seed, { lw: 5 }); dot(ctx, 0, 2, 5, INK); break;
    case 'closed': line(ctx, [[-13, 2], [0, 7], [13, 2]], seed, 6); break;
    case 'sad': line(ctx, [[-13, 6], [0, 1], [13, 6]], seed, 6); break;
    case 'happy': default: line(ctx, [[-15, 6], [-9, -6], [0, -10], [9, -6], [15, 6]], seed, 6); break;
  }
}
function mouth(ctx, type, open, seed) {
  const o = clamp(open, 0, 1.2);
  switch (type) {
    case 'open': {
      const w = 15 + 9 * o, h = 6 + 24 * o;
      const P = [[-w, -3], [-w * .5, -5], [0, -5.5], [w * .5, -5], [w, -3], [w * .8, h * .5], [0, h], [-w * .8, h * .5]];
      shape(ctx, P, MOUTH, seed, { lw: 5, amp: .6 });
      if (h > 12) { ctx.save(); smoothPath(ctx, P, true, seed, .6); ctx.clip(); blob(ctx, 0, h * .9, w * .65, h * .4, TONGUE, seed + 2, { lw: 0 }); ctx.restore(); }
      break;
    }
    case 'grin': {
      const P = [[-26, -4], [0, -6], [26, -4], [18, 14], [0, 22], [-18, 14]];
      shape(ctx, P, MOUTH, seed, { lw: 5, amp: .6 });
      ctx.save(); smoothPath(ctx, P, true, seed, .6); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(-30, -8, 60, 11); ctx.restore();
      break;
    }
    case 'o': blob(ctx, 0, 6, 8 + 5 * o, 10 + 6 * o, MOUTH, seed, { lw: 5, amp: .5 }); break;
    case 'wavy': line(ctx, [[-18, 4], [-9, -2], [0, 4], [9, -2], [18, 4]], seed, 5); break;
    case 'smile': default: line(ctx, [[-14, -2], [-6, 5], [6, 5], [14, -2]], seed, 5); break;
  }
}
function faceOf(ctx, P, seed, cx, cy) {
  ctx.save(); ctx.translate(cx, cy);
  if (P.blush > 0) { blob(ctx, -72, 40, 22, 11, BLUSH + (.55 * P.blush) + ')', seed + 30, { lw: 0, amp: .5 }); blob(ctx, 72, 40, 22, 11, BLUSH + (.55 * P.blush) + ')', seed + 31, { lw: 0, amp: .5 }); }
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(side * 44 + (P.look || 0) * 6, 12); eyes(ctx, P.eyes, seed + 10 + side); ctx.restore(); }
  if (P.brows === 'worried') { line(ctx, [[-60, -14], [-28, -26]], seed + 40, 5); line(ctx, [[60, -14], [28, -26]], seed + 41, 5); }
  if (P.brows === 'angry') { line(ctx, [[-62, -24], [-28, -12]], seed + 40, 6); line(ctx, [[62, -24], [28, -12]], seed + 41, 6); }
  ctx.save(); ctx.translate(0, 52); mouth(ctx, P.mouth, P.open, seed + 50); ctx.restore();
  ctx.restore();
}
function drawBoy(ctx, P, t, seed = 100) {
  ctx.save();
  ctx.translate(P.x, P.y - P.bob);
  ctx.scale(P.s * P.face * (1 + P.sq * .6), P.s * (1 - P.sq));
  ctx.rotate(P.rot);
  for (const [sx, a, sd] of [[-24, P.legL, 1], [24, P.legR, 2]]) {       // legs, feet on the ground
    const pts = armPts(sx, -112, [a[0], a[1]], 56, 52);
    tube(ctx, pts, 20, seed + sd);
    const f = pts[2];
    blob(ctx, f[0] + (sx < 0 ? -6 : 6), f[1] + 4, 21, 12, FILL, seed + 10 + sd, { amp: .8 });
  }
  shape(ctx, [[-56, -152], [56, -152], [58, -106], [8, -102], [0, -118], [-8, -102], [-58, -106]], FILL, seed + 20);   // shorts
  shape(ctx, [[-48, -262], [-58, -236], [-56, -150], [0, -144], [56, -150], [58, -236], [48, -262], [18, -268], [-18, -268]], FILL, seed + 21);
  line(ctx, [[-18, -266], [0, -254], [18, -266]], seed + 22, 5);
  const shL = [-50, -248], shR = [50, -248];
  const aL = P.handL ? ikArm(shL, P.handL, 52, 48, -1) : armPts(shL[0], shL[1], P.armL);
  const aR = P.handR ? ikArm(shR, P.handR, 52, 48, 1) : armPts(shR[0], shR[1], P.armR);
  const raised = a => a[2][1] < -262;
  const drawArm = (a, s2, hold) => {
    tube(ctx, a, 19, seed + s2);
    tube(ctx, [a[0], [lerp(a[0][0], a[1][0], .38), lerp(a[0][1], a[1][1], .38)]], 30, seed + s2 + 3);     // sleeve
    blob(ctx, a[2][0], a[2][1], 15, 15, FILL, seed + s2 + 5, { amp: .7 });
    if (hold === 'chappal') chappal(ctx, a[2][0] + 6, a[2][1] - 34, -1.35, .78, seed + s2 + 7);
    if (hold === 'laddoo') laddoo(ctx, a[2][0], a[2][1] - 26, 26, seed + s2 + 8);
  };
  if (!raised(aL)) drawArm(aL, 30, P.holdL);
  if (!raised(aR)) drawArm(aR, 40, P.hold);
  const hx = P.headX, hy = -366 + P.headY;                                  // the head
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(P.headTilt);
  shape(ctx, [[96, -60], [138, -90], [130, -52], [150, -40], [118, -20]], FILL, seed + 50);
  shape(ctx, [[-118, -30], [-136, -8], [-120, 2], [-128, 24], [-108, 18]], FILL, seed + 51);
  blob(ctx, -118, 14, 16, 20, FILL, seed + 52); blob(ctx, 118, 14, 16, 20, FILL, seed + 53);
  shape(ctx, [[-120, -30], [-110, -84], [-60, -110], [0, -116], [60, -110], [110, -84], [120, -30], [116, 30], [90, 80], [40, 104], [0, 108], [-40, 104], [-90, 80], [-116, 30]], FILL, seed + 54);
  // the pagdi: a puffy orange wrap with folds and a fan
  shape(ctx, [[54, -150], [70, -196], [92, -206], [110, -190], [104, -158], [82, -140]], ORANGE, seed + 55);
  line(ctx, [[74, -160], [86, -196]], seed + 56, 3.5, ORANGE_D); line(ctx, [[88, -156], [100, -190]], seed + 57, 3.5, ORANGE_D);
  shape(ctx, [[-128, -26], [-136, -76], [-112, -128], [-56, -160], [10, -170], [80, -156], [126, -112], [136, -56], [128, -18], [86, -30], [30, -44], [-30, -42], [-84, -30]], ORANGE, seed + 58);
  line(ctx, [[-120, -44], [-70, -98], [0, -132], [70, -142]], seed + 59, 4, ORANGE_D);
  line(ctx, [[-96, -34], [-30, -76], [50, -104], [118, -98]], seed + 60, 4, ORANGE_D);
  line(ctx, [[-40, -42], [30, -60], [100, -64], [130, -46]], seed + 61, 4, ORANGE_D);
  shape(ctx, [[116, -40], [150, -20], [156, 10], [138, 4], [122, -16]], ORANGE, seed + 62);
  faceOf(ctx, P, seed + 200, 0, 6);
  if (P.tears > 0) for (const sd of [-1, 1]) {                               // two streams of cartoon tears
    const u = (t * 2.2 + (sd > 0 ? .5 : 0)) % 1;
    ctx.globalAlpha = P.tears * (1 - u);
    blob(ctx, sd * 50 + sd * u * 30, 46 + u * 90, 9, 13, '#8fd3ff', seed + 70 + sd, { lw: 3 });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (raised(aL)) drawArm(aL, 30, P.holdL);
  if (raised(aR)) drawArm(aR, 40, P.hold);
  if (P.sweat > 0) {
    const y = hy - 40 + (t * 60 % 30);
    shape(ctx, [[hx + 110, y - 26], [hx + 122, y], [hx + 110, y + 10], [hx + 98, y]], 'rgba(150,210,255,' + P.sweat + ')', seed + 60, { lw: 4 });
  }
  if (P.stars > 0) for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; star(ctx, hx + Math.cos(a) * 120, hy - 140 + Math.sin(a) * 26, 17, '#ffd23f', a, seed + 90 + k); }
  ctx.restore();
}

// ───────── props ─────────
// a blue-and-white rubber chappal seen from above (gold for the golden chappal)
function chappal(ctx, x, y, rot, s = 1, seed = 970, gold = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  shape(ctx, [[-64, -6], [-52, -24], [20, -28], [60, -20], [68, 0], [60, 20], [20, 26], [-52, 22], [-64, 6]], gold ? '#f2b318' : '#4d8fe0', seed, { lw: 5 });
  shape(ctx, [[-54, -4], [-44, -16], [18, -19], [50, -13], [56, 0], [50, 13], [18, 18], [-44, 15], [-54, 4]], gold ? '#ffe680' : '#f4f1ea', seed + 1, { lw: 0 });
  line(ctx, [[-22, -16], [26, 0], [-22, 16]], seed + 2, 9, gold ? '#d18a00' : '#2f6fd0');
  ctx.restore();
}
// her pink sweet box tied with gold ribbon (closed), centred on its middle
function sweetBox(ctx, x, y, s = 1, seed = 1040) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shape(ctx, [[-62, -30], [62, -30], [62, 52], [-62, 52]], '#ff7eb6', seed, { lw: 5, sharp: true });
  line(ctx, [[0, -30], [0, 52]], seed + 1, 10, '#ffd23f');
  shape(ctx, [[-68, -52], [68, -52], [68, -30], [-68, -30]], '#ff5aa5', seed + 2, { lw: 5, sharp: true });
  line(ctx, [[0, -52], [0, -30]], seed + 3, 10, '#ffd23f');
  shape(ctx, [[0, -52], [-26, -80], [-6, -76]], '#ffd23f', seed + 4, { lw: 3 }); shape(ctx, [[0, -52], [26, -80], [6, -76]], '#ffd23f', seed + 5, { lw: 3 });
  ctx.restore();
}
// the paper cat from "Chuhe Se Takkar": a cardboard cat face with ears, whiskers and a pink nose
function paperCat(ctx, x, y, s = 1, t = 0, seed = 1100) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 3) * .06);
  shape(ctx, [[-58, -30], [-50, -86], [-14, -48]], '#e3b27a', seed, { lw: 5 }); shape(ctx, [[58, -30], [50, -86], [14, -48]], '#e3b27a', seed + 1, { lw: 5 });
  shape(ctx, [[-48, -40], [-46, -72], [-24, -48]], '#ffb3c6', seed + 2, { lw: 0 }); shape(ctx, [[48, -40], [46, -72], [24, -48]], '#ffb3c6', seed + 3, { lw: 0 });
  blob(ctx, 0, 0, 66, 56, '#efc48e', seed + 4, { lw: 5 });
  for (const sd of [-1, 1]) { blob(ctx, sd * 24, -8, 10, 13, INK, seed + 5 + sd, { lw: 0, amp: .3 }); dot(ctx, sd * 24 - 3, -12, 3.5, '#fff'); }
  shape(ctx, [[-9, 12], [9, 12], [0, 22]], '#ff7a9a', seed + 8, { lw: 3, amp: .3 });
  line(ctx, [[-14, 30], [-6, 34], [0, 26], [6, 34], [14, 30]], seed + 9, 3.5);
  for (const sd of [-1, 1]) for (const dy of [-6, 6]) line(ctx, [[sd * 30, 20 + dy * .4], [sd * 84, 14 + dy * 1.6]], seed + 10 + sd * 3 + dy, 2.5);
  ctx.restore();
}
// a hand pointer for the first-round hint
function pointer(ctx, x, y, s, seed = 1200) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-.5);
  tube(ctx, [[0, 0], [0, 58]], 22, seed);                                  // the pointing finger
  shape(ctx, [[-30, 50], [30, 50], [36, 104], [10, 128], [-26, 124], [-40, 92]], FILL, seed + 1, { lw: 5 });
  line(ctx, [[-14, 66], [-14, 84]], seed + 2, 4); line(ctx, [[4, 66], [4, 84]], seed + 3, 4); line(ctx, [[20, 66], [20, 84]], seed + 4, 4);
  ctx.restore();
}

// ───────── the kitchen (world units; drawn once into a cache) ─────────
function drawKitchen(ctx, L) {
  const { WW, HH, floorY } = L;
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, '#ffd8b2'); g.addColorStop(1, '#fff2e2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, WW, floorY + 12);
  // a paper grain over the wall
  for (let k = 0; k < 260; k++) {
    const x = hashS(k, 31) * WW, y = hashS(k, 32) * floorY, r = 1 + hashS(k, 33) * 2;
    dot(ctx, x, y, r, hashS(k, 34) < .5 ? 'rgba(160,110,70,.07)' : 'rgba(255,255,255,.25)');
  }
  // tiles behind the table
  const t0 = Math.max(floorY - 560, 160);
  for (let x = 30; x <= WW; x += 92) line(ctx, [[x, t0], [x, floorY]], 800 + x, 2, 'rgba(200,140,100,.2)');
  for (let y = floorY - 92; y >= t0; y -= 92) line(ctx, [[0, y], [WW, y]], 820 + y, 2, 'rgba(200,140,100,.2)');
  // window, clock and a shelf with jars, placed by the shape of the screen
  const dy = Math.max(floorY - 1150, 190);
  const wx = WW > 1500 ? WW * .74 : Math.min(WW * .62, WW - 320), ww = 250, wh = 230;
  shape(ctx, [[wx, dy], [wx + ww, dy], [wx + ww, dy + wh], [wx, dy + wh]], '#bfe4ff', 840, { lw: 6, sharp: true });
  line(ctx, [[wx + ww / 2, dy], [wx + ww / 2, dy + wh]], 841, 5); line(ctx, [[wx, dy + wh / 2], [wx + ww, dy + wh / 2]], 842, 5);
  shape(ctx, [[wx - 22, dy - 18], [wx + 34, dy - 18], [wx + 22, dy + wh + 26], [wx - 18, dy + wh + 34]], '#ff9f7a', 843);
  shape(ctx, [[wx + ww + 22, dy - 18], [wx + ww - 34, dy - 18], [wx + ww - 22, dy + wh + 26], [wx + ww + 18, dy + wh + 34]], '#ff9f7a', 844);
  line(ctx, [[wx - 40, dy - 20], [wx + ww + 40, dy - 20]], 845, 7, '#8a5530');
  const cxk = Math.max(WW * .3, 200), cyk = dy + 40;
  blob(ctx, cxk, cyk, 46, 46, '#fffaf0', 849, { lw: 5 });
  line(ctx, [[cxk, cyk], [cxk + 22, cyk - 22]], 850, 4); line(ctx, [[cxk, cyk], [cxk - 4, cyk - 30]], 851, 5);
  const sy = dy + 190, sx0 = 36, sx1 = Math.min(360, WW * .36);
  shape(ctx, [[sx0, sy], [sx1, sy], [sx1, sy + 18], [sx0, sy + 18]], '#a8693d', 846, { lw: 5, sharp: true });
  blob(ctx, sx0 + 50, sy - 38, 30, 36, '#ffe08a', 847, { lw: 5 }); blob(ctx, sx0 + 124, sy - 34, 26, 32, '#c4e8a0', 848, { lw: 5 });
  if (sx1 - sx0 > 250) blob(ctx, sx0 + 196, sy - 36, 28, 34, '#ffb3c1', 852, { lw: 5 });
  // the gang's crack (left) and the rat's mousehole (right), at the floor
  const c = L.crackX;
  shape(ctx, [[c - 56, floorY + 6], [c - 40, floorY - 62], [c - 14, floorY - 44], [c, floorY - 92], [c + 22, floorY - 52], [c + 52, floorY + 6]], '#2a1a14', 853, { lw: 5 });
  line(ctx, [[c, floorY - 92], [c + 10, floorY - 130], [c + 34, floorY - 150]], 854, 4);
  const hx = L.holeX, w = 128, h = 142, P = [];
  for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; P.push([hx - Math.cos(a) * w / 2, floorY - h + (1 - Math.sin(a)) * h * .5]); }
  const arch = [[hx - w / 2, floorY + 6], ...P, [hx + w / 2, floorY + 6]];
  shape(ctx, arch.map(([px, py]) => [px + (px < hx ? -12 : px > hx ? 12 : 0), py - 12]), '#a8693d', 855, { lw: 5 });
  shape(ctx, arch, '#1d120d', 856, { lw: 5 });
  // the floor
  ctx.fillStyle = '#d9a777'; ctx.fillRect(0, floorY + 8, WW, HH - floorY);
  for (let k = 1; k < 4; k++) { const y = floorY + 8 + (HH - floorY) * k / 4; line(ctx, [[0, y], [WW * .5, y + 3], [WW, y]], 860 + k, 3, 'rgba(120,70,30,.22)'); }
  line(ctx, [[0, floorY + 8], [WW * .25, floorY + 6], [WW * .5, floorY + 9], [WW * .75, floorY + 6], [WW, floorY + 8]], 901, 6, '#a87a52');
  // the table
  const { tx0, tx1, topY } = L;
  for (const lx of [L.legL, L.legR]) shape(ctx, [[lx - 13, topY + 26], [lx + 13, topY + 26], [lx + 13, floorY + 6], [lx - 13, floorY + 6]], '#8a5530', 870 + lx, { lw: 5, sharp: true });
  shape(ctx, [[tx0, topY], [tx1, topY], [tx1, topY + 28], [tx0, topY + 28]], '#a8693d', 880, { lw: 5, sharp: true });
  line(ctx, [[tx0 + 14, topY + 9], [tx1 - 14, topY + 9]], 881, 3, 'rgba(255,230,200,.45)');
}
