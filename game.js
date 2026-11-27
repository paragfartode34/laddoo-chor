// game.js: "Laddoo Chor", a YouTube Playable from the channel's cartoon series "Natkhat Chhora vs the Cockroach Gang".
// The Cockroach Gang sneaks out of the wall crack and the mousehole, climbs the table legs or abseils down on threads,
// and carries the laddoos off the thali. Tap them before they get away; tap a thief to win its laddoo back.
// This file: layout (every aspect ratio), the round, effects, HUD, screens, input, saving, and the Playables SDK.
'use strict';

// ───────── the YouTube Playables SDK (absent, or a no-op, outside YouTube) ─────────
const YT = typeof ytgame !== 'undefined' ? ytgame : null;
const IN_YT = !!(YT && YT.IN_PLAYABLES_ENV);
const QS = new URLSearchParams(location.search);
const DEBUG = !IN_YT && QS.get('debug') === '1';
function sdk(fn) { if (!YT) return undefined; try { return fn(YT); } catch (e) { return undefined; } }
function settle(p, ms, fallback) {          // a promise's value, or `fallback` if it fails or takes longer than ms
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    setTimeout(() => fin(fallback), ms);
    Promise.resolve(p).then(fin, () => fin(fallback));
  });
}
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ───────── words (English is the default; the stickers are the cartoon's own sound words) ─────────
const STR = {
  en: { tagline: 'Save the laddoos from the Cockroach Gang!', series: 'Natkhat Chhora vs the Cockroach Gang', play: 'TAP TO PLAY', hint: 'Tap the cockroaches!',
    best: 'Best', newBest: 'NEW BEST!', over: 'The gang took every laddoo!', again: 'PLAY AGAIN', adCont: 'Watch an ad: +3 laddoos', noAd: 'No ad right now',
    paused: 'Paused', tapGo: 'Tap to continue', saved: 'SAVED!', sweets: '+3 LADDOOS!', golden: 'GOLDEN CHAPPAL!', ratSub: 'Hit him 4 times!', go: 'GO!' },
  hi: { tagline: 'लड्डुओं को कॉकरोच गैंग से बचाओ!', series: 'नटखट छोरा vs कॉकरोच गैंग', play: 'खेलने के लिए टैप करो', hint: 'कॉकरोच पर टैप करो!',
    best: 'बेस्ट', newBest: 'नया रिकॉर्ड!', over: 'गैंग सारे लड्डू ले गया!', again: 'फिर से खेलो', adCont: 'विज्ञापन देखो: +3 लड्डू', noAd: 'अभी कोई विज्ञापन नहीं',
    paused: 'रुका हुआ', tapGo: 'जारी रखने के लिए टैप करो', saved: 'BACH GAYA!', sweets: '+3 LADDOO!', golden: 'SONE KI CHAPPAL!', ratSub: 'उसे 4 बार मारो!', go: 'CHALO!' },
  es: { tagline: '¡Salva los laddus de la Pandilla Cucaracha!', series: 'Natkhat Chhora vs la Pandilla Cucaracha', play: 'TOCA PARA JUGAR', hint: '¡Toca las cucarachas!',
    best: 'Récord', newBest: '¡NUEVO RÉCORD!', over: '¡La pandilla se llevó todos los laddus!', again: 'JUGAR OTRA VEZ', adCont: 'Ver un anuncio: +3 laddus', noAd: 'No hay anuncios ahora',
    paused: 'Pausa', tapGo: 'Toca para continuar', saved: '¡SALVADO!', sweets: '¡+3 LADDUS!', golden: '¡CHANCLA DE ORO!', ratSub: '¡Dale 4 golpes!', go: '¡YA!' },
  pt: { tagline: 'Salve os laddus da Gangue das Baratas!', series: 'Natkhat Chhora vs a Gangue das Baratas', play: 'TOQUE PARA JOGAR', hint: 'Toque nas baratas!',
    best: 'Recorde', newBest: 'NOVO RECORDE!', over: 'A gangue levou todos os laddus!', again: 'JOGAR DE NOVO', adCont: 'Ver um anúncio: +3 laddus', noAd: 'Sem anúncio agora',
    paused: 'Pausado', tapGo: 'Toque para continuar', saved: 'SALVO!', sweets: '+3 LADDUS!', golden: 'CHINELO DE OURO!', ratSub: 'Acerte 4 vezes!', go: 'JÁ!' },
};
let S = STR.en;
async function detectLang() {
  let tag = 'en';
  const v = await settle(sdk(y => y.system.getLanguage()), 1500, null);
  if (typeof v === 'string' && v) tag = v;
  if (!IN_YT && QS.get('lang')) tag = QS.get('lang');          // local testing only
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return STR[base] ? base : 'en';
}

// ───────── saving (YouTube cloud save in the Playable; the browser's storage only outside YouTube) ─────────
const LS_KEY = 'laddoo-chor-save-v1';
const SAVE = { v: 1, best: 0, games: 0, rats: 0 };
const SV = { loaded: false, loading: null, dirty: false, saving: false, again: false };
function applySave(raw) {
  if (typeof raw !== 'string' || !raw) return;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return;
    const n = x => (Number.isFinite(+x) && +x > 0 ? Math.min(Math.floor(+x), 1e12) : 0);
    SAVE.best = Math.max(SAVE.best, n(o.best)); SAVE.games = Math.max(SAVE.games, n(o.games)); SAVE.rats = Math.max(SAVE.rats, n(o.rats));
  } catch (e) { /* an unreadable save is ignored */ }
}
function loadSave() {
  if (SV.loading) return SV.loading;
  if (!IN_YT) {
    try { applySave(localStorage.getItem(LS_KEY)); } catch (e) {}
    SV.loaded = true; return (SV.loading = Promise.resolve());
  }
  const p = sdk(y => y.game.loadData());
  SV.loading = Promise.resolve(p).then(raw => { applySave(raw); SV.loaded = true; }, () => {}).then(() => { SV.loading = null; });
  return SV.loading;
}
function saveGame() {
  if (!SV.dirty || G.sim) return;
  if (!IN_YT) { try { localStorage.setItem(LS_KEY, JSON.stringify(SAVE)); } catch (e) {} SV.dirty = false; return; }
  if (!SV.loaded) { loadSave().then(() => { if (SV.loaded) saveGame(); }); return; }   // the SDK needs loadData first
  if (SV.saving) { SV.again = true; return; }
  SV.saving = true; SV.dirty = false;
  const data = JSON.stringify(SAVE);
  Promise.resolve(sdk(y => y.game.saveData(data))).catch(() => { SV.dirty = true; })
    .then(() => { SV.saving = false; if (SV.again) { SV.again = false; saveGame(); } });
}
function sendScore(v) {
  if (!IN_YT || G.sim) return;
  const p = sdk(y => y.engagement.sendScore({ value: Math.max(0, Math.floor(v)) }));
  if (p && p.catch) p.catch(() => {});
}

