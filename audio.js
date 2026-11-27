// audio.js: every sound in the game is synthesised here with the Web Audio API; there are no audio files.
// Music: the series' own theme (F major, 150 BPM: xylophone and clarinet over an oom-pah), a sneaky D-minor tiptoe,
// a chase in F minor for the rat, and a soft glockenspiel version for the title. Effects: TOK!, boing, DHAPP!, the
// gang's giggle, a sad trombone, a meow, sparkles. Sound follows YouTube's audio setting and stops while paused.
'use strict';
const Sound = (() => {
  let ac = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
  let enabled = true, paused = false, unlocked = false;
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = n => { if (typeof n === 'number') return n; const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return 12 * (+m[2] + 1) + NOTE[m[1]]; };
  const hz = n => 440 * Math.pow(2, (midi(n) - 69) / 12);
  const MASTER = .85;

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC(); } catch (e) { ac = null; return false; }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = .004; comp.release.value = .2;
    master = ac.createGain(); master.gain.value = enabled ? MASTER : 0;
    master.connect(comp); comp.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = .5; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // the first tap starts the audio (browsers need a user gesture); while muted it runs silent, so unmuting needs no tap
  function unlock() {
    if (!init()) return;
    unlocked = true;
    if (!paused && ac.state !== 'running') ac.resume().catch(() => {});
  }
  function setEnabled(on) {
    enabled = on !== false;
    if (ac) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(enabled ? MASTER : 0, ac.currentTime); }
  }
  function pause() { paused = true; if (ac && ac.state === 'running') ac.suspend().catch(() => {}); }
  function resume() { paused = false; if (ac && unlocked && ac.state !== 'running') ac.resume().catch(() => {}); }
  const live = () => !!ac && unlocked && !paused;

  // ───────── building blocks ─────────
  function gainTo(dest, v = 0) { const g = ac.createGain(); g.gain.value = v; g.connect(dest); return g; }
  function filt(type, f, q, dest) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; }
  function pan(p, dest) { if (!ac.createStereoPanner) return dest; const s = ac.createStereoPanner(); s.pan.value = p; s.connect(dest); return s; }
  function osc(type, f, t, dur, dest) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + .05); return o; }
  function noise(t, dur, dest) { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(dest); s.start(t, Math.random() * .5); s.stop(t + dur + .05); return s; }
  function perc(g, t, a, peak, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function held(g, t, a, peak, dur, rel) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + Math.max(a, dur)); g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(a, dur) + rel); }

  // ───────── instruments ─────────
  const I = {
    xylo(t, n, v, out) { const f = hz(n), p = pan(.15, out);
      const g = gainTo(p); perc(g, t, .002, .42 * v, .3); osc('sine', f, t, .35, g);
      const g2 = gainTo(p); perc(g2, t, .001, .14 * v, .06); osc('sine', f * 3.93, t, .1, g2);
      const g3 = gainTo(p); perc(g3, t, .001, .05 * v, .03); osc('sine', f * 9.4, t, .06, g3); },
    glock(t, n, v, out) { const f = hz(n), p = pan(.1, out);
      const g = gainTo(p); perc(g, t, .002, .26 * v, 1.1); osc('sine', f, t, 1.2, g);
      const g2 = gainTo(p); perc(g2, t, .001, .1 * v, .35); osc('sine', f * 2.76, t, .4, g2);
      const g3 = gainTo(p); perc(g3, t, .001, .04 * v, .15); osc('sine', f * 5.4, t, .2, g3); },
    clar(t, n, dur, v, out) { const p = pan(-.2, out), lp = filt('lowpass', 1700, .7, p), g = gainTo(lp);
      held(g, t, .015, .13 * v, dur, .06); osc('square', hz(n), t, dur + .1, g); },
    trumpet(t, n, dur, v, out) { const p = pan(.1, out), lp = filt('lowpass', 900, 1.5, p), g = gainTo(lp);
      lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(2800, t + .04); lp.frequency.exponentialRampToValueAtTime(1300, t + .04 + dur);
      held(g, t, .02, .16 * v, dur, .08); osc('sawtooth', hz(n), t, dur + .12, g); },
    tuba(t, n, v, out) { const f = hz(n), lp = filt('lowpass', 520, 1.2, out), g = gainTo(lp);
      perc(g, t, .012, .4 * v, .26); osc('sawtooth', f, t, .32, g);
      const g2 = gainTo(out); perc(g2, t, .01, .22 * v, .25); osc('sine', f, t, .3, g2); },
    pizz(t, n, v, out, pn = .25) { const f = hz(n), p = pan(pn, out), lp = filt('lowpass', 2600, .8, p);
      const g = gainTo(lp); perc(g, t, .002, .2 * v, .17); osc('triangle', f, t, .22, g);
      const g2 = gainTo(lp); perc(g2, t, .001, .05 * v, .05); osc('sawtooth', f, t, .08, g2); },
    wood(t, hi, v, out) { const f = hi ? 1250 : 950, p = pan(.3, out);
      const g = gainTo(p); perc(g, t, .001, .45 * v, .05); osc('sine', f, t, .07, g);
      const bp = filt('bandpass', f * 2, 6, p), g2 = gainTo(bp); perc(g2, t, .001, .5 * v, .02); noise(t, .03, g2); },
    bassoon(t, n, dur, v, out) { const p = pan(-.15, out), bp = filt('bandpass', 520, 1.3, p), lp = filt('lowpass', 1800, .6, bp), g = gainTo(lp);
      held(g, t, .012, .5 * v, dur, .05); osc('sawtooth', hz(n), t, dur + .08, g); },
    cello(t, n, v, out) { const p = pan(-.2, out), lp = filt('lowpass', 1500, .8, p), g = gainTo(lp);
      perc(g, t, .004, .22 * v, .13); osc('sawtooth', hz(n), t, .17, g); },
    harp(t, n, v, out) { const f = hz(n), p = pan(.3, out), lp = filt('lowpass', 3000, .5, p);
      const g = gainTo(lp); perc(g, t, .003, .22 * v, .9); osc('triangle', f, t, 1, g);
      const g2 = gainTo(lp); perc(g2, t, .002, .06 * v, .3); osc('sine', f * 2, t, .35, g2); },
    pad(t, n, dur, v, out) { const f = hz(n), p = pan(-.2, out), lp = filt('lowpass', 1400, .5, p), g = gainTo(lp);
      held(g, t, .25, .05 * v, dur - .1, .35); osc('sawtooth', f * 1.003, t, dur + .4, g); osc('sawtooth', f * .997, t, dur + .4, g); },
    snare(t, v, out) { const hp = filt('highpass', 1800, .7, out), g = gainTo(hp); perc(g, t, .001, .4 * v, .12); noise(t, .14, g);
      const g2 = gainTo(out); perc(g2, t, .001, .25 * v, .06); osc('triangle', 190, t, .08, g2); },
    kick(t, v, out) { const g = gainTo(out); perc(g, t, .002, .9 * v, .28);
      const o = osc('sine', 130, t, .3, g); o.frequency.exponentialRampToValueAtTime(45, t + .12); },
    hat(t, v, out) { const hp = filt('highpass', 7000, .7, out), g = gainTo(hp); perc(g, t, .001, .22 * v, .04); noise(t, .05, g); },
  };

  // ───────── the music ─────────
  const MEL = [[0, 'C6', 1], [2, 'A5', 1], [3, 'C6', 1], [4, 'F6', 2], [6, 'E6', 1], [7, 'D6', 1],
    [8, 'C6', 1], [9, 'A5', 1], [10, 'Bb5', 1], [11, 'G5', 1], [12, 'A5', 2], [14, 'F5', 2],
    [16, 'G5', 1], [17, 'A5', 1], [18, 'Bb5', 1], [19, 'C6', 1], [20, 'D6', 1], [21, 'E6', 1], [22, 'F6', 1], [23, 'G6', 1],
    [24, 'A6', 2], [26, 'F6', 1], [27, 'C6', 1], [28, 'F6', 3]];
  const CH = { F: ['F2', 'C2', ['A4', 'C5', 'F5']], C7: ['C2', 'G2', ['G4', 'Bb4', 'E5']], Bb: ['Bb1', 'F2', ['F4', 'Bb4', 'D5']], Dm: ['D2', 'A2', ['F4', 'A4', 'D5']] };
  const PROG = [['F', 'F'], ['C7', 'F'], ['Bb', 'C7'], ['F', 'F']];
  const SNK = ['D3', 'F3', 'A3', 'G#3', 'A3', 'F3', 'E3', 'C#3'];
  const CL = [[0, 'D5', 1], [1, 'E5', 1], [2, 'F5', 2], [4, 'E5', 1], [5, 'D5', 1], [6, 'C#5', 2], [8, 'D5', 2], [10, 'A4', 5]];
  const CHS = ['F3', 'C4', 'Ab3', 'C4', 'F3', 'C4', 'Bb3', 'C4'];

  function themeBar(bar, t, b, out, o = {}) {      // one bar (0..3) of the series theme
    for (const [i, n, L] of MEL) {
      if ((i >> 3) !== bar) continue;
      const tt = t + (i - bar * 8) * b / 2;
      I.xylo(tt, n, .8, out);
      I.clar(tt, midi(n) - 12, .45 * b * L - .03, .9, out);
      if (o.glock) I.glock(tt, n, .45, out);
      if (o.brass) I.trumpet(tt, midi(n) - 12, .45 * b * L - .03, .7, out);
    }
    const [h1, h2] = PROG[bar];
    for (let half = 0; half < 2; half++) {
      const nm = half ? h2 : h1, [root, fifth, tri] = CH[nm], same = half === 1 && h1 === nm;
      I.tuba(t + half * 2 * b, same ? fifth : root, .9, out);
      for (const p of tri) I.pizz(t + (half * 2 + 1) * b, p, .55, out);
    }
    for (let k = 0; k < 4; k++) {
      if (o.drums) { if (k % 2) I.snare(t + k * b, .5, out); else I.kick(t + k * b, .7, out); I.hat(t + k * b + b / 2, .6, out); }
      else I.wood(t + k * b, k % 2 === 0, .5, out);
    }
  }
  function sneakBar(bar, t, b, out) {              // the tiptoe: a walking bassoon, pizzicato and a clarinet line
    for (let k = 0; k < 4; k++) {
      const n = SNK[(bar * 4 + k) % 8];
      I.bassoon(t + k * b, n, .5 * b, .9, out);
      I.pizz(t + k * b, midi(n) - 12, .7, out, -.05);
      I.pizz(t + k * b + b / 2, k % 2 ? 'D5' : 'A4', .35, out);
    }
    for (const [i, n, L] of CL) if ((i >> 3) === (bar % 2)) I.clar(t + (i % 8) * b / 2, n, .45 * b * L - .03, 1, out);
    I.wood(t, true, .35, out); I.wood(t + 2 * b, false, .35, out);
  }
  function chaseBar(bar, t, b, out) {              // the chase (F minor), for the rat
    for (let k = 0; k < 8; k++) {
      const tt = t + k * b / 2, n = CHS[k];
      I.cello(tt, n, k % 2 ? .75 : 1, out);
      I.snare(tt, k % 4 === 0 ? .55 : .28, out);
      if (k % 2 === 0) I.pizz(tt, midi(n) - 12, .8, out, 0);
      if (k === 0) I.xylo(tt, midi(n) + 24, .6, out);
    }
    if (bar % 4 === 0) ['F4', 'A4', 'C5', 'F5'].forEach((n, i) => I.trumpet(t + i * b / 2, n, i < 3 ? .14 : .5, .9, out));
  }
  function sweetBar(bar, t, b, out) {              // the title: the theme slowly on glockenspiel, strings and a harp
    for (const [i, n] of MEL.slice(0, 12)) if (Math.floor(i / 4) === bar) I.glock(t + (i - bar * 4) * b, n, .6, out);
    const [root, , tri] = CH[['F', 'Dm', 'Bb', 'C7'][bar]];
    for (const p of tri) I.pad(t, p, 4 * b, 1, out);
    I.harp(t, midi(root) + 24, .7, out);
    const arp = tri.map(midi).concat(tri.map(p => midi(p) + 12));
    for (let k = 0; k < 8; k++) I.harp(t + k * b / 2, arp[k % 6], .45, out);
  }
  const SONGS = {
    title: { bars: 4, play: (bar, t, b, out) => sweetBar(bar % 4, t, b, out) },
    main: { bars: 16, play(bar, t, b, out, hot) {
      const sec = bar >> 2, r = bar % 4;
      if (sec === 0) themeBar(r, t, b, out, { drums: hot });
      else if (sec === 1) themeBar(r, t, b, out, { glock: true, drums: hot });
      else if (sec === 2) sneakBar(r, t, b, out);
      else themeBar(r, t, b, out, { brass: true, drums: true });
    } },
    chase: { bars: 4, play: (bar, t, b, out) => chaseBar(bar, t, b, out) },
  };
  let song = null, want = null, bar = 0, nextBar = 0, songGain = null, tempo = 1, hot = false;
  function playSong(name) { want = name; if (!name) stopSong(); }
  function stopSong() {
    song = null;
    if (songGain && ac) { const g = songGain; g.gain.setTargetAtTime(0, ac.currentTime, .05); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 400); }
    songGain = null;
  }
  // called every animation frame: schedules the next bar a little ahead of time
  function tick() {
    if (!live()) return;
    const now = ac.currentTime;
    if (want !== song) {
      stopSong(); song = want; bar = 0; nextBar = now + .06;
      if (song) { songGain = gainTo(musicBus, 1); }
    }
    if (!song) return;
    if (nextBar < now) nextBar = now + .05;              // after a stall, start the next bar cleanly
    const b = .4 / tempo;
    while (nextBar < now + .25) {
      SONGS[song].play(bar % SONGS[song].bars, nextBar, b, songGain, hot);
      bar++; nextBar += 4 * b;
    }
  }
  function setTempo(x, isHot) { tempo = x; hot = !!isHot; }

  // ───────── sound effects ─────────
  function at(d = 0) { return ac.currentTime + .005 + d; }
  function glide(type, f0, f1, t, d, v, out, curve = 'exp') {
    const g = gainTo(out); perc(g, t, .005, v, d);
    const o = osc(type, f0, t, d + .05, g);
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + d); else o.frequency.linearRampToValueAtTime(f1, t + d);
    return o;
  }
  const FX = {
    tok() { const t = at(), o = sfxBus;
      glide('sine', 720, 300, t, .07, .55, o);
      const bp = filt('bandpass', 2600, 3, o), g = gainTo(bp); perc(g, t, .001, .6, .025); noise(t, .04, g); },
    boing(f = 240) { const t = at(.02), g = gainTo(sfxBus); perc(g, t, .005, .3, .55);
      const o = osc('sine', f, t, .6, g); o.frequency.exponentialRampToValueAtTime(f * 2.3, t + .07);
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 13; lg.gain.setValueAtTime(f * .35, t); lg.gain.exponentialRampToValueAtTime(1, t + .55);
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + .62); },
    thud() { const t = at();
      glide('sine', 160, 55, t, .16, .7, sfxBus);
      const lp = filt('lowpass', 700, .7, sfxBus), g = gainTo(lp); perc(g, t, .001, .5, .08); noise(t, .1, g); },
    hehe() { const t = at(); for (let k = 0; k < 6; k++) { const f = 2100 + (k % 2) * 450 + Math.random() * 120; glide('sine', f, f * 1.12, t + k * .055, .035, .14, sfxBus); } },
    squeak() { const t = at(), g = gainTo(sfxBus); perc(g, t, .005, .22, .16);
      const o = osc('sine', 1700, t, .2, g); o.frequency.linearRampToValueAtTime(2700, t + .06); o.frequency.linearRampToValueAtTime(2000, t + .16); },
    plip(f = 880) { glide('sine', f, f * 1.7, at(), .07, .25, sfxBus); },
    grab() { const t = at(); glide('triangle', 520, 380, t, .09, .25, sfxBus); I.wood(t + .07, false, .5, sfxBus); },
    rescue() { const t = at(); ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => I.xylo(t + i * .055, n, 1, sfxBus)); },
    steal() { const t = at(), lp = filt('lowpass', 1400, 4, sfxBus), g = gainTo(lp);
      held(g, t, .02, .22, .32, .1); const o = osc('sawtooth', hz('Bb3'), t, .45, g); o.frequency.linearRampToValueAtTime(hz('A3') * .97, t + .4);
      lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(380, t + .4); },
    lose() { const t = at(.05), notes = ['G3', 'F#3', 'F3', 'E3'];
      notes.forEach((n, i) => { const t0 = t + i * .42, d = i < 3 ? .34 : 1.1, lp = filt('lowpass', 500, 5, sfxBus), g = gainTo(lp);
        held(g, t0, .03, .26, d, .12); const o = osc('sawtooth', hz(n), t0, d + .15, g);
        lp.frequency.setValueAtTime(450, t0); lp.frequency.linearRampToValueAtTime(1700, t0 + .12); lp.frequency.linearRampToValueAtTime(520, t0 + d);
        if (i === 3) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 6; lg.gain.value = 5; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0 + .2); lfo.stop(t0 + d + .1); } }); },
    meow() { const t = at(), d = .55, src = ac.createOscillator(); src.type = 'sawtooth';
      src.frequency.setValueAtTime(430, t); src.frequency.linearRampToValueAtTime(780, t + .17); src.frequency.linearRampToValueAtTime(470, t + d);
      const g = gainTo(sfxBus); held(g, t, .05, .5, d - .12, .1);
      const f1 = filt('bandpass', 950, 4, g), f2 = filt('bandpass', 2400, 5, g);
      f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1150, t + .2); f1.frequency.linearRampToValueAtTime(800, t + d);
      src.connect(f1); src.connect(f2); src.start(t); src.stop(t + d + .1); },
    sparkle() { const t = at(); ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((n, i) => I.glock(t + i * .06, n, 1, sfxBus)); },
    pop() { const t = at(); glide('sine', 300, 1150, t, .08, .35, sfxBus); },
    golden() { const t = at(); glide('sine', 380, 1900, t, .35, .3, sfxBus); FX.sparkle(); },
    fanfare() { const t = at(); ['F4', 'A4', 'C5', 'F5'].forEach((n, i) => I.trumpet(t + i * .11, n, i < 3 ? .09 : .45, 1, sfxBus)); },
    ratSting() { const t = at(); ['F2', 'C3', 'Ab3'].forEach(n => I.trumpet(t, n, .5, 1, sfxBus)); I.snare(t, .7, sfxBus); FX.squeak(); },
    combo(level) { I.xylo(at(), 72 + Math.min(level, 6) * 2, 1, sfxBus); I.xylo(at(.06), 79 + Math.min(level, 6) * 2, 1, sfxBus); },
    best() { FX.fanfare(); const t = at(.5); ['F6', 'A6', 'C7'].forEach((n, i) => I.glock(t + i * .08, n, 1, sfxBus)); },
    whoosh() { const t = at(), bp = filt('bandpass', 400, 2, sfxBus), g = gainTo(bp); held(g, t, .05, .35, .18, .08); noise(t, .3, g);
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2600, t + .25); },
  };
  function sfx(name, arg) { if (!live() || !enabled) return; try { FX[name](arg); } catch (e) {} }

  return { unlock, setEnabled, pause, resume, tick, playSong, setTempo, sfx, get running() { return live(); } };
})();
