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
  // Combo tak putus terus: ada 2 langkah "peluang" untuk letup lagi sebelum combo hilang
  const COMBO_GRACE = 2;
  let miss = 0;

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

  // ---------- tekstur (dilukis sekali guna canvas) ----------
  const randBP = () => Math.round(Math.random() * 100) + '% ' + Math.round(Math.random() * 100) + '%';
  function makeTexture(kind) {
    const S = 128, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const R = (a, b) => a + Math.random() * (b - a);
    const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
    const noise = (amt, spike) => {
      const im = g.getImageData(0, 0, S, S), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        let n = (Math.random() - 0.5) * amt;
        if (spike && Math.random() < spike) n += Math.random() < 0.5 ? -90 : 90;
        d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
      }
      g.putImageData(im, 0, 0);
    };
    if (kind === 'batu') {
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 45; i++) { // tompok gelap/cerah
        const x = R(0, S), y = R(0, S), r = R(8, 32), v = Math.random() < 0.5 ? 70 : 190;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${v},${v},${v},.38)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 4; i++) { // urat batu
        let x = R(0, S), y = R(0, S);
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 9; k++) { x += R(-16, 16); y += R(-16, 16); g.lineTo(x, y); }
        g.strokeStyle = i % 2 ? 'rgba(230,230,230,.4)' : 'rgba(40,40,40,.35)'; g.lineWidth = R(0.6, 1.6); g.stroke();
      }
      for (let i = 0; i < 22; i++) { // lubang kecil
        const x = R(0, S), y = R(0, S), r = R(0.8, 2.6);
        g.fillStyle = 'rgba(25,25,25,.75)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(235,235,235,.45)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.5, r * 0.45, 0, 7); g.fill();
      }
      noise(60, 0.05); // bintik granit
    } else if (kind === 'pokok') {
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
      const kx = R(30, 100), ky = R(30, 100);
      for (let y0 = -12; y0 < S + 12; y0 += R(2.2, 4.5)) { // urat kayu
        g.beginPath();
        const ph = R(0, 6), dark = Math.random() < 0.65;
        for (let x = 0; x <= S; x += 3) {
          const dx = x - kx, dy = y0 - ky, dist2 = dx * dx + dy * dy;
          const bend = 14 * Math.exp(-dist2 / 260) * Math.sign(dy || 1);
          const y = y0 + Math.sin(x * 0.045 + ph) * 2.2 + bend;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.strokeStyle = dark ? `rgba(50,50,50,${R(0.25, 0.55)})` : `rgba(210,210,210,${R(0.15, 0.35)})`;
        g.lineWidth = R(0.5, 1.8); g.stroke();
      }
      for (let k = 6; k > 0; k--) { // mata kayu
        g.beginPath(); g.ellipse(kx, ky, k * 2.4, k * 1.3, 0, 0, 7);
        g.strokeStyle = `rgba(35,35,35,${0.15 + k * 0.05})`; g.lineWidth = 1.2; g.stroke();
      }
      g.fillStyle = 'rgba(30,30,30,.6)'; g.beginPath(); g.ellipse(kx, ky, 2.5, 1.5, 0, 0, 7); g.fill();
      noise(26, 0);
    } else { // kaca: lut sinar, gelembung halus & sedikit kabus
      g.clearRect(0, 0, S, S);
      for (let i = 0; i < 16; i++) {
        const x = R(0, S), y = R(0, S), r = R(0.8, 3.5);
        g.beginPath(); g.arc(x, y, r, 0, 7);
        g.fillStyle = 'rgba(255,255,255,.10)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.7; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - r * 0.4, y - r * 0.5, 1, 1);
      }
      const im = g.getImageData(0, 0, S, S), d = im.data;
      for (let i = 0; i < d.length; i += 4) if (Math.random() < 0.05) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.max(d[i + 3], 28); }
      g.putImageData(im, 0, 0);
    }
    return cv;
  }
  // Bakar warna + tekstur jadi SATU gambar setiap warna. Blok guna gambar ni terus (ringan),
  // dan kepingan pecah dilukis dari gambar yang sama.
  const BAKED = {};
  (function installTextures() {
    try {
      const prev = document.body.dataset.skin;
      const probes = [1, 2, 3, 4].map((n) => {
        const d = document.createElement('div');
        d.className = 'c' + n;
        d.style.display = 'none';
        document.body.appendChild(d);
        return d;
      });
      let css = '';
      SKINS.forEach((k) => {
        document.body.dataset.skin = k.id;
        const tex = makeTexture(k.id);
        BAKED[k.id] = {};
        probes.forEach((d, i) => {
          const cs = getComputedStyle(d);
          const hi = cs.getPropertyValue('--hi').trim(), lo = cs.getPropertyValue('--lo').trim();
          const cv = document.createElement('canvas');
          cv.width = cv.height = 128;
          const g = cv.getContext('2d');
          const gr = g.createLinearGradient(0, 0, 128, 128);
          gr.addColorStop(0, hi); gr.addColorStop(1, lo);
          g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
          g.globalCompositeOperation = k.id === 'kaca' ? 'source-over' : 'overlay';
          g.drawImage(tex, 0, 0);
          BAKED[k.id][i + 1] = cv;
          const url = k.id === 'kaca' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.88);
          css += `body[data-skin="${k.id}"] .c${i + 1}{--baked:url(${url})}\n`;
        });
      });
      probes.forEach((d) => d.remove());
      document.body.dataset.skin = prev || 'batu';
      const st = document.createElement('style');
      st.textContent = css;
      document.head.appendChild(st);
    } catch (e) { /* canvas tak boleh guna: kekal warna biasa */ }
  })();

  // ---------- papan ----------
  function buildBoard() {
    boardEl.innerHTML = '';
    cells = [];
    for (let r = 0; r < N; r++) {
      cells.push([]);
      for (let c = 0; c < N; c++) {
        const d = document.createElement('div');
        d.className = 'cell';
        d.style.setProperty('--bp', randBP()); // setiap petak tunjuk bahagian tekstur lain
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

  // Letak blok di tempat terbaik: utamakan letup banyak baris serentak, lepas tu yang paling "kemas"
  // (rapat dinding/blok lain). Laju: tak salin papan untuk setiap kedudukan, kira guna bilangan per baris/lajur.
  const addR = new Int8Array(N), addC = new Int8Array(N);
  function simBestPlace(g, shape) {
    const rowCnt = new Int8Array(N), colCnt = new Int8Array(N);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c]) { rowCnt[r]++; colCnt[c]++; }
    const pts = [];
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) pts.push(r, c); }));
    const H = shape.length, W = shape[0].length;
    let bestScore = -1, br = 0, bc = 0, bl = 0;
    for (let r0 = 0; r0 <= N - H; r0++) for (let c0 = 0; c0 <= N - W; c0++) {
      let ok = true;
      for (let i = 0; i < pts.length; i += 2) if (g[r0 + pts[i]][c0 + pts[i + 1]]) { ok = false; break; }
      if (!ok) continue;
      let snug = 0;
      for (let i = 0; i < pts.length; i += 2) {
        const R = r0 + pts[i], C = c0 + pts[i + 1];
        addR[R]++; addC[C]++;
        if (R === 0 || g[R - 1][C]) snug++;
        if (R === N - 1 || g[R + 1][C]) snug++;
        if (C === 0 || g[R][C - 1]) snug++;
        if (C === N - 1 || g[R][C + 1]) snug++;
      }
      let L = 0;
      for (let i = 0; i < N; i++) {
        if (addR[i]) { if (rowCnt[i] + addR[i] === N) L++; addR[i] = 0; }
        if (addC[i]) { if (colCnt[i] + addC[i] === N) L++; addC[i] = 0; }
      }
      const score = L * L * 100 + snug; // letup 2 baris serentak > 2 kali letup 1 baris
      if (score > bestScore) { bestScore = score; br = r0; bc = c0; bl = L; }
    }
    if (bestScore < 0) return null;
    // Bina papan hasil untuk kedudukan terbaik sahaja
    const t = g.map((row) => row.slice());
    for (let i = 0; i < pts.length; i += 2) t[br + pts[i]][bc + pts[i + 1]] = 1;
    if (bl) {
      const fr = [], fc = [];
      for (let i = 0; i < N; i++) {
        if (t[i].every(Boolean)) fr.push(i);
        if (t.every((row) => row[i])) fc.push(i);
      }
      fr.forEach((i) => t[i].fill(0));
      fc.forEach((i) => t.forEach((row) => { row[i] = 0; }));
    }
    return { score: bestScore, lines: bl, grid: t };
  }

  // Boleh ke ketiga-tiga blok diletak (cuba semua 6 susunan)? Berapa besar letupan dia?
  function simRateSet(g, shapes) {
    const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    let best = null;
    for (const o of orders) {
      let cur = g, placed = 0, lines = 0, boom = 0, clears = 0;
      for (const k of o) {
        const b = simBestPlace(cur, shapes[k]);
        if (!b) break;
        cur = b.grid; placed++; lines += b.lines; boom += b.lines * b.lines;
        if (b.lines) clears++;
      }
      // Baris/lajur yang dah 6-7 penuh = umpan untuk letupan besar pusingan depan
      let setup = 0;
      for (let i = 0; i < N; i++) {
        const rn = cur[i].filter(Boolean).length, cn = cur.filter((row) => row[i]).length;
        if (rn >= 6) setup++;
        if (cn >= 6) setup++;
      }
      const r = { placed, lines, boom, setup, clears };
      if (!best || placed > best.placed || (placed === best.placed && clears * 30 + boom * 10 + setup > best.clears * 30 + best.boom * 10 + best.setup)) best = r;
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
      // Utama: semua muat. Lepas tu: banyak langkah yang letup (combo), letupan besar, susun baris untuk depan. Sikit random.
      const score = r.placed * 1000 + r.clears * 220 + r.boom * 80 + r.setup * 30 + Math.random() * 25;
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
      if (v) b.style.setProperty('--bp', randBP());
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
      const ring = [P(0, 0), P(rnd(30, 70), 0), P(100, rnd(15, 45)), P(100, 100), P(rnd(30, 70), 100), P(0, rnd(55, 85))];
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

  // ===== Enjin kepingan: SEMUA kepingan, habuk & daun dilukis atas satu canvas =====
  // (dulu setiap kepingan satu elemen HTML — ratusan elemen, berat gila kat phone)
  const fxCanvas = document.createElement('canvas');
  fxCanvas.className = 'fxc';
  fxLayer.appendChild(fxCanvas);
  const fx = fxCanvas.getContext('2d');
  let fxDPR = 1, fxW = 0, fxH = 0;
  function sizeFx() {
    fxDPR = 1; // kepingan bergerak laju — resolusi biasa cukup, 4x kurang piksel nak dilukis
    fxW = innerWidth; fxH = innerHeight;
    fxCanvas.width = Math.round(fxW * fxDPR); fxCanvas.height = Math.round(fxH * fxDPR);
  }
  sizeFx();
  addEventListener('resize', sizeFx);
  const parts = [];
  let fxOn = false, fxLast = 0;
  function spawn(p) {
    if (p.draw === drawShard) cutShard(p);
    parts.push(p);
    if (!fxOn) { fxOn = true; fxLast = performance.now(); requestAnimationFrame(fxTick); }
  }
  function fxTick(now) {
    const dt = Math.min(0.034, Math.max(0, (now - fxLast) / 1000));
    fxLast = now;
    fx.setTransform(fxDPR, 0, 0, fxDPR, 0, 0);
    fx.clearRect(0, 0, fxW, fxH);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t < 0) continue; // belum mula (kelewatan)
      if (p.t >= p.life || p.y > fxH + 60) {
        if (p.spr) recycle(p.spr);
        parts.splice(i, 1);
        if (p.onEnd) p.onEnd();
        continue;
      }
      p.vy += p.g * dt;
      if (p.drag) p.vx *= Math.max(0, 1 - p.drag * dt);
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      fx.globalAlpha = p.t > p.life - p.fade ? (p.life - p.t) / p.fade : 1;
      p.draw(p);
    }
    fx.globalAlpha = 1;
    fxCanvas.dataset.n = parts.length;
    if (parts.length) requestAnimationFrame(fxTick);
    else { fxOn = false; fx.clearRect(0, 0, fxW, fxH); }
  }
  // Kepingan dipotong SEKALI masa pecah jadi gambar kecil; setiap frame cuma "cop" gambar tu (laju)
  const pool = [];
  const getCanvas = (w, h) => { const c = pool.pop() || document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const recycle = (c) => { if (pool.length < 400) pool.push(c); };
  function cutShard(p) {
    const q = p.poly;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]); y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]); }
    x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1;
    const c = getCanvas(Math.ceil(x1) + 1 - x0, Math.ceil(y1) + 1 - y0);
    const g = c.getContext('2d');
    g.translate(-x0, -y0);
    g.beginPath();
    g.moveTo(q[0], q[1]);
    for (let i = 2; i < q.length; i += 2) g.lineTo(q[i], q[i + 1]);
    g.closePath();
    g.save();
    g.clip();
    if (p.img) g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.ox, -p.oy, p.w, p.h);
    else { g.fillStyle = '#888'; g.fillRect(-p.ox, -p.oy, p.w, p.h); }
    g.restore();
    g.strokeStyle = p.edge;
    g.lineWidth = 1;
    g.stroke();
    p.spr = c; p.sx0 = x0; p.sy0 = y0;
    p.img = null; p.poly = null;
  }
  function drawShard(p) {
    fx.setTransform(Math.cos(p.rot), Math.sin(p.rot), -Math.sin(p.rot), Math.cos(p.rot), p.x, p.y);
    fx.drawImage(p.spr, p.sx0, p.sy0);
    fx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // Retak: garis "merebak" + kilat putih atas petak, lepas tu petak pecah (onEnd)
  function drawCrack(p) {
    const u = p.t / p.life;
    const jx = rnd(-1.2, 1.2), jy = rnd(-1.2, 1.2); // gegar sikit
    fx.setTransform(1, 0, 0, 1, p.x + jx, p.y + jy);
    fx.globalAlpha = 0.45 * u;
    fx.fillStyle = '#fff';
    fx.fillRect(0, 0, p.w, p.h);
    fx.globalAlpha = 1;
    fx.strokeStyle = p.stroke;
    fx.lineWidth = p.lw;
    fx.lineCap = 'round';
    fx.lineJoin = 'round';
    p.paths.forEach((pts, i) => {
      fx.setLineDash([p.lens[i] * Math.min(1, u * 1.3), 1e4]);
      fx.beginPath();
      fx.moveTo(pts[0], pts[1]);
      for (let j = 2; j < pts.length; j += 2) fx.lineTo(pts[j], pts[j + 1]);
      fx.stroke();
    });
    fx.setLineDash([]);
    fx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const CRACK_STYLE = {
    batu: ['rgba(20,15,10,.85)', 0.05],
    kaca: ['rgba(255,255,255,.95)', 0.03],
    pokok: ['rgba(40,20,5,.85)', 0.04],
  };

  function drawSprite(p) {
    const s = p.scaleAt ? p.scaleAt(p.t / p.life) : 1;
    const sw = p.sway ? Math.sin(p.t * p.sway) : 0;
    fx.save();
    fx.translate(p.x + sw * (p.swayAmp || 0), p.y);
    fx.rotate(p.rot + sw * 0.9);
    if (p.alpha) fx.globalAlpha *= p.alpha;
    fx.drawImage(p.img, -p.w * s / 2, -p.h * s / 2, p.w * s, p.h * s);
    fx.restore();
  }
  function drawSpeck(p) { fx.fillStyle = p.fill; fx.fillRect(p.x, p.y, p.w, p.h); }
  const sprite = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')); return c; };
  const SPR = {
    dust: sprite(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(235,225,210,.85)'); gr.addColorStop(0.4, 'rgba(190,180,165,.45)'); gr.addColorStop(1, 'rgba(190,180,165,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }),
    spark: sprite(32, 32, (g) => {
      const st = [[16, 1], [19, 13], [31, 16], [19, 19], [16, 31], [13, 19], [1, 16], [13, 13]];
      g.shadowColor = '#bff4ff'; g.shadowBlur = 6; g.fillStyle = '#fff';
      g.beginPath(); st.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    }),
    leaf: sprite(24, 14, (g) => {
      const gr = g.createLinearGradient(0, 0, 24, 14);
      gr.addColorStop(0, '#9be05a'); gr.addColorStop(1, '#3e8a2a');
      g.fillStyle = gr; g.beginPath(); g.ellipse(12, 7, 11, 5.5, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(30,60,20,.5)'; g.beginPath(); g.moveTo(2, 7); g.lineTo(22, 7); g.stroke();
    }),
  };

  // Satu petak pecah: kepingan ikut corak retak + habuk/kilauan ikut tema
  function spawnBreak(t, rect, color, pat, lines, bp, dense) {
    const img = BAKED[t] && BAKED[t][color];
    const bpv = (bp || '30% 40%').split(' ').map(parseFloat);
    const W = rect.width, Hh = rect.height;
    let sx = 0, sy = 0, sw = 0, sh = 0;
    if (img) { // bahagian gambar yang sama dengan yang petak tu tunjuk (background-size 220%)
      sw = img.width / 2.2; sh = img.height / 2.2;
      sx = img.width * 1.2 / 2.2 * bpv[0] / 100; sy = img.height * 1.2 / 2.2 * bpv[1] / 100;
    }
    const edge = t === 'kaca' ? 'rgba(255,255,255,.75)' : t === 'batu' ? 'rgba(0,0,0,.35)' : 'rgba(50,25,8,.45)';
    const push = 1 + lines * 0.25;
    pat.shards.forEach((poly) => {
      const cxp = poly.reduce((a, p) => a + p[0], 0) / poly.length, cyp = poly.reduce((a, p) => a + p[1], 0) / poly.length;
      const ox = cxp / 100 * W, oy = cyp / 100 * Hh;
      const q = [];
      poly.forEach((p) => q.push(p[0] / 100 * W - ox, p[1] / 100 * Hh - oy));
      const dx = (cxp - 50) / 50, dy = (cyp - 50) / 50;
      const sh0 = { x: rect.left + ox, y: rect.top + oy, rot: 0, t: 0, poly: q, img, sx, sy, sw, sh, ox, oy, w: W, h: Hh, edge, draw: drawShard, drag: 0 };
      if (t === 'kaca') Object.assign(sh0, { vx: dx * rnd(200, 380) * push, vy: dy * rnd(200, 380) * push - 60, g: 1500, drag: 2.2, vr: rnd(-12, 12), life: rnd(0.95, 1.2), fade: 0.3 });
      else if (t === 'batu') Object.assign(sh0, { vx: dx * rnd(50, 110) * push, vy: dy * rnd(40, 90) * push - rnd(110, 170), g: 1250, vr: rnd(-4.5, 4.5), life: rnd(1.1, 1.4), fade: 0.3 });
      else Object.assign(sh0, { vx: dx * rnd(40, 90) * push + rnd(-20, 20), vy: -rnd(70, 130) * push, g: 1200, vr: rnd(-3, 3), life: rnd(1.1, 1.3), fade: 0.25 });
      spawn(sh0);
    });
    const cx = rect.left + W / 2, cy = rect.top + Hh / 2;
    if (t === 'batu') {
      spawn({ x: cx, y: cy, vx: rnd(-20, 20), vy: rnd(-40, -15), g: 0, vr: 0, rot: 0, t: 0, life: rnd(0.7, 0.95), fade: 0.6, img: SPR.dust, w: 46, h: 46, alpha: 0.9, scaleAt: (u) => 0.4 + u * 2, draw: drawSprite });
      for (let i = 0; i < (dense ? 1 : 2); i++) {
        const z = rnd(4, 7);
        spawn({ x: cx, y: cy, vx: rnd(-220, 220), vy: rnd(-280, -120), g: 1500, vr: rnd(-10, 10), rot: 0, t: 0, life: 1, fade: 0.3,
          poly: [-z / 2, -z / 2, z / 2, -z / 3, z / 2, z / 2, -z / 3, z / 2], img, sx: sx + rnd(0, sw * 0.6), sy: sy + rnd(0, sh * 0.6), sw: sw * 0.3, sh: sh * 0.3,
          ox: z / 2, oy: z / 2, w: z, h: z, edge, draw: drawShard });
      }
    } else if (t === 'kaca') {
      if (!dense || Math.random() < 0.5) spawn({ x: cx + rnd(-W / 2, W / 2), y: cy + rnd(-Hh / 2, Hh / 2), vx: 0, vy: 0, g: 0, vr: 6, rot: 0, t: 0, life: 0.45, fade: 0.1, img: SPR.spark, w: 18, h: 18,
        scaleAt: (u) => (u < 0.4 ? (u / 0.4) * 1.3 : ((1 - u) / 0.6) * 1.3), draw: drawSprite });
    } else {
      for (let i = 0; i < (dense ? 1 : 3); i++) spawn({ x: cx + rnd(-8, 8), y: cy + rnd(-8, 8), vx: rnd(-160, 160), vy: rnd(-200, -60), g: 600, drag: 1.2, vr: 0, rot: 0, t: 0, life: rnd(0.9, 1.2), fade: 0.4, w: 4, h: 3, fill: '#d8b47a', draw: drawSpeck });
      if (pat.leaves) spawn({ x: cx, y: cy, vx: 0, vy: rnd(90, 150), g: 0, vr: 0, rot: rnd(0, 3), t: 0, life: rnd(1.4, 1.8), fade: 0.4, img: SPR.leaf, w: 16, h: 9, sway: rnd(5, 7), swayAmp: rnd(18, 32), draw: drawSprite });
    }
  }

  function shatter(toClear, lines, origin, rows, cols) {
    const t = skin();
    // Pancaran cahaya sepanjang baris/lajur yang penuh, memancar dari tempat blok diletak
    const wrapEl = boardEl.parentElement;
    const beam = (isRow, i) => {
      const a = isRow ? cells[i][0] : cells[0][i], z = isRow ? cells[i][N - 1] : cells[N - 1][i];
      const bm = document.createElement('div');
      bm.className = 'beam';
      Object.assign(bm.style, {
        left: a.offsetLeft - 3 + 'px', top: a.offsetTop - 3 + 'px',
        width: z.offsetLeft + z.offsetWidth - a.offsetLeft + 6 + 'px', height: z.offsetTop + z.offsetHeight - a.offsetTop + 6 + 'px',
        transformOrigin: isRow ? ((origin[1] + 0.5) / N * 100) + '% 50%' : '50% ' + ((origin[0] + 0.5) / N * 100) + '%',
      });
      wrapEl.appendChild(bm);
      gsap.timeline({ onComplete: () => bm.remove() })
        .fromTo(bm, isRow ? { scaleX: 0, opacity: 1 } : { scaleY: 0, opacity: 1 }, isRow ? { scaleX: 1, duration: 0.18, ease: 'power3.out' } : { scaleY: 1, duration: 0.18, ease: 'power3.out' })
        .to(bm, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.2);
    };
    rows.forEach((r) => beam(true, r));
    cols.forEach((c) => beam(false, c));
    // Papan "terhentak" + gegar ikut saiz letupan
    gsap.fromTo(boardEl, { scale: 1 + 0.012 * lines }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.35)', delay: 0.18, clearProps: 'transform' });
    const amp = lines >= 2 ? 3 + lines * 2.5 : 2.5;
    gsap.to(wrapEl, {
      keyframes: [{ x: -amp, y: amp * 0.5 }, { x: amp, y: -amp * 0.5 }, { x: -amp * 0.6, y: -amp * 0.3 }, { x: amp * 0.35, y: amp * 0.2 }, { x: 0, y: 0 }],
      duration: 0.32 + lines * 0.04, delay: 0.18, ease: 'none', clearProps: 'transform',
    });
    // Baca SEMUA kedudukan petak sekali gus dulu (kalau baca sambil ubah DOM, browser kira semula susun atur berkali-kali)
    const rects = new Map();
    toClear.forEach((k) => rects.set(k, cells[Math.floor(k / N)][k % N].getBoundingClientRect()));
    const dense = toClear.size > 16;
    const [stroke, lwRatio] = CRACK_STYLE[t];
    toClear.forEach((k) => {
      const r = Math.floor(k / N), c = k % N, el = cells[r][c];
      const color = grid[r][c] || 1;
      const pat = breakPattern(t);
      const rect = rects.get(k), W = rect.width, Hh = rect.height;
      const delay = 0.05 + Math.min(0.2, Math.hypot(r - origin[0], c - origin[1]) * 0.035); // 0.05 = "hit-stop"
      const paths = pat.cracks.map((pts) => pts.flatMap((p) => [p[0] / 100 * W, p[1] / 100 * Hh]));
      const lens = paths.map((q) => { let L = 0; for (let j = 2; j < q.length; j += 2) L += Math.hypot(q[j] - q[j - 2], q[j + 1] - q[j - 1]); return L; });
      const bp = el.style.getPropertyValue('--bp');
      spawn({
        x: rect.left, y: rect.top, w: W, h: Hh, t: -delay, life: 0.14, fade: 0, vx: 0, vy: 0, g: 0, vr: 0, rot: 0,
        paths, lens, stroke, lw: Math.max(1.2, W * lwRatio), draw: drawCrack,
        onEnd: () => {
          if (grid[r][c]) el.classList.add('shattered'); // kalau papan dah dikosongkan, jangan sorok petak
          spawnBreak(t, rect, color, pat, lines, bp, dense);
        },
      });
    });
  }

  // ===== Tukar tema: petak flip gelombang dari tengah =====
  const bannerEl = $('banner');
  function changeSkin() {
    const next = (skinIdx + 1) % SKINS.length;
    bannerEl.textContent = 'GEMPOUKK!';
    if (!window.gsap || reduceMotion) {
      busy = false;
      setSkin(next);
      showPopup('GEMPOUKK!', 1.4);
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
      .fromTo(bannerEl, { autoAlpha: 0, scale: 2.6, rotation: -14 }, { autoAlpha: 1, scale: 1, rotation: -4, duration: 0.35, ease: 'back.out(2.5)' }, 0)
      .to(bannerEl, { scale: 1.08, rotation: 3, duration: 0.12, repeat: 3, yoyo: true, ease: 'sine.inOut' })
      .to(bannerEl, { autoAlpha: 0, scale: 0.6, y: -30, duration: 0.3, ease: 'power2.in' }, 1.3)
      .set(bannerEl, { y: 0, rotation: 0 });
  }
  const flashEl = document.createElement('div');
  flashEl.className = 'flash';
  fxLayer.appendChild(flashEl);

  // ===== Meter combo atas papan =====
  const comboEl = $('comboBar'), comboTxt = $('comboTxt'), comboDots = comboEl.querySelectorAll('i');
  function updateCombo(bumped) {
    if (!combo) { comboEl.classList.remove('on', 'last'); return; }
    comboEl.classList.add('on');
    comboTxt.textContent = '🔥 Combo x' + combo;
    const left = COMBO_GRACE - miss;
    comboDots.forEach((d, i) => d.classList.toggle('full', i < left));
    comboEl.classList.toggle('last', left === 1);
    if (window.gsap && !reduceMotion) {
      if (bumped) gsap.fromTo(comboEl, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.45)' });
      else if (left === 1) gsap.fromTo(comboEl, { x: -5 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    }
  }

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
      miss = 0;
      updateCombo(true);
      // 1 baris = 10, 2 = 30, 3 = 60 ... darab combo
      const pts = 10 * lines * (lines + 1) / 2 * combo;
      const toClear = new Set();
      rows.forEach((r) => { for (let c = 0; c < N; c++) toClear.add(r * N + c); });
      cols.forEach((c) => { for (let r = 0; r < N; r++) toClear.add(r * N + c); });
      if (window.gsap && !reduceMotion) {
        shatter(toClear, lines, [r0 + (p.shape.length - 1) / 2, c0 + (p.shape[0].length - 1) / 2], rows, cols);
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
      }, 450); // tunggu semua petak habis retak & pecah
    } else {
      if (combo) {
        miss++;
        if (miss >= COMBO_GRACE) { combo = 0; miss = 0; }
      }
      updateCombo(false);
      afterMove();
    }
  }

  function afterMove() {
    render();
    if (tray.every((p) => !p)) newTray();
    renderTray();
    store.set('blokboom-save', { grid, tray, score, combo, miss });
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
    score = 0; combo = 0; miss = 0;
    updateCombo(false);
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
    miss = saved.miss || 0;
    updateCombo(false);
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