// ───────── canvas and layout (world units: 1000 = the shorter side of the screen) ─────────
const cvs = document.getElementById('game'), ctx = cvs.getContext('2d');
let L = null, DPR = 1, bg = null;
function computeLayout(w, h) {
  const k = Math.min(w, h) / 1000, WW = w / k, HH = h / k;
  const floorH = clamp(HH * .16, 120, 240), floorY = HH - floorH;
  const tw = clamp(WW * .56, 540, 780), cx = WW / 2;
  const topY = floorY - 250;
  return { k, w, h, WW, HH, floorH, floorY, tw, cx, tx0: cx - tw / 2, tx1: cx + tw / 2, topY,
    legL: cx - tw / 2 + 52, legR: cx + tw / 2 - 52, plateY: topY - 20, crackX: 96, holeX: WW - 108, portrait: HH > WW * 1.15 };
}
function resize() {
  const w = Math.max(1, Math.round(window.innerWidth)), h = Math.max(1, Math.round(window.innerHeight));
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  const pw = Math.round(w * DPR), ph = Math.round(h * DPR);
  if (cvs.width !== pw || cvs.height !== ph) { cvs.width = pw; cvs.height = ph; }
  L = computeLayout(w, h);
  LWF = clamp(.54 / L.k, 1, 1.5);
  bg = null;
}
function buildBg() {
  bg = document.createElement('canvas'); bg.width = cvs.width; bg.height = cvs.height;
  const c = bg.getContext('2d'), b = BOIL;
  c.setTransform(DPR * L.k, 0, 0, DPR * L.k, 0, 0);
  BOIL = 0; drawKitchen(c, L); BOIL = b;
}

// ───────── the game state ─────────
const G = {
  state: 'loading', t: 0, anim: 0, score: 0, combo: 0, plate: 10, crumbs: 0, ents: [], fx: [], flying: [], powers: [],
  spawnT: 0, powerT: 0, ratAt: 0, golden: 0, shake: 0, hud: 0, needTap: false, endT: 0, overT: 0, newBest: false,
  continued: false, busy: false, adFail: false, lastAd: -1e9, idc: 0, buttons: [], kos: 0, ratsBeaten: 0, hint: false,
  pendingStart: false, sim: false,
};
const mult = () => 1 + Math.min(4, Math.floor(G.combo / 5));
// difficulty: the gang comes faster and more often the longer the round lasts (it never stops rising)
const spawnInterval = () => .18 + 1.57 * Math.exp(-G.t / 60);
const approach = () => 1.6 + 4.8 * Math.exp(-G.t / 70);
const GOLD_TIME = 6, GOLD_REACH = 130;

function startRound() {
  if (paused) { G.pendingStart = true; return; }
  Object.assign(G, { state: 'play', t: 0, score: 0, combo: 0, plate: 10, crumbs: 0, ents: [], flying: [], powers: [],
    spawnT: 1.1, powerT: 14, ratAt: 75, golden: 0, needTap: false, newBest: false, continued: false, adFail: false,
    kos: 0, ratsBeaten: 0, hint: SAVE.games < 3 });
  G.fx = [];
  if (!G.sim) { Sound.playSong('main'); Sound.sfx('fanfare'); sticker(S.go, L.cx, L.topY - 420, { size: 120, dur: .9 }); }
}
function startEnding() {
  G.state = 'ending'; G.endT = 1.7;
  if (!G.sim) { Sound.playSong(null); Sound.sfx('lose'); sticker('HAIN?!', L.cx, L.plateY - 220, { size: 120, dur: 1.6, grad: ['#ff9a85', '#e8331f'] }); }
}
function showOver() {
  G.state = 'over'; G.overT = 0; G.ents = []; G.flying = []; G.powers = [];
  if (G.sim) return;
  const sc = Math.floor(G.score);
  if (sc > SAVE.best) { SAVE.best = sc; G.newBest = true; }
  SAVE.games++; SAVE.rats += G.ratsBeaten; SV.dirty = true;
  saveGame(); sendScore(sc);
  if (G.newBest) Sound.sfx('best');
}
function playAgain() {
  // a natural break between rounds: YouTube may show an interstitial ad here (it pauses the game while it plays)
  if (IN_YT && SAVE.games >= 2 && performance.now() - G.lastAd > 90000) {
    G.lastAd = performance.now();
    const p = sdk(y => y.ads.requestInterstitialAd());
    if (p && p.catch) p.catch(() => {});
  }
  startRound();
}
async function adContinue() {
  if (!IN_YT || G.continued || G.busy || G.adFail) return;
  G.busy = true;
  let ok = false;
  try { ok = await settle(sdk(y => y.ads.requestRewardedAd('laddoo-chor-continue-3')), 120000, false) === true; } catch (e) { ok = false; }
  G.busy = false;
  if (!ok) { G.adFail = true; return; }
  // the reward: three laddoos back on the thali and the same round goes on
  Object.assign(G, { state: 'play', plate: 3, crumbs: 0, ents: [], flying: [], powers: [], spawnT: 1.6, needTap: false, continued: true, newBest: false });
  G.ratAt = Math.max(G.ratAt, G.t + 20);
  Sound.playSong('main'); sticker(S.sweets, L.cx, L.plateY - 230, { size: 96, grad: ['#fff2a8', '#ffb52e'] });
}

