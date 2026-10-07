# Lô Esport Menorca

Sitio estático multipágina construido con Vite.

## Comandos

- `npm run dev`: servidor local.
- `npm run dev:api`: API local de formularios en el puerto 8080.
- `npm run build`: genera `dist/`.
- `npm run preview`: previsualiza la build.
- `npm run clean`: elimina `dist/`.
- `npm run authorize:drive`: genera el token OAuth independiente para una carpeta
  de Mi unidad cuando no se pueda usar una unidad compartida.
- `npm run verify:form-storage`: comprueba permisos reales de escritura en Sheets
  y Drive y prepara o migra la cabecera sin enviar una inscripción.
- `npm run check:i18n`: comprueba la cobertura de textos dinámicos y errores del servidor.
- `npm test`: ejecuta las pruebas unitarias del backend de formularios.
- `npm run check`: comprueba traducciones, pruebas y build.

## Estructura

- `*.html`: páginas publicadas.
- `styles.css`: estilos globales del sitio.
- `script.js`: entrada JS mínima.
- `src/i18n/`: detección de idioma, selector y catálogo.
- `scripts/`: auditorías de cobertura y funcionamiento de idiomas.
- `src/ui/`: módulos de interacción reutilizables.
- `server/`: servidor de producción y envío mediante Gmail API.
- `assets/`: imágenes, logos, favicons y vídeo usados por las páginas.
- `dist/`: salida generada por Vite; no se edita a mano.

## Formularios y despliegue

La web y `POST /api/forms` se publican juntos en el servicio de Cloud Run
`loesport-web`, región `europe-southwest1`, dentro del proyecto `loesport`.
Cada envío intenta generar una captura del formulario, incluye las respuestas en
el cuerpo del correo y adjunta los archivos originales. La captura es opcional:
si el navegador no puede generarla o hace superar el límite de tamaño, el envío
continúa con normalidad sin ella. Además, los envíos de tipo `inscripcion` y
`preinscripcion` se guardan en vistas separadas de Google Sheets y sus archivos o
capturas se archivan en Google Drive; los demás formularios continúan usando solo
el correo.

La instalación activa usa la identidad dedicada de Cloud Run para Sheets y un
OAuth independiente para la carpeta privada de Mi unidad. El servicio esta
limitado a una instancia maxima y la integracion se verifico con envios reales en
ambos formatos de frontend. El estado y los UUID de esas pruebas se conservan en
`SPREADSHEET_INSCRIPCION_HANDOFF.md`.

Las builds de producción envían directamente a la API de Cloud Run. CORS está
limitado a `https://loesport-new-web.vercel.app`, `https://loesport.es` y
`https://www.loesport.es`. En `localhost`, Vite mantiene su proxy `/api`.

Cloud Run recibe estas variables desde Secret Manager:

- `GMAIL_CLIENT_ID` desde `gmail-client-id`.
- `GMAIL_CLIENT_SECRET` desde `gmail-client-secret`.
- `GMAIL_REFRESH_TOKEN` desde `gmail-refresh-token`.

Google Sheets utiliza la identidad de servicio de Cloud Run (Application Default
Credentials), separada del OAuth personal de Gmail. Google Drive usa la misma
identidad cuando la carpeta está dentro de una unidad compartida. No se debe crear
ni subir una clave JSON.

Configuración necesaria:

1. Habilita Google Sheets API y Google Drive API en el proyecto `loesport`.
2. Ejecuta `loesport-web` con una cuenta de servicio dedicada y administrada por
   el club; evita reutilizar la cuenta Compute predeterminada en otros servicios.
   Antes de cambiar la identidad del servicio, concédele acceso de lectura solo a
   los tres secretos de Gmail ya usados por la API para no interrumpir el resto de
   formularios.
3. Crea una hoja propiedad del club y compártela como editora únicamente con esa
   cuenta de servicio.
4. Configura `GOOGLE_SHEETS_SPREADSHEET_ID` con el identificador de esa hoja.
5. Opcionalmente, configura `GOOGLE_SHEETS_INSCRIPCION_TAB`; por defecto se usa
   `Inscripciones`. La pestaña técnica oculta usa
   `GOOGLE_SHEETS_INSCRIPCION_SYSTEM_TAB` o `_Inscripciones sistema` por defecto.
   El formulario de prueba usa `GOOGLE_SHEETS_PREINSCRIPCION_TAB` o
   `Periodos de prueba`, y una pestaña técnica
   `GOOGLE_SHEETS_PREINSCRIPCION_SYSTEM_TAB` o `_Pruebas sistema`.
6. Crea una carpeta privada para formularios y configura su ID en
   `GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID`.
