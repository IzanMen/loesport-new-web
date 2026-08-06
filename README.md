# Lô Esport Menorca

Sitio estático multipágina construido con Vite.

## Comandos

- `npm run dev`: servidor local.
- `npm run dev:api`: API local de formularios en el puerto 8080.
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
- `server/`: servidor de producción y envío mediante Gmail API.
- `assets/`: imágenes, logos, favicons y vídeo usados por las páginas.
- `dist/`: salida generada por Vite; no se edita a mano.

## Formularios y despliegue

La web y `POST /api/forms` se publican juntos en el servicio de Cloud Run
`loesport-web`, región `europe-southwest1`, dentro del proyecto `loesport`.
Cada envío genera una captura del formulario, incluye las respuestas en el cuerpo
del correo y adjunta los archivos originales.

Cloud Run recibe estas variables desde Secret Manager:

- `GMAIL_CLIENT_ID` desde `gmail-client-id`.
- `GMAIL_CLIENT_SECRET` desde `gmail-client-secret`.
- `GMAIL_REFRESH_TOKEN` desde `gmail-refresh-token`.

El cliente OAuth debe permanecer en estado **En producción** para que el token de
una aplicación externa no caduque a los siete días. Para renovar la autorización,
ejecuta `npm run authorize:gmail` con las variables descritas en `.env.example` y
guarda el nuevo token como otra versión de `gmail-refresh-token`.

## Añadir una página

1. Crea el HTML en la raíz.
2. Añade `<link rel="stylesheet" href="/styles.css" />` en el `<head>`.
3. Añade `<script type="module" src="/script.js"></script>` antes de cerrar `<body>`.
4. Registra el archivo en `pages` dentro de `vite.config.js`.
5. Si hay textos nuevos, añádelos en `src/i18n/catalog.js`.
