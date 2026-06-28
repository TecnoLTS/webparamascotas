Home category assets for `paramascotasec`

This project currently uses only 2 category image blocks on the home page.

1. Top category strip (`Collection.tsx`)

Path:
`/public/images/collection/home-top`

Files in active use:
- `catalogo-completo-para-mascotas-4x5.webp` -> `Todas`
- `ropa-para-mascotas-4x5.webp` -> `Ropa`
- `alimento-para-mascotas-4x5.webp` -> `Alimento`
- `salud-para-mascotas-4x5.webp` -> `Salud`
- `accesorios-para-mascotas-4x5.webp` -> `Accesorios`

Recommended source size:
- `1200x1500`

Minimum safe size:
- `960x1200`

2. Secondary featured block (`Collection2.tsx`)

Path:
`/public/images/collection/home-featured`

The current home layout only needs 6 files.

Mobile `<640px`
- `alimentos-para-mascotas-en-ecuador-mobile-principal-16x10.webp` -> `1176x736`
- `salud-para-mascotas-en-ecuador-mobile-secundario-square.webp` -> `588x588`
- `accesorios-para-mascotas-en-ecuador-mobile-secundario-square.webp` -> `588x588`

Desktop `>=640px`
- `alimentos-para-mascotas-en-ecuador-desktop-principal-4x5.webp` -> `1260x1240`
- `salud-para-mascotas-en-ecuador-desktop-secundario-16x10.webp` -> `1260x590`
- `accesorios-para-mascotas-en-ecuador-desktop-secundario-16x10.webp` -> `1260x590`

Notes
- `Salud` and `Accesorios` share the same required resolution because they use the same slot size.
- If an image still looks too cut off with the correct dimensions, the issue is composition, not ratio.
- To replace an image, keep the same file name and overwrite the file in the same folder.
- After changing images, regenerate versions:
  - `cd /home/admincenter/contenedores/webparamascotas/app && npm run images:manifest`
