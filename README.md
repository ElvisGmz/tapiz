# Tapiz — wallpaper studio

Editor de wallpapers por capas: degradados (lineal, radial, cónico, mesh), texturas, patrones, formas, animales, emojis, íconos y texto. Exporta en PNG/JPG/WebP hasta 6K, o en un pack para varios dispositivos de una sola vez.

```bash
pnpm install
pnpm dev
```

## Cómo funciona

- **Todo es relativo.** Las posiciones van de 0 a 1 y los tamaños son una fracción del lado corto, así que el mismo diseño se adapta a 4K, a un iPhone o a un banner, y la vista previa se ve igual que la exportación.
- **Un solo renderer** (`src/lib/render`) dibuja en un `<canvas>` tanto la vista previa como la exportación a tamaño real. Cada capa se pinta en un lienzo aparte y luego se compone con su opacidad, modo de fusión, desenfoque y sombra.
- **Nitidez vectorial:** los íconos de Lucide se convierten a `Path2D` y los emojis usan los SVG de Twemoji/OpenMoji (vía jsDelivr), así que se ven nítidos en cualquier resolución.
- **Aleatoriedad con semilla:** la dispersión, los mosaicos y las texturas usan un PRNG con semilla, por lo que el diseño no cambia entre la vista previa y la exportación. "Barajar" cambia la semilla.

## Funciones

- **Guía de bienvenida**: aparece sola la primera vez y se vuelve a abrir con el botón **?** o la tecla `?`. Cada función tiene un botón "Probar" que te lleva directo a ella.
- **26 plantillas editables**: estáticas, ▶ animadas y ☀️🌙 de día/noche. Se pueden recolorear con cualquier paleta antes de cargarlas.
- **Fotos tuyas** como capa: de fondo a pantalla completa o esparcidas como los emojis, con marcos (polaroid, círculo, arco, blob) y ajustes de brillo, contraste, saturación, B/N y tono. Se suben con archivo, ⌘V, arrastrando o **pegando un link** (el proxy `/api/image` evita el bloqueo CORS). Los PNG transparentes se detectan y se muestran sin marco. Las fotos se guardan en IndexedDB, dentro del navegador.
- **Día / Noche (macOS)**: escenas por apariencia (claro/oscuro) o por hora del día, con escenas de noche, atardecer y amanecer generadas automáticamente. Se exporta un **.heic dinámico nativo** que se arma en el navegador: HEVC vía WebCodecs, un muxer HEIF propio y metadatos XMP `apple_desktop:apr` / `apple_desktop:h24`.
- **Animaciones** por capa (deriva, flotar, balanceo, girar, latir, parpadeo, grano vivo…) y del fondo. Todas son periódicas, así que el loop no muestra corte. Se exportan como **MP4** (HEVC/H.264 con mediabunny) o como **link en vivo** `/live` para usar con [Plash](https://sindresorhus.com/plash), que además cambia de escena con el modo oscuro o con la hora.
- **Sorpréndeme** (`Espacio`). Con día/noche regenera todas las escenas en sync, o solo la actual si usas el menú ▾.
- **Remix colores**, **Barajar**, deshacer/rehacer, Mis diseños y links para compartir
- **Tamaño del lienzo**: más de 40 dispositivos (Mac, monitores, iPhone, Android, tablets, redes), proporciones con calidad HD a 8K, "Mi pantalla" o un tamaño personalizado

- **Multiplataforma**: detecta Mac, Windows, Android, iPhone/iPad y Linux, y adapta atajos (⌘ o Ctrl), instrucciones y exportación. En Mac se ofrece el `.heic` y Plash; en Windows, [Lively Wallpaper](https://www.rocksdanister.com/lively/) (acepta el MP4 o el link en vivo); en Android, el MP4 para apps de fondos animados. Fuera de Apple el códec por defecto es H.264, y las escenas día/noche se pueden bajar como PNG en cualquier sistema.

Atajos (en Windows/Linux, Ctrl en vez de ⌘): `Espacio` sorpresa · `⌘Z` / `⇧⌘Z` deshacer/rehacer · `⌘D` duplicar · `⌘E` exportar · `⌘V` pegar foto o link · `Supr` borrar capa · `?` ayuda

## Estructura

```
src/lib/types.ts        modelo del documento (capas, rellenos, distribución)
src/lib/render/         motor de canvas: fill, shapes, patterns, textures, assets
src/lib/templates.ts    plantillas + recolor + sorpresa
src/lib/store.ts        estado del editor, historial, links para compartir, guardados
src/lib/scenes.ts       escenas día/noche y derivación automática
src/lib/heic.ts         .heic dinámico: bplist, XMP, HEVC (WebCodecs) y muxer HEIF
src/lib/photos.ts       biblioteca de fotos (IndexedDB)
src/lib/render/motion.ts animaciones con loop sin corte
src/app/api/image       proxy de imágenes (endurecido: SSRF, rebinding, límites)
src/lib/sanitize.ts     validación de diseños externos
src/app/live            fondo en vivo para Plash
src/components/         UI (Editor, Preview, Inspector, LayersPanel, Dialogs…)
```

Nota: Safari limita los lienzos a unos 16.7 MP. Para exportar en 6K usa Chrome, Edge o Firefox.

## Privacidad y créditos

- **Sin indexar:** `robots.txt` bloquea a todos los rastreadores, cada respuesta lleva `X-Robots-Tag: noindex` y las páginas incluyen `<meta name="robots" content="noindex">`. Tampoco se envía el referrer a terceros.
- **Seguridad:**
  - El proxy `/api/image` solo responde a la propia app (`Sec-Fetch-Site`) y tiene un límite de peticiones por IP. Bloquea IPs privadas o internas en el momento de conectar, así que DNS rebinding no sirve; valida cada redirección; rechaza SVG, URLs con credenciales y archivos gigantes; y sus respuestas no se cachean y van con `CSP: sandbox`.
  - Los diseños que llegan de fuera (links, `/live`, localStorage) pasan por `sanitizeDoc`, que descarta lo desconocido, exige colores hex y limita cantidades y tamaños. Además, la descompresión del link tiene un tope.
  - Cabeceras: CSP estricta (solo tu dominio y jsDelivr), `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`, `no-referrer` y sin `X-Powered-By`.
- Todo se genera en tu navegador: los PNG, el .heic, el MP4 y tus fotos (que se guardan en IndexedDB). El servidor solo interviene en `/api/image`, que trae imágenes por link y únicamente responde a la propia app.
- Las fuentes se sirven desde tu propio dominio (`next/font`). La única petición externa es a jsDelivr, para los SVG de los emojis.
- Dependencias: Next/React (MIT), Lucide (ISC), mediabunny (MPL-2.0).
- Emojis: [Twemoji](https://github.com/jdecked/twemoji) (CC BY 4.0) y [OpenMoji](https://openmoji.org) (CC BY-SA 4.0). Si publicas wallpapers que los usan, da crédito.
