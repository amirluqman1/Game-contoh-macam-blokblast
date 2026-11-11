(() => {
  const N = 8;
  const COLORS = 4; // setiap tema ada 4 warna

  // Bentuk blok: [baris][lajur], 1 = ada blok
  const SHAPES = [
    [[1]],
    [[1, 1]], [[1], [1]],
    [[1, 1, 1]], [[1], [1], [1]],
    [[1, 1, 1, 1]], [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]], [[1], [1], [1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 1, 1]], [[1, 1], [1, 1], [1, 1]],
    // L kecil
    [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [1, 0]], [[1, 1], [0, 1]],
    // L besar
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]], [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]], [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
    // L panjang
    [[1, 0], [1, 0], [1, 1]], [[0, 1], [0, 1], [1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1], [0, 1], [0, 1]],
    [[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
    // T
    [[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[0, 1], [1, 1], [0, 1]],
    // S / Z
    [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]], [[0, 1], [1, 1], [1, 0]],
  ];

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board'), trayEl = $('tray'), scoreEl = $('score'), bestEl = $('best');
  const popupEl = $('popup'), overEl = $('over');

  let grid, tray, score, best, combo, cells = [], soundOn = true, busy = false;

  // ---------- simpanan (selamat kalau localStorage tak boleh guna) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- bunyi ringkas ----------
  let actx;
  function beep(freq, dur = 0.08, type = 'sine', vol = 0.15) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch {}
  }
  const sndPlace = () => beep(320, 0.06, 'triangle');
    const sndBreak = (lines) => {
    const t = skin();
    if (t === 'batu') {
      beep(90, 0.2, 'square', 0.12);
      for (let i = 0; i < 3 + lines; i++) setTimeout(() => beep(180 + Math.random() * 260, 0.03, 'square', 0.05), 40 + i * 35);
    } else if (t === 'kaca') {
      for (let i = 0; i < 4 + lines * 2; i++) setTimeout(() => beep(1700 + Math.random() * 1900, 0.09, 'sine', 0.06), i * 28);
    } else {
      beep(260, 0.08, 'triangle', 0.2);
      setTimeout(() => beep(170, 0.12, 'triangle', 0.14), 70);
      for (let i = 0; i < lines; i++) setTimeout(() => beep(420 + i * 90, 0.05, 'triangle', 0.08), 150 + i * 60);
    }
    if (lines >= 2) [0, 1, 2].forEach((i) => setTimeout(() => beep(620 + i * 180 + lines * 60, 0.12, 'square', 0.06), 200 + i * 70));
  };
  const sndSkin = () => [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => beep(400 * Math.pow(1.26, i), 0.14, 'triangle', 0.1), i * 70));
  const sndOver = () => [0, 1, 2].forEach((i) => setTimeout(() => beep(300 - i * 70, 0.2, 'sawtooth', 0.08), i * 150));

  // ---------- tema ----------
  const SKINS = [
    { id: 'batu', name: 'Batu', icon: '🪨' },
    { id: 'kaca', name: 'Kaca', icon: '💎' },
    { id: 'pokok', name: 'Pokok', icon: '🌳' },
  ];
  let skinIdx = 0;
  function setSkin(i) {
    skinIdx = i;
    document.body.dataset.skin = SKINS[i].id;
    store.set('blokboom-skin', i);
  }
  const skin = () => SKINS[skinIdx].id;
  // Save lama ada 7 warna, tema sekarang 4
  const fixColor = (v) => (v > COLORS ? ((v - 1) % COLORS) + 1 : v);

  // ---------- papan ----------
  function buildBoard() {
    boardEl.innerHTML = '';
    cells = [];
    for (let r = 0; r < N; r++) {
      cells.push([]);
      for (let c = 0; c < N; c++) {
        const d = document.createElement('div');
        d.className = 'cell';
        boardEl.appendChild(d);
        cells[r].push(d);
      }
    }
  }

  function render() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const el = cells[r][c];
      el.className = 'cell' + (grid[r][c] ? ' c' + grid[r][c] : '');
      if (el.firstChild) el.replaceChildren(); // buang sisa retak
    }
  }

  const fits = (shape, r0, c0) => {
    for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const R = r0 + r, C = c0 + c;
      if (R < 0 || C < 0 || R >= N || C >= N || grid[R][C]) return false;
    }
    return true;
  };

  const canFitAnywhere = (shape) => {
    for (let r = 0; r <= N - shape.length; r++)
      for (let c = 0; c <= N - shape[0].length; c++) if (fits(shape, r, c)) return true;
    return false;
  };

  // Baris/lajur yang akan penuh kalau letak blok kat sini
  function linesIfPlaced(shape, r0, c0) {
    const tmp = grid.map((row) => row.slice());
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) tmp[r0 + r][c0 + c] = 1; }));
    const rows = [], cols = [];
    for (let i = 0; i < N; i++) {
      if (tmp[i].every(Boolean)) rows.push(i);
      if (tmp.every((row) => row[i])) cols.push(i);
    }
    return { rows, cols };
  }

  // ---------- tray ----------
  // Bantuan bila papan sesak: papan bawah 30% penuh = random biasa.
  // Lepas tu makin penuh, makin tinggi peluang dapat blok kecil.
  // Tak pernah sengaja bagi blok susah.
  const cellCount = (shape) => shape.flat().filter(Boolean).length;

  function helpLevel() {
    const filled = grid.flat().filter(Boolean).length / (N * N);
    return Math.min(1, Math.max(0, (filled - 0.3) / 0.35)); // 0 bila <=30% penuh, 1 bila >=65%
  }

  function randomPiece(help) {
    const weights = SHAPES.map((sh) => 1 / Math.pow(cellCount(sh), 2 * help));
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < SHAPES.length - 1 && (x -= weights[k]) > 0) k++;
    return { shape: SHAPES[k], color: 1 + Math.floor(Math.random() * COLORS) };
  }

  // SIM-START: simulasi papan untuk pilih set blok yang membantu (tak sentuh papan sebenar)
  function simFits(g, shape, r0, c0) {
    for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const R = r0 + r, C = c0 + c;
      if (R < 0 || C < 0 || R >= N || C >= N || g[R][C]) return false;
    }
    return true;
  }

  // Letak blok di tempat terbaik: utamakan letup baris, lepas tu yang paling "kemas" (rapat dinding/blok lain)
  function simBestPlace(g, shape) {
    let best = null;
    for (let r0 = 0; r0 <= N - shape.length; r0++) for (let c0 = 0; c0 <= N - shape[0].length; c0++) {
      if (!simFits(g, shape, r0, c0)) continue;
      const t = g.map((row) => row.slice());
      let snug = 0;
      shape.forEach((row, r) => row.forEach((v, c) => {
        if (!v) return;
        const R = r0 + r, C = c0 + c;
        t[R][C] = 1;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const y = R + dr, x = C + dc;
          if (y < 0 || x < 0 || y >= N || x >= N || g[y][x]) snug++;
        }
      }));
      const rows = [], cols = [];
      for (let i = 0; i < N; i++) {
        if (t[i].every(Boolean)) rows.push(i);
        if (t.every((row) => row[i])) cols.push(i);
      }
      const L = rows.length + cols.length;
      const score = L * L * 100 + snug; // letup 2 baris serentak > 2 kali letup 1 baris
      if (!best || score > best.score) {
        rows.forEach((i) => t[i].fill(0));
        cols.forEach((i) => t.forEach((row) => { row[i] = 0; }));
        best = { score, lines: rows.length + cols.length, grid: t };
      }
    }
    return best;
  }

  // Boleh ke ketiga-tiga blok diletak (cuba semua 6 susunan)? Berapa besar letupan dia?
  function simRateSet(g, shapes) {
    const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    let best = null;
    for (const o of orders) {
      let cur = g, placed = 0, lines = 0, boom = 0;
      for (const k of o) {
        const b = simBestPlace(cur, shapes[k]);
        if (!b) break;
        cur = b.grid; placed++; lines += b.lines; boom += b.lines * b.lines;
      }
      // Baris/lajur yang dah 6-7 penuh = umpan untuk letupan besar pusingan depan
      let setup = 0;
      for (let i = 0; i < N; i++) {
        const rn = cur[i].filter(Boolean).length, cn = cur.filter((row) => row[i]).length;
        if (rn >= 6) setup++;
        if (cn >= 6) setup++;
      }
      const r = { placed, lines, boom, setup };
      if (!best || placed > best.placed || (placed === best.placed && boom * 10 + setup > best.boom * 10 + best.setup)) best = r;
    }
    return best;
  }
  // SIM-END

  function newTray() {
    const help = helpLevel();
    // Cari bentuk yang boleh letupkan baris SEKARANG (penutup lubang). Makin banyak baris, makin diutamakan.
    const clearers = [];
    SHAPES.forEach((sh) => {
      const b = simBestPlace(grid, sh);
      if (b && b.lines > 0) clearers.push({ sh, w: b.lines * b.lines * b.lines });
    });
    // Kalau ada bentuk yang boleh letup 2+ baris serentak, bagi yang tu je
    const maxW = Math.max(0, ...clearers.map((c) => c.w));
    const pool = maxW >= 8 ? clearers.filter((c) => c.w >= 8) : clearers;
    const pickClearer = () => {
      let x = Math.random() * pool.reduce((a, c) => a + c.w, 0);
      for (const c of pool) if ((x -= c.w) <= 0) return c.sh;
      return pool[pool.length - 1].sh;
    };
    // 6 set calon bila papan lapang, sampai 12 bila sesak
    const want = 6 + Math.round(help * 6);
    const candidates = [];
    for (let t = 0; t < 60 && candidates.length < want; t++) {
      const set = [randomPiece(help), randomPiece(help), randomPiece(help)];
      if (pool.length && t % 3 !== 2) set[Math.floor(Math.random() * 3)].shape = pickClearer();
      if (set.some((p) => canFitAnywhere(p.shape))) candidates.push(set);
    }
    if (!candidates.length) candidates.push([randomPiece(help), randomPiece(help), randomPiece(help)]);
    let best = null, bestScore = -1;
    for (const set of candidates) {
      const r = simRateSet(grid, set.map((p) => p.shape));
      // Utama: semua muat. Lepas tu: letupan besar, dan susun baris untuk letupan depan. Sikit random.
      const score = r.placed * 1000 + r.boom * 100 + r.setup * 30 + Math.random() * 25;
      if (score > bestScore) { bestScore = score; best = set; }
    }
    tray = best;
  }

  function pieceEl(p, cls = 'piece') {
    const el = document.createElement('div');
    el.className = cls;
    el.style.gridTemplateColumns = `repeat(${p.shape[0].length}, auto)`;
    p.shape.forEach((row) => row.forEach((v) => {
      const b = document.createElement('div');
      b.className = v ? 'blk c' + p.color : 'empty';
      el.appendChild(b);
    }));
    return el;
  }

  function renderTray() {
    trayEl.innerHTML = '';
    tray.forEach((p, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.i = i;
      if (p) {
        slot.appendChild(pieceEl(p));
        if (!canFitAnywhere(p.shape)) slot.classList.add('nofit');
        slot.addEventListener('pointerdown', startDrag);
      }
      trayEl.appendChild(slot);
    });
  }

  // ---------- drag & drop ----------
  let drag = null;

  function metrics() {
    const a = cells[0][0].getBoundingClientRect();
    const b = cells[0][1].getBoundingClientRect();
    return { cell: a.width, pitch: b.left - a.left, x0: a.left, y0: a.top };
  }

  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PICKUP_MS = reduceMotion ? 0 : 140;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function startDrag(e) {
    if (busy || drag) return;
    const slot = e.currentTarget;
    if (slot._finishReturn) slot._finishReturn(); // tengah terbang balik? siapkan terus
    if (slot.classList.contains('dragging')) return;
    const i = +slot.dataset.i;
    const p = tray[i];
    if (!p) return;
    e.preventDefault();
    const m = metrics();
    const src = slot.querySelector('.piece').getBoundingClientRect();
    const fl = document.createElement('div');
    fl.className = 'floating';
    const inner = pieceEl(p);
    inner.style.setProperty('--cell', m.cell + 'px');
    inner.style.gap = (m.pitch - m.cell) + 'px';
    fl.appendChild(inner);
    document.body.appendChild(fl);
    const w = p.shape[0].length * m.pitch, h = p.shape.length * m.pitch;
    // Kat phone, angkat blok atas jari supaya nampak
    const lift = e.pointerType === 'touch' ? h / 2 + m.cell * 1.6 : h / 2;
    drag = {
      i, p, fl, w, h, lift, slot, m, pos: null, pid: e.pointerId,
      fx: e.clientX, fy: e.clientY, t0: performance.now(),
      sx: src.left + src.width / 2, sy: src.top + src.height / 2,
      k: src.width / w, raf: 0,
    };
    slot.classList.add('dragging');
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    frame();
  }

  function clearPreview() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const el = cells[r][c];
      if (el.classList.contains('ghost')) el.className = 'cell';
      el.classList.remove('willclear');
    }
  }

  function moveDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.fx = e.clientX; drag.fy = e.clientY;
    if (!drag.raf) drag.raf = requestAnimationFrame(frame);
  }

  // Satu kemas kini setiap frame skrin, bukan setiap kali jari bergerak
  function frame() {
    if (!drag) return;
    drag.raf = 0;
    const t = PICKUP_MS ? Math.min(1, (performance.now() - drag.t0) / PICKUP_MS) : 1;
    const e = ease(t);
    // Titik sasaran: tengah blok, atas jari
    const tx = drag.fx, ty = drag.fy - drag.lift + drag.h / 2;
    const cx = drag.sx + (tx - drag.sx) * e, cy = drag.sy + (ty - drag.sy) * e;
    const sc = drag.k + (1 - drag.k) * e;
    drag.fl.style.transform = `translate3d(${cx - drag.w / 2}px, ${cy - drag.h / 2}px, 0) scale(${sc})`;
    if (t < 1) drag.raf = requestAnimationFrame(frame);
    updatePreview(tx - drag.w / 2, ty - drag.h / 2);
  }

  function updatePreview(x, y) {
    const { pitch, x0, y0 } = drag.m;
    const fc = (x - x0) / pitch, fr = (y - y0) / pitch;
    // "Melekat": selagi blok tak lari jauh dari petak sekarang, kekal kat situ.
    // Elak bayang melompat-lompat bila blok tepat di tengah antara dua petak.
    const cur = drag.pos;
    if (cur && Math.abs(fc - cur[1]) < 0.75 && Math.abs(fr - cur[0]) < 0.75) return;
    const c0 = Math.round(fc), r0 = Math.round(fr);
    const pos = fits(drag.p.shape, r0, c0) ? [r0, c0] : null;
    if (String(pos) === String(drag.pos)) return;
    if (drag.pos) { drag.prevPos = drag.pos; drag.changedAt = performance.now(); }
    drag.pos = pos;
    clearPreview();
    if (!pos) return;
    drag.p.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) cells[r0 + r][c0 + c].className = `cell ghost c${drag.p.color}`;
    }));
    const { rows, cols } = linesIfPlaced(drag.p.shape, r0, c0);
    rows.forEach((r) => cells[r].forEach((el) => el.classList.add('willclear')));
    cols.forEach((c) => cells.forEach((row) => row[c].classList.add('willclear')));
  }

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (drag.raf) cancelAnimationFrame(drag.raf);
    clearPreview();
    const d = drag;
    drag = null;
    // Jari tergelincir masa diangkat? Kalau bayang baru berubah <100ms sebelum lepas,
    // guna tempat sebelum tu (yang kau nampak lebih lama).
    // Hanya untuk gelincir kecil (petak sebelah), bukan bila sengaja tarik keluar untuk batal.
    if (d.pos && d.prevPos && performance.now() - d.changedAt < 100 &&
        Math.abs(d.pos[0] - d.prevPos[0]) + Math.abs(d.pos[1] - d.prevPos[1]) === 1) d.pos = d.prevPos;
    if (d.pos && e.type === 'pointerup') {
      d.fl.remove();
      d.slot.classList.remove('dragging');
      place(d.i, d.p, d.pos[0], d.pos[1]);
      return;
    }
    // Tak muat: blok terbang balik ke tray
    let timer = 0;
    const done = () => {
      clearTimeout(timer);
      d.slot._finishReturn = null;
      d.fl.remove();
      d.slot.classList.remove('dragging');
    };
    if (reduceMotion) return done();
    d.slot._finishReturn = done;
    d.fl.style.transition = 'transform .18s cubic-bezier(.2,.8,.3,1)';
    d.fl.style.transform = `translate3d(${d.sx - d.w / 2}px, ${d.sy - d.h / 2}px, 0) scale(${d.k})`;
    timer = setTimeout(done, 190);
  }

  // ---------- main logic ----------
  function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
    if (score > best) { best = score; bestEl.textContent = best; store.set('blokboom-best', best); }
  }

  // Serpihan + gegar papan
  const wrapEl = boardEl.parentElement;
  function boom(toClear, lines) {
    if (reduceMotion) return;
    const per = lines >= 3 ? 3 : 2;
    toClear.forEach((k) => {
      const el = cells[Math.floor(k / N)][k % N];
      const color = grid[Math.floor(k / N)][k % N] || 1 + Math.floor(Math.random() * COLORS);
      for (let i = 0; i < per; i++) {
        const sp = document.createElement('span');
        sp.className = 'spark blk c' + color;
        const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * (40 + lines * 25);
        sp.style.left = el.offsetLeft + el.offsetWidth / 2 + 'px';
        sp.style.top = el.offsetTop + el.offsetHeight / 2 + 'px';
        sp.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        sp.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        sp.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
        wrapEl.appendChild(sp);
        setTimeout(() => sp.remove(), 700);
      }
    });
    if (lines >= 2) {
      boardEl.classList.remove('shake', 'shake-big'); void boardEl.offsetWidth;
      boardEl.classList.add(lines >= 3 ? 'shake-big' : 'shake');
    }
  }

  // ===== Letupan GSAP: retak dulu, lepas tu pecah & jatuh (lain ikut tema) =====
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fxLayer = document.createElement('div');
  fxLayer.className = 'fx';
  document.body.appendChild(fxLayer);

  // Corak pecah: garis retak + kepingan yang tepinya ikut garis retak tu (koordinat 0-100)
  function breakPattern(t) {
    const P = (x, y) => [x, y];
    if (t === 'batu') {
      const C = P(rnd(38, 62), rnd(38, 62));
      const T = P(rnd(30, 70), 0), R = P(100, rnd(30, 70)), B = P(rnd(30, 70), 100), L = P(0, rnd(30, 70));
      const mid = (a, b) => P((a[0] + b[0]) / 2 + rnd(-9, 9), (a[1] + b[1]) / 2 + rnd(-9, 9));
      const mT = mid(C, T), mR = mid(C, R), mB = mid(C, B), mL = mid(C, L);
      return {
        cracks: [[C, mT, T], [C, mR, R], [C, mB, B], [C, mL, L]],
        shards: [[P(0, 0), T, mT, C, mL, L], [T, P(100, 0), R, mR, C, mT], [C, mR, R, P(100, 100), B, mB], [L, mL, C, mB, B, P(0, 100)]],
      };
    }
    if (t === 'kaca') {
      const C = P(rnd(35, 65), rnd(35, 65));
      const ring = [P(0, 0), P(rnd(25, 75), 0), P(100, 0), P(100, rnd(25, 75)), P(100, 100), P(rnd(25, 75), 100), P(0, 100), P(0, rnd(25, 75))];
      const shards = ring.map((p, i) => [C, p, ring[(i + 1) % ring.length]]);
      const inner = ring.map((p) => P(C[0] + (p[0] - C[0]) * 0.35, C[1] + (p[1] - C[1]) * 0.35));
      return { cracks: ring.map((p) => [C, p]).concat([inner.concat([inner[0]])]), shards };
    }
    // pokok: belah jadi 3 papan kayu, garis belah bergerigi
    const a = rnd(28, 38), b = rnd(62, 72), j1 = rnd(-6, 6), j2 = rnd(-6, 6);
    const sa = [P(a, 0), P(a + j1, 35), P(a - j1, 65), P(a, 100)];
    const sb = [P(b, 0), P(b + j2, 40), P(b - j2, 70), P(b, 100)];
    return {
      cracks: [sa, sb],
      shards: [[P(0, 0)].concat(sa, [P(0, 100)]), sa.concat(sb.slice().reverse()), sb.concat([P(100, 100), P(100, 0)])],
      leaves: Math.random() < 0.6,
    };
  }

  function shatter(toClear, lines, origin) {
    const t = skin();
    const tl = gsap.timeline();
    toClear.forEach((k) => {
      const r = Math.floor(k / N), c = k % N, el = cells[r][c];
      const color = grid[r][c] || 1;
      const pat = breakPattern(t);
      const delay = Math.min(0.2, Math.hypot(r - origin[0], c - origin[1]) * 0.035);
      // 1) retak
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('class', 'crack');
      const paths = pat.cracks.map((pts) => {
        const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pa.setAttribute('d', 'M' + pts.map((p) => p.join(' ')).join(' L'));
        pa.setAttribute('pathLength', '100');
        svg.appendChild(pa);
        return pa;
      });
      el.appendChild(svg);
      tl.fromTo(paths, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.12, ease: 'power1.out' }, delay);
      tl.to(el, { x: rnd(-2, 2), y: rnd(-2, 2), duration: 0.04, repeat: 3, yoyo: true }, delay);
      // 2) pecah
      tl.add(() => {
        const rect = el.getBoundingClientRect();
        if (grid[r][c]) el.classList.add('shattered'); // kalau papan dah dikosongkan, jangan sorok petak
        svg.remove();
        gsap.set(el, { clearProps: 'transform' });
        pat.shards.forEach((poly) => {
          const f = document.createElement('div');
          f.className = 'frag c' + color;
          const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
          Object.assign(f.style, {
            left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px',
            clipPath: 'polygon(' + poly.map((p) => p[0] + '% ' + p[1] + '%').join(',') + ')',
            transformOrigin: cx + '% ' + cy + '%',
          });
          fxLayer.appendChild(f);
          const dx = (cx - 50) / 50, dy = (cy - 50) / 50, push = 1 + lines * 0.25;
          const done = () => f.remove();
          if (t === 'kaca') {
            gsap.timeline({ onComplete: done })
              .to(f, { x: dx * rnd(25, 55) * push, y: dy * rnd(25, 55) * push, rotation: rnd(-200, 200), duration: 0.22, ease: 'power3.out' })
              .to(f, { x: '+=' + rnd(-25, 25), y: '+=' + rnd(260, 400), rotation: '+=' + rnd(-200, 200), duration: rnd(0.7, 0.9), ease: 'power2.in' })
              .to(f, { opacity: 0, duration: 0.3 }, '-=0.3');
          } else if (t === 'batu') {
            gsap.timeline({ onComplete: done })
              .to(f, { x: dx * 10 * push, y: dy * 10 * push - 8, duration: 0.12, ease: 'power1.out' })
              .to(f, { x: '+=' + (dx * 25 + rnd(-15, 15)), y: '+=' + rnd(260, 420), rotation: rnd(-130, 130), duration: rnd(0.7, 0.95), ease: 'power2.in' })
              .to(f, { opacity: 0, duration: 0.25 }, '-=0.25');
          } else {
            gsap.timeline({ onComplete: done })
              .to(f, { y: -6 * push, rotation: rnd(-10, 10), duration: 0.1, ease: 'power1.out' })
              .to(f, { x: dx * 30 + rnd(-20, 20), y: rnd(260, 400), rotation: rnd(-80, 80), duration: rnd(0.8, 1), ease: 'power2.in' })
              .to(f, { opacity: 0, duration: 0.25 }, '-=0.25');
          }
        });
        if (pat.leaves) {
          const lf = document.createElement('div');
          lf.className = 'leaf';
          Object.assign(lf.style, { left: rect.left + rect.width / 2 + 'px', top: rect.top + rect.height / 2 + 'px' });
          fxLayer.appendChild(lf);
          const side = Math.random() < 0.5 ? -1 : 1;
          gsap.to(lf, { y: rnd(150, 260), duration: rnd(1.3, 1.8), ease: 'sine.in', onComplete: () => lf.remove() });
          gsap.to(lf, { x: side * rnd(25, 45), rotation: side * 70, duration: 0.4, repeat: 3, yoyo: true, ease: 'sine.inOut' });
          gsap.to(lf, { opacity: 0, duration: 0.4, delay: 1.1 });
        }
      }, delay + 0.14);
    });
    if (lines >= 2) {
      boardEl.classList.remove('shake', 'shake-big'); void boardEl.offsetWidth;
      boardEl.classList.add(lines >= 3 ? 'shake-big' : 'shake');
    }
  }

  // ===== Tukar tema: petak flip gelombang dari tengah =====
  const bannerEl = $('banner');
  function changeSkin() {
    const next = (skinIdx + 1) % SKINS.length;
    const S = SKINS[next];
    bannerEl.innerHTML = '<small>3 letupan berturut-turut!</small><span>' + S.icon + ' Tema ' + S.name + '</span>';
    if (!window.gsap || reduceMotion) {
      busy = false;
      setSkin(next);
      showPopup(S.icon + ' Tema ' + S.name + '!');
      return;
    }
    busy = true;
    const flat = cells.flat();
    const stag = { each: 0.025, from: 'center', grid: [N, N] };
    const tl = gsap.timeline();
    tl.to(flat, { rotateY: 90, scale: 0.7, duration: 0.2, ease: 'power2.in', stagger: stag })
      .to('.slot .piece', { scale: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .add(() => {
        setSkin(next);
        sndSkin();
        gsap.fromTo(flashEl, { opacity: 0.55 }, { opacity: 0, duration: 0.6 });
      })
      .to(flat, { rotateY: 0, scale: 1, duration: 0.4, ease: 'back.out(2.2)', stagger: stag })
      .to('.slot .piece', { scale: 1, duration: 0.35, ease: 'back.out(3)' }, '<')
      .add(() => { busy = false; gsap.set(flat, { clearProps: 'transform' }); gsap.set('.slot .piece', { clearProps: 'transform' }); })
      .fromTo(bannerEl, { autoAlpha: 0, scale: 0.3, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(3)' }, 0.1)
      .to(bannerEl, { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power1.in' }, 1.5)
      .set(bannerEl, { y: 0 });
  }
  const flashEl = document.createElement('div');
  flashEl.className = 'flash';
  fxLayer.appendChild(flashEl);

  function showPopup(text, size = 1) {
    popupEl.style.setProperty('--size', size);
    popupEl.textContent = text;
    popupEl.classList.remove('show'); void popupEl.offsetWidth; popupEl.classList.add('show');
  }

  function place(i, p, r0, c0) {
    const { rows, cols } = linesIfPlaced(p.shape, r0, c0);
    let n = 0;
    p.shape.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return;
      grid[r0 + r][c0 + c] = p.color; n++;
    }));
    tray[i] = null;
    render();
    renderTray(); // terus buang blok dari tray, jangan tunggu letupan habis
    p.shape.forEach((row, r) => row.forEach((v, c) => { if (v) cells[r0 + r][c0 + c].classList.add('placed'); }));
    sndPlace();
    addScore(n);

    const lines = rows.length + cols.length;
    if (lines) {
      combo++;
      // 1 baris = 10, 2 = 30, 3 = 60 ... darab combo
      const pts = 10 * lines * (lines + 1) / 2 * combo;
      const toClear = new Set();
      rows.forEach((r) => { for (let c = 0; c < N; c++) toClear.add(r * N + c); });
      cols.forEach((c) => { for (let r = 0; r < N; r++) toClear.add(r * N + c); });
      if (window.gsap && !reduceMotion) {
        shatter(toClear, lines, [r0 + (p.shape.length - 1) / 2, c0 + (p.shape[0].length - 1) / 2]);
      } else {
        toClear.forEach((k) => cells[Math.floor(k / N)][k % N].classList.add('clearing'));
        boom(toClear, lines);
      }
      sndBreak(lines);
      const switchSkin = combo % 3 === 0; // 3, 6, 9... letupan berturut-turut
      const words = ['', 'Bagus!', 'Mantap!', 'Power!', 'Gila ah!', 'LEGEND!'];
      showPopup((combo > 1 ? `Combo x${combo}  ` : '') + (words[Math.min(lines, 5)]) + ` +${pts}`, Math.min(1.3, 0.9 + lines * 0.1 + combo * 0.05));
      busy = true;
      setTimeout(() => {
        toClear.forEach((k) => { grid[Math.floor(k / N)][k % N] = 0; });
        addScore(pts);
        if (grid.every((row) => row.every((v) => !v))) { addScore(300); showPopup('Papan bersih! +300 ✨'); }
        busy = false;
        afterMove();
        if (switchSkin && overEl.hidden) {
          busy = true; // tunggu tulisan combo habis dulu, baru tukar tema
          setTimeout(changeSkin, 450);
        }
      }, 380);
    } else {
      combo = 0;
      afterMove();
    }
  }

  function afterMove() {
    render();
    if (tray.every((p) => !p)) newTray();
    renderTray();
    store.set('blokboom-save', { grid, tray, score, combo });
    if (!tray.some((p) => p && canFitAnywhere(p.shape))) gameOver();
  }

  function gameOver() {
    store.set('blokboom-save', null);
    sndOver();
    setTimeout(() => {
      $('final').textContent = score;
      $('newbest').hidden = !(score > 0 && score >= best && score > startBest);
      overEl.hidden = false;
    }, 500);
  }

  let startBest = 0;
  function newGame() {
    grid = Array.from({ length: N }, () => Array(N).fill(0));
    score = 0; combo = 0;
    startBest = best;
    scoreEl.textContent = 0;
    overEl.hidden = true;
    $('ask').hidden = true;
    newTray();
    render();
    renderTray();
    store.set('blokboom-save', null);
  }

  // ---------- mula ----------
  best = store.get('blokboom-best', 0);
  bestEl.textContent = best;
  soundOn = store.get('blokboom-sound', true);
  $('sound').textContent = soundOn ? '🔊' : '🔇';
  buildBoard();
  setSkin(Math.min(SKINS.length - 1, Math.max(0, store.get('blokboom-skin', 0) | 0)));

  const saved = store.get('blokboom-save', null);
  if (saved && saved.grid && saved.tray) {
    ({ grid, tray, score, combo } = saved);
    grid = grid.map((row) => row.map(fixColor));
    tray = tray.map((p) => (p ? { ...p, color: fixColor(p.color) } : p));
    startBest = best;
    scoreEl.textContent = score;
    render();
    renderTray();
  } else {
    newGame();
  }

  $('restart').onclick = () => {
    if (busy) return;
    if (score === 0) newGame(); else $('ask').hidden = false;
  };
  $('askNo').onclick = () => { $('ask').hidden = true; };
  $('askYes').onclick = () => { $('ask').hidden = true; newGame(); };
  $('again').onclick = newGame;
  $('sound').onclick = () => {
    soundOn = !soundOn;
    store.set('blokboom-sound', soundOn);
    $('sound').textContent = soundOn ? '🔊' : '🔇';
  };
})();