7. Si usas una unidad compartida, configura obligatoriamente
   `GOOGLE_DRIVE_INSCRIPCION_SHARED_DRIVE_ID` para impedir que un error de ID
   redirija los documentos a otra unidad accesible.

La opción recomendada es que la carpeta pertenezca a una unidad compartida, que
su ID quede fijado en la configuración y que la cuenta de servicio tenga permiso
para añadir contenido. Una cuenta de servicio
no puede ser propietaria de archivos, por lo que una carpeta normal de Mi unidad
no funciona con ADC. La API rechaza cualquier carpeta con permisos para cualquiera
o para todo un dominio, para no publicar documentos, datos bancarios o información
de menores.

Si el club no dispone de unidades compartidas, se puede usar una carpeta de Mi
unidad con un OAuth independiente de Drive:

1. Ejecuta `npm run authorize:drive` con `GOOGLE_DRIVE_CLIENT_ID` y
   `GOOGLE_DRIVE_CLIENT_SECRET`; si se omiten, reutiliza el ID y secreto del cliente
   OAuth de Gmail, pero nunca su refresh token.
2. Guarda el resultado como `GOOGLE_DRIVE_REFRESH_TOKEN` en Secret Manager.
3. Da acceso a ese token solo a `loesport-web` y configura la carpeta propiedad de
   la misma cuenta autorizada.

Este token usa el permiso completo de Drive para poder escribir en una carpeta ya
existente de Mi unidad. Debe ser exclusivo de este servicio, mantenerse en estado
**En producción** y tratarse como un secreto de alto impacto.

La pestaña visible `Inscripciones` contiene 33 columnas de datos: la fecha y hora de
recepción y todos los datos que rellena la persona. Se omite el ID interno del
grupo y los cuatro campos de documentos muestran directamente sus enlaces
privados de Drive. También incluye `Correo electrónico de contacto`. Al final se añaden `ID de envío`, `Estado gestión`,
`Estado de Drive` y `Estado del correo`. Las actualizaciones buscan el UUID,
independientemente de la posición de la fila visible.

`inscripcion-familiar.html` simplifica las altas conjuntas de las escuelas de
Alaior y Maó. El navegador envía una inscripción estándar por participante, por
lo que cada persona mantiene su propia fila y su carpeta de Drive sin cambiar el
esquema de la hoja. Todas las filas incluyen en `Observaciones` una referencia
`FAM-XXXXXXXX`; las de madres y padres indican además la tarifa simultánea con
hijo/a en la escuela y, cuando hay tres o más participantes, el descuento
familiar. Los UUID individuales se conservan durante los reintentos para que un
fallo parcial no duplique las personas ya guardadas.

La pestaña visible `Periodos de prueba` contiene los datos de la prueba, la
captura privada y la carpeta de Drive. Su estado técnico se conserva en
`_Pruebas sistema`. Por defecto reutiliza la misma carpeta privada de Drive que
inscripción y distingue cada envío con una subcarpeta `preinscripcion-UUID`; se
puede separar mediante `GOOGLE_DRIVE_PREINSCRIPCION_FOLDER_ID` y, si corresponde,
`GOOGLE_DRIVE_PREINSCRIPCION_SHARED_DRIVE_ID`.

Para conservar la deduplicación y los reintentos sin ensuciar la vista, la API
mantiene esos datos en `_Inscripciones sistema`, una pestaña oculta. Al desplegar
este esquema, la pestaña técnica anterior se renombra y oculta automáticamente,
se crea la vista de gestión y se proyectan todos los envíos, incluidos los
pendientes y fallidos. Cada inscripción
sigue creando una subcarpeta por UUID con los documentos y, cuando el navegador
puede generarla, la captura. Si alguna
cabecera no coincide con el esquema esperado, el envío se detiene antes del
correo.

`GET /api/health` conserva `spreadsheetConfigured` y `driveConfigured` para
inscripción y añade el detalle de ambos formularios en `formStorage`, sin revelar
identificadores. Solo confirma que existen las variables mínimas; ejecuta
`npm run verify:form-storage` con la identidad de producción y termina con un envío
real de prueba después del despliegue.
Para consultar u ordenar inscripciones, utiliza vistas de filtro y evita reordenar
o eliminar físicamente filas mientras haya envíos en curso.

### Reconciliar las vistas de gestión

`npm run reconcile:form-sheets` analiza ambas vistas sin escribir, usando
`GOOGLE_SHEETS_SPREADSHEET_ID` y credenciales ADC con acceso al documento.
`npm run reconcile:form-sheets -- --apply` aplica la reconciliación, crea una
copia de cada vista con datos y verifica los IDs escritos. No envía correos ni
modifica archivos de Drive o registros técnicos.

