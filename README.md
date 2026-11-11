# 💥 Blok Boom

Game puzzle blok 8×8. Tarik blok ke papan, isi penuh satu baris atau lajur, nanti dia meletup!

## Cara main
Buka `index.html` dalam browser (phone pun boleh).

- Dapat 3 blok setiap pusingan
- Isi penuh baris / lajur → meletup, dapat markah
- Letup berturut-turut → combo, markah berganda
- Papan bersih habis → bonus +300
- Tak ada blok yang muat → kalah

## Tema
Ada 3 tema, setiap satu dengan 4 warna sendiri dan cara pecah sendiri:

| Tema | Rupa | Cara pecah |
|---|---|---|
| 🪨 Batu | granit, batu pasir, batu loh, batu kapur | retak bergerigi, pecah jadi 4 ketul + batu kecil + habuk, jatuh berat |
| 💎 Kaca | kaca berwarna lut sinar, ada gelembung | retak bintang, serpihan terpelanting lalu jatuh, berkilau |
| 🌳 Pokok | kayu (urat & mata kayu) dan daun | terbelah jadi 3 papan kayu, habuk kayu, daun melayang |

Tekstur blok dilukis guna canvas masa game mula. Setiap baris yang meletup ada pancaran cahaya, papan terhentak dan bergegar ikut saiz letupan.

## Combo
Combo naik setiap kali letup. Kalau satu langkah tak letup, combo masih selamat — tapi **2 langkah berturut-turut tak letup**, combo hilang. Meter 🔥 atas papan tunjuk combo sekarang dan berapa peluang tinggal (titik merah = peluang terakhir).

Dapat **3 letupan berturut-turut** (combo x3, x6, x9...) → keluar **GEMPOUKK!**, petak flip macam gelombang dan tema bertukar.

Animasi letupan guna [GSAP](https://gsap.com) dari cdnjs. Kalau GSAP tak dapat load (contoh: offline), game masih jalan dengan letupan ringkas.

## Blok yang keluar
Tak random bulat-bulat. Setiap kali bagi 3 blok baru, game cabut 6–12 set calon dan "cuba letak" setiap set dalam simulasi, pastu pilih set yang:

1. ketiga-tiga bloknya boleh muat,
2. boleh letupkan baris **serentak** (2+ baris sekali gus diutamakan),
3. banyak langkah yang letup (supaya combo hidup),
4. susun baris/lajur hampir penuh untuk letupan besar pusingan depan.

Kalau ada bentuk yang boleh tutup lubang dan letup 2+ baris sekarang, bentuk tu kerap diselitkan dalam set calon. Bila papan dah lebih 30% penuh, peluang dapat blok kecil pun naik. Game tak pernah sengaja bagi blok susah.
