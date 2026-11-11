// =====================================================================
// game.js : otak permainan Blok Boom
// Fail ni dikomen baris demi baris supaya senang belajar.
// Cara baca: komen (// ...) terletak SEBELUM baris kod yang dia terangkan,
// atau di hujung baris kalau baris tu pendek.
// =====================================================================

// "(() => { ... })();" dipanggil IIFE (fungsi yang terus dijalankan sebaik dibaca).
// "() => {" = arrow function tanpa nama. Semua pemboleh ubah di dalam dia "terkurung"
// di sini sahaja, tak bocor jadi pemboleh ubah global yang boleh bergaduh dengan kod lain.
(() => {
  // const = pemboleh ubah tetap, nilainya tak boleh ditukar lepas ni. N = saiz papan (8 x 8).
  const N = 8;
  // Setiap tema ada 4 warna. Komen selepas // pada hujung baris pun sah.
  const COLORS = 4; // setiap tema ada 4 warna

  // Komen biasa. "Bentuk blok: [baris][lajur], 1 = ada blok"
  // Setiap bentuk = array dalam array (jadual). [[1,1]] = 1 baris, 2 lajur. 1 = ada kotak, 0 = kosong.
  const SHAPES = [
    // 1 kotak je
    [[1]],
    // garisan 2 kotak: melintang, lepas tu menegak (2 baris, 1 lajur setiap satu)
    [[1, 1]], [[1], [1]],
    // garisan 3 kotak (melintang, menegak)
    [[1, 1, 1]], [[1], [1], [1]],
    // garisan 4 kotak
    [[1, 1, 1, 1]], [[1], [1], [1], [1]],
    // garisan 5 kotak
    [[1, 1, 1, 1, 1]], [[1], [1], [1], [1], [1]],
    // kotak 2x2
    [[1, 1], [1, 1]],
    // kotak besar 3x3
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    // segi empat 2x3 dan 3x2
    [[1, 1, 1], [1, 1, 1]], [[1, 1], [1, 1], [1, 1]],
    // L kecil
    // 4 arah putaran L kecil (3 kotak)
    [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[1, 1], [1, 0]], [[1, 1], [0, 1]],
    // L besar
    // L besar 3x3 (5 kotak), dua arah pertama
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]], [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
    // L besar, dua arah lagi
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]], [[1, 1, 1], [0, 0, 1], [0, 0, 1]],
    // L panjang
    // L panjang menegak (4 kotak), 4 arah
    [[1, 0], [1, 0], [1, 1]], [[0, 1], [0, 1], [1, 1]], [[1, 1], [1, 0], [1, 0]], [[1, 1], [0, 1], [0, 1]],
    // L panjang melintang, 4 arah
    [[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
    // T
    // bentuk T, 4 arah
    [[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[0, 1], [1, 1], [0, 1]],
    // S / Z
    // bentuk S dan Z, 4 arah
    [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 0], [1, 1], [0, 1]], [[0, 1], [1, 1], [1, 0]],
  ]; // tutup senarai SHAPES. Jumlah: 37 bentuk

  // $ = nama pendek untuk fungsi "cari elemen HTML ikut id".
  // (id) => ... = arrow function yang ambil satu input (id) dan terus pulangkan hasil dia.
  // document.getElementById(id) = cari tag HTML yang ada id="..." dalam index.html.
  const $ = (id) => document.getElementById(id);
  // Satu "const" boleh isytihar banyak pemboleh ubah dipisah koma. Setiap satu simpan elemen HTML.
  const boardEl = $('board'), trayEl = $('tray'), scoreEl = $('score'), bestEl = $('best');
  // Elemen untuk tulisan popup ("Bagus!") dan skrin game over
  const popupEl = $('popup'), overEl = $('over');

  // let = pemboleh ubah yang BOLEH ditukar nilai kemudian.
  // grid = papan (jadual 8x8), tray = 3 blok kat bawah, score = markah, best = markah terbaik,
  // combo = berapa kali berturut letup, cells = senarai kotak HTML papan, soundOn = bunyi hidup?, busy = tengah animasi? (kunci input)
  let grid, tray, score, best, combo, cells = [], soundOn = true, busy = false;
  // Combo tak putus terus: ada 2 langkah "peluang" untuk letup lagi sebelum combo hilang
  // Nombor tetap: berapa langkah yang kau dibenarkan tak letup sebelum combo putus
  const COMBO_GRACE = 2;
  // miss = berapa langkah berturut-turut kau tak letup (mula dari 0)
  let miss = 0;

  // ---------- simpanan (selamat kalau localStorage tak boleh guna) ----------
  // Objek "store" dengan 2 fungsi (get dan set) untuk simpan data dalam browser (localStorage).
  const store = {
    // get(k, d): ambil nilai ikut nama k; kalau tak ada, pulangkan d (nilai lalai / default).
    // try { ... } catch { ... } = cuba buat; kalau error (contoh storage disekat), jalankan bahagian catch.
    // localStorage.getItem = baca teks yang disimpan. "? :" (ternary) = kalau null pulang d, kalau tak, tukar teks jadi data guna JSON.parse.
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    // set(k, v): simpan nilai v bawah nama k. JSON.stringify tukar data jadi teks sebab localStorage cuma simpan teks.
    // catch {} kosong = kalau gagal, senyap je (jangan crash game).
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  }; // tutup objek store

  // ---------- bunyi ringkas ----------
  // actx = "audio context", enjin bunyi browser. Belum dicipta (undefined), dicipta bila bunyi pertama diminta.
  let actx;
  // beep(frekuensi, tempoh, jenis gelombang, kuat bunyi).
  // "dur = 0.08" = nilai lalai: kalau tak bagi nilai, guna 0.08. Sama untuk type dan vol.
  function beep(freq, dur = 0.08, type = 'sine', vol = 0.15) {
    // Kalau bunyi dimatikan, keluar dari fungsi terus (return = berhenti dan pulang).
    if (!soundOn) return;
    // Cuba main bunyi; kalau browser tak sokong, catch di bawah tangkap error.
    try {
      // "a = a || b" bermaksud: kalau a dah ada guna a, kalau belum, cipta yang baru.
      // webkitAudioContext = nama lama untuk Safari lama.
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      // Cipta "oscillator" (penjana bunyi) dan "gain" (kawalan kuat bunyi).
      const o = actx.createOscillator(), g = actx.createGain();
      // Tetapkan jenis gelombang (sine/square/triangle...) dan frekuensi (nada tinggi rendah).
      o.type = type; o.frequency.value = freq;
      // Mula bunyi pada kuat "vol" sekarang.
      g.gain.setValueAtTime(vol, actx.currentTime);
      // Bunyi mengecil secara perlahan sampai hampir senyap dalam tempoh "dur" (supaya tak bunyi "klik").
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      // Sambung wayar: penjana -> kawalan kuat bunyi -> speaker (destination).
      o.connect(g).connect(actx.destination);
      // Mula main sekarang, dan berhenti selepas "dur" saat.
      o.start(); o.stop(actx.currentTime + dur);
    } catch {} // kalau gagal, abaikan
  } // tutup fungsi beep
  // Bunyi letak blok: bunyi pendek nada 320 Hz.
  const sndPlace = () => beep(320, 0.06, 'triangle');
    // Bunyi pecah: lain ikut tema. (lines = berapa baris meletup serentak)
    const sndBreak = (lines) => {
    // Ambil nama tema sekarang ('batu' / 'kaca' / 'pokok')
    const t = skin();
    // Kalau tema batu:
    if (t === 'batu') {
      // satu dentum rendah (90 Hz, gelombang segi empat)
      beep(90, 0.2, 'square', 0.12);
      // "for" = ulang. Ulang (3 + lines) kali: setiap kali, jadualkan satu bunyi kecil rawak.
      // setTimeout(fungsi, ms) = jalankan fungsi tu selepas ms milisaat. Math.random() = nombor rawak 0 hingga <1.
      for (let i = 0; i < 3 + lines; i++) setTimeout(() => beep(180 + Math.random() * 260, 0.03, 'square', 0.05), 40 + i * 35);
    // kalau tema kaca:
    } else if (t === 'kaca') {
      // banyak "ting" kecil nada tinggi rawak, macam kaca berderai
      for (let i = 0; i < 4 + lines * 2; i++) setTimeout(() => beep(1700 + Math.random() * 1900, 0.09, 'sine', 0.06), i * 28);
    // selain tu (tema pokok):
    } else {
      // ketukan kayu: bunyi kuat dulu, lepas 70ms bunyi lebih rendah
      beep(260, 0.08, 'triangle', 0.2);
      setTimeout(() => beep(170, 0.12, 'triangle', 0.14), 70);  // bunyi kedua, lebih rendah, selepas 70ms
      // sebiji bunyi naik nada untuk setiap baris yang meletup
      for (let i = 0; i < lines; i++) setTimeout(() => beep(420 + i * 90, 0.05, 'triangle', 0.08), 150 + i * 60);
    } // tutup if/else tema
    // Kalau letup 2 baris atau lebih, tambah 3 bunyi naik (sebagai ganjaran).
    // [0,1,2].forEach(fungsi) = jalankan fungsi sekali untuk setiap item dalam senarai.
    if (lines >= 2) [0, 1, 2].forEach((i) => setTimeout(() => beep(620 + i * 180 + lines * 60, 0.12, 'square', 0.06), 200 + i * 70));
  }; // tutup sndBreak
  // Bunyi tukar tema: 5 nada naik. 1.26 dikuasakan i (Math.pow) = setiap nada ~4 semitone lebih tinggi dari sebelumnya.
  const sndSkin = () => [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => beep(400 * Math.pow(1.26, i), 0.14, 'triangle', 0.1), i * 70));
  // Bunyi game over: 3 nada TURUN (300 tolak i*70) gelombang gergaji.
  const sndOver = () => [0, 1, 2].forEach((i) => setTimeout(() => beep(300 - i * 70, 0.2, 'sawtooth', 0.08), i * 150));

  // ---------- tema ----------
  // Senarai 3 tema. Setiap tema = objek { id, name, icon } (kunci: nilai).
  const SKINS = [
    { id: 'batu', name: 'Batu', icon: '🪨' },  // tema 0: batu (id dipakai oleh CSS data-skin)
    { id: 'kaca', name: 'Kaca', icon: '💎' },  // tema 1: kaca
    { id: 'pokok', name: 'Pokok', icon: '🌳' },  // tema 2: pokok
  ];  // tutup senarai SKINS
  // skinIdx = nombor tema sekarang dalam senarai (0 = batu, 1 = kaca, 2 = pokok)
  let skinIdx = 0;
  // setSkin(i): tukar ke tema nombor i
  function setSkin(i) {
    // simpan nombor tema
    skinIdx = i;
    // letak atribut data-skin="batu" pada <body>. CSS guna ni untuk tukar warna (body[data-skin="batu"] {...})
    document.body.dataset.skin = SKINS[i].id;
    // simpan dalam browser supaya tema diingat bila buka semula
    store.set('blokboom-skin', i);
  }  // tutup setSkin
  // skin() = pulangkan nama tema sekarang (contoh 'kaca'). SKINS[skinIdx] = ambil item nombor skinIdx dari senarai.
  const skin = () => SKINS[skinIdx].id;
  // Save lama ada 7 warna, tema sekarang 4
  // fixColor: kalau nombor warna (v) lebih besar dari 4, "lipat" semula ke 1-4 guna baki bahagi (%).
  const fixColor = (v) => (v > COLORS ? ((v - 1) % COLORS) + 1 : v);

  // ---------- tekstur (dilukis sekali guna canvas) ----------
  // randBP: jana teks rawak macam "37% 82%". Dipakai sebagai kedudukan tekstur supaya setiap blok nampak lain.
  // Math.round = bundarkan ke nombor bulat. '%' + ... = sambung nombor dengan teks (string concatenation).
  const randBP = () => Math.round(Math.random() * 100) + '% ' + Math.round(Math.random() * 100) + '%';
  // makeTexture(kind): lukis satu gambar tekstur ("batu", "pokok" atau kaca) guna <canvas>, pulangkan canvas tu.
  function makeTexture(kind) {
    // S = saiz gambar (128 x 128 piksel). Cipta elemen <canvas> baru dalam memori.
    const S = 128, cv = document.createElement('canvas');
    // Tetapkan lebar dan tinggi sekali gus: "a = b = nilai" bermaksud kedua-duanya dapat nilai sama.
    cv.width = cv.height = S;
    // g = "pen" untuk melukis (2D context). Semua g.xxx() di bawah = arahan lukis.
    const g = cv.getContext('2d');
    // R(a, b): nombor rawak antara a dan b
    const R = (a, b) => a + Math.random() * (b - a);
    // clamp(v): hadkan nilai v antara 0 hingga 255 (julat warna). Ternary bersarang: kalau <0 jadi 0, kalau >255 jadi 255, kalau tak v.
    const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
    // noise(amt, spike): tambah "bintik" rawak pada seluruh gambar, jadi nampak berpasir.
    const noise = (amt, spike) => {
      // Baca semua piksel gambar. im.data = senarai panjang nombor: setiap piksel ada 4 nilai (R, G, B, Alpha).
      const im = g.getImageData(0, 0, S, S), d = im.data;
      // Loncat 4 nilai setiap kali (i += 4) = satu piksel setiap pusingan.
      for (let i = 0; i < d.length; i += 4) {
        // n = perubahan cerah/gelap rawak (negatif atau positif)
        let n = (Math.random() - 0.5) * amt;
        // Kadang-kadang (kebarangkalian "spike") tambah titik yang sangat gelap atau sangat cerah
        if (spike && Math.random() < spike) n += Math.random() < 0.5 ? -90 : 90;
        // Tukar R, G dan B piksel tu (d[i], d[i+1], d[i+2]) guna n, dihadkan 0-255 oleh clamp
        d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
      } // tutup for piksel
      // Letak semula piksel yang dah diubah ke atas canvas
      g.putImageData(im, 0, 0);
    }; // tutup noise
    // Kalau jenis batu:
    if (kind === 'batu') {
      // Warnai seluruh gambar kelabu (128,128,128), lepas tu fillRect(x, y, lebar, tinggi) = isi segi empat
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
      // Ulang 45 kali: lukis tompok. Komen // pada hujung baris menerangkan tujuan.
      for (let i = 0; i < 45; i++) { // tompok gelap/cerah
        // x,y = kedudukan rawak, r = jejari rawak, v = 70 (gelap) atau 190 (cerah) secara rawak 50/50
        const x = R(0, S), y = R(0, S), r = R(8, 32), v = Math.random() < 0.5 ? 70 : 190;
        // gradient bulat: tengah pekat, tepi lutsinar (supaya tompok nampak lembut)
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        // `...${v}...` = template literal (guna backtick): ${v} diganti dengan nilai v. addColorStop(0 hingga 1, warna) tetapkan warna pada titik gradient.
        gr.addColorStop(0, `rgba(${v},${v},${v},.38)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        // Isi segi empat sekeliling tompok guna gradient tadi
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      } // tutup for tompok
      // 4 garisan retak halus (urat batu)
      for (let i = 0; i < 4; i++) { // urat batu
        // titik mula rawak. "let" sebab x,y akan berubah.
        let x = R(0, S), y = R(0, S);
        // beginPath = mula lukisan baru, moveTo = letak pen kat titik mula
        g.beginPath(); g.moveTo(x, y);
        // 9 langkah: setiap langkah gerak pen sikit-sikit rawak (-16 hingga 16), lineTo = tarik garis ke situ
        for (let k = 0; k < 9; k++) { x += R(-16, 16); y += R(-16, 16); g.lineTo(x, y); }
        // Warna garis: kalau i ganjil (i % 2 bukan 0) cerah, kalau genap gelap. lineWidth = tebal garis. stroke() = lukis garis.
        g.strokeStyle = i % 2 ? 'rgba(230,230,230,.4)' : 'rgba(40,40,40,.35)'; g.lineWidth = R(0.6, 1.6); g.stroke();
      } // tutup for urat
      // 22 lubang kecil
      for (let i = 0; i < 22; i++) { // lubang kecil
        // kedudukan dan saiz rawak lubang
        const x = R(0, S), y = R(0, S), r = R(0.8, 2.6);
        // bulatan gelap (arc(x, y, jejari, mula, hujung); 7 radian > bulatan penuh) lepas tu fill = isi warna
        g.fillStyle = 'rgba(25,25,25,.75)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        // bulatan cerah kecil sedikit senget = pantulan cahaya, nampak macam lubang dalam
        g.fillStyle = 'rgba(235,235,235,.45)'; g.beginPath(); g.arc(x + r * 0.5, y + r * 0.5, r * 0.45, 0, 7); g.fill();
      } // tutup for lubang
      // tambah bintik granit (60 = kuat, 0.05 = 5% piksel jadi titik terang/gelap)
      noise(60, 0.05); // bintik granit
    // Kalau jenis kayu (pokok):
    } else if (kind === 'pokok') {
      // asas kelabu
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, S, S);
      // kx,ky = kedudukan "mata kayu" (pusat bulatan urat) secara rawak
      const kx = R(30, 100), ky = R(30, 100);
      // Setiap pusingan = satu garis urat kayu melintang. y0 mula dari atas (-12) ke bawah, jarak rawak 2.2-4.5 piksel.
      for (let y0 = -12; y0 < S + 12; y0 += R(2.2, 4.5)) { // urat kayu
        // mula lukis garis baru
        g.beginPath();
        // ph = fasa gelombang rawak, dark = 65% kebarangkalian garis ni gelap
        const ph = R(0, 6), dark = Math.random() < 0.65;
        // Dari kiri ke kanan, setiap 3 piksel:
        for (let x = 0; x <= S; x += 3) {
          // dx, dy = jarak dari mata kayu. dist2 = jarak dikuasa dua (Pythagoras tanpa punca)
          const dx = x - kx, dy = y0 - ky, dist2 = dx * dx + dy * dy;
          // bend = urat "melengkung" mengelilingi mata kayu. Math.exp = fungsi eksponen (makin jauh makin kecil). Math.sign = +1 atau -1 (atas atau bawah mata).
          const bend = 14 * Math.exp(-dist2 / 260) * Math.sign(dy || 1);
          // y = kedudukan garis + gelombang sin kecil + lengkung tadi
          const y = y0 + Math.sin(x * 0.045 + ph) * 2.2 + bend;
          // x ? lineTo : moveTo. Kalau x bukan 0 (truthy) tarik garis, kalau x = 0 letak titik mula.
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        } // tutup for x
        // warna garis gelap atau cerah (ternary), dengan kelegapan rawak
        g.strokeStyle = dark ? `rgba(50,50,50,${R(0.25, 0.55)})` : `rgba(210,210,210,${R(0.15, 0.35)})`;
        // tebal rawak lepas tu lukis
        g.lineWidth = R(0.5, 1.8); g.stroke();
      } // tutup for urat kayu
      // 6 bulatan sepusat (ellipse) = gelang mata kayu, dari besar ke kecil (k turun dari 6 ke 1)
      for (let k = 6; k > 0; k--) { // mata kayu
        // ellipse(x, y, jejariX, jejariY, putaran, mula, hujung)
        g.beginPath(); g.ellipse(kx, ky, k * 2.4, k * 1.3, 0, 0, 7);
        // makin besar gelang, makin pekat sikit
        g.strokeStyle = `rgba(35,35,35,${0.15 + k * 0.05})`; g.lineWidth = 1.2; g.stroke();
      } // tutup for gelang
      // titik gelap tengah mata kayu
      g.fillStyle = 'rgba(30,30,30,.6)'; g.beginPath(); g.ellipse(kx, ky, 2.5, 1.5, 0, 0, 7); g.fill();
      // bintik halus kayu (tanpa titik spike)
      noise(26, 0);
    // Selain tu = kaca:
    } else { // kaca: lut sinar, gelembung halus & sedikit kabus
      // clearRect = kosongkan (jadi lutsinar) kerana kaca tak perlu warna asas
      g.clearRect(0, 0, S, S);
      // 16 gelembung udara dalam kaca
      for (let i = 0; i < 16; i++) {
        // kedudukan dan saiz rawak
        const x = R(0, S), y = R(0, S), r = R(0.8, 3.5);
        // bulatan gelembung
        g.beginPath(); g.arc(x, y, r, 0, 7);
        // isi lutsinar putih
        g.fillStyle = 'rgba(255,255,255,.10)'; g.fill();
        // garis tepi gelembung
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.7; g.stroke();
        // titik kilat 1x1 piksel kat gelembung
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x - r * 0.4, y - r * 0.5, 1, 1);
      } // tutup for gelembung
      // baca piksel untuk tambah kabus halus
      const im = g.getImageData(0, 0, S, S), d = im.data;
      // 5% piksel dijadikan putih. d[i]=d[i+1]=d[i+2]=255 = tetapkan R,G,B sekali gus. d[i+3] = alpha (kelegapan), minimum 28.
      for (let i = 0; i < d.length; i += 4) if (Math.random() < 0.05) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.max(d[i + 3], 28); }
      // letak semula piksel ke canvas
      g.putImageData(im, 0, 0);
    } // tutup if/else jenis tekstur
    // pulangkan canvas yang dah siap dilukis
    return cv;
  } // tutup makeTexture
  // Bakar warna + tekstur jadi SATU gambar setiap warna. Blok guna gambar ni terus (ringan),
  // dan kepingan pecah dilukis dari gambar yang sama.
  // BAKED = kotak simpanan (objek kosong {}) untuk gambar yang dah siap "dibakar"
  const BAKED = {};
  // BEVEL = kotak simpanan untuk gambar tepi serong setiap tema
  const BEVEL = {};
  // Tepi serong (bevel) macam jubin timbul: atas paling terang, bawah paling gelap, bucu bertemu serong 45°
  // BEVEL_STYLE: tetapan tepi setiap tema. Setiap tema = senarai nilai ikut turutan label di bawah.
  const BEVEL_STYLE = {
    //       lebar  atas  kiri  kanan bawah  garis luar               garis dalam
    batu:  [17, 0.34, 0.2, 0.3, 0.5, 'rgba(0,0,0,.45)', 0.22],
    kaca:  [13, 0.6, 0.38, 0.14, 0.26, 'rgba(255,255,255,.7)', 0.35],  // tetapan tepi serong kaca (lebih nipis dan terang)
    pokok: [15, 0.26, 0.16, 0.32, 0.5, 'rgba(45,22,6,.55)', 0.18],  // tetapan tepi serong kayu
  }; // tutup BEVEL_STYLE
  // makeBevel(kind): lukis gambar tepi serong untuk satu tema
  function makeBevel(kind) {
    // Destructuring: ambil 7 nilai dari senarai tadi dan beri nama sekali gus.
    // b = lebar tepi, aT/aL/aR/aB = kelegapan tepi atas/kiri/kanan/bawah, outline = warna garis luar, inner = kelegapan garis dalam
    const [b, aT, aL, aR, aB, outline, inner] = BEVEL_STYLE[kind];
    // canvas baru 128x128 macam makeTexture
    const S = 128, cv = document.createElement('canvas');
    cv.width = cv.height = S;  // set lebar dan tinggi canvas sekali gus
    const g = cv.getContext('2d');  // g = pen untuk melukis atas canvas
    // face(): lukis satu muka tepi (segi empat senget) guna senarai titik, dengan gradient dari terang ke pudar.
    // pts = senarai titik sudut, (x0,y0)->(x1,y1) = arah gradient, rgb = warna, a = kelegapan
    const face = (pts, x0, y0, x1, y1, rgb, a) => {
      // buat gradient garis lurus dari (x0,y0) ke (x1,y1)
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      // hujung mula: kelegapan penuh a. hujung akhir: 55% daripada a (lebih pudar)
      gr.addColorStop(0, `rgba(${rgb},${a})`);
      gr.addColorStop(1, `rgba(${rgb},${a * 0.55})`);  // hujung gradient: pudar jadi 55% daripada kelegapan asal
      // guna gradient sebagai warna isi
      g.fillStyle = gr;
      // mula bentuk baru
      g.beginPath();
      // Untuk setiap titik [x, y] dalam pts: titik pertama (i = 0, false) moveTo; titik lain lineTo. "([x, y], i)" = destructuring terus dalam parameter.
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      // tutup bentuk (sambung titik akhir ke titik mula) dan isi warna
      g.closePath();
      g.fill();  // isi bentuk dengan gradient
    }; // tutup face
    // 4 muka tepi. Setiap satu = 4 titik sudut (trapezium) + arah gradient + warna (putih untuk cahaya, hitam untuk bayang).
    face([[0, 0], [S, 0], [S - b, b], [b, b]], 0, 0, 0, b, '255,255,255', aT);             // atas
    face([[0, 0], [b, b], [b, S - b], [0, S]], 0, 0, b, 0, '255,255,255', aL);             // kiri
    face([[S, 0], [S, S], [S - b, S - b], [S - b, b]], S, 0, S - b, 0, '0,0,0', aR);         // kanan
    face([[0, S], [b, S - b], [S - b, S - b], [S, S]], 0, S, 0, S - b, '0,0,0', aB);         // bawah
    // garisan halus antara tepi serong & muka blok
    // tebal garis 2 piksel
    g.lineWidth = 2;
    // garis dalam terang di sebelah atas-kiri (bentuk huruf "L" terbalik: bawah-kiri > atas-kiri > atas-kanan)
    g.strokeStyle = `rgba(255,255,255,${inner})`;
    g.beginPath(); g.moveTo(b, S - b); g.lineTo(b, b); g.lineTo(S - b, b); g.stroke();  // lukis garis berbentuk L terbalik (tepi dalam atas-kiri)
    // garis dalam gelap di sebelah bawah-kanan
    g.strokeStyle = `rgba(0,0,0,${inner})`;
    g.beginPath(); g.moveTo(S - b, b); g.lineTo(S - b, S - b); g.lineTo(b, S - b); g.stroke();  // lukis garis berbentuk L (tepi dalam bawah-kanan)
    // garis bucu serong (nampak lebih 3D)
    // lebih nipis sikit (1.5)
    g.lineWidth = 1.5;
    // garis serong terang kat bucu atas-kiri (dari sudut luar ke sudut dalam)
    g.strokeStyle = `rgba(255,255,255,${inner * 0.8})`;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(b, b); g.stroke();  // garis serong kecil kat bucu atas-kiri
    // garis serong gelap kat bucu bawah-kanan
    g.strokeStyle = `rgba(0,0,0,${inner * 0.8})`;
    g.beginPath(); g.moveTo(S, S); g.lineTo(S - b, S - b); g.stroke();  // garis serong kecil kat bucu bawah-kanan
    // kilat lembut kat muka blok
    // gradient bulat lembut kat sebelah atas-kiri muka blok = kesan cahaya
    const hl = g.createRadialGradient(S * 0.35, S * 0.3, 0, S * 0.35, S * 0.3, S * 0.55);
    // tengah sedikit putih, tepi hilang
    hl.addColorStop(0, 'rgba(255,255,255,.12)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');  // hujung kilat: lutsinar penuh (hilang)
    // isi bahagian tengah blok (selepas tolak tepi di semua sisi) dengan kilat
    g.fillStyle = hl;
    g.fillRect(b, b, S - 2 * b, S - 2 * b);  // isi kawasan muka blok (tolak tepi) dengan kilat
    // garis luar
    // tebal 3 piksel, warna ikut tema
    g.lineWidth = 3;
    g.strokeStyle = outline;  // warna garis luar ikut tema
    // lukis garis segi empat keliling gambar (strokeRect = lukis bingkai sahaja, tak isi)
    g.strokeRect(1.5, 1.5, S - 3, S - 3);
    // pulangkan canvas
    return cv;
  } // tutup makeBevel
  // "(function installTextures() { ... })();" = IIFE bernama. Dijalankan SEKALI masa game mula untuk siapkan semua tekstur.
  (function installTextures() {
    // Kalau apa-apa gagal di dalam (contoh canvas tak sokong), catch di bawah tangkap supaya game tak mati.
    try {
      // simpan tema sekarang, nanti kita pulangkan balik
      const prev = document.body.dataset.skin;
      // Cipta 4 elemen <div> tersembunyi kelas c1..c4. Kita guna untuk BACA warna (--hi, --lo) dari CSS tema.
      // [1,2,3,4].map(fungsi) = ubah senarai, pulangkan senarai baru (di sini senarai div)
      const probes = [1, 2, 3, 4].map((n) => {
        // cipta div, letak kelas "c1", "c2"...
        const d = document.createElement('div');
        d.className = 'c' + n;  // kelas 'c1', 'c2'... sambung teks dengan nombor n
        // display:none = tak nampak
        d.style.display = 'none';
        // letak dalam halaman supaya CSS tema boleh dikira
        document.body.appendChild(d);
        // pulangkan div ni (jadi item dalam senarai probes)
        return d;
      }); // tutup map
      // css = teks CSS yang akan kita bina dan masukkan ke halaman nanti
      let css = '';
      // Untuk setiap tema dalam SKINS (k = satu tema):
      SKINS.forEach((k) => {
        // tukar tema sementara supaya CSS tema ni terpakai pada probes
        document.body.dataset.skin = k.id;
        // lukis tekstur tema ni
        const tex = makeTexture(k.id);
        // lukis tepi serong tema ni, simpan dalam BEVEL
        BEVEL[k.id] = makeBevel(k.id);
        // tambah satu peraturan CSS: letak gambar tepi serong sebagai pemboleh ubah CSS --bevel-img. toDataURL = tukar gambar jadi teks panjang "data:image/png;base64,...". \n = baris baru.
        css += `body[data-skin="${k.id}"]{--bevel-img:url(${BEVEL[k.id].toDataURL('image/png')})}\n`;
        // sediakan kotak kosong untuk warna-warna tema ni
        BAKED[k.id] = {};
        // Untuk setiap probe (d = div, i = nombor 0-3):
        probes.forEach((d, i) => {
          // getComputedStyle = baca gaya CSS sebenar yang dah dikira browser
          const cs = getComputedStyle(d);
          // baca warna --hi (terang) dan --lo (gelap) untuk warna ni; .trim() buang ruang kosong
          const hi = cs.getPropertyValue('--hi').trim(), lo = cs.getPropertyValue('--lo').trim();
          // canvas baru 128x128 untuk satu warna
          const cv = document.createElement('canvas');
          cv.width = cv.height = 128;  // saiz canvas 128 x 128
          const g = cv.getContext('2d');  // pen untuk canvas warna ni
          // gradient serong dari --hi ke --lo
          const gr = g.createLinearGradient(0, 0, 128, 128);
          gr.addColorStop(0, hi); gr.addColorStop(1, lo);  // gradient dari warna terang (hi) ke warna gelap (lo)
          // isi canvas dengan gradient tu
          g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
          // mod campur warna: kaca = letak biasa (source-over), batu/kayu = "overlay" (tekstur gelap/cerah menggelapkan/mencerahkan warna)
          g.globalCompositeOperation = k.id === 'kaca' ? 'source-over' : 'overlay';
          // lukis tekstur di atas warna
          g.drawImage(tex, 0, 0);
          // simpan gambar siap dalam BAKED[tema][warna 1-4]. (i + 1 sebab i bermula dari 0)
          BAKED[k.id][i + 1] = cv;
          // tukar gambar jadi teks. Kaca guna png (kekal lutsinar), lain guna jpeg kualiti 88% (lebih kecil)
          const url = k.id === 'kaca' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.88);
          // tambah peraturan CSS: kelas .c1 dalam tema ni guna gambar tadi sebagai --baked
          css += `body[data-skin="${k.id}"] .c${i + 1}{--baked:url(${url})}\n`;
        }); // tutup forEach probes
      }); // tutup forEach SKINS
      // buang 4 div sementara tadi
      probes.forEach((d) => d.remove());
      // pulangkan tema asal. "a || b" = guna a, kalau kosong guna b ('batu').
      document.body.dataset.skin = prev || 'batu';
      // cipta tag <style>, isi dengan CSS yang kita bina, dan letak dalam <head> supaya CSS berkuat kuasa
      const st = document.createElement('style');
      st.textContent = css;  // isi tag <style> dengan CSS yang dibina
      document.head.appendChild(st);  // letak dalam <head> supaya CSS berkuat kuasa
    } catch (e) { /* canvas tak boleh guna: kekal warna biasa */ }  // kalau ada error (contoh canvas tak sokong), abaikan dan game guna warna biasa
  })(); // tutup installTextures dan terus panggil dia (tanda "()" di hujung)

  // ---------- papan ----------
  // buildBoard(): bina 64 kotak HTML (8x8) dan letak dalam papan. Dipanggil sekali masa game mula.
  function buildBoard() {
    // kosongkan papan HTML (buang apa-apa di dalam)
    boardEl.innerHTML = '';
    // cells = senarai kosong; nanti jadi senarai baris, setiap baris senarai kotak (cells[baris][lajur])
    cells = [];
    // Untuk setiap baris r dari 0 hingga 7:
    for (let r = 0; r < N; r++) {
      // tambah satu baris kosong dalam cells
      cells.push([]);
      // Untuk setiap lajur c dari 0 hingga 7 (for dalam for = gelung bersarang)
      for (let c = 0; c < N; c++) {
        // cipta tag <div> baru
        const d = document.createElement('div');
        // letak kelas CSS "cell" supaya nampak sebagai kotak papan
        d.className = 'cell';
        // setiap petak tunjuk bahagian tekstur lain (letak pemboleh ubah CSS --bp rawak)
        d.style.setProperty('--bp', randBP()); // setiap petak tunjuk bahagian tekstur lain
        // masukkan div tu ke dalam papan (jadi anak boardEl)
        boardEl.appendChild(d);
        // simpan rujukan div dalam cells[r] supaya nanti boleh cari terus ikut baris & lajur
        cells[r].push(d);
      } // tutup for lajur
    } // tutup for baris
  } // tutup buildBoard

  // render(): kemas kini rupa papan mengikut data dalam "grid" (grid[r][c] = 0 kosong, 1-4 = ada blok warna tu)
  function render() {
    // Dua "for" tanpa kurungan kerawal: for baris, di dalamnya for lajur. Badan gelung bermula di "{" selepas for kedua.
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      // ambil elemen HTML petak ni
      const el = cells[r][c];
      // tetapkan kelas: 'cell' sahaja, atau 'cell c2' kalau ada blok warna 2. (ternary + sambung teks)
      el.className = 'cell' + (grid[r][c] ? ' c' + grid[r][c] : '');
      // kalau ada anak elemen (sisa retak), buang semua. replaceChildren() tanpa hujah = kosongkan.
      if (el.firstChild) el.replaceChildren(); // buang sisa retak
    } // tutup for lajur
  } // tutup render

  // fits(shape, r0, c0): boleh ke "shape" diletak dengan sudut atas-kiri di baris r0, lajur c0? Pulang true/false.
  const fits = (shape, r0, c0) => {
    // Untuk setiap kotak dalam bentuk (r = baris dalam bentuk, c = lajur dalam bentuk). shape[0].length = lebar bentuk.
    for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[0].length; c++) {
      // kalau kotak ni kosong (0) dalam bentuk, langkau. "continue" = terus ke pusingan seterusnya. "!" = bukan/NOT.
      if (!shape[r][c]) continue;
      // kedudukan sebenar atas papan (R = baris, C = lajur)
      const R = r0 + r, C = c0 + c;
      // Gagal kalau: terkeluar papan (R<0, C<0, R>=N, C>=N) ATAU petak tu dah ada blok (grid[R][C] bukan 0). "||" = ATAU.
      if (R < 0 || C < 0 || R >= N || C >= N || grid[R][C]) return false;
    } // tutup for
    // semua kotak okey, jadi muat
    return true;
  }; // tutup fits

  // canFitAnywhere(shape): ada tak MANA-MANA tempat atas papan yang muat bentuk ni? Dipakai untuk game over dan kelabu blok.
  const canFitAnywhere = (shape) => {
    // cuba setiap baris mula (r) yang mungkin. "N - shape.length" = baris terakhir yang masih muat.
    for (let r = 0; r <= N - shape.length; r++)
      // cuba setiap lajur mula (c). Kalau fits() beri true, pulang true terus.
      for (let c = 0; c <= N - shape[0].length; c++) if (fits(shape, r, c)) return true;
    // dah cuba semua, tak ada yang muat
    return false;
  }; // tutup canFitAnywhere

  // Baris/lajur yang akan penuh kalau letak blok kat sini
  // linesIfPlaced: kalau "shape" diletak di (r0,c0), baris & lajur mana yang jadi penuh (akan meletup)?
  function linesIfPlaced(shape, r0, c0) {
    // tmp = SALINAN papan (papan sebenar tak diubah). grid.map(fungsi) ubah setiap baris; row.slice() = salin baris.
    const tmp = grid.map((row) => row.slice());
    // letak bentuk dalam salinan: untuk setiap baris, untuk setiap nilai v; kalau v ada (1), tulis 1 dalam tmp.
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) tmp[r0 + r][c0 + c] = 1; }));
    // dua senarai kosong untuk simpan nombor baris dan lajur yang penuh
    const rows = [], cols = [];
    // semak setiap i dari 0 hingga 7
    for (let i = 0; i < N; i++) {
      // .every(Boolean) = adakah SEMUA item dalam baris tu "benar" (bukan 0)? Kalau ya, baris i penuh. push = tambah dalam senarai.
      if (tmp[i].every(Boolean)) rows.push(i);
      // untuk lajur: tmp.every(fungsi) = semua baris mesti ada nilai pada lajur i
      if (tmp.every((row) => row[i])) cols.push(i);
    } // tutup for
    // pulangkan objek dengan 2 senarai. { rows, cols } = singkatan untuk { rows: rows, cols: cols }.
    return { rows, cols };
  } // tutup linesIfPlaced

  // ---------- tray ----------
  // Bantuan bila papan sesak: papan bawah 30% penuh = random biasa.
  // Lepas tu makin penuh, makin tinggi peluang dapat blok kecil.
  // Tak pernah sengaja bagi blok susah.
  // cellCount(shape): berapa kotak dalam bentuk. shape.flat() = ratakan jadual jadi satu senarai; .filter(Boolean) = tinggal yang 1; .length = kira.
  const cellCount = (shape) => shape.flat().filter(Boolean).length;

  // helpLevel(): tahap bantuan 0 hingga 1 bergantung berapa penuh papan
  function helpLevel() {
    // filled = pecahan papan yang penuh (0 hingga 1). grid.flat() = ratakan 8x8 jadi 64 item.
    const filled = grid.flat().filter(Boolean).length / (N * N);
    // Math.max(0, x) elak negatif, Math.min(1, x) elak lebih 1. (filled - 0.3) / 0.35 = tukar julat 30%-65% jadi 0-1.
    return Math.min(1, Math.max(0, (filled - 0.3) / 0.35)); // 0 bila <=30% penuh, 1 bila >=65%
  } // tutup helpLevel

  // randomPiece(help): pilih satu bentuk rawak. Bila help tinggi, bentuk kecil lebih kerap dipilih.
  function randomPiece(help) {
    // "Berat" setiap bentuk: 1 / (bilangan kotak ^ (2*help)). help=0 -> semua berat 1 (sama rata). help tinggi -> bentuk besar beratnya kecil.
    const weights = SHAPES.map((sh) => 1 / Math.pow(cellCount(sh), 2 * help));
    // x = nombor rawak antara 0 hingga jumlah semua berat. reduce(fungsi, 0) = tambah semua nilai dalam senarai.
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    // k = indeks bentuk terpilih (mula 0)
    let k = 0;
    // Tolak berat satu-satu dari x sampai x <= 0; k berhenti kat bentuk yang "kena". "x -= a" = x = x - a.
    while (k < SHAPES.length - 1 && (x -= weights[k]) > 0) k++;
    // pulangkan blok: bentuk + warna rawak 1-4. Math.floor = bundar ke bawah.
    return { shape: SHAPES[k], color: 1 + Math.floor(Math.random() * COLORS) };
  } // tutup randomPiece

  // SIM-START: simulasi papan untuk pilih set blok yang membantu (tak sentuh papan sebenar)
  // simFits: sama macam fits() tapi periksa papan "g" yang diberi (salinan simulasi), bukan papan sebenar
  function simFits(g, shape, r0, c0) {
    // setiap kotak dalam bentuk
    for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[0].length; c++) {
      // langkau kotak kosong
      if (!shape[r][c]) continue;
      // kedudukan atas papan
      const R = r0 + r, C = c0 + c;
      // keluar papan atau berlanggar = tak muat
      if (R < 0 || C < 0 || R >= N || C >= N || g[R][C]) return false;
    } // tutup for
    // muat
    return true;
  } // tutup simFits

  // Letak blok di tempat terbaik: utamakan letup banyak baris serentak, lepas tu yang paling "kemas"
  // (rapat dinding/blok lain). Laju: tak salin papan untuk setiap kedudukan, kira guna bilangan per baris/lajur.
  // Int8Array(N) = senarai tetap 8 nombor kecil (cepat), semua mula 0. addR/addC = pembilang sementara "blok tambahan per baris/lajur".
  const addR = new Int8Array(N), addC = new Int8Array(N);
  // simBestPlace(g, shape): cari kedudukan TERBAIK untuk shape atas papan g (simulasi). Pulang null kalau tak muat.
  function simBestPlace(g, shape) {
    // rowCnt/colCnt = berapa kotak penuh dalam setiap baris/lajur sekarang
    const rowCnt = new Int8Array(N), colCnt = new Int8Array(N);
    // kira: "r++" tambah 1. "rowCnt[r]++" = tambah 1 pada item ke-r. Kurungan kerawal { } sebab ada 2 arahan.
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c]) { rowCnt[r]++; colCnt[c]++; }
    // pts = senarai rata koordinat kotak bentuk: [baris, lajur, baris, lajur, ...]
    const pts = [];
    // untuk setiap kotak yang ada (v = 1), simpan (r, c). push boleh terima banyak nilai sekali gus.
    shape.forEach((row, r) => row.forEach((v, c) => { if (v) pts.push(r, c); }));
    // H = tinggi bentuk, W = lebar bentuk
    const H = shape.length, W = shape[0].length;
    // bestScore = skor terbaik setakat ini (-1 = belum ada). br/bc = baris/lajur terbaik. bl = bilangan baris/lajur yang meletup.
    let bestScore = -1, br = 0, bc = 0, bl = 0;
    // cuba setiap kedudukan (r0, c0) yang bentuk masih dalam papan
    for (let r0 = 0; r0 <= N - H; r0++) for (let c0 = 0; c0 <= N - W; c0++) {
      // ok = benar kalau semua kotak jatuh atas petak kosong
      let ok = true;
      // loncat 2 (i += 2) sebab pts simpan pasangan (baris, lajur). "break" = hentikan gelung terus.
      for (let i = 0; i < pts.length; i += 2) if (g[r0 + pts[i]][c0 + pts[i + 1]]) { ok = false; break; }
      // tak muat kat sini, cuba kedudukan lain
      if (!ok) continue;
      // snug = skor "kemas": berapa sisi blok yang bersentuh dinding atau blok lain
      let snug = 0;
      // untuk setiap kotak bentuk di kedudukan ini
      for (let i = 0; i < pts.length; i += 2) {
        // kedudukan sebenar kotak atas papan
        const R = r0 + pts[i], C = c0 + pts[i + 1];
        // catat: baris R dan lajur C dapat 1 blok tambahan
        addR[R]++; addC[C]++;
        // Empat semakan sisi (atas, bawah, kiri, kanan). Kalau sisi tu dinding papan ATAU petak penuh, snug +1. "snug++" = tambah 1.
        if (R === 0 || g[R - 1][C]) snug++;
        if (R === N - 1 || g[R + 1][C]) snug++;  // sisi bawah: dinding papan atau petak penuh?
        if (C === 0 || g[R][C - 1]) snug++;  // sisi kiri: dinding atau petak penuh?
        if (C === N - 1 || g[R][C + 1]) snug++;  // sisi kanan: dinding atau petak penuh?
      } // tutup for kotak
      // L = bilangan baris + lajur yang jadi penuh (akan meletup)
      let L = 0;
      // semak setiap baris/lajur i
      for (let i = 0; i < N; i++) {
        // kalau baris i dapat blok tambahan: kalau jumlah (sedia ada + tambahan) = 8, penuh -> L +1. Lepas tu reset pembilang ke 0 supaya bersih untuk kedudukan seterusnya.
        if (addR[i]) { if (rowCnt[i] + addR[i] === N) L++; addR[i] = 0; }
        // sama untuk lajur
        if (addC[i]) { if (colCnt[i] + addC[i] === N) L++; addC[i] = 0; }
      } // tutup for
      // skor: L*L*100 (letup lagi banyak serentak dapat bonus kuasa dua) + snug
      const score = L * L * 100 + snug; // letup 2 baris serentak > 2 kali letup 1 baris
      // kalau skor ni terbaik setakat ini, ingat kedudukan dan L
      if (score > bestScore) { bestScore = score; br = r0; bc = c0; bl = L; }
    } // tutup for kedudukan
    // tak jumpa kedudukan langsung = pulang null (kosong)
    if (bestScore < 0) return null;
    // Bina papan hasil untuk kedudukan terbaik sahaja
    // t = salinan papan untuk hasil akhir
    const t = g.map((row) => row.slice());
    // letak semua kotak bentuk di kedudukan terbaik (br, bc)
    for (let i = 0; i < pts.length; i += 2) t[br + pts[i]][bc + pts[i + 1]] = 1;
    // kalau ada baris/lajur penuh (bl > 0), kosongkan (macam game betul)
    if (bl) {
      // fr = baris penuh, fc = lajur penuh
      const fr = [], fc = [];
      // cari semuanya
      for (let i = 0; i < N; i++) {
        if (t[i].every(Boolean)) fr.push(i);  // baris i penuh? simpan nombor baris dalam fr
        if (t.every((row) => row[i])) fc.push(i);  // lajur i penuh? simpan nombor lajur dalam fc
      } // tutup for
      // .fill(0) = isi satu baris dengan 0 semua (kosongkan)
      fr.forEach((i) => t[i].fill(0));
      // kosongkan lajur i dalam setiap baris
      fc.forEach((i) => t.forEach((row) => { row[i] = 0; }));
    } // tutup if bl
    // pulangkan hasil: skor, bilangan letupan, dan papan baru
    return { score: bestScore, lines: bl, grid: t };
  } // tutup simBestPlace

  // Boleh ke ketiga-tiga blok diletak (cuba semua 6 susunan)? Berapa besar letupan dia?
  // simRateSet(g, shapes): beri markah untuk satu set 3 blok. Cuba semua susunan giliran dan pilih yang terbaik.
  function simRateSet(g, shapes) {
    // 6 susunan giliran yang mungkin (3 x 2 x 1 = 6). Contoh [1,0,2] = letak blok ke-2, lepas tu ke-1, lepas tu ke-3.
    const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    // best = hasil terbaik setakat ini (null = belum ada)
    let best = null;
    // "for...of" = ulang setiap item dalam senarai (o = satu susunan)
    for (const o of orders) {
      // cur = papan semasa simulasi. placed = berapa blok berjaya diletak. lines/boom/clears = statistik letupan.
      let cur = g, placed = 0, lines = 0, boom = 0, clears = 0;
      // letak setiap blok ikut susunan o (k = nombor blok)
      for (const k of o) {
        // cari tempat terbaik untuk blok k atas papan semasa
        const b = simBestPlace(cur, shapes[k]);
        // tak muat langsung = berhenti simulasi susunan ni
        if (!b) break;
        // kemas kini: papan baru, bilangan blok, jumlah baris, "boom" (baris kuasa dua = ganjaran letupan besar)
        cur = b.grid; placed++; lines += b.lines; boom += b.lines * b.lines;
        // kalau langkah ni meletup, tambah kiraan clears
        if (b.lines) clears++;
      } // tutup for blok
      // Baris/lajur yang dah 6-7 penuh = umpan untuk letupan besar pusingan depan
      // setup = bilangan baris/lajur hampir penuh yang tinggal
      let setup = 0;
      // semak semua baris dan lajur
      for (let i = 0; i < N; i++) {
        // rn = kotak penuh dalam baris i, cn = kotak penuh dalam lajur i
        const rn = cur[i].filter(Boolean).length, cn = cur.filter((row) => row[i]).length;
        // kalau 6 atau lebih penuh, kira sebagai "hampir penuh"
        if (rn >= 6) setup++;
        if (cn >= 6) setup++;  // lajur hampir penuh pun dikira
      } // tutup for
      // r = ringkasan susunan ni
      const r = { placed, lines, boom, setup, clears };
      // Tukar "best" kalau: belum ada, ATAU lebih banyak blok diletak, ATAU sama banyak tapi gabungan (clears, boom, setup) lebih tinggi.
      if (!best || placed > best.placed || (placed === best.placed && clears * 30 + boom * 10 + setup > best.clears * 30 + best.boom * 10 + best.setup)) best = r;
    } // tutup for susunan
    // pulangkan yang terbaik
    return best;
  } // tutup simRateSet
  // SIM-END

  // newTray(): pilih 3 blok baru untuk tray. Cuba banyak set calon, pilih yang paling membantu pemain.
  function newTray() {
    // tahap bantuan (0 papan lapang, 1 papan sesak)
    const help = helpLevel();
    // Cari bentuk yang boleh letupkan baris SEKARANG (penutup lubang). Makin banyak baris, makin diutamakan.
    // clearers = senarai bentuk "penutup lubang"
    const clearers = [];
    // cuba semua 37 bentuk
    SHAPES.forEach((sh) => {
      // cari tempat terbaik bentuk ni atas papan sebenar
      const b = simBestPlace(grid, sh);
      // kalau muat DAN meletup sekurang-kurangnya 1 baris: simpan, dengan "berat" = baris kuasa tiga (letup 2 baris jauh lebih dipilih)
      if (b && b.lines > 0) clearers.push({ sh, w: b.lines * b.lines * b.lines });
    }); // tutup forEach
    // Kalau ada bentuk yang boleh letup 2+ baris serentak, bagi yang tu je
    // maxW = berat paling tinggi. "...clearers.map(...)" = spread: keluarkan setiap item senarai jadi hujah berasingan untuk Math.max.
    const maxW = Math.max(0, ...clearers.map((c) => c.w));
    // pool = kumpulan pilihan. Kalau ada yang letup 2+ baris (berat >= 8), tapis hanya itu; kalau tak, semua penutup.
    const pool = maxW >= 8 ? clearers.filter((c) => c.w >= 8) : clearers;
    // pickClearer(): cabut satu bentuk dari pool, bentuk berat tinggi lagi kerap kena
    const pickClearer = () => {
      // x = nombor rawak dalam julat jumlah berat
      let x = Math.random() * pool.reduce((a, c) => a + c.w, 0);
      // tolak berat satu-satu; berhenti bila x <= 0 dan pulang bentuk tu
      for (const c of pool) if ((x -= c.w) <= 0) return c.sh;
      // jaga-jaga (ralat bundar): pulang item terakhir
      return pool[pool.length - 1].sh;
    }; // tutup pickClearer
    // 6 set calon bila papan lapang, sampai 12 bila sesak
    // want = berapa set calon nak cuba (6 hingga 12)
    const want = 6 + Math.round(help * 6);
    // candidates = senarai set calon
    const candidates = [];
    // cuba sehingga 60 kali, berhenti bila dah cukup calon. (t = nombor percubaan)
    for (let t = 0; t < 60 && candidates.length < want; t++) {
      // set = 3 blok rawak
      const set = [randomPiece(help), randomPiece(help), randomPiece(help)];
      // Dalam 2 daripada 3 percubaan (t % 3 !== 2), tukar satu blok rawak (indeks 0-2) kepada bentuk penutup lubang
      if (pool.length && t % 3 !== 2) set[Math.floor(Math.random() * 3)].shape = pickClearer();
      // .some(fungsi) = benar kalau SEKURANG-KURANGNYA satu item lulus. Set mesti ada satu blok yang muat. Kalau ya, jadikan calon.
      if (set.some((p) => canFitAnywhere(p.shape))) candidates.push(set);
    } // tutup for percubaan
    // Kalau tak ada calon langsung, bagi satu set rawak
    if (!candidates.length) candidates.push([randomPiece(help), randomPiece(help), randomPiece(help)]);
    // best = set terbaik, bestScore = skor terbaik
    let best = null, bestScore = -1;
    // beri markah setiap calon
    for (const set of candidates) {
      // simRateSet: simulasi 6 susunan. set.map(fungsi) = ambil bentuk sahaja.
      const r = simRateSet(grid, set.map((p) => p.shape));
      // Utama: semua muat. Lepas tu: banyak langkah yang letup (combo), letupan besar, susun baris untuk depan. Sikit random.
      // Formula markah: blok muat (x1000) paling penting, lepas tu clears, boom, setup, dan sedikit rawak supaya tak membosankan.
      const score = r.placed * 1000 + r.clears * 220 + r.boom * 80 + r.setup * 30 + Math.random() * 25;
      // kalau lebih tinggi dari yang terbaik, ingat set ni
      if (score > bestScore) { bestScore = score; best = set; }
    } // tutup for calon
    // letak set terpilih sebagai tray sebenar
    tray = best;
  } // tutup newTray

  // pieceEl(p, cls): bina elemen HTML untuk satu blok (grid kecil berisi kotak). cls = nama kelas CSS (lalai 'piece').
  function pieceEl(p, cls = 'piece') {
    // bekas <div> utama
    const el = document.createElement('div');
    // letak nama kelas
    el.className = cls;
    // tetapkan bilangan lajur grid ikut lebar bentuk: contoh "repeat(3, auto)" = 3 lajur sama lebar
    el.style.gridTemplateColumns = `repeat(${p.shape[0].length}, auto)`;
    // untuk setiap baris, untuk setiap nilai v (1 atau 0) dalam bentuk:
    p.shape.forEach((row) => row.forEach((v) => {
      // satu kotak kecil
      const b = document.createElement('div');
      // kalau v = 1: kelas 'blk c2' (kotak berwarna); kalau 0: 'empty' (ruang kosong tak nampak)
      b.className = v ? 'blk c' + p.color : 'empty';
      // kotak berwarna dapat kedudukan tekstur rawak
      if (v) b.style.setProperty('--bp', randBP());
      // masukkan kotak dalam bekas
      el.appendChild(b);
    })); // tutup 2 forEach
    // pulangkan elemen siap
    return el;
  } // tutup pieceEl

  // renderTray(): lukis 3 blok dalam tray bawah papan
  function renderTray() {
    // kosongkan tray dulu
    trayEl.innerHTML = '';
    // untuk setiap slot (p = blok atau null, i = nombor 0-2)
    tray.forEach((p, i) => {
      // slot = ruang untuk satu blok
      const slot = document.createElement('div');
      slot.className = 'slot';  // letak kelas CSS 'slot'
      // simpan nombor slot dalam atribut data-i (nanti dibaca balik masa tarik)
      slot.dataset.i = i;
      // kalau blok masih ada (belum diletak):
      if (p) {
        // letak gambar blok dalam slot
        slot.appendChild(pieceEl(p));
        // kalau tak muat mana-mana, tambah kelas 'nofit' (CSS jadikan kelabu)
        if (!canFitAnywhere(p.shape)) slot.classList.add('nofit');
        // dengar sentuhan/klik: bila jari mula tekan (pointerdown), panggil startDrag
        slot.addEventListener('pointerdown', startDrag);
      } // tutup if p
      // letak slot dalam tray
      trayEl.appendChild(slot);
    }); // tutup forEach
  } // tutup renderTray

  // ---------- drag & drop ----------
  // drag = maklumat tentang blok yang sedang ditarik (null = tak tarik apa-apa)
  let drag = null;

  // metrics(): ukur saiz dan kedudukan papan atas skrin (dalam piksel)
  function metrics() {
    // getBoundingClientRect() = kedudukan & saiz sebenar elemen atas skrin. a = petak pertama, b = petak sebelahnya.
    const a = cells[0][0].getBoundingClientRect();
    const b = cells[0][1].getBoundingClientRect();  // b = petak sebelah kanan petak pertama (untuk kira jarak antara petak)
    // cell = lebar satu petak, pitch = jarak dari satu petak ke petak sebelah (termasuk celah), x0/y0 = sudut atas-kiri papan
    return { cell: a.width, pitch: b.left - a.left, x0: a.left, y0: a.top };
  } // tutup metrics

  // reduceMotion = pengguna minta kurangkan animasi (tetapan aksesibiliti). "a && b" = guna b hanya kalau a ada. matchMedia(...).matches = benar/palsu.
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // PICKUP_MS = berapa lama animasi "angkat" (140ms), atau 0 kalau kurangkan animasi
  const PICKUP_MS = reduceMotion ? 0 : 140;
  // ease(t): lengkung kelajuan. t dari 0 ke 1; hasil laju di mula, perlahan di hujung ("ease-out cubic").
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // startDrag(e): dipanggil bila jari mula tekan blok. "e" = objek event (maklumat tentang tekanan tu).
  function startDrag(e) {
    // kalau tengah animasi (busy) atau dah ada blok ditarik, abaikan
    if (busy || drag) return;
    // e.currentTarget = elemen yang pasang listener (slot)
    const slot = e.currentTarget;
    // kalau blok ni tengah terbang balik ke tray, siapkan animasi tu terus dulu
    if (slot._finishReturn) slot._finishReturn(); // tengah terbang balik? siapkan terus
    // kalau slot ni dah ditarik, keluar
    if (slot.classList.contains('dragging')) return;
    // "+" depan teks = tukar jadi nombor. i = nombor slot (0-2).
    const i = +slot.dataset.i;
    // p = blok dalam slot tu
    const p = tray[i];
    // tiada blok (dah diletak) = keluar
    if (!p) return;
    // elak browser buat benda lalai (scroll, pilih teks) masa tarik
    e.preventDefault();
    // ukur papan sekarang
    const m = metrics();
    // kedudukan dan saiz blok dalam tray (titik mula animasi angkat)
    const src = slot.querySelector('.piece').getBoundingClientRect();
    // blok terapung = salinan blok yang bergerak mengikut jari
    const fl = document.createElement('div');
    fl.className = 'floating';  // kelas CSS 'floating' (kedudukan tetap atas skrin)
    // dalam bekas terapung, letak gambar blok yang sama
    const inner = pieceEl(p);
    // saiz kotak dalam blok terapung = saiz petak papan (supaya nampak sama saiz bila atas papan)
    inner.style.setProperty('--cell', m.cell + 'px');
    // celah antara kotak = jarak petak tolak lebar petak
    inner.style.gap = (m.pitch - m.cell) + 'px';
    // masukkan dalam bekas terapung, lepas tu dalam <body> supaya boleh gerak bebas atas skrin
    fl.appendChild(inner);
    document.body.appendChild(fl);  // letak blok terapung dalam <body>
    // w,h = lebar dan tinggi blok dalam piksel
    const w = p.shape[0].length * m.pitch, h = p.shape.length * m.pitch;
    // Kat phone, angkat blok atas jari supaya nampak
    // lift = berapa jauh blok diangkat atas jari. Kalau sentuhan (touch) angkat lebih tinggi supaya jari tak tutup; kalau tetikus, separuh tinggi je.
    const lift = e.pointerType === 'touch' ? h / 2 + m.cell * 1.6 : h / 2;
    // Simpan semua maklumat tarikan dalam satu objek
    drag = {
      // i = nombor slot, p = blok, fl = elemen terapung, w/h = saiz, lift = tinggi angkat, slot = slot asal, m = ukuran papan,
      // pos = kedudukan petak semasa (null = tak sah), pid = ID jari (untuk pastikan ikut jari yang sama)
      i, p, fl, w, h, lift, slot, m, pos: null, pid: e.pointerId,
      // fx, fy = kedudukan jari; t0 = masa mula tarik
      fx: e.clientX, fy: e.clientY, t0: performance.now(),
      // sx, sy = titik tengah blok dalam tray (titik mula)
      sx: src.left + src.width / 2, sy: src.top + src.height / 2,
      // k = nisbah saiz blok kecil di tray berbanding saiz sebenar (mula kecil, membesar), raf = ID animasi frame
      k: src.width / w, raf: 0,
    }; // tutup objek drag
    // tandakan slot supaya blok asal disembunyikan (CSS)
    slot.classList.add('dragging');
    // dengar jari bergerak, diangkat, atau dibatalkan, di seluruh tetingkap
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);  // bila jari diangkat, panggil endDrag
    window.addEventListener('pointercancel', endDrag);  // bila tarikan dibatalkan sistem, panggil endDrag juga
    // lukis frame pertama terus
    frame();
  } // tutup startDrag

  // clearPreview(): buang bayang blok dan serlahan baris dari papan
  function clearPreview() {
    // semua 64 petak
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const el = cells[r][c];  // ambil elemen petak baris r, lajur c
      // kalau petak ni bayang ("ghost"), reset kepada petak biasa
      if (el.classList.contains('ghost')) el.className = 'cell';
      // buang serlahan "akan meletup"
      el.classList.remove('willclear');
    } // tutup for
  } // tutup clearPreview

  // moveDrag(e): dipanggil setiap kali jari bergerak
  function moveDrag(e) {
    // abaikan kalau tak tarik, atau jari lain (bukan yang tarik blok)
    if (!drag || e.pointerId !== drag.pid) return;
    // simpan kedudukan jari terkini
    drag.fx = e.clientX; drag.fy = e.clientY;
    // minta browser panggil frame() pada frame skrin seterusnya (kalau belum diminta). Elak kerja berlebihan.
    if (!drag.raf) drag.raf = requestAnimationFrame(frame);
  } // tutup moveDrag

  // Satu kemas kini setiap frame skrin, bukan setiap kali jari bergerak
  // frame(): kemas kini kedudukan blok terapung (jalan sekali setiap frame skrin, kira-kira 60 kali sesaat)
  function frame() {
    // tak tarik apa-apa = keluar
    if (!drag) return;
    // reset ID frame (dah dijalankan)
    drag.raf = 0;
    // t = kemajuan animasi angkat, 0 hingga 1. Min(1, ...) hadkan pada 1.
    const t = PICKUP_MS ? Math.min(1, (performance.now() - drag.t0) / PICKUP_MS) : 1;
    // e = t selepas lengkung kelajuan
    const e = ease(t);
    // Titik sasaran: tengah blok, atas jari
    // tx, ty = titik sasaran: tengah blok betul-betul atas jari (ditolak "lift")
    const tx = drag.fx, ty = drag.fy - drag.lift + drag.h / 2;
    // cx, cy = kedudukan semasa antara titik mula (tray) dan sasaran (jari): mula + (sasaran - mula) * e
    const cx = drag.sx + (tx - drag.sx) * e, cy = drag.sy + (ty - drag.sy) * e;
    // sc = skala semasa: dari k (kecil) ke 1 (saiz penuh)
    const sc = drag.k + (1 - drag.k) * e;
    // letak blok: translate3d = alih ikut x,y; scale = besarkan. Template literal `...${}...` sisip nilai. translate3d guna GPU (lebih licin).
    drag.fl.style.transform = `translate3d(${cx - drag.w / 2}px, ${cy - drag.h / 2}px, 0) scale(${sc})`;
    // kalau animasi belum habis, minta frame seterusnya
    if (t < 1) drag.raf = requestAnimationFrame(frame);
    // kemas kini bayang atas papan (hujah = sudut atas-kiri blok)
    updatePreview(tx - drag.w / 2, ty - drag.h / 2);
  } // tutup frame

  // updatePreview(x, y): tunjuk bayang di petak yang paling dekat dengan kedudukan blok (x, y)
  function updatePreview(x, y) {
    // ambil ukuran papan dari drag.m. Destructuring objek: { pitch, x0, y0 } = ambil 3 sifat sekali gus.
    const { pitch, x0, y0 } = drag.m;
    // fc, fr = lajur dan baris dalam bentuk pecahan (contoh 3.4). Tolak x0/y0 dan bahagi jarak petak.
    const fc = (x - x0) / pitch, fr = (y - y0) / pitch;
    // "Melekat": selagi blok tak lari jauh dari petak sekarang, kekal kat situ.
    // Elak bayang melompat-lompat bila blok tepat di tengah antara dua petak.
    // cur = kedudukan bayang sekarang
    const cur = drag.pos;
    // Kalau ada kedudukan sekarang dan blok belum lari 0.75 petak darinya (Math.abs = nilai mutlak, abaikan tanda), kekal. "return" = keluar fungsi.
    if (cur && Math.abs(fc - cur[1]) < 0.75 && Math.abs(fr - cur[0]) < 0.75) return;
    // bundarkan ke petak terdekat
    const c0 = Math.round(fc), r0 = Math.round(fr);
    // pos = [baris, lajur] kalau muat, kalau tak null
    const pos = fits(drag.p.shape, r0, c0) ? [r0, c0] : null;
    // kalau kedudukan tak berubah, tak payah buat apa-apa. String(...) tukar senarai jadi teks supaya boleh dibanding.
    if (String(pos) === String(drag.pos)) return;
    // simpan kedudukan lama dan masanya (untuk kesan "jari tergelincir" masa lepas)
    if (drag.pos) { drag.prevPos = drag.pos; drag.changedAt = performance.now(); }
    // kedudukan baru
    drag.pos = pos;
    // buang bayang lama
    clearPreview();
    // kalau tak muat, tak ada bayang untuk dilukis
    if (!pos) return;
    // lukis bayang: untuk setiap kotak bentuk yang ada (v = 1), tukar kelas petak papan jadi 'cell ghost cN'
    drag.p.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) cells[r0 + r][c0 + c].className = `cell ghost c${drag.p.color}`;  // kalau kotak ni ada, tukar kelas petak jadi bayang (ghost) warna blok
    })); // tutup 2 forEach
    // baris/lajur yang akan penuh kalau letak kat sini
    const { rows, cols } = linesIfPlaced(drag.p.shape, r0, c0);
    // serlahkan baris tu: untuk setiap baris r, setiap petak (el) dapat kelas 'willclear'
    rows.forEach((r) => cells[r].forEach((el) => el.classList.add('willclear')));
    // serlahkan lajur c: untuk setiap baris, petak pada lajur c
    cols.forEach((c) => cells.forEach((row) => row[c].classList.add('willclear')));
  } // tutup updatePreview

  // endDrag(e): dipanggil bila jari diangkat atau tarikan dibatalkan
  function endDrag(e) {
    // abaikan kalau bukan tarikan semasa atau jari lain
    if (!drag || e.pointerId !== drag.pid) return;
    // berhenti dengar pergerakan (bersihkan listener supaya tak berganda)
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);  // buang listener pointerup
    window.removeEventListener('pointercancel', endDrag);  // buang listener pointercancel
    // batalkan frame yang dah diminta tapi belum jalan
    if (drag.raf) cancelAnimationFrame(drag.raf);
    // buang bayang
    clearPreview();
    // d = salin rujukan maklumat tarikan, lepas tu kosongkan "drag" (tarikan dah selesai)
    const d = drag;
    drag = null;  // kosongkan drag: tak ada blok sedang ditarik
    // Jari tergelincir masa diangkat? Kalau bayang baru berubah <100ms sebelum lepas,
    // guna tempat sebelum tu (yang kau nampak lebih lama).
    // Hanya untuk gelincir kecil (petak sebelah), bukan bila sengaja tarik keluar untuk batal.
    // Syarat: ada kedudukan sekarang DAN kedudukan lama, berubah kurang 100ms lalu, dan beza tepat 1 petak (jarak baris + jarak lajur = 1). Kalau ya, guna kedudukan lama.
    if (d.pos && d.prevPos && performance.now() - d.changedAt < 100 &&
        Math.abs(d.pos[0] - d.prevPos[0]) + Math.abs(d.pos[1] - d.prevPos[1]) === 1) d.pos = d.prevPos;  // sambungan syarat di atas: jumlah beza baris + lajur = 1 petak. Kalau semua benar, guna kedudukan lama
    // Kalau ada kedudukan sah DAN jari memang diangkat (bukan dibatalkan sistem):
    if (d.pos && e.type === 'pointerup') {
      // buang blok terapung
      d.fl.remove();
      // tunjuk balik slot (walaupun blok akan hilang sebab dah diletak)
      d.slot.classList.remove('dragging');
      // letak blok atas papan
      place(d.i, d.p, d.pos[0], d.pos[1]);
      // siap, keluar
      return;
    } // tutup if letak
    // Tak muat: blok terbang balik ke tray
    // timer = ID setTimeout (0 = belum ada)
    let timer = 0;
    // done(): selesai animasi balik, bersihkan semuanya
    const done = () => {
      // batalkan timer (kalau done dipanggil awal)
      clearTimeout(timer);
      // buang penanda "tengah balik"
      d.slot._finishReturn = null;
      // buang blok terapung dan tunjuk balik blok dalam slot
      d.fl.remove();
      d.slot.classList.remove('dragging');  // tunjuk balik blok dalam slot
    }; // tutup done
    // kalau kurangkan animasi, tak payah animasi balik, terus selesai
    if (reduceMotion) return done();
    // simpan done supaya startDrag boleh siapkan terus kalau pemain tarik semula pantas
    d.slot._finishReturn = done;
    // animasi CSS: transform berubah dalam 0.18 saat dengan lengkung kelajuan cubic-bezier
    d.fl.style.transition = 'transform .18s cubic-bezier(.2,.8,.3,1)';
    // sasaran animasi: balik ke titik mula dalam tray, saiz asal (k)
    d.fl.style.transform = `translate3d(${d.sx - d.w / 2}px, ${d.sy - d.h / 2}px, 0) scale(${d.k})`;
    // selepas 190ms (animasi dah habis) panggil done
    timer = setTimeout(done, 190);
  } // tutup endDrag

  // ---------- main logic ----------
  // addScore(n): tambah n markah dan kemas kini paparan
  function addScore(n) {
    // "+=" = tambah ke nilai sedia ada: score = score + n
    score += n;
    // letak nombor dalam elemen HTML skor (textContent = teks dalam elemen)
    scoreEl.textContent = score;
    // Trik untuk mulakan semula animasi CSS: buang kelas, "void ...offsetWidth" paksa browser kira semula susun atur, lepas tu letak kelas balik.
    scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
    // kalau markah lepasi rekod: kemas kini "best", paparan dan simpan dalam browser
    if (score > best) { best = score; bestEl.textContent = best; store.set('blokboom-best', best); }
  } // tutup addScore

  // Serpihan + gegar papan
  // wrapEl = bekas papan (induk boardEl). .parentElement = elemen yang membungkus.
  const wrapEl = boardEl.parentElement;
  // boom(toClear, lines): letupan ringkas (versi tanpa GSAP, dipakai kalau GSAP tak dapat dimuat)
  function boom(toClear, lines) {
    // kalau pengguna minta kurangkan animasi, tak buat apa-apa
    if (reduceMotion) return;
    // per = bilangan serpihan setiap petak (3 kalau letup 3+ baris, kalau tak 2)
    const per = lines >= 3 ? 3 : 2;
    // toClear = Set (senarai tanpa pendua) nombor petak. k = nombor petak 0-63.
    toClear.forEach((k) => {
      // tukar nombor k jadi baris (k / 8 dibundar ke bawah) dan lajur (baki k % 8), lepas tu ambil elemen petak
      const el = cells[Math.floor(k / N)][k % N];
      // warna petak tu; "|| ..." kalau kosong (0), guna warna rawak 1-4
      const color = grid[Math.floor(k / N)][k % N] || 1 + Math.floor(Math.random() * COLORS);
      // buat 'per' serpihan setiap petak
      for (let i = 0; i < per; i++) {
        // serpihan = tag <span> kecil
        const sp = document.createElement('span');
        // kelas CSS: spark (animasi terbang) + blk + warna
        sp.className = 'spark blk c' + color;
        // ang = arah rawak (0 hingga 2*PI = bulatan penuh dalam radian). dist = jarak terbang rawak, lagi jauh bila banyak baris.
        const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * (40 + lines * 25);
        // mula dari tengah petak (offsetLeft/Top = kedudukan relatif bekas; + separuh lebar/tinggi = tengah)
        sp.style.left = el.offsetLeft + el.offsetWidth / 2 + 'px';
        sp.style.top = el.offsetTop + el.offsetHeight / 2 + 'px';  // kedudukan menegak: tengah petak
        // Cos dan Sin tukar arah (sudut) jadi jarak ke kanan (--dx) dan ke bawah (--dy). CSS animasi baca dua pemboleh ubah ni.
        sp.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        sp.style.setProperty('--dy', Math.sin(ang) * dist + 'px');  // sin(arah) * jarak = berapa jauh ke bawah (--dy)
        // putaran rawak -270° hingga +270°
        sp.style.setProperty('--rot', (Math.random() * 540 - 270) + 'deg');
        // letak dalam halaman supaya kelihatan
        wrapEl.appendChild(sp);
        // buang serpihan selepas 700ms (animasi dah habis)
        setTimeout(() => sp.remove(), 700);
      } // tutup for serpihan
    }); // tutup forEach petak
    // kalau letup 2+ baris, gegarkan papan guna kelas CSS
    if (lines >= 2) {
      // buang kelas gegar lama + paksa reset animasi (trik offsetWidth)
      boardEl.classList.remove('shake', 'shake-big'); void boardEl.offsetWidth;
      // letak kelas gegar: kuat kalau 3+ baris, sederhana kalau 2
      boardEl.classList.add(lines >= 3 ? 'shake-big' : 'shake');
    } // tutup if
  } // tutup boom

  // ===== Letupan GSAP: retak dulu, lepas tu pecah & jatuh (lain ikut tema) =====
  // rnd(a, b): nombor rawak antara a dan b (sama macam R dalam makeTexture)
  const rnd = (a, b) => a + Math.random() * (b - a);
  // fxLayer = lapisan penuh skrin untuk semua kesan letupan
  const fxLayer = document.createElement('div');
  fxLayer.className = 'fx';  // kelas CSS 'fx' (lapisan penuh skrin)
  document.body.appendChild(fxLayer);  // letak dalam <body>

  // Corak pecah: garis retak + kepingan yang tepinya ikut garis retak tu (koordinat 0-100)
  // breakPattern(t): jana corak retak untuk satu petak ikut tema t. Pulang { cracks, shards }.
  // Koordinat 0-100 = peratus daripada petak. cracks = garis retak, shards = bentuk kepingan.
  function breakPattern(t) {
    // P(x, y) = buat satu titik [x, y]
    const P = (x, y) => [x, y];
    // Tema batu: retak bintang dari satu titik tengah ke 4 sisi
    if (t === 'batu') {
      // C = titik tengah retak (rawak berhampiran tengah)
      const C = P(rnd(38, 62), rnd(38, 62));
      // T, R, B, L = titik di sisi Atas, Kanan, Bawah, Kiri petak
      const T = P(rnd(30, 70), 0), R = P(100, rnd(30, 70)), B = P(rnd(30, 70), 100), L = P(0, rnd(30, 70));
      // mid(a, b) = titik tengah antara a dan b digoyangkan sikit (supaya retak bergerigi tak lurus)
      const mid = (a, b) => P((a[0] + b[0]) / 2 + rnd(-9, 9), (a[1] + b[1]) / 2 + rnd(-9, 9));
      // titik tengah bergoyang untuk setiap 4 garis
      const mT = mid(C, T), mR = mid(C, R), mB = mid(C, B), mL = mid(C, L);
      // pulangkan objek: cracks = 4 garis (setiap satu 3 titik), shards = 4 kepingan (poligon ikut garis retak tadi)
      return {
        cracks: [[C, mT, T], [C, mR, R], [C, mB, B], [C, mL, L]],  // 4 garis retak: tengah -> titik goyang -> sisi
        shards: [[P(0, 0), T, mT, C, mL, L], [T, P(100, 0), R, mR, C, mT], [C, mR, R, P(100, 100), B, mB], [L, mL, C, mB, B, P(0, 100)]],  // 4 kepingan: setiap satu poligon yang tepinya ikut garis retak
      }; // tutup objek pulangan
    } // tutup if batu
    // Tema kaca: retak bintang banyak segi tiga
    if (t === 'kaca') {
      // titik tengah retak
      const C = P(rnd(35, 65), rnd(35, 65));
      // ring = 6 titik keliling tepi petak (sudut dan titik rawak di sisi)
      const ring = [P(0, 0), P(rnd(30, 70), 0), P(100, rnd(15, 45)), P(100, 100), P(rnd(30, 70), 100), P(0, rnd(55, 85))];
      // setiap kepingan = segi tiga (tengah, titik ke-i, titik ke-(i+1)). "% ring.length" sambung titik terakhir ke titik pertama (lingkar).
      const shards = ring.map((p, i) => [C, p, ring[(i + 1) % ring.length]]);
      // inner = lingkaran kecil dalam (35% jarak dari tengah ke setiap titik tepi) untuk retak bulat dalam
      const inner = ring.map((p) => P(C[0] + (p[0] - C[0]) * 0.35, C[1] + (p[1] - C[1]) * 0.35));
      // cracks = garis jejari dari tengah ke setiap titik (ring.map...) + lingkaran dalam. concat = sambung 2 senarai.
      return { cracks: ring.map((p) => [C, p]).concat([inner.concat([inner[0]])]), shards };
    } // tutup if kaca
    // pokok: belah jadi 3 papan kayu, garis belah bergerigi
    // Tema pokok: 2 garis belah menegak, jadi 3 papan. a, b = kedudukan mendatar garis; j1, j2 = senget sikit (bergerigi)
    const a = rnd(28, 38), b = rnd(62, 72), j1 = rnd(-6, 6), j2 = rnd(-6, 6);
    // sa, sb = 4 titik setiap garis belah dari atas ke bawah
    const sa = [P(a, 0), P(a + j1, 35), P(a - j1, 65), P(a, 100)];
    const sb = [P(b, 0), P(b + j2, 40), P(b - j2, 70), P(b, 100)];  // garis belah kanan, 4 titik
    // pulangkan: 2 garis retak, 3 kepingan papan (kiri, tengah, kanan), dan 60% kebarangkalian ada daun
    return {
      cracks: [sa, sb],  // 2 garis retak
      // kiri = sudut atas-kiri + garis sa + sudut bawah-kiri. tengah = sa + sb dibalikkan (reverse). kanan = sb + sudut bawah-kanan + atas-kanan.
      shards: [[P(0, 0)].concat(sa, [P(0, 100)]), sa.concat(sb.slice().reverse()), sb.concat([P(100, 100), P(100, 0)])],
      leaves: Math.random() < 0.6,  // true kalau nombor rawak < 0.6 (60% peluang ada daun)
    }; // tutup objek pulangan
  } // tutup breakPattern

  // ===== Enjin kepingan: SEMUA kepingan, habuk & daun dilukis atas satu canvas =====
  // (dulu setiap kepingan satu elemen HTML — ratusan elemen, berat gila kat phone)
  // fxCanvas = satu canvas penuh skrin; semua kepingan dilukis di sini setiap frame
  const fxCanvas = document.createElement('canvas');
  fxCanvas.className = 'fxc';  // kelas CSS 'fxc'
  fxLayer.appendChild(fxCanvas);  // letak canvas dalam lapisan kesan
  // fx = "pen" untuk lukis atas canvas ni
  const fx = fxCanvas.getContext('2d');
  // fxDPR = nisbah piksel (1 = biasa), fxW/fxH = lebar dan tinggi canvas
  let fxDPR = 1, fxW = 0, fxH = 0;
  // sizeFx(): laraskan saiz canvas ikut saiz skrin
  function sizeFx() {
    fxDPR = 1; // kepingan bergerak laju — resolusi biasa cukup, 4x kurang piksel nak dilukis
    // innerWidth/innerHeight = saiz tetingkap browser
    fxW = innerWidth; fxH = innerHeight;
    // tetapkan saiz canvas (bundar ke nombor bulat)
    fxCanvas.width = Math.round(fxW * fxDPR); fxCanvas.height = Math.round(fxH * fxDPR);
  } // tutup sizeFx
  // jalankan sekali sekarang
  sizeFx();
  // dan setiap kali tetingkap bertukar saiz (contoh putar phone)
  addEventListener('resize', sizeFx);
  // parts = senarai semua zarah/kepingan yang sedang hidup
  const parts = [];
  // fxOn = adakah gelung lukis tengah jalan? fxLast = masa frame terakhir
  let fxOn = false, fxLast = 0;
  // spawn(p): tambah satu zarah ke dalam senarai dan mulakan gelung kalau belum jalan
  function spawn(p) {
    // kalau ni kepingan, potong dulu jadi gambar (lihat cutShard). "===" = sama tepat.
    if (p.draw === drawShard) cutShard(p);
    // tambah dalam senarai
    parts.push(p);
    // kalau gelung belum jalan: hidupkan, rekod masa, minta frame pertama
    if (!fxOn) { fxOn = true; fxLast = performance.now(); requestAnimationFrame(fxTick); }
  } // tutup spawn
  // fxTick(now): dipanggil setiap frame. Gerakkan dan lukis semua zarah. "now" = masa semasa (ms).
  function fxTick(now) {
    // dt = masa sejak frame lepas dalam saat (had 0 hingga 0.034 supaya tak "lompat" kalau browser tersangkut)
    const dt = Math.min(0.034, Math.max(0, (now - fxLast) / 1000));
    // ingat masa ni untuk frame seterusnya
    fxLast = now;
    // reset transformasi lukisan kepada biasa (skala fxDPR)
    fx.setTransform(fxDPR, 0, 0, fxDPR, 0, 0);
    // padam semua lukisan frame lepas
    fx.clearRect(0, 0, fxW, fxH);
    // Ulang dari BELAKANG ke depan (i-- dan bermula dari length-1) sebab kita buang item dari senarai dalam gelung. Buang dari belakang tak kacau indeks yang belum diproses.
    for (let i = parts.length - 1; i >= 0; i--) {
      // p = zarah ke-i
      const p = parts[i];
      // tambah masa umur zarah
      p.t += dt;
      // masa negatif = belum mula (ada kelewatan), langkau
      if (p.t < 0) continue; // belum mula (kelewatan)
      // Zarah mati kalau: umur melepasi jangka hayat ATAU jatuh keluar bawah skrin
      if (p.t >= p.life || p.y > fxH + 60) {
        // kembalikan canvas kecil ke "kolam" untuk digunakan semula
        if (p.spr) recycle(p.spr);
        // splice(i, 1) = buang 1 item pada indeks i dari senarai
        parts.splice(i, 1);
        // kalau ada fungsi onEnd (contoh retak -> pecah), jalankan
        if (p.onEnd) p.onEnd();
        // langkau ke zarah seterusnya
        continue;
      } // tutup if mati
      // graviti: kelajuan menegak (vy) bertambah ikut g * masa
      p.vy += p.g * dt;
      // geseran udara: kelajuan mendatar dikurangkan sedikit (kalau p.drag ada)
      if (p.drag) p.vx *= Math.max(0, 1 - p.drag * dt);
      // gerak: kedudukan += kelajuan * masa. putaran (rot) += kelajuan putaran (vr) * masa.
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      // lut sinar: hujung hayat (dalam "fade" saat terakhir) makin pudar, selain tu penuh (1)
      fx.globalAlpha = p.t > p.life - p.fade ? (p.life - p.t) / p.fade : 1;
      // lukis zarah guna fungsi lukis masing-masing (drawShard, drawSprite, drawCrack atau drawSpeck)
      p.draw(p);
    } // tutup for zarah
    // reset lut sinar penuh
    fx.globalAlpha = 1;
    // simpan bilangan zarah pada atribut data-n (untuk debug/ujian)
    fxCanvas.dataset.n = parts.length;
    // kalau masih ada zarah, minta frame seterusnya (gelung terus). Kalau tak, matikan gelung dan bersihkan canvas.
    if (parts.length) requestAnimationFrame(fxTick);
    else { fxOn = false; fx.clearRect(0, 0, fxW, fxH); }  // tiada zarah lagi: hentikan gelung dan bersihkan canvas
  } // tutup fxTick
  // Kepingan dipotong SEKALI masa pecah jadi gambar kecil; setiap frame cuma "cop" gambar tu (laju)
  // pool = kolam canvas kecil yang boleh digunakan semula (elak cipta canvas baru setiap kali)
  const pool = [];
  // getCanvas(w, h): ambil canvas dari kolam (pool.pop) atau cipta baru, lepas tu set saiz w x h
  const getCanvas = (w, h) => { const c = pool.pop() || document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // recycle(c): pulangkan canvas ke kolam (maksimum 400 supaya tak membazir memori)
  const recycle = (c) => { if (pool.length < 400) pool.push(c); };
  // cutShard(p): potong gambar petak ikut bentuk kepingan p, simpan sebagai canvas kecil dalam p.spr
  function cutShard(p) {
    // q = senarai rata titik poligon [x, y, x, y, ...] relatif pusat kepingan
    const q = p.poly;
    // cari kotak sempadan (x0,y0 = sudut kiri-atas, x1,y1 = kanan-bawah). Infinity = nombor tak terhingga (supaya min/max pertama pasti menang).
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // untuk setiap titik (loncat 2), kemas kini min dan max
    for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]); y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]); }
    // bundar ke bawah dan tolak 1 piksel margin
    x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1;
    // canvas kecil seluas kotak sempadan. Math.ceil = bundar ke atas.
    const c = getCanvas(Math.ceil(x1) + 1 - x0, Math.ceil(y1) + 1 - y0);
    // pen untuk canvas kecil ni
    const g = c.getContext('2d');
    // alih asal koordinat supaya kepingan muat tepat dalam canvas kecil
    g.translate(-x0, -y0);
    // lukis garis luar poligon: mula di titik pertama
    g.beginPath();
    g.moveTo(q[0], q[1]);  // pen mula di titik pertama poligon
    // sambung ke titik-titik lain
    for (let i = 2; i < q.length; i += 2) g.lineTo(q[i], q[i + 1]);
    // tutup poligon
    g.closePath();
    // simpan keadaan pen, lepas tu clip() = hadkan lukisan seterusnya DALAM bentuk poligon sahaja
    g.save();
    g.clip();  // hadkan lukisan seterusnya DALAM poligon sahaja
    // kalau ada gambar tekstur: lukis bahagian gambar (sx,sy,sw,sh) ke seluruh petak. Kalau tak, isi kelabu.
    if (p.img) g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.ox, -p.oy, p.w, p.h);
    else { g.fillStyle = '#888'; g.fillRect(-p.ox, -p.oy, p.w, p.h); }  // kalau tak ada gambar, isi kelabu
    // kalau ada tepi serong, lukis di atasnya
    if (p.bevel) g.drawImage(p.bevel, -p.ox, -p.oy, p.w, p.h);
    // lepaskan clip (pulihkan keadaan yang disimpan)
    g.restore();
    // lukis garis tepi kepingan
    g.strokeStyle = p.edge;
    g.lineWidth = 1;  // tebal garis tepi 1 piksel
    g.stroke();  // lukis garis tepi
    // simpan canvas siap (spr) dan offsetnya dalam zarah; buang img dan poly kerana tak diperlukan lagi
    p.spr = c; p.sx0 = x0; p.sy0 = y0;
    p.img = null; p.poly = null;  // kosongkan gambar dan poligon asal (dah tak perlu, jimat memori)
  } // tutup cutShard
  // drawShard(p): lukis satu kepingan (yang dah dipotong jadi gambar kecil) atas canvas
  function drawShard(p) {
    // setTransform(a, b, c, d, e, f) = matriks putaran + kedudukan. cos/sin(rot) putar kepingan; p.x, p.y = kedudukan.
    fx.setTransform(Math.cos(p.rot), Math.sin(p.rot), -Math.sin(p.rot), Math.cos(p.rot), p.x, p.y);
    // "cop" gambar kepingan (p.spr) di kedudukan offset (sx0, sy0) relatif pusat putaran
    fx.drawImage(p.spr, p.sx0, p.sy0);
    // reset transformasi kepada biasa supaya zarah lain tak terkesan
    fx.setTransform(1, 0, 0, 1, 0, 0);
  } // tutup drawShard
  // Retak: garis "merebak" + kilat putih atas petak, lepas tu petak pecah (onEnd)
  // drawCrack(p): lukis retak yang merebak di atas satu petak. Bila hayat tamat, onEnd akan panggil pecah.
  function drawCrack(p) {
    // u = kemajuan 0 hingga 1 (umur / jangka hayat)
    const u = p.t / p.life;
    // jx, jy = gegar kecil rawak supaya petak nampak bergetar
    const jx = rnd(-1.2, 1.2), jy = rnd(-1.2, 1.2); // gegar sikit
    // alih asal lukisan ke sudut petak (+ gegar)
    fx.setTransform(1, 0, 0, 1, p.x + jx, p.y + jy);
    // kilat putih: makin lama makin cerah (max 45%)
    fx.globalAlpha = 0.45 * u;
    // isi seluruh petak putih
    fx.fillStyle = '#fff';
    fx.fillRect(0, 0, p.w, p.h);  // isi seluruh petak (lebar p.w, tinggi p.h)
    // lut sinar penuh balik untuk garis retak
    fx.globalAlpha = 1;
    // warna dan tebal garis retak (ikut tema, dihantar dalam p)
    fx.strokeStyle = p.stroke;
    fx.lineWidth = p.lw;  // tebal garis retak
    // hujung garis bulat dan sambungan bulat (lebih cantik)
    fx.lineCap = 'round';
    fx.lineJoin = 'round';  // sambungan garis bulat
    // setiap garis retak (pts = titik, i = nombor garis)
    p.paths.forEach((pts, i) => {
      // setLineDash([panjang_dilukis, jarak_kosong]) = lukis sebahagian garis sahaja. Panjang bertambah ikut u, jadi retak nampak "merebak". 1e4 = 10000 (sangat besar = tak ada selang).
      fx.setLineDash([p.lens[i] * Math.min(1, u * 1.3), 1e4]);
      // lukis garis dari titik pertama ke seterusnya
      fx.beginPath();
      fx.moveTo(pts[0], pts[1]);  // mula di titik pertama garis retak
      for (let j = 2; j < pts.length; j += 2) fx.lineTo(pts[j], pts[j + 1]);  // sambung ke titik-titik lain (loncat 2: pasangan x, y)
      fx.stroke();  // lukis garis
    }); // tutup forEach garis
    // reset garis putus-putus dan transformasi
    fx.setLineDash([]);
    fx.setTransform(1, 0, 0, 1, 0, 0);  // reset transformasi
  } // tutup drawCrack
  // CRACK_STYLE: warna retak dan nisbah ketebalan (ikut lebar petak) untuk setiap tema
  const CRACK_STYLE = {
    batu: ['rgba(20,15,10,.85)', 0.05],  // retak batu: hitam kecoklatan, tebal 5% lebar petak
    kaca: ['rgba(255,255,255,.95)', 0.03],  // retak kaca: putih, nipis (3%)
    pokok: ['rgba(40,20,5,.85)', 0.04],  // retak kayu: coklat gelap (4%)
  }; // tutup CRACK_STYLE

  // drawSprite(p): lukis zarah gambar (habuk, kilauan, daun) dengan skala, putaran dan goyang
  function drawSprite(p) {
    // s = skala semasa. Kalau ada fungsi scaleAt, guna dia dengan umur 0-1; kalau tak, 1 (saiz biasa).
    const s = p.scaleAt ? p.scaleAt(p.t / p.life) : 1;
    // sw = goyang kiri kanan (gelombang sin) untuk daun. Kalau tak ada p.sway, 0.
    const sw = p.sway ? Math.sin(p.t * p.sway) : 0;
    // simpan keadaan pen supaya perubahan di bawah tak terbawa ke zarah lain
    fx.save();
    // alih asal ke kedudukan zarah (+ goyang). "p.swayAmp || 0" = kalau tak ada, guna 0.
    fx.translate(p.x + sw * (p.swayAmp || 0), p.y);
    // putar zarah (+ senget ikut goyang)
    fx.rotate(p.rot + sw * 0.9);
    // kalau ada kelegapan tambahan (p.alpha), darabkan. "*=" = darab dan simpan semula.
    if (p.alpha) fx.globalAlpha *= p.alpha;
    // lukis gambar di tengah-tengah titik asal, dengan saiz w*s x h*s
    fx.drawImage(p.img, -p.w * s / 2, -p.h * s / 2, p.w * s, p.h * s);
    // pulihkan keadaan pen
    fx.restore();
  } // tutup drawSprite
  // drawSpeck(p): lukis serbuk kecil segi empat (habuk kayu)
  function drawSpeck(p) { fx.fillStyle = p.fill; fx.fillRect(p.x, p.y, p.w, p.h); }
  // sprite(w, h, paint): cipta gambar kecil w x h dan lukis dengan fungsi paint (menerima pen g), pulangkan canvas.
  const sprite = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')); return c; };
  // SPR: 3 gambar kecil yang dilukis sekali dan digunakan berulang kali (dust = habuk, spark = kilauan, leaf = daun)
  const SPR = {
    // habuk: bulatan lembut kelabu cerah, tengah pekat, tepi hilang
    dust: sprite(64, 64, (g) => {
      // gradient bulat dari titik tengah (32,32) jejari 0 hingga 32
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      // 3 warna berhenti: tengah pekat, 40% separuh, tepi lutsinar
      gr.addColorStop(0, 'rgba(235,225,210,.85)'); gr.addColorStop(0.4, 'rgba(190,180,165,.45)'); gr.addColorStop(1, 'rgba(190,180,165,0)');
      // isi seluruh gambar
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }), // tutup dust
    // kilauan: bintang 4 mata putih bercahaya
    spark: sprite(32, 32, (g) => {
      // st = 8 titik sudut bentuk bintang
      const st = [[16, 1], [19, 13], [31, 16], [19, 19], [16, 31], [13, 19], [1, 16], [13, 13]];
      // cahaya biru muda (shadow) kuat 6 piksel, isi putih
      g.shadowColor = '#bff4ff'; g.shadowBlur = 6; g.fillStyle = '#fff';
      // lukis bintang: titik pertama moveTo, lain lineTo (cara sama macam dalam makeBevel), lepas tu fill
      g.beginPath(); st.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    }), // tutup spark
    // daun hijau
    leaf: sprite(24, 14, (g) => {
      // gradient hijau terang -> hijau gelap
      const gr = g.createLinearGradient(0, 0, 24, 14);
      gr.addColorStop(0, '#9be05a'); gr.addColorStop(1, '#3e8a2a');  // hijau muda di mula, hijau tua di hujung
      // elips (bentuk daun) diisi gradient
      g.fillStyle = gr; g.beginPath(); g.ellipse(12, 7, 11, 5.5, 0, 0, 7); g.fill();
      // garis urat daun di tengah
      g.strokeStyle = 'rgba(30,60,20,.5)'; g.beginPath(); g.moveTo(2, 7); g.lineTo(22, 7); g.stroke();
    }), // tutup leaf
  }; // tutup SPR

  // Satu petak pecah: kepingan ikut corak retak + habuk/kilauan ikut tema
  // spawnBreak: cipta semua kepingan + habuk bila satu petak pecah. t = tema, rect = kedudukan petak atas skrin, color = warna 1-4,
  // pat = corak dari breakPattern, lines = bilangan baris meletup, bp = kedudukan tekstur petak, dense = letupan besar? (kurangkan zarah kecil)
  function spawnBreak(t, rect, color, pat, lines, bp, dense) {
    // img = gambar tekstur siap untuk tema+warna ni. "a && a[b]" = kalau a ada, ambil a[b]; kalau tak, undefined (selamat).
    const img = BAKED[t] && BAKED[t][color];
    // bpv = kedudukan tekstur sebagai 2 nombor. split(' ') pecah teks "30% 40%" jadi 2 bahagian, map(parseFloat) tukar jadi nombor 30 dan 40.
    const bpv = (bp || '30% 40%').split(' ').map(parseFloat);
    // W = lebar petak, Hh = tinggi petak
    const W = rect.width, Hh = rect.height;
    // sx, sy, sw, sh = bahagian gambar tekstur yang dipotong (mula 0)
    let sx = 0, sy = 0, sw = 0, sh = 0;
    // kalau ada gambar:
    if (img) { // bahagian gambar yang sama dengan yang petak tu tunjuk (background-size 220%)
      // saiz bahagian = gambar / 2.2 (sebab CSS paparkan gambar pada 220% saiz)
      sw = img.width / 2.2; sh = img.height / 2.2;
      // kedudukan bermula dikira daripada peratus bp, supaya kepingan tunjuk tekstur yang SAMA dengan petak asal
      sx = img.width * 1.2 / 2.2 * bpv[0] / 100; sy = img.height * 1.2 / 2.2 * bpv[1] / 100;
    } // tutup if img
    // warna garis tepi kepingan ikut tema (ternary bersarang: kaca ? ... : batu ? ... : pokok)
    const edge = t === 'kaca' ? 'rgba(255,255,255,.75)' : t === 'batu' ? 'rgba(0,0,0,.35)' : 'rgba(50,25,8,.45)';
    // push = kuat tolakan, makin kuat bila banyak baris meletup
    const push = 1 + lines * 0.25;
    // untuk setiap kepingan (poly = senarai titik [x,y] dalam peratus):
    pat.shards.forEach((poly) => {
      // cxp, cyp = titik pusat kepingan (purata semua titik). reduce(fungsi, 0) tambah semua x, bahagi bilangan titik.
      const cxp = poly.reduce((a, p) => a + p[0], 0) / poly.length, cyp = poly.reduce((a, p) => a + p[1], 0) / poly.length;
      // ox, oy = pusat kepingan dalam piksel (peratus -> piksel: bahagi 100, darab lebar/tinggi)
      const ox = cxp / 100 * W, oy = cyp / 100 * Hh;
      // q = titik poligon relatif pusat (dalam piksel), senarai rata [x, y, x, y, ...]
      const q = [];
      poly.forEach((p) => q.push(p[0] / 100 * W - ox, p[1] / 100 * Hh - oy));  // tukar setiap titik dari peratus ke piksel, relatif pusat kepingan
      // dx, dy = arah kepingan dari tengah petak, -1 hingga +1 (kepingan hujung kanan terbang ke kanan, dll.)
      const dx = (cxp - 50) / 50, dy = (cyp - 50) / 50;
      // sh0 = objek zarah kepingan: kedudukan (x, y), putaran (rot), umur (t), poligon, gambar, tepi, dan fungsi lukis
      const sh0 = { x: rect.left + ox, y: rect.top + oy, rot: 0, t: 0, poly: q, img, bevel: BEVEL[t], sx, sy, sw, sh, ox, oy, w: W, h: Hh, edge, draw: drawShard, drag: 0 };
      // Fizik berbeza ikut tema. Object.assign(sasaran, sifat) = tambah sifat-sifat tu ke sasaran.
      // kaca: terpelanting laju ke luar, geseran udara 2.2, putar laju, hayat ~1 saat
      if (t === 'kaca') Object.assign(sh0, { vx: dx * rnd(200, 380) * push, vy: dy * rnd(200, 380) * push - 60, g: 1500, drag: 2.2, vr: rnd(-12, 12), life: rnd(0.95, 1.2), fade: 0.3 });
      // batu: perlahan dulu, terangkat sikit, lepas tu jatuh berat (graviti 1250), putar perlahan
      else if (t === 'batu') Object.assign(sh0, { vx: dx * rnd(50, 110) * push, vy: dy * rnd(40, 90) * push - rnd(110, 170), g: 1250, vr: rnd(-4.5, 4.5), life: rnd(1.1, 1.4), fade: 0.3 });
      // pokok: terangkat sedikit (vy negatif = ke atas) lepas tu jatuh, putar perlahan
      else Object.assign(sh0, { vx: dx * rnd(40, 90) * push + rnd(-20, 20), vy: -rnd(70, 130) * push, g: 1200, vr: rnd(-3, 3), life: rnd(1.1, 1.3), fade: 0.25 });
      // masukkan kepingan dalam enjin (spawn akan potong gambar dan mula animasi)
      spawn(sh0);
    }); // tutup forEach kepingan
    // cx, cy = titik tengah petak atas skrin (untuk habuk, kilauan, dll.)
    const cx = rect.left + W / 2, cy = rect.top + Hh / 2;
    // Habuk dan serpihan tambahan ikut tema:
    if (t === 'batu') {
      // awan habuk: membesar (scaleAt) dari 0.4 ke 2.4, hilang perlahan, naik sikit
      spawn({ x: cx, y: cy, vx: rnd(-20, 20), vy: rnd(-40, -15), g: 0, vr: 0, rot: 0, t: 0, life: rnd(0.7, 0.95), fade: 0.6, img: SPR.dust, w: 46, h: 46, alpha: 0.9, scaleAt: (u) => 0.4 + u * 2, draw: drawSprite });
      // batu kecil: 1 kalau letupan besar (dense), kalau tak 2
      for (let i = 0; i < (dense ? 1 : 2); i++) {
        // z = saiz batu kecil (4-7 piksel)
        const z = rnd(4, 7);
        // zarah kepingan kecil: poligon 4 sudut kecil, ambil tekstur dari bahagian rawak gambar
        spawn({ x: cx, y: cy, vx: rnd(-220, 220), vy: rnd(-280, -120), g: 1500, vr: rnd(-10, 10), rot: 0, t: 0, life: 1, fade: 0.3,
          poly: [-z / 2, -z / 2, z / 2, -z / 3, z / 2, z / 2, -z / 3, z / 2], img, sx: sx + rnd(0, sw * 0.6), sy: sy + rnd(0, sh * 0.6), sw: sw * 0.3, sh: sh * 0.3,  // bentuk batu kecil (4 sudut) + ambil bahagian rawak gambar tekstur
          ox: z / 2, oy: z / 2, w: z, h: z, edge, draw: drawShard });  // pusat, saiz, tepi dan fungsi lukis; tutup objek dan spawn
      } // tutup for batu kecil
    // Tema kaca: satu kilauan bintang
    } else if (t === 'kaca') {
      // Kalau bukan letupan besar, atau 50% peluang, cipta kilauan di tempat rawak dalam petak. scaleAt: membesar dalam 40% pertama umur, lepas tu mengecil.
      if (!dense || Math.random() < 0.5) spawn({ x: cx + rnd(-W / 2, W / 2), y: cy + rnd(-Hh / 2, Hh / 2), vx: 0, vy: 0, g: 0, vr: 6, rot: 0, t: 0, life: 0.45, fade: 0.1, img: SPR.spark, w: 18, h: 18,
        scaleAt: (u) => (u < 0.4 ? (u / 0.4) * 1.3 : ((1 - u) / 0.6) * 1.3), draw: drawSprite });  // fungsi skala: membesar 40% pertama umur, lepas tu mengecil. Tutup objek dan spawn
    // Tema pokok: habuk kayu dan daun
    } else {
      // 1 serbuk kalau letupan besar, kalau tak 3. Warna coklat muda, jatuh dengan geseran.
      for (let i = 0; i < (dense ? 1 : 3); i++) spawn({ x: cx + rnd(-8, 8), y: cy + rnd(-8, 8), vx: rnd(-160, 160), vy: rnd(-200, -60), g: 600, drag: 1.2, vr: 0, rot: 0, t: 0, life: rnd(0.9, 1.2), fade: 0.4, w: 4, h: 3, fill: '#d8b47a', draw: drawSpeck });
      // kalau corak ada daun (60%): satu daun jatuh melayang, goyang kiri kanan (sway)
      if (pat.leaves) spawn({ x: cx, y: cy, vx: 0, vy: rnd(90, 150), g: 0, vr: 0, rot: rnd(0, 3), t: 0, life: rnd(1.4, 1.8), fade: 0.4, img: SPR.leaf, w: 16, h: 9, sway: rnd(5, 7), swayAmp: rnd(18, 32), draw: drawSprite });
    } // tutup if/else tema
  } // tutup spawnBreak

  // shatter(...): letupan utama (versi GSAP). toClear = senarai petak, lines = bilangan baris, origin = tempat blok diletak, rows/cols = baris dan lajur penuh
  function shatter(toClear, lines, origin, rows, cols) {
    // tema sekarang
    const t = skin();
    // Pancaran cahaya sepanjang baris/lajur yang penuh, memancar dari tempat blok diletak
    // (wrapEl di sini adalah pemboleh ubah tempatan yang menyorok wrapEl luar; nilainya sama)
    const wrapEl = boardEl.parentElement;
    // beam(isRow, i): cipta satu pancaran untuk baris i (isRow = true) atau lajur i (isRow = false)
    const beam = (isRow, i) => {
      // a = petak pertama, z = petak terakhir dalam baris/lajur tu
      const a = isRow ? cells[i][0] : cells[0][i], z = isRow ? cells[i][N - 1] : cells[N - 1][i];
      // bm = elemen pancaran
      const bm = document.createElement('div');
      bm.className = 'beam';  // kelas CSS 'beam'
      // Object.assign(elemen.style, {...}) = tetapkan banyak sifat CSS sekali gus. Pancaran seluas satu baris/lajur (+3px setiap sisi). transformOrigin = titik tempat pancaran "membesar" bermula (dari tempat blok diletak).
      Object.assign(bm.style, {
        left: a.offsetLeft - 3 + 'px', top: a.offsetTop - 3 + 'px',  // kedudukan kiri dan atas pancaran (tolak 3px untuk margin)
        width: z.offsetLeft + z.offsetWidth - a.offsetLeft + 6 + 'px', height: z.offsetTop + z.offsetHeight - a.offsetTop + 6 + 'px',  // lebar dan tinggi: dari petak pertama sampai petak terakhir (tambah 6px)
        transformOrigin: isRow ? ((origin[1] + 0.5) / N * 100) + '% 50%' : '50% ' + ((origin[0] + 0.5) / N * 100) + '%',  // titik asal pembesaran: dari tempat blok diletak (peratus)
      }); // tutup Object.assign
      // letak dalam halaman
      wrapEl.appendChild(bm);
      // GSAP timeline = urutan animasi. onComplete = jalankan bila habis (buang pancaran).
      gsap.timeline({ onComplete: () => bm.remove() })
        // fromTo(sasaran, dari, ke): animasi dari keadaan A ke B. Baris membesar mendatar (scaleX 0 -> 1), lajur menegak (scaleY). "power3.out" = lengkung kelajuan.
        .fromTo(bm, isRow ? { scaleX: 0, opacity: 1 } : { scaleY: 0, opacity: 1 }, isRow ? { scaleX: 1, duration: 0.18, ease: 'power3.out' } : { scaleY: 1, duration: 0.18, ease: 'power3.out' })
        // to(sasaran, ke, masa_mula): lepas 0.2 saat, pancaran pudar (opacity ke 0) dalam 0.35 saat
        .to(bm, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.2);
    }; // tutup beam
    // cipta pancaran untuk setiap baris dan lajur penuh
    rows.forEach((r) => beam(true, r));
    cols.forEach((c) => beam(false, c));  // sama untuk setiap lajur penuh
    // Papan "terhentak" + gegar ikut saiz letupan
    // Papan mula sedikit besar (1.012 per baris) dan mengecut balik ke saiz asal dengan lantunan "elastic" (lepas 0.18 saat). clearProps = buang gaya sementara selepas habis.
    gsap.fromTo(boardEl, { scale: 1 + 0.012 * lines }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.35)', delay: 0.18, clearProps: 'transform' });
    // amp = kekuatan gegaran dalam piksel (lagi banyak baris, lagi kuat)
    const amp = lines >= 2 ? 3 + lines * 2.5 : 2.5;
    // Gegar bekas papan: "keyframes" = senarai kedudukan berturutan (kiri-bawah, kanan-atas, ... akhirnya 0,0 = kembali asal)
    gsap.to(wrapEl, {
      keyframes: [{ x: -amp, y: amp * 0.5 }, { x: amp, y: -amp * 0.5 }, { x: -amp * 0.6, y: -amp * 0.3 }, { x: amp * 0.35, y: amp * 0.2 }, { x: 0, y: 0 }],  // senarai kedudukan gegar berturutan, akhir kembali 0,0
      duration: 0.32 + lines * 0.04, delay: 0.18, ease: 'none', clearProps: 'transform',  // tempoh gegar: makin lama kalau banyak baris. Lepas 0.18 saat, tiada lengkung (ease: 'none')
    }); // tutup gsap.to gegar
    // Baca SEMUA kedudukan petak sekali gus dulu (kalau baca sambil ubah DOM, browser kira semula susun atur berkali-kali)
    // rects = Map (kamus: kunci -> nilai). Simpan kedudukan atas skrin setiap petak yang akan pecah.
    const rects = new Map();
    toClear.forEach((k) => rects.set(k, cells[Math.floor(k / N)][k % N].getBoundingClientRect()));  // simpan kedudukan petak k dalam Map rects
    // dense = letupan besar (lebih 16 petak)? Kalau ya, kurangkan zarah kecil supaya tak berat.
    const dense = toClear.size > 16;
    // Ambil warna dan nisbah ketebalan retak ikut tema. "const [a, b] = senarai" = destructuring senarai 2 item.
    const [stroke, lwRatio] = CRACK_STYLE[t];
    // untuk setiap petak yang pecah:
    toClear.forEach((k) => {
      // r, c = baris dan lajur; el = elemen petak
      const r = Math.floor(k / N), c = k % N, el = cells[r][c];
      // warna petak (kalau 0 guna 1)
      const color = grid[r][c] || 1;
      // corak pecah rawak untuk petak ni
      const pat = breakPattern(t);
      // rect = kedudukan petak; W, Hh = lebar dan tinggi
      const rect = rects.get(k), W = rect.width, Hh = rect.height;
      // kelewatan: petak jauh dari tempat blok diletak pecah lebih lambat (gelombang). Math.hypot = jarak lurus (Pythagoras). 0.05 = jeda "hit-stop" sebelum mula.
      const delay = 0.05 + Math.min(0.2, Math.hypot(r - origin[0], c - origin[1]) * 0.035); // 0.05 = "hit-stop"
      // tukar titik retak dari peratus ke piksel. flatMap(fungsi) = map + ratakan hasil jadi senarai rata [x, y, x, y...]
      const paths = pat.cracks.map((pts) => pts.flatMap((p) => [p[0] / 100 * W, p[1] / 100 * Hh]));
      // lens = panjang setiap garis retak (jumlah jarak antara titik) untuk animasi "merebak"
      const lens = paths.map((q) => { let L = 0; for (let j = 2; j < q.length; j += 2) L += Math.hypot(q[j] - q[j - 2], q[j + 1] - q[j - 1]); return L; });
      // kedudukan tekstur petak
      const bp = el.style.getPropertyValue('--bp');
      // spawn zarah "retak": mula selepas "delay" (t negatif = menunggu), hidup 0.14 saat. Bila habis (onEnd) petak pecah jadi kepingan.
      spawn({
        x: rect.left, y: rect.top, w: W, h: Hh, t: -delay, life: 0.14, fade: 0, vx: 0, vy: 0, g: 0, vr: 0, rot: 0,  // kedudukan = sudut petak, t negatif = tunggu, hayat 0.14 saat, tiada pergerakan (vx, vy, g, vr = 0)
        paths, lens, stroke, lw: Math.max(1.2, W * lwRatio), draw: drawCrack,  // data retak (garis, panjang, warna), tebal garis minimum 1.2px, dan fungsi lukis drawCrack
        // onEnd = fungsi yang dipanggil sebaik retak habis
        onEnd: () => {
          // sorok petak asal (kelas 'shattered') kecuali papan dah dikosongkan
          if (grid[r][c]) el.classList.add('shattered'); // kalau papan dah dikosongkan, jangan sorok petak
          // cipta kepingan dan habuk
          spawnBreak(t, rect, color, pat, lines, bp, dense);
        }, // tutup onEnd
      }); // tutup spawn retak
    }); // tutup forEach petak
  } // tutup shatter

  // ===== Tukar tema: petak flip gelombang dari tengah =====
  // bannerEl = tulisan "GEMPOUKK!" yang keluar bila tema bertukar
  const bannerEl = $('banner');
  // changeSkin(): animasi tukar ke tema seterusnya (dipanggil setiap 3 letupan berturut-turut)
  function changeSkin() {
    // tema seterusnya. "% SKINS.length" = selepas tema terakhir, patah balik ke tema pertama (0).
    const next = (skinIdx + 1) % SKINS.length;
    // letak teks banner
    bannerEl.textContent = 'GEMPOUKK!';
    // Kalau GSAP tak dimuat (!window.gsap) atau pengguna kurangkan animasi: tukar tema terus tanpa animasi
    if (!window.gsap || reduceMotion) {
      // buka kunci input
      busy = false;
      // tukar tema
      setSkin(next);
      // tunjuk tulisan popup biasa
      showPopup('GEMPOUKK!', 1.4);
      // siap
      return;
    } // tutup if tanpa GSAP
    // kunci input semasa animasi
    busy = true;
    // flat = ratakan papan 8x8 jadi satu senarai 64 petak (untuk dianimasi serentak)
    const flat = cells.flat();
    // stag = tetapan "stagger" GSAP: setiap petak mula lewat 0.025 saat dari yang sebelum, bermula dari tengah, ikut grid 8x8 = kesan gelombang
    const stag = { each: 0.025, from: 'center', grid: [N, N] };
    // tl = timeline (urutan animasi). Setiap .to / .add / .fromTo disambung berantai (chaining) dan dijalankan ikut turutan.
    const tl = gsap.timeline();
    // 1) semua petak diputar 90° pada paksi Y (rotateY) dan mengecil (scale 0.7) = "flip" tutup
    tl.to(flat, { rotateY: 90, scale: 0.7, duration: 0.2, ease: 'power2.in', stagger: stag })
      // serentak (masa 0) blok dalam tray mengecil jadi 0. '.slot .piece' = pemilih CSS.
      .to('.slot .piece', { scale: 0, duration: 0.2, ease: 'power2.in' }, 0)
      // .add(fungsi) = jalankan fungsi pada ketika ni dalam urutan. Di sini: tukar tema, bunyi, dan kilat putih.
      .add(() => {
        // tukar tema sebenar
        setSkin(next);
        // bunyi naik nada
        sndSkin();
        // kilat putih: opacity dari 0.55 ke 0 dalam 0.6 saat. (flashEl dicipta di bawah; sudah wujud masa fungsi ni dipanggil)
        gsap.fromTo(flashEl, { opacity: 0.55 }, { opacity: 0, duration: 0.6 });
      }) // tutup add tukar tema
      // 2) petak diputar balik ke 0° dan membesar semula dengan lantunan ("back.out")
      .to(flat, { rotateY: 0, scale: 1, duration: 0.4, ease: 'back.out(2.2)', stagger: stag })
      // blok tray membesar balik. '<' = mula serentak dengan animasi sebelumnya.
      .to('.slot .piece', { scale: 1, duration: 0.35, ease: 'back.out(3)' }, '<')
      // bila siap: buka kunci input dan buang gaya sementara GSAP daripada petak dan blok
      .add(() => { busy = false; gsap.set(flat, { clearProps: 'transform' }); gsap.set('.slot .piece', { clearProps: 'transform' }); })
      // Banner: bermula besar (2.6x) dan senget, mengecil dengan lantunan. Masa mula 0 = serentak dengan flip tadi. autoAlpha = opacity + visibility.
      .fromTo(bannerEl, { autoAlpha: 0, scale: 2.6, rotation: -14 }, { autoAlpha: 1, scale: 1, rotation: -4, duration: 0.35, ease: 'back.out(2.5)' }, 0)
      // banner bergoyang: ulang 3 kali (repeat), yoyo = berpatah balik ke asal setiap ulangan
      .to(bannerEl, { scale: 1.08, rotation: 3, duration: 0.12, repeat: 3, yoyo: true, ease: 'sine.inOut' })
      // pada saat ke-1.3, banner mengecil, naik 30px dan hilang
      .to(bannerEl, { autoAlpha: 0, scale: 0.6, y: -30, duration: 0.3, ease: 'power2.in' }, 1.3)
      // reset kedudukan dan putaran banner untuk kali seterusnya. .set = tetapkan terus tanpa animasi.
      .set(bannerEl, { y: 0, rotation: 0 });
  } // tutup changeSkin
  // flashEl = lapisan putih penuh skrin untuk kesan kilat
  const flashEl = document.createElement('div');
  flashEl.className = 'flash';  // kelas CSS 'flash'
  // letak dalam lapisan kesan
  fxLayer.appendChild(flashEl);

  // ===== Meter combo atas papan =====
  // comboEl = bekas meter, comboTxt = tulisan "Combo xN", comboDots = titik-titik peluang (<i>). querySelectorAll('i') = cari semua tag <i> dalam comboEl.
  const comboEl = $('comboBar'), comboTxt = $('comboTxt'), comboDots = comboEl.querySelectorAll('i');
  // updateCombo(bumped): kemas kini meter combo. bumped = true kalau combo baru je naik (untuk animasi lantun).
  function updateCombo(bumped) {
    // kalau combo 0: sorokkan meter (buang kelas 'on' dan 'last') dan keluar
    if (!combo) { comboEl.classList.remove('on', 'last'); return; }
    // ada combo: tunjuk meter
    comboEl.classList.add('on');
    // tulis teks, contoh "🔥 Combo x3"
    comboTxt.textContent = '🔥 Combo x' + combo;
    // left = peluang tinggal (2 tolak langkah terlepas)
    const left = COMBO_GRACE - miss;
    // setiap titik: classList.toggle('full', syarat) = tambah kelas 'full' kalau syarat benar, buang kalau palsu. Titik ke-i penuh kalau i < left.
    comboDots.forEach((d, i) => d.classList.toggle('full', i < left));
    // kalau tinggal 1 peluang, tambah kelas 'last' (titik jadi merah)
    comboEl.classList.toggle('last', left === 1);
    // animasi (hanya kalau GSAP ada dan animasi dibenarkan):
    if (window.gsap && !reduceMotion) {
      // baru naik: meter mula besar 1.5x dan lantun balik ke 1 ("elastic" = melantun macam getah)
      if (bumped) gsap.fromTo(comboEl, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.45)' });
      // peluang terakhir: bergoyang sikit dari kiri (x: -5 ke 0) sebagai amaran
      else if (left === 1) gsap.fromTo(comboEl, { x: -5 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    } // tutup if gsap
  } // tutup updateCombo

  // showPopup(text, size): tunjuk tulisan besar kat tengah papan (contoh "Combo x2 Mantap! +60")
  function showPopup(text, size = 1) {
    // letak saiz sebagai pemboleh ubah CSS --size (CSS darabkan dengan saiz asas)
    popupEl.style.setProperty('--size', size);
    // letak teks
    popupEl.textContent = text;
    // mulakan semula animasi CSS (trik sama macam addScore)
    popupEl.classList.remove('show'); void popupEl.offsetWidth; popupEl.classList.add('show');
  } // tutup showPopup

  // place(i, p, r0, c0): letak blok p (dari slot i) di baris r0, lajur c0. Ini fungsi paling penting: kira markah, letupan, combo.
  function place(i, p, r0, c0) {
    // cari baris dan lajur yang akan penuh (sebelum letak betul-betul)
    const { rows, cols } = linesIfPlaced(p.shape, r0, c0);
    // n = bilangan kotak yang diletak (untuk markah)
    let n = 0;
    // untuk setiap kotak dalam bentuk
    p.shape.forEach((row, r) => row.forEach((v, c) => {
      // langkau kotak kosong (return di dalam forEach = langkau pusingan ni sahaja)
      if (!v) return;
      // tulis warna blok dalam grid pada kedudukan sebenar, dan tambah kiraan
      grid[r0 + r][c0 + c] = p.color; n++;
    })); // tutup 2 forEach
    // slot dalam tray jadi kosong (null)
    tray[i] = null;
    // lukis semula papan dan tray
    render();
    renderTray(); // terus buang blok dari tray, jangan tunggu letupan habis
    // beri kelas 'placed' pada petak baru diletak (CSS animasi "pop kecil")
    p.shape.forEach((row, r) => row.forEach((v, c) => { if (v) cells[r0 + r][c0 + c].classList.add('placed'); }));
    // bunyi letak
    sndPlace();
    // 1 markah untuk setiap kotak diletak
    addScore(n);

    // lines = jumlah baris + lajur yang penuh
    const lines = rows.length + cols.length;
    // kalau ada yang penuh (lines bukan 0):
    if (lines) {
      // combo naik 1, langkah terlepas direset, kemas kini meter
      combo++;
      miss = 0;  // reset langkah terlepas kepada 0
      updateCombo(true);  // kemas kini meter, true = animasi lantun
      // 1 baris = 10, 2 = 30, 3 = 60 ... darab combo
      // pts = markah: 10 * lines * (lines+1) / 2 (nombor segi tiga: 1, 3, 6, 10...) * combo
      const pts = 10 * lines * (lines + 1) / 2 * combo;
      // toClear = Set petak yang akan dikosongkan. Set = senarai unik (petak yang jatuh pada baris DAN lajur tak dikira dua kali).
      const toClear = new Set();
      // untuk setiap baris penuh, tambah semua 8 petaknya. Nombor petak = baris * 8 + lajur.
      rows.forEach((r) => { for (let c = 0; c < N; c++) toClear.add(r * N + c); });
      // untuk setiap lajur penuh, tambah semua 8 petak
      cols.forEach((c) => { for (let r = 0; r < N; r++) toClear.add(r * N + c); });
      // Kalau GSAP ada dan animasi dibenarkan: letupan penuh. Hujah ke-3 = pusat bentuk blok (untuk gelombang).
      if (window.gsap && !reduceMotion) {
        shatter(toClear, lines, [r0 + (p.shape.length - 1) / 2, c0 + (p.shape[0].length - 1) / 2], rows, cols);  // mulakan letupan GSAP. Hujah ke-3 = pusat blok yang diletak
      // kalau tak, guna letupan ringkas CSS
      } else {
        toClear.forEach((k) => cells[Math.floor(k / N)][k % N].classList.add('clearing'));  // setiap petak yang akan hilang dapat kelas 'clearing' (animasi CSS)
        boom(toClear, lines);  // serpihan CSS ringkas
      } // tutup if/else gsap
      // bunyi pecah ikut tema
      sndBreak(lines);
      // tukar tema bila combo gandaan 3 (3, 6, 9...). "%" = baki bahagi; baki 0 = boleh dibahagi tepat.
      const switchSkin = combo % 3 === 0; // 3, 6, 9... letupan berturut-turut
      // words = ayat pujian ikut bilangan baris (indeks 0 kosong, 1 = "Bagus!", ...)
      const words = ['', 'Bagus!', 'Mantap!', 'Power!', 'Gila ah!', 'LEGEND!'];
      // popup: "Combo xN " (kalau combo > 1) + pujian (maksimum indeks 5) + markah. Saiz teks naik ikut baris dan combo, had 1.3.
      showPopup((combo > 1 ? `Combo x${combo}  ` : '') + (words[Math.min(lines, 5)]) + ` +${pts}`, Math.min(1.3, 0.9 + lines * 0.1 + combo * 0.05));
      // kunci input semasa letupan
      busy = true;
      // Selepas 450ms (animasi letupan siap), jalankan fungsi ni:
      setTimeout(() => {
        // kosongkan petak-petak yang meletup dalam data grid
        toClear.forEach((k) => { grid[Math.floor(k / N)][k % N] = 0; });
        // tambah markah letupan
        addScore(pts);
        // kalau SEMUA petak kosong (papan bersih): bonus 300. grid.every(baris => baris.every(v => !v)) = semua baris, semua nilai 0.
        if (grid.every((row) => row.every((v) => !v))) { addScore(300); showPopup('Papan bersih! +300 ✨'); }
        // buka kunci input
        busy = false;
        // lukis semula + sediakan blok baru + semak game over
        afterMove();
        // kalau patut tukar tema DAN game belum tamat (overEl.hidden = skrin game over tersembunyi):
        if (switchSkin && overEl.hidden) {
          // kunci semula, tunggu 450ms supaya tulisan combo habis, baru tukar tema
          busy = true; // tunggu tulisan combo habis dulu, baru tukar tema
          setTimeout(changeSkin, 450);  // panggil changeSkin selepas 450ms
        } // tutup if switchSkin
      }, 450); // tunggu semua petak habis retak & pecah
    // kalau tak meletup langsung:
    } else {
      // kalau tengah ada combo, tambah langkah terlepas. Kalau dah cukup 2, combo putus (reset 0).
      if (combo) {
        miss++;  // satu lagi langkah terlepas
        if (miss >= COMBO_GRACE) { combo = 0; miss = 0; }  // kalau terlepas cukup (2), combo putus
      } // tutup if combo
      // kemas kini meter
      updateCombo(false);
      // terus sediakan langkah seterusnya
      afterMove();
    } // tutup if/else lines
  } // tutup place

  // afterMove(): dipanggil lepas setiap langkah selesai
  function afterMove() {
    // lukis papan ikut data grid
    render();
    // kalau ketiga-tiga slot kosong (null), sediakan 3 blok baru. "tray.every(fungsi)" = semua lulus syarat.
    if (tray.every((p) => !p)) newTray();
    // lukis tray
    renderTray();
    // simpan permainan dalam browser supaya boleh sambung kemudian
    store.set('blokboom-save', { grid, tray, score, combo, miss });
    // kalau TIADA satu pun blok yang muat (tray.some = ada sekurang-kurangnya satu?), game over
    if (!tray.some((p) => p && canFitAnywhere(p.shape))) gameOver();
  } // tutup afterMove

  // gameOver(): tunjuk skrin kalah
  function gameOver() {
    // padam simpanan (game dah tamat)
    store.set('blokboom-save', null);
    // bunyi sedih
    sndOver();
    // tunggu 0.5 saat sebelum tunjuk skrin supaya pemain nampak papan sekejap
    setTimeout(() => {
      // tulis markah akhir
      $('final').textContent = score;
      // tunjuk "Rekod baru!" kalau markah > 0, sama atau lebih dari best, DAN lebih tinggi dari rekod sebelum game ni. "hidden = !(...)" = sorokkan kalau syarat palsu.
      $('newbest').hidden = !(score > 0 && score >= best && score > startBest);
      // tunjuk skrin game over
      overEl.hidden = false;
    }, 500); // tutup setTimeout
  } // tutup gameOver

  // startBest = rekod terbaik semasa game ni mula (untuk tahu kalau rekod dipecahkan)
  let startBest = 0;
  // newGame(): mulakan permainan baru
  function newGame() {
    // papan kosong: Array.from({length: N}, fungsi) cipta senarai 8 item, setiap item = baris baru 8 nilai 0 (Array(N).fill(0))
    grid = Array.from({ length: N }, () => Array(N).fill(0));
    // reset markah, combo dan langkah terlepas
    score = 0; combo = 0; miss = 0;
    // sorokkan meter combo
    updateCombo(false);
    // ingat rekod sekarang
    startBest = best;
    // paparan markah jadi 0
    scoreEl.textContent = 0;
    // sorokkan skrin game over dan dialog "Mula semula?"
    overEl.hidden = true;
    $('ask').hidden = true;  // sorokkan dialog 'Mula semula?'
    // sediakan 3 blok pertama, lukis papan dan tray
    newTray();
    render();  // lukis papan
    renderTray();  // lukis tray
    // padam simpanan lama
    store.set('blokboom-save', null);
  } // tutup newGame

  // ---------- mula ----------
  // Dari sini ke bawah = kod yang dijalankan SEKALI bila halaman dibuka (permulaan permainan).
  // baca rekod terbaik dari simpanan (lalai 0) dan papar
  best = store.get('blokboom-best', 0);
  bestEl.textContent = best;  // papar rekod terbaik
  // baca tetapan bunyi (lalai hidup) dan letak ikon: ternary 🔊 kalau hidup, 🔇 kalau mati
  soundOn = store.get('blokboom-sound', true);
  $('sound').textContent = soundOn ? '🔊' : '🔇';  // ikon bunyi: 🔊 kalau hidup, 🔇 kalau mati
  // bina papan HTML 8x8
  buildBoard();
  // baca tema terakhir yang disimpan. "| 0" menukar jadi nombor bulat. Math.max(0, ...) dan Math.min(... , 2) pastikan dalam julat 0-2.
  setSkin(Math.min(SKINS.length - 1, Math.max(0, store.get('blokboom-skin', 0) | 0)));

  // baca permainan yang disimpan kali lepas (null kalau tak ada)
  const saved = store.get('blokboom-save', null);
  // kalau ada simpanan sah (ada grid dan tray): sambung permainan tu
  if (saved && saved.grid && saved.tray) {
    // destructuring: ambil 4 nilai dari objek saved sekali gus ke pemboleh ubah sedia ada. Kurungan luar ( ) diperlukan supaya JavaScript tak keliru "{" dengan blok kod.
    ({ grid, tray, score, combo } = saved);
    // miss mungkin tak ada dalam simpanan lama: guna 0
    miss = saved.miss || 0;
    // kemas kini meter combo
    updateCombo(false);
    // tukar warna lama (7 warna) ke 4 warna baru. grid.map(baris => baris.map(fixColor)) = guna fixColor pada setiap nilai.
    grid = grid.map((row) => row.map(fixColor));
    // sama untuk tray. "{ ...p, color: ... }" = salin semua sifat p (spread) tapi tukar color. Kalau p null, kekal null.
    tray = tray.map((p) => (p ? { ...p, color: fixColor(p.color) } : p));
    // rekod permulaan = rekod semasa
    startBest = best;
    // paparkan markah
    scoreEl.textContent = score;
    // lukis papan dan tray
    render();
    renderTray();  // lukis tray
  // kalau tak ada simpanan: mula game baru
  } else {
    newGame();  // mula game baru
  } // tutup if saved

  // Pasang fungsi pada butang. "onclick = fungsi" = jalankan fungsi bila butang ditekan.
  // butang ↻: kalau tengah animasi, abaikan. Kalau markah 0, terus mula baru; kalau tak, tunjuk dialog pengesahan.
  $('restart').onclick = () => {
    if (busy) return;  // kalau tengah animasi, abaikan tekanan
    if (score === 0) newGame(); else $('ask').hidden = false;  // markah 0 = terus mula; kalau tak, tunjuk dialog pengesahan ($('ask').hidden = false)
  }; // tutup onclick restart
  // "Tak jadi": tutup dialog
  $('askNo').onclick = () => { $('ask').hidden = true; };
  // "Ya, mula": tutup dialog dan mula game baru
  $('askYes').onclick = () => { $('ask').hidden = true; newGame(); };
  // "Main lagi" (skrin game over): mula game baru. Di sini fungsi newGame dihantar terus tanpa () = "jalankan bila ditekan", bukan "jalankan sekarang".
  $('again').onclick = newGame;
  // butang bunyi: tukar hidup/mati
  $('sound').onclick = () => {
    // "!" = songsangkan: true jadi false, false jadi true
    soundOn = !soundOn;
    // simpan pilihan
    store.set('blokboom-sound', soundOn);
    // tukar ikon
    $('sound').textContent = soundOn ? '🔊' : '🔇';
  }; // tutup onclick sound
// Hujung IIFE: "})();" tutup fungsi yang dibuka di baris pertama dan terus jalankan dia.
})();
