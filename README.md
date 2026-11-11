# 💥 Blok Boom

Game puzzle blok 8×8. Tarik blok ke papan, isi penuh satu baris atau lajur, nanti dia meletup!

## Cara main
Buka `index.html` dalam browser (phone pun boleh).

- Dapat 3 blok setiap pusingan
- Isi penuh baris / lajur → meletup, dapat markah
- Letup berturut-turut → combo, markah berganda
- Papan bersih habis → bonus +300
- Tak ada blok yang muat → kalah

## Blok yang keluar
Tak random bulat-bulat. Setiap kali bagi 3 blok baru, game cabut 6–12 set calon dan "cuba letak" setiap set dalam simulasi, pastu pilih set yang:

1. ketiga-tiga bloknya boleh muat,
2. boleh letupkan paling banyak baris **serentak** (2+ baris sekali gus diutamakan),
3. susun baris/lajur hampir penuh untuk letupan besar pusingan depan.

Kalau ada bentuk yang boleh tutup lubang dan letup 2+ baris sekarang, bentuk tu kerap diselitkan dalam set calon. Bila papan dah lebih 30% penuh, peluang dapat blok kecil pun naik. Game tak pernah sengaja bagi blok susah.