La migración enlaza las filas antiguas por fecha de recepción (incluidas fechas
nativas de Sheets), desambiguando por nombre cuando coinciden los segundos.
Se detiene ante correspondencias dudosas. Conserva los datos editados en la
vista, compacta los huecos y añade los UUID que faltan desde la hoja técnica.
Los registros con UUID distintos nunca se fusionan por DNI, teléfono o nombre.
`Estado gestión` comienza en `pendiente` y admite `sí`, `duplicado`, `prueba`,
`error` y `pendiente`; la API conserva esa decisión al actualizar los estados
de entrega y los enlaces. Ningún nombre se excluye automáticamente.

Para activar este cambio en producción, retirar primero las revisiones antiguas
que escriben por número de fila y dejar terminar sus envíos en curso. Aplicar la
migración con las escrituras detenidas y activar después el backend actualizado.
El backend también prepara las columnas y migra una vista antigua en su primera
validación. No compactar la hoja mientras siga escribiendo el backend anterior.

`FORM_STORAGE_MAINTENANCE=1` permite pausar temporalmente `POST /api/forms`
con HTTP 503 y `Retry-After: 60`, manteniendo la web y `/api/health` disponibles.
Retirar la variable al terminar. El endpoint de salud expone
`formStorageMaintenance` para comprobarlo.

La deduplicación estricta entre varias instancias requeriría un almacén con
escritura condicional, como Firestore. Mientras Sheets sea el único almacén, se
debe limitar `loesport-web` a una instancia máxima a nivel de servicio
(`gcloud run deploy ... --max=1`); el código serializa los reintentos por UUID
dentro de esa instancia y recupera filas pendientes antiguas.

`FORM_RECIPIENT` admite uno o varios correos separados por comas. Por ejemplo:
`loesport@gmail.com`.

El correo interno del club sigue usando `GMAIL_SENDER` y `GMAIL_REFRESH_TOKEN`.
Las confirmaciones automáticas al usuario se envían desde Google Apps Script con
la cuenta `inscripcio.loesport@gmail.com`, sin tocar Cloud Run:

1. Crea un proyecto en <https://script.google.com/> con esa cuenta.
2. Copia el contenido de `apps-script/confirmation-email.gs`.
3. Publica como Web App con acceso "Cualquier persona".
4. Configura o revisa en el frontend:

```bash
VITE_CONFIRMATION_WEBHOOK_ENDPOINT="https://script.google.com/macros/s/AKfycbzkhPaLY-DbzSHK1N1eN8Sn2YErPms2O6QvNvSZ_TT-6nUhpskpBkqGoRX7Qy8RVCHx/exec"
VITE_CONFIRMATION_WEBHOOK_TOKEN="ASDFLMKÑDASF134KJNÑNÑ413NÑKNÑLK34M56"
```

Este envío es adicional al envío principal: si Apps Script falla, el formulario
igualmente queda enviado al club.

El cliente OAuth debe permanecer en estado **En producción** para que el token de
una aplicación externa no caduque a los siete días. Para renovar la autorización,
ejecuta `npm run authorize:gmail` con las variables descritas en `.env.example` y
guarda el nuevo token como otra versión de `gmail-refresh-token`.

La hoja y Drive almacenan datos de menores, documentos de identidad, datos
bancarios y de salud. Deben mantenerse privados, con acceso nominal mínimo y una
política de retención coherente con la documentación de protección de datos. Al
suprimir una inscripción deben eliminarse de forma coordinada la fila, su carpeta
de Drive y el correo asociado.

Para recuperar inscripciones históricas desde correos `.eml`, utiliza
`scripts/import-historical-inscriptions.mjs`. El modo predeterminado es una
previsualización sin escrituras ni datos personales; `--apply` requiere las
credenciales mediante variables o archivos de secretos, no reenvía el correo y
verifica al terminar las filas, enlaces y hashes de Drive. Los UUID se derivan de
forma estable del `Message-ID`, por lo que repetir una importación no la duplica.

## Añadir una página

1. Crea el HTML en la raíz.
2. Añade `<link rel="stylesheet" href="/styles.css" />` en el `<head>`.
3. Añade `<script type="module" src="/script.js"></script>` antes de cerrar `<body>`.
4. Registra el archivo en `pages` dentro de `vite.config.js`.
5. Si hay textos nuevos, añádelos en `src/i18n/catalog.js` o `src/i18n/supplemental-catalog.js`.
6. Ejecuta `npm run check` para verificar que no queda ninguna cadena sin traducir.

## Auditoría de idiomas en navegador

Con Vite abierto en `http://127.0.0.1:4321` y Chrome en modo headless con el
puerto de depuración `9224`, `npm run audit:i18n:browser` recorre todos los HTML,
las fichas de producto y los estados interactivos en ES, CA, GL y EU.