// ───────── the Cockroach Gang and Mota Chuha ─────────
function makeRoach(kind, route) {
  const A = approach() * (kind === 2 ? .72 : kind === 0 ? 1.25 : 1.05) * (route === 'T' ? .9 : 1);
  return { type: 'roach', kind, route, side: route === 'L' ? -1 : route === 'R' ? 1 : 0, u: 0, A, state: 'in', timer: 0,
    hp: kind === 0 ? 2 : 1, steal: kind === 0 ? 2 : 1, carry: 0, stun: 0, boost: 1, age: 0, dash: Math.random(),
    off: route === 'T' ? rand(-80, 80) : 0, s: kind === 2 ? .5 : .62, r: kind === 2 ? 82 : 95, capOff: false, spin: 1, id: ++G.idc };
}
function spawnSomething() {
  const inCount = G.ents.filter(e => e.state === 'in').length, cap = Math.min(18, 5 + Math.floor(G.t / 15));
  if (inCount >= cap) return;
  const r = Math.random();
  let kind = 1;                                       // the cool one in shades
  if (G.t > 6 && r < .33) kind = 2;                   // the baby: small and quick
  else if (G.t > 15 && r > (G.t > 120 ? .62 : .72)) kind = 0;   // the boss: two hits, takes two laddoos
  const threadP = G.t < 20 ? 0 : G.t < 60 ? .3 : G.t < 120 ? .4 : .45;
  const route = Math.random() < threadP ? 'T' : (Math.random() < .5 ? 'L' : 'R');
  G.ents.push(makeRoach(kind, route));
}
function spawnRat() {
  const side = Math.random() < .7 ? 1 : -1;           // usually out of his own mousehole on the right
  G.ents.push({ type: 'rat', kind: 3, route: side < 0 ? 'L' : 'R', side, u: 0, A: approach() * 1.1, state: 'in', timer: 0,
    hp: 4, steal: 3, carry: 0, stun: 0, boost: 1, age: 0, s: .68, r: 135, spin: 1, id: ++G.idc });
  if (!G.sim) {
    sticker('MOTA CHUHA!', L.cx, Math.max(260, L.topY - 470), { size: 104, dur: 1.8, grad: ['#d9dde3', '#8a93a0'] });
    sticker(S.ratSub, L.cx, Math.max(360, L.topY - 370), { size: 50, dur: 1.8, grad: ['#ffffff', '#ffe46b'], rot: 0 });
    Sound.sfx('ratSting'); Sound.playSong('chase');
  }
}
const ratOnScreen = () => G.ents.some(e => e.type === 'rat');
function walkPts(side) {
  const x0 = side < 0 ? L.crackX : L.holeX, legX = side < 0 ? L.legL : L.legR, stop = L.cx + side * 178;
  return [[x0, L.floorY], [legX, L.floorY], [legX, L.topY], [stop, L.topY]];
}
const pileTop = n => L.plateY + (n > 0 ? LAD10[Math.min(n, 10) - 1][1] - 26 : -12);
function entPos(e) {
  if (e.route === 'T') return { x: L.cx + e.off, y: lerp(-90, pileTop(G.plate) - 2, clamp(e.u)), seg: 3 };
  const P = walkPts(e.side);
  const d = [Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), P[1][1] - P[2][1], Math.abs(P[3][0] - P[2][0])];
  let s = clamp(e.u) * (d[0] + d[1] + d[2]), i = 0;
  while (i < 2 && s > d[i]) { s -= d[i]; i++; }
  const v = d[i] > 0 ? s / d[i] : 0, a = P[i], b = P[i + 1];
  return { x: lerp(a[0], b[0], v), y: lerp(a[1], b[1], v), seg: i };
}
function entCenter(e) { const p = entPos(e); return { x: p.x, y: p.y - (e.type === 'rat' ? 150 : 118) * e.s }; }
const hittable = e => e.state === 'in' || e.state === 'grab' || e.state === 'out' || e.state === 'confused';

function stepEnt(e, dt) {
  e.age += dt;
  if (e.stun > 0) { e.stun -= dt; return; }
  switch (e.state) {
    case 'in': {
      let v = 1 / e.A;
      if (e.type === 'roach' && e.kind === 1) { const c = (e.age * 1.4 + e.dash) % 1; e.dashing = c < .6; v *= e.dashing ? 1.75 : .12; }
      e.u += v * dt * e.boost;
      if (e.u >= 1) { e.u = 1; arrive(e); }
      break;
    }
    case 'grab': case 'confused': e.timer -= dt; if (e.timer <= 0) e.state = 'out'; break;
    case 'out': e.u -= (2 + Math.min(2.5, G.t / 240)) / e.A * dt * e.boost; if (e.u <= 0) escape(e); break;
    case 'bonk': e.timer -= dt; if (e.timer <= 0) { e.state = 'flee'; e.fleeV = Math.max(e.u, .05) / .9; } break;
    case 'scared': e.timer -= dt; if (e.timer <= 0) { e.state = 'flee'; e.fleeV = Math.max(e.u, .05) / .8; } break;
    case 'flee': e.u -= e.fleeV * dt; if (e.u <= 0) e.state = 'gone'; break;
  }
}
function arrive(e) {
  if (G.plate > 0) {
    const n = Math.min(e.steal, G.plate);
    G.plate -= n; e.carry = n; e.state = 'grab'; e.timer = e.type === 'rat' ? .45 : .3; G.crumbs = Math.min(9, G.crumbs + 2);
    if (!G.sim) { Sound.sfx('grab'); crumbFx(L.cx, L.plateY - 40); }
  } else {
    e.state = 'confused'; e.timer = .7;
    if (!G.sim) { const c = entCenter(e); sticker('?', c.x, c.y - 130 * e.s, { size: 70, dur: .7, grad: ['#ffffff', '#ffe46b'] }); }
  }
}
function escape(e) {
  e.state = 'gone';
  if (e.carry > 0) {
    G.combo = 0; G.hud = 1;
    if (!G.sim) {
      const p = entPos(e);
      sticker(e.type === 'rat' ? 'HEH HEH!' : 'HEHE!', clamp(p.x, 160, L.WW - 160), p.y - 170, { size: 72, dur: .9, grad: ['#b6f28a', '#3fae2a'] });
      Sound.sfx('hehe'); Sound.sfx('steal'); shake(6);
    }
    e.carry = 0;
  }
}

