# Lô Esport Menorca

Sitio estático multipágina construido con Vite.

## Comandos

- `npm run dev`: servidor local.
- `npm run build`: genera `dist/`.
- `npm run preview`: previsualiza la build.
- `npm run clean`: elimina `dist/`.
- `npm run check`: comprobación de build.

## Estructura

- `*.html`: páginas publicadas.
- `styles.css`: estilos globales del sitio.
- `script.js`: entrada JS mínima.
- `src/i18n/`: detección de idioma, selector y catálogo.
- `src/ui/`: módulos de interacción reutilizables.
- `assets/`: imágenes, logos, favicons y vídeo usados por las páginas.
- `dist/`: salida generada por Vite; no se edita a mano.

## Añadir una página

1. Crea el HTML en la raíz.
2. Añade `<link rel="stylesheet" href="/styles.css" />` en el `<head>`.
3. Añade `<script type="module" src="/script.js"></script>` antes de cerrar `<body>`.
4. Registra el archivo en `pages` dentro de `vite.config.js`.
5. Si hay textos nuevos, añádelos en `src/i18n/catalog.js`.
