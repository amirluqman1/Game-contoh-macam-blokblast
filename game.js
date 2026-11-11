(() => {
  const N = 8;
  const COLORS = 7;

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
  const sndClear = (n) => [0, 1, 2].forEach((i) => setTimeout(() => beep(520 + i * 160 + n * 60, 0.12, 'square', 0.08), i * 70));
  const sndOver = () => [0, 1, 2].forEach((i) => setTimeout(() => beep(300 - i * 70, 0.2, 'sawtooth', 0.08), i * 150));

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
      cells[r][c].className = 'cell' + (grid[r][c] ? ' c' + grid[r][c] : '');
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
  // Bantuan bila papan sesak: papan bawah 40% penuh = random biasa.
  // Lepas tu makin penuh, makin tinggi peluang dapat blok kecil.
  // Tak pernah sengaja bagi blok susah.
  const cellCount = (shape) => shape.flat().filter(Boolean).length;

  function helpLevel() {
    const filled = grid.flat().filter(Boolean).length / (N * N);
    return Math.min(1, Math.max(0, (filled - 0.4) / 0.35)); // 0 bila <=40% penuh, 1 bila >=75%
  }

  function randomPiece(help) {
    const weights = SHAPES.map((sh) => 1 / Math.pow(cellCount(sh), 1.5 * help));
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < SHAPES.length - 1 && (x -= weights[k]) > 0) k++;
    return { shape: SHAPES[k], color: 1 + Math.floor(Math.random() * COLORS) };
  }

  function newTray() {
    // Cuba bagi set yang sekurang-kurangnya satu blok boleh muat
    const help = helpLevel();
    let set;
    for (let t = 0; t < 20; t++) {
      set = [randomPiece(help), randomPiece(help), randomPiece(help)];
      if (set.some((p) => canFitAnywhere(p.shape))) break;
    }
    tray = set;
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
    const c0 = Math.round((x - x0) / pitch), r0 = Math.round((y - y0) / pitch);
    const pos = fits(drag.p.shape, r0, c0) ? [r0, c0] : null;
    if (String(pos) === String(drag.pos)) return;
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

  function showPopup(text) {
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
      toClear.forEach((k) => cells[Math.floor(k / N)][k % N].classList.add('clearing'));
      sndClear(lines);
      const words = ['', 'Bagus!', 'Mantap!', 'Power!', 'Gila ah!', 'LEGEND!'];
      showPopup((combo > 1 ? `Combo x${combo}  ` : '') + (words[Math.min(lines, 5)]) + ` +${pts}`);
      busy = true;
      setTimeout(() => {
        toClear.forEach((k) => { grid[Math.floor(k / N)][k % N] = 0; });
        addScore(pts);
        if (grid.every((row) => row.every((v) => !v))) { addScore(300); showPopup('Papan bersih! +300 ✨'); }
        busy = false;
        afterMove();
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

  const saved = store.get('blokboom-save', null);
  if (saved && saved.grid && saved.tray) {
    ({ grid, tray, score, combo } = saved);
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