// ───────── tapping ─────────
function tapAt(wx, wy) {
  for (const p of G.powers) if (!p.taken && Math.hypot(p.x - wx, p.y - wy) < Math.max(96, 26 / L.k)) { takePower(p); return; }
  const gold = G.golden > 0, hits = [];
  for (const e of G.ents) {
    if (!hittable(e)) continue;
    const c = entCenter(e), r = Math.max(e.r, 24 / L.k) + (gold ? GOLD_REACH : 0), d = Math.hypot(c.x - wx, c.y - wy);
    if (d <= r) hits.push([d / r, e]);
  }
  if (!G.sim) { chappalFx(wx, wy, gold); if (gold) ringFx(wx, wy, GOLD_REACH + 90); }
  if (!hits.length) { miss(wx, wy); return; }
  hits.sort((a, b) => a[0] - b[0]);
  if (gold) for (const [, e] of hits) hitEnt(e, 2); else hitEnt(hits[0][1], 1);
}
function hitEnt(e, dmg) {
  const c = entCenter(e);
  e.hp -= dmg;
  if (e.hp > 0) {                                             // the boss loses his cap; the rat takes a knock
    e.stun = e.type === 'rat' ? .35 : .22;
    e.u = clamp(e.u + (e.state === 'out' ? .05 : -.05) * (e.type === 'rat' ? 1 : .6), 0, 1);
    G.score += 5 * mult();
    if (G.sim) return;
    if (e.type === 'roach' && !e.capOff) {
      e.capOff = true; e.boost = 1.3;
      capFx(c.x, c.y - 70, entPos(e).x < L.cx ? -1 : 1);
      sticker('HAIN?!', c.x, c.y - 120, { size: 64, dur: .7, grad: ['#ff9a85', '#e8331f'] }); Sound.sfx('pop');
    } else { sticker(pick(['TOK!', 'BONK!']), c.x, c.y - 120, { size: 70, dur: .6 }); Sound.sfx('squeak'); }
    Sound.sfx('tok'); starBurst(c.x, c.y, 3); shake(3);
    return;
  }
  const before = mult();
  G.combo++; G.kos++;
  const pts = (e.type === 'rat' ? 100 : [25, 10, 15][e.kind]) * mult();
  G.score += pts;
  if (e.carry > 0) rescue(e, c);
  e.state = 'bonk'; e.timer = .5; e.spin = c.x < L.cx ? -1 : 1; e.stun = 0;
  if (e.type === 'rat') G.ratsBeaten++;
  G.hint = false;
  if (G.sim) return;
  sticker(e.type === 'rat' ? 'BHAAG GAYA!' : pick(['TOK!', 'BONK!', 'DHAPP!', 'THAPAAK!', 'TAK!']), c.x, c.y - 120, { size: e.type === 'rat' ? 90 : 74, dur: .7 });
  floatText('+' + pts, c.x + 70, c.y - 40);
  starBurst(c.x, c.y, e.type === 'rat' ? 8 : 5); shake(e.type === 'rat' ? 9 : 4);
  Sound.sfx('tok'); Sound.sfx('boing', e.type === 'rat' ? 150 : e.kind === 2 ? 340 : 240);
  if (e.type === 'rat') Sound.sfx('squeak');
  if (mult() > before) { Sound.sfx('combo', mult()); sticker(`×${mult()}`, L.WW - 150, 250, { size: 84, dur: .9, grad: ['#e9b6ff', '#9b4dff'] }); }
}
function rescue(e, c) {
  for (let i = 0; i < e.carry; i++) G.flying.push({ x0: c.x, y0: c.y - 90 * e.s, x1: L.cx + rand(-40, 40), y1: L.plateY - 70, t: -i * .08, dur: .45 });
  G.score += 20 * e.carry;
  if (!G.sim) { sticker(S.saved, c.x, c.y - 210, { size: 66, dur: .9, grad: ['#b6efff', '#2f9be0'] }); Sound.sfx('rescue'); }
  e.carry = 0;
}
function miss(wx, wy) {
  G.combo = 0;
  if (G.sim) return;
  dustFx(wx, wy); Sound.sfx('thud');
}

// ───────── power-ups: her sweet box (+3 laddoos), the paper cat (MEOW! scares everyone), the golden chappal ─────────
let powerId = 0;
function spawnPower() {
  const low = G.plate <= 5, r = Math.random();
  const kind = (low && r < .6) || (!low && r < .38) ? 'box' : r < .72 ? 'cat' : 'gold';
  const side = Math.random() < .5 ? -1 : 1;
  const x = clamp(L.cx + side * rand(L.tw * .3, L.tw * .5 + 120), 120, L.WW - 120);
  const y = clamp(rand(L.topY - 560, L.topY - 230), 250, L.topY - 200);
  G.powers.push({ kind, x, y, t: 0, life: 5.5, id: ++powerId });
  if (!G.sim) Sound.sfx('plip', 1300);
}
function takePower(p) {
  p.taken = true; G.powers = G.powers.filter(q => q !== p);
  if (p.kind === 'box') {
    for (let i = 0; i < 3; i++) G.flying.push({ x0: p.x, y0: p.y, x1: L.cx + rand(-50, 50), y1: L.plateY - 70, t: -i * .1, dur: .55 });
    if (!G.sim) { sticker(S.sweets, p.x, p.y - 110, { size: 70, grad: ['#fff2a8', '#ff7eb6'] }); Sound.sfx('sparkle'); }
  } else if (p.kind === 'cat') {
    for (const e of G.ents) {
      if (!hittable(e)) continue;
      const c = entCenter(e);
      if (e.carry > 0) rescue(e, c);
      e.state = 'scared'; e.timer = .35; e.scared = 1;
      G.score += e.type === 'rat' ? 50 : 5;
      if (e.type === 'rat') G.ratsBeaten++;
    }
    if (!G.sim) { sticker('MEOW!', p.x, p.y - 100, { size: 110, dur: 1.1, grad: ['#ffd0e0', '#ff5f9e'] }); Sound.sfx('meow'); shake(6); }
  } else {
    G.golden = GOLD_TIME;
    if (!G.sim) { sticker(S.golden, p.x, p.y - 110, { size: 64, grad: ['#fff2a8', '#f2b318'] }); Sound.sfx('golden'); }
  }
}
function stepPowers(dt) {
  for (const p of G.powers) p.t += dt;
  G.powers = G.powers.filter(p => p.t < p.life);
}
function stepFlying(dt) {
  for (const f of G.flying) {
    f.t += dt;
    if (f.t >= f.dur && !f.done) { f.done = true; G.plate = Math.min(10, G.plate + 1); if (!G.sim) Sound.sfx('plip', 700 + G.plate * 40); }
  }
  G.flying = G.flying.filter(f => !f.done);
}

// ───────── the round ─────────
function stepRound(dt, ending) {
  if (!ending) {
    G.t += dt;
    G.spawnT -= dt;
    if (G.spawnT <= 0) { spawnSomething(); G.spawnT = spawnInterval() * rand(.75, 1.25); }
    G.powerT -= dt;
    if (G.powerT <= 0) { spawnPower(); G.powerT = rand(15, 23); }
    if (G.t >= G.ratAt) { if (!ratOnScreen()) spawnRat(); G.ratAt = G.t + rand(46, 58); }
    if (G.golden > 0) G.golden = Math.max(0, G.golden - dt);
  }
  const hadRat = ratOnScreen();
  for (const e of G.ents) stepEnt(e, dt);
  G.ents = G.ents.filter(e => e.state !== 'gone');
  if (hadRat && !ratOnScreen() && !ending && !G.sim) Sound.playSong('main');
  stepFlying(dt); stepPowers(dt);
  if (!ending && G.plate <= 0 && !G.ents.some(e => e.carry > 0) && G.flying.length === 0) startEnding();
}
function update(dt) {
  G.anim += dt;
  if (G.state === 'play' && !G.needTap) stepRound(dt, false);
  else if (G.state === 'ending') { stepRound(dt, true); G.endT -= dt; if (G.endT <= 0) showOver(); }
  else if (G.state === 'over') { G.overT += dt; if (G.overT > 1.6 && G.overT - dt <= 1.6) Sound.playSong('title'); }
  if (G.state === 'play') Sound.setTempo(1 + Math.min(.12, G.t / 900), G.t > 60);
  stepFx(dt);
  G.hud = Math.max(0, G.hud - dt * 1.6);
  G.shake *= Math.exp(-dt * 14);
}

