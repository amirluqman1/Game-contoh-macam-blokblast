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
| 🪨 Batu | granit, batu pasir, batu loh, batu kapur | retak bergerigi, pecah jadi 4 ketul, jatuh |
| 💎 Kaca | kaca berwarna lut sinar | retak bintang, serpihan terpelanting lalu jatuh |
| 🌳 Pokok | kayu dan daun | terbelah jadi 3 papan kayu, daun melayang |

Dapat **3 letupan berturut-turut** (combo x3, x6, x9...) → keluar **GEMPOUKK!**, petak flip macam gelombang dan tema bertukar.

Animasi letupan guna [GSAP](https://gsap.com) dari cdnjs. Kalau GSAP tak dapat load (contoh: offline), game masih jalan dengan letupan ringkas.

## Blok yang keluar
Tak random bulat-bulat. Setiap kali bagi 3 blok baru, game cabut 6–12 set calon dan "cuba letak" setiap set dalam simulasi, pastu pilih set yang:

1. ketiga-tiga bloknya boleh muat,
2. boleh letupkan paling banyak baris **serentak** (2+ baris sekali gus diutamakan),
3. susun baris/lajur hampir penuh untuk letupan besar pusingan depan.

Kalau ada bentuk yang boleh tutup lubang dan letup 2+ baris sekarang, bentuk tu kerap diselitkan dalam set calon. Bila papan dah lebih 30% penuh, peluang dapat blok kecil pun naik. Game tak pernah sengaja bagi blok susah.
