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
Random, dengan bantuan bila papan sesak (game tak pernah sengaja bagi blok susah):

1. **Saiz blok** – bila papan dah lebih 30% penuh, peluang dapat blok kecil naik sikit demi sikit (paling tinggi bila 65% penuh).
2. **Ikut bentuk papan** – bila papan sesak, game cabut sampai 8 set calon dan "cuba letak" setiap set dalam simulasi. Set yang ketiga-tiga bloknya boleh muat dan boleh letupkan paling banyak baris yang diberi.

Papan masih lapang = random biasa (cuma pastikan sekurang-kurangnya satu blok muat).