// ───────── effects ─────────
function shake(px) { if (!REDUCED_MOTION) G.shake = Math.max(G.shake, px); }
function fxAdd(o) { G.fx.push(Object.assign({ t: 0 }, o)); if (G.fx.length > 90) G.fx.shift(); }
function sticker(text, x, y, o = {}) {
  fxAdd({ kind: 'sticker', text, x: clamp(x, 140, L.WW - 140), y: Math.max(y, 90), dur: o.dur || .9, size: o.size || 74, rot: o.rot ?? rand(-.12, .12), grad: o.grad || ['#ffe46b', '#ffb02e'] });
}
function floatText(text, x, y) { fxAdd({ kind: 'float', text, x, y, dur: .8 }); }
function starBurst(x, y, n) { for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), v = rand(260, 520); fxAdd({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, rot: rand(0, 6), vr: rand(-9, 9), r: rand(14, 24), dur: .6 }); } }
function chappalFx(x, y, gold) { fxAdd({ kind: 'chappal', x, y, rot: rand(-.9, -.2), dur: .3, gold }); }
function ringFx(x, y, r) { fxAdd({ kind: 'ring', x, y, r, dur: .35 }); }
function dustFx(x, y) { for (let i = 0; i < 5; i++) fxAdd({ kind: 'dust', x: x + rand(-30, 30), y: y + rand(-10, 20), vx: rand(-160, 160), vy: rand(-120, -20), r: rand(16, 28), dur: .45 }); }
function capFx(x, y, dir) { fxAdd({ kind: 'cap', x, y, vx: dir * rand(160, 260), vy: -620, rot: 0, vr: dir * 12, dur: 1.3 }); }
function crumbFx(x, y) { for (let i = 0; i < 6; i++) fxAdd({ kind: 'crumb', x: x + rand(-60, 60), y, vx: rand(-200, 200), vy: rand(-380, -160), r: rand(4, 8), dur: .6 }); }
function stepFx(dt) {
  for (const f of G.fx) {
    f.t += dt;
    if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.kind === 'dust' ? 0 : 1500) * dt; }
    if (f.vr) f.rot += f.vr * dt;
  }
  G.fx = G.fx.filter(f => f.t < f.dur);
}
function drawFx(c, layer) {
  for (const f of G.fx) {
    const u = f.t / f.dur;
    if ((f.kind === 'sticker' || f.kind === 'float') !== (layer === 'top')) continue;
    switch (f.kind) {
      case 'sticker': {
        const s = popScale(f.t) * (u > .82 ? 1 - (u - .82) / .18 : 1);
        if (s <= 0) break;
        c.save(); c.translate(f.x, f.y - 30 * u); c.rotate(f.rot); c.scale(s, s);
        inkText(c, f.text, 0, 0, { size: f.size, grad: f.grad, lw: f.size * .13, outer: '#fff', maxW: L.WW - 60 });
        c.restore(); break;
      }
      case 'float': c.globalAlpha = 1 - u; inkText(c, f.text, f.x, f.y - 90 * u, { size: 50, fill: '#fff', lw: 8, shadow: false }); c.globalAlpha = 1; break;
      case 'star': c.globalAlpha = 1 - u * u; star(c, f.x, f.y, f.r, '#ffd23f', f.rot, 1700, 3); c.globalAlpha = 1; break;
      case 'chappal': {
        const s = f.t < .06 ? lerp(1.5, .95, f.t / .06) : .95, a = f.t < .14 ? 1 : 1 - (f.t - .14) / .16;
        c.globalAlpha = clamp(a); chappal(c, f.x, f.y - (f.t < .06 ? 40 * (1 - f.t / .06) : 0), f.rot, s, 1710, f.gold); c.globalAlpha = 1; break;
      }
      case 'ring': c.beginPath(); c.arc(f.x, f.y, f.r * easeOut(u), 0, Math.PI * 2); c.lineWidth = 12 * (1 - u) * LWF; c.strokeStyle = 'rgba(255,200,40,.85)'; c.stroke(); break;
      case 'dust': c.globalAlpha = (1 - u) * .8; blob(c, f.x, f.y, f.r * (1 + u), f.r * .8 * (1 + u), '#cbbfae', 1720, { lw: 3, amp: 2 }); c.globalAlpha = 1; break;
      case 'cap': c.globalAlpha = u > .8 ? (1 - u) / .2 : 1; capAlone(c, f.x, f.y, f.rot, .62); c.globalAlpha = 1; break;
      case 'crumb': dot(c, f.x, f.y, f.r, '#e8890f'); break;
    }
  }
}

// ───────── drawing the round ─────────
function drawEnt(c, e) {
  const p = entPos(e), t = G.anim + e.id * .37, s = e.s, thread = e.route === 'T';
  const goingOut = e.state === 'out' || e.state === 'flee' || e.state === 'scared';
  const face = thread ? (e.off <= 0 ? 1 : -1) : (goingOut ? e.side : -e.side) || 1;
  let arms = 'down', eyes = 'dot', mouth = 'grin', run = 1, rot = 0, sq = 0, hopY = 0, speed = 2.6;
  if (thread) { arms = 'up'; run = 0; rot = Math.sin(t * 2.2) * .06; }
  else if (p.seg === 1) { arms = 'climb'; run = .7; speed = 2.2; }
  switch (e.state) {
    case 'in':
      if (!thread && p.seg !== 1) arms = 'sneak';
      eyes = e.kind === 1 ? 'smug' : 'dot'; mouth = e.kind === 2 ? 'smile' : 'grin';
      if (e.dashing === false) run = 0;
      break;
    case 'grab': arms = 'up'; eyes = 'happy'; mouth = 'o'; run = 0; break;
    case 'confused': arms = 'down'; eyes = 'shock'; mouth = 'o'; run = 0; break;
    case 'out': if (!thread && p.seg !== 1) arms = 'up'; eyes = 'happy'; mouth = 'laugh'; speed = 3.4; break;
    case 'bonk': { const u = 1 - e.timer / .5; eyes = 'xx'; mouth = 'o'; arms = 'up'; run = 0; rot = e.spin * Math.PI * easeOut(u * 1.7); hopY = -80 * Math.sin(Math.PI * clamp(u * 1.3)); break; }
    case 'scared': case 'flee': eyes = 'shock'; mouth = 'o'; arms = 'up'; run = 1; speed = 5; break;
  }
  if (e.stun > 0) { eyes = 'shock'; mouth = 'o'; sq = .12 * Math.sin(e.stun * 50); }
  const by = p.y + hopY, cy = by - (e.type === 'rat' ? 150 : 118) * s;
  c.save();
  if (thread) line(c, [[p.x + 3, -30], [p.x + 1, by - 216 * s]], 1300 + e.id % 50, 2.5, 'rgba(59,42,33,.75)', .4);
  if (rot) { c.translate(p.x, cy); c.rotate(rot); c.translate(-p.x, -cy); }
  if (e.type === 'rat') {
    const up = e.carry > 0 || e.state === 'scared' || e.state === 'flee' || e.state === 'bonk';
    rat(c, p.x, by, s, t, { face, run, speed: speed * 1.3, squash: sq, arms: up ? 'up' : 'down',
      eyes: e.state === 'out' ? 'happy' : (e.stun > 0 || e.state === 'flee' || e.state === 'scared') ? 'shock' : e.state === 'bonk' ? 'closed' : 'red',
      mouth: e.state === 'out' ? 'laugh' : e.stun > 0 || e.state === 'bonk' || e.state === 'flee' ? 'o' : 'grin',
      scared: e.state === 'scared' || (e.state === 'flee' && e.scared) ? 1 : 0, tailUp: e.state === 'flee' || e.state === 'scared' ? 1 : 0 });
    if (e.carry > 0) [[-24, -186], [24, -186], [0, -226]].slice(0, e.carry).forEach(([dx, dy], i) => laddoo(c, p.x + dx, by + dy * (s / .68), 22, 1400 + i));
  } else {
    roach(c, p.x, by, s, t, { kind: e.kind, face, run, speed, arms, eyes, mouth, squash: sq, capOff: e.capOff });
    for (let i = 0; i < e.carry; i++) {
      if (thread) laddoo(c, p.x, by - 6 + i * 40, 22, 1410 + i);
      else laddoo(c, p.x, by - 216 * s - 24 - i * 42, 22, 1410 + i);
    }
  }
  c.restore();
  if (e.state === 'bonk' || e.stun > 0) for (let k = 0; k < 3; k++) {
    const a = t * 7 + k * 2.1; star(c, p.x + Math.cos(a) * 60 * s / .62, cy - 95 * s + Math.sin(a) * 16, 13, '#ffd23f', a, 1730 + k, 3);
  }
}
function drawPower(c, p) {
  const life = 1 - p.t / p.life;
  if (life < .25 && Math.floor(p.t * 10) % 2) return;     // blinks before it goes
  const sc = p.t < .25 ? backOut(p.t / .25) : 1, bob = Math.sin(p.t * 3.2) * 10;
  c.save(); c.translate(p.x, p.y + bob); c.scale(sc, sc);
  blob(c, 0, 0, 76, 76, 'rgba(255,255,255,.85)', 1500, { lw: 5 });
  c.beginPath(); c.arc(0, 0, 90, -Math.PI / 2, -Math.PI / 2 + life * Math.PI * 2);
  c.lineWidth = 9 * LWF; c.strokeStyle = p.kind === 'gold' ? '#f2b318' : p.kind === 'cat' ? '#ff5f9e' : '#ff9f2e'; c.lineCap = 'round'; c.stroke();
  if (p.kind === 'box') sweetBox(c, 0, 6, .66, 1510);
  else if (p.kind === 'cat') paperCat(c, 0, 10, .8, p.t, 1520);
  else { chappal(c, 0, 0, -.6, .74, 1530, true); for (let k = 0; k < 3; k++) { const a = p.t * 4 + k * 2.1; star(c, Math.cos(a) * 50, Math.sin(a) * 40, 9, '#fff6b0', a, 1540 + k, 2); } }
  c.restore();
}
function drawFlying(c) {
  for (const f of G.flying) {
    if (f.t < 0) continue;
    const u = clamp(f.t / f.dur), x = lerp(f.x0, f.x1, u), y = lerp(f.y0, f.y1, u) - 160 * Math.sin(Math.PI * u);
    laddoo(c, x, y, 25, 1450);
  }
}
function drawHint(c) {
  if (!G.hint || G.state !== 'play' || G.needTap) return;
  let tgt = null, best = -1;
  for (const e of G.ents) if (hittable(e) && e.u > best) { best = e.u; tgt = e; }
  inkText(c, S.hint, L.cx, Math.min(260, L.topY - 380), { size: 60, maxW: L.WW - 80, fill: '#fff' });
  if (tgt) { const p = entCenter(tgt), b = Math.abs(Math.sin(G.anim * 5)) * 26; pointer(c, p.x + 30 + b * .5, p.y + 20 + b, .78); }
}
function drawHUD(c) {
  const top = 64, gap = Math.min(44, (L.WW * .52 - 50) / 10), r = gap * .43;
  const carried = G.ents.reduce((a, e) => a + (e.carry || 0), 0) + G.flying.length;
  const jx = G.hud > 0 ? Math.sin(G.anim * 60) * 8 * G.hud : 0;
  if (G.hud > 0) { c.globalAlpha = G.hud * .5; roundRect(c, 22, top - r - 14, gap * 10 + 34, r * 2 + 28, r + 14); c.fillStyle = '#ff5a4a'; c.fill(); c.globalAlpha = 1; }
  for (let i = 0; i < 10; i++) {
    const x = 40 + r + i * gap + jx, y = top;
    if (i < G.plate) laddoo(c, x, y, r, 1600 + i);
    else if (i < G.plate + carried) { c.globalAlpha = .3 + .15 * Math.sin(G.anim * 8); laddoo(c, x, y, r, 1600 + i); c.globalAlpha = 1; }
    else { c.save(); c.setLineDash([r * .35, r * .35]); c.beginPath(); c.arc(x, y, r * .85, 0, Math.PI * 2); c.lineWidth = 3.5; c.strokeStyle = 'rgba(59,42,33,.45)'; c.stroke(); c.restore(); }
  }
  inkText(c, String(G.score), L.WW - 40, top + 4, { size: 74, align: 'right', grad: ['#fff8dc', '#ffcf4a'], lw: 11 });
  inkText(c, `${S.best} ${Math.max(SAVE.best, G.score)}`, L.WW - 40, top + 66, { size: 34, align: 'right', fill: '#fff', lw: 7, shadow: false });
  const m = mult();
  if (m > 1) inkText(c, `×${m}`, L.WW - 40, top + 128, { size: 58, align: 'right', grad: ['#f0ccff', '#9b4dff'], lw: 9 });
  if (G.golden > 0) {
    const w = gap * 10, u = G.golden / GOLD_TIME;
    roundRect(c, 40, top + r + 18, w, 16, 8); c.fillStyle = 'rgba(59,42,33,.25)'; c.fill();
    roundRect(c, 40, top + r + 18, w * u, 16, 8); c.fillStyle = '#f2b318'; c.fill();
  }
}
function drawRound(c) {
  thali(c, L.cx, L.plateY, G.plate, G.crumbs);
  const list = G.ents.slice().sort((a, b) => entPos(a).y - entPos(b).y);
  for (const e of list) drawEnt(c, e);
  drawFlying(c);
  for (const p of G.powers) drawPower(c, p);
  drawFx(c, 'low');
  drawFx(c, 'top');
  drawHUD(c);
  drawHint(c);
}

// ───────── screens ─────────
function button(c, id, text, x, y, w, h, o = {}) {
  const sc = o.pulse ? 1 + .035 * Math.sin(G.anim * 5) : 1;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.globalAlpha = o.disabled ? .55 : 1;
  roundRect(c, -w / 2 + 6, -h / 2 + 10, w, h, h / 2); c.fillStyle = 'rgba(59,42,33,.35)'; c.fill();
  roundRect(c, -w / 2, -h / 2, w, h, h / 2); c.fillStyle = o.fill || '#ff9f2e'; c.fill();
  c.lineWidth = 6 * LWF; c.strokeStyle = INK; c.stroke();
  inkText(c, text, 0, 3, { size: h * .44, maxW: w * .84, shadow: false, lw: h * .075, fill: '#fff' });
  c.restore();
  if (!o.disabled) G.buttons.push({ id, x: x - w / 2, y: y - h / 2, w, h });
}
function drawBoyAt(c, mood) {
  const bx = Math.max(L.tx0 - 105, 95), t = G.anim;
  const P = mood === 'sad'
    ? pose({ x: bx, y: L.floorY, s: .46, eyes: 'closed', mouth: 'wavy', tears: 1, brows: 'worried', handL: [-30, -300], handR: [40, -300], headTilt: .05 * Math.sin(t * 3) })
    : pose({ x: bx, y: L.floorY, s: .46, eyes: 'happy', mouth: 'grin', handL: [-72, -168], handR: [76, -330 + 8 * Math.sin(t * 4)], hold: 'chappal', look: 1, headTilt: .04 * Math.sin(t * 2.5), bob: 6 * Math.abs(Math.sin(t * 3.9)) });
  drawBoy(c, P, t);
}
function drawTitle(c) {
  const size = Math.min(L.WW * .17, L.HH * .12, 210), y1 = L.portrait ? Math.max(L.HH * .2, 330) : Math.max(L.HH * .115, 110);
  const R = size * 2.6, gy = y1 + size * .85;                       // a soft glow so the title reads over the kitchen
  c.save(); c.translate(L.cx, gy); c.scale(1.7, 1);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, 'rgba(255,247,234,.9)'); g.addColorStop(.62, 'rgba(255,247,234,.6)'); g.addColorStop(1, 'rgba(255,247,234,0)');
  c.fillStyle = g; c.fillRect(-R, -R, 2 * R, 2 * R); c.restore();
  thali(c, L.cx, L.plateY, 10, 0);
  drawBoyAt(c, 'happy');
  darkEyes(c, L.holeX, L.floorY - 60, G.anim, 1, 1.1);
  darkEyes(c, L.holeX + 8, L.floorY - 108, G.anim + .7, 2, .8);
  c.save(); c.translate(L.cx, y1); c.rotate(-.04 + .015 * Math.sin(G.anim * 2));
  inkText(c, 'LADDOO', 0, 0, { size, grad: ['#fff09a', '#ffb02e'], outer: '#fff', lw: size * .12 });
  c.restore();
  c.save(); c.translate(L.cx + size * .25, y1 + size * .95); c.rotate(.05 - .015 * Math.sin(G.anim * 2));
  inkText(c, 'CHOR', 0, 0, { size: size * 1.08, grad: ['#ff9a85', '#e8331f'], outer: '#fff', lw: size * .12 });
  c.restore();
  inkText(c, S.series, L.cx, y1 + size * 1.62, { size: 40, maxW: L.WW - 100, fill: '#fff', lw: 7, shadow: false });
  inkText(c, S.tagline, L.cx, y1 + size * 1.62 + 58, { size: 46, maxW: L.WW - 80, fill: '#ffe46b', lw: 8 });
  const bw = Math.min(L.WW * .7, 640), bh = Math.min(L.floorH * .62, 124);
  button(c, 'play', S.play, L.cx, L.floorY + L.floorH * .52, bw, bh, { pulse: true });
  if (SAVE.best > 0) inkText(c, `${S.best} ${SAVE.best}`, L.WW - 40, 64, { size: 44, align: 'right', fill: '#fff', lw: 8 });
}
function drawOver(c) {
  c.fillStyle = 'rgba(59,42,33,.42)'; c.fillRect(0, 0, L.WW, L.HH);
  thali(c, L.cx, L.plateY, 0, 9);
  for (let i = 0; i < 3; i++) {                                    // the gang dances on the empty thali
    const t = G.anim + i * .4, up = Math.floor(t * 2.5) % 2;
    roach(c, L.cx + (i - 1) * 105, L.topY - 26 * Math.abs(Math.sin(t * 7.85)), i === 2 ? .5 : .62, t,
      { kind: i, face: i === 2 ? -1 : 1, arms: up ? 'up' : 'laugh', eyes: 'happy', mouth: 'laugh', run: 0 });
  }
  drawBoyAt(c, 'sad');
  const showAd = IN_YT && !G.continued;
  const w = Math.min(L.WW * .88, 720), h = showAd ? 700 : 590, x0 = L.cx - w / 2, cy = L.portrait ? Math.min(L.HH * .42, L.topY - h / 2 - 180) : L.HH * .5, y0 = Math.max(cy - h / 2, 70);
  const pop = backOut(G.overT / .35);
  c.save(); c.translate(L.cx, y0 + h / 2); c.scale(pop, pop); c.translate(-L.cx, -(y0 + h / 2));
  c.save(); c.shadowColor = 'rgba(40,25,15,.3)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  roundRect(c, x0, y0, w, h, 34); c.fillStyle = '#fffaf0'; c.fill(); c.restore();
  roundRect(c, x0, y0, w, h, 34); c.lineWidth = 6 * LWF; c.strokeStyle = INK; c.stroke();
  c.save(); c.translate(L.cx, y0 + 4); c.rotate(-.03); c.fillStyle = 'rgba(244,150,165,.65)'; c.fillRect(-110, -24, 220, 48); c.restore();
  inkText(c, 'HAIN?!', L.cx, y0 + 90, { size: 100, grad: ['#ff9a85', '#e8331f'], outer: '#fff', lw: 13 });
  plainText(c, S.over, L.cx, y0 + 180, { size: 42, maxW: w - 80, fill: INK });
  inkText(c, String(G.score), L.cx, y0 + 290, { size: 130, grad: ['#fff8dc', '#ffb02e'], lw: 16 });
  plainText(c, `${S.best}: ${SAVE.best}`, L.cx, y0 + 385, { size: 40, fill: '#7a6656' });
  if (G.newBest) { c.save(); c.translate(L.cx + w * .3, y0 + 225); c.rotate(.18 + .04 * Math.sin(G.anim * 6)); inkText(c, S.newBest, 0, 0, { size: 50, maxW: w * .4, grad: ['#fff2a8', '#f2b318'], outer: '#fff', lw: 7 }); c.restore(); }
  c.restore();
  if (G.overT > .35) {
    button(c, 'again', S.again, L.cx, y0 + 490, w * .8, 112, { pulse: G.overT > 1 });
    if (showAd) button(c, 'ad', G.adFail ? S.noAd : S.adCont, L.cx, y0 + 615, w * .8, 86, { fill: '#7fd0ff', disabled: G.adFail || G.busy });
  }
}
function drawPaused(c) {
  c.fillStyle = 'rgba(59,42,33,.5)'; c.fillRect(0, 0, L.WW, L.HH);
  inkText(c, S.paused, L.cx, L.HH * .4, { size: 110, maxW: L.WW - 80, grad: ['#fff8dc', '#ffcf4a'], lw: 14 });
  c.globalAlpha = .75 + .25 * Math.sin(G.anim * 4);
  inkText(c, S.tapGo, L.cx, L.HH * .4 + 130, { size: 56, maxW: L.WW - 80, fill: '#fff', lw: 9 });
  c.globalAlpha = 1;
}
function drawLoading() {
  resize();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#ffe6c9'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.setTransform(DPR * L.k, 0, 0, DPR * L.k, 0, 0);
  for (let i = 0; i < 3; i++) laddoo(ctx, L.cx + (i - 1) * 90, L.HH / 2, 30, 1800 + i);
}
function render() {
  if (!bg) buildBg();
  G.buttons = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  const sx = G.shake > .3 ? rand(-1, 1) * G.shake : 0, sy = G.shake > .3 ? rand(-1, 1) * G.shake : 0;
  ctx.setTransform(DPR * L.k, 0, 0, DPR * L.k, sx * DPR, sy * DPR);
  setBoil(G.anim);
  if (G.state === 'title') drawTitle(ctx);
  else if (G.state === 'over') drawOver(ctx);
  else { drawRound(ctx); if (G.needTap) drawPaused(ctx); }
}

// ───────── input ─────────
function onPress(x, y) {
  if (paused) return;
  if (G.state === 'title') { startRound(); return; }
  if (G.state === 'play') { if (G.needTap) { G.needTap = false; return; } tapAt(x, y); return; }
  if (G.state === 'over' && G.overT > .7) {
    const b = G.buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (b && b.id === 'again') playAgain();
    else if (b && b.id === 'ad') adContinue();
  }
}
cvs.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  Sound.unlock();
  if (!L) return;
  const r = cvs.getBoundingClientRect();
  onPress((ev.clientX - r.left) / L.k, (ev.clientY - r.top) / L.k);
}, { passive: false });
cvs.addEventListener('contextmenu', ev => ev.preventDefault());
window.addEventListener('keydown', ev => {
  if (ev.key !== ' ' && ev.key !== 'Enter') return;           // Esc and every other key are left alone
  ev.preventDefault(); Sound.unlock();
  if (paused) return;
  if (G.state === 'title') startRound();
  else if (G.state === 'play' && G.needTap) G.needTap = false;
  else if (G.state === 'over' && G.overT > .7) playAgain();
});
window.addEventListener('resize', resize);

// ───────── pause and resume (only YouTube's onPause/onResume) ─────────
let paused = false, raf = 0, lastNow = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  let dt = (now - lastNow) / 1000; lastNow = now;
  if (!(dt > 0)) dt = 0; else if (dt > .05) dt = .05;
  if (DEBUG && G.timeScale >= 0) dt *= G.timeScale;          // testing only: slow motion
  update(dt); render(); Sound.tick();
}
function pauseGame() {
  if (paused) return;
  paused = true;
  if (raf) cancelAnimationFrame(raf); raf = 0;
  Sound.pause();
  if (G.state === 'play') G.needTap = true;                   // wait for a tap before the round goes on
  saveGame();
}
function resumeGame() {
  if (!paused) return;
  paused = false;
  Sound.resume();
  if (G.pendingStart) { G.pendingStart = false; startRound(); }
  if (G.state !== 'loading' && !raf) { lastNow = performance.now(); raf = requestAnimationFrame(frame); }
}

// ───────── start-up ─────────
async function boot() {
  drawLoading();
  sdk(y => y.game.firstFrameReady());
  sdk(y => y.system.onPause(pauseGame));
  sdk(y => y.system.onResume(resumeGame));
  Sound.setEnabled(sdk(y => y.system.isAudioEnabled()) !== false);
  sdk(y => y.system.onAudioEnabledChange(on => Sound.setEnabled(on)));
  window.addEventListener('error', () => sdk(y => y.health.logError()));
  window.addEventListener('unhandledrejection', () => sdk(y => y.health.logWarning()));
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load(`60px ${FONT}`) : null;
  const [lang] = await Promise.all([detectLang(), settle(fontReady, 3000, null), settle(loadSave(), 3000, null)]);
  S = STR[lang]; document.documentElement.lang = lang;
  G.state = 'title';
  if (!paused) { lastNow = performance.now(); raf = requestAnimationFrame(frame); }
  sdk(y => y.game.gameReady());
}
boot();

// ───────── testing hooks (only with ?debug=1, never inside YouTube) ─────────
if (DEBUG) {
  // a bot that plays a whole round at full speed: it reacts after `react` s, taps `rate` times a second and misses some
  window.__laddoo = {
    G, SAVE, layout: () => L, press: (x, y) => onPress(x, y), start: startRound, center: e => entCenter(e), hittable, pause: pauseGame, resume: resumeGame,
    renderCost(n = 30) { const t0 = performance.now(); for (let i = 0; i < n; i++) { update(1 / 60); render(); } return (performance.now() - t0) / n; },
    sim(o = {}) {
      const react = o.react ?? .45, missP = o.miss ?? .08, rate = o.rate ?? 3.5, maxT = o.maxT ?? 900, dt = 1 / 60, jitter = o.jitter ?? 25;
      const seen = new Map(); let cool = 0, guard = 0;
      G.sim = true; startRound();
      while ((G.state === 'play' || G.state === 'ending') && G.t < maxT && guard++ < 400000) {
        cool -= dt;
        if (G.state === 'play' && cool <= 0) {
          let best = null, bs = -1, pw = null;
          for (const e of G.ents) {
            if (!hittable(e)) continue;
            if (!seen.has(e.id)) seen.set(e.id, G.t);
            if (G.t - seen.get(e.id) < react) continue;
            const urg = (e.carry ? 2 : 0) + e.u + (e.type === 'rat' ? .5 : 0);
            if (urg > bs) { bs = urg; best = e; }
          }
          for (const p of G.powers) { const id = 'p' + p.id; if (!seen.has(id)) seen.set(id, G.t); if (G.t - seen.get(id) >= react) pw = p; }
          if (pw && Math.random() < .6) { tapAt(pw.x, pw.y); cool = 1 / rate; }
          else if (best) { const c = entCenter(best), off = Math.random() < missP ? 260 : 0; tapAt(c.x + rand(-jitter, jitter) + off, c.y + rand(-jitter, jitter)); cool = 1 / rate; }
        }
        update(dt);
      }
      const res = { t: +G.t.toFixed(1), score: G.score, kos: G.kos, rats: G.ratsBeaten };
      G.sim = false; G.state = 'title'; G.ents = []; G.fx = []; G.flying = []; G.powers = [];
      return res;
    },
  };
}
