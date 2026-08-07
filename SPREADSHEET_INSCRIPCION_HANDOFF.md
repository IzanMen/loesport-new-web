# Volcado a Google Sheets del formulario de inscripcion

Estado: activo en produccion. Desde el 8 de agosto de 2026, la revision de Cloud
Run `loesport-web-00010-dax` recibe el 100 % del trafico y usa la vista minima de
inscripciones.

## Alcance acordado

- Solo se debe volcar a hoja de calculo el formulario `inscripcion`.
- No entran por ahora `preinscripcion`, `licencias`, `baja`, `socio`, `newsletter`, `contacto`, `patrocinio` ni `equipacion`.
- La solucion debe quedar limpia y replicable para anadir otros formularios despues.

## Implementacion actual

- `src/ui/form-submission.js` genera y conserva un UUID durante reintentos.
- `src/ui/registration-forms.js` envia claves semanticas estables para todos los
  campos de inscripcion. Una edicion posterior a un intento fallido inicia un UUID
  nuevo mediante el reinicio centralizado para evitar mezclar contenidos.
- `server/form-payload.js` valida y sanea el contrato del endpoint.
- `server/inscripcion-sheet.js` mantiene el esquema tecnico de 56 columnas en una
  pestana oculta y proyecta una vista visible de 32 columnas: fecha/hora, campos
  que rellena la persona y enlaces privados en los cuatro campos de documentos.
  Migra la pestana anterior, mapea por clave, conserva respuestas desconocidas y
  escribe con `RAW`.
- `server/inscripcion-drive.js` crea una subcarpeta idempotente por UUID, guarda la
  captura y los adjuntos y nunca publica permisos.
- `server/form-submission-orchestrator.js` coordina fila `pending`, plan y archivo
  de Drive, enlaces persistidos y, por ultimo, Gmail con estados `sent`/`error`;
  deduplica UUID enviados y recupera `pending` antiguos.
- `server/index.js` solo activa Sheets y Drive para
  `payload.type === "inscripcion"` y expone `spreadsheetConfigured` y
  `driveConfigured` en `/api/health`.
- `server/error-summary.js` evita que errores de Gmail, Sheets o Drive vuelquen datos del
  formulario, MIME o credenciales en los logs.
- Los adjuntos y la captura siguen viajando por Gmail y tambien se guardan en
  Drive. Sheets guarda nombres, IDs y enlaces privados, nunca los binarios.

## Configuracion aplicada en produccion

- Google Sheets API y Google Drive API estan habilitadas en el proyecto `loesport`.
- Cloud Run usa la cuenta de servicio dedicada
  `loesport-forms@loesport.iam.gserviceaccount.com`.
- Sheets usa ADC con esa identidad; la hoja privada le concede permiso de editor.
- La carpeta elegida pertenece a Mi unidad. Drive usa un OAuth independiente del
  de Gmail, almacenado en Secret Manager como `google-drive-refresh-token`; no hay
  claves JSON en el repositorio ni en Cloud Run.
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_INSCRIPCION_TAB`,
  `GOOGLE_SHEETS_INSCRIPCION_SYSTEM_TAB` y
  `GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID` estan configuradas en `loesport-web`.
- La cuenta de servicio solo puede leer la version activa del secreto de Drive.
- La carpeta y la hoja se comprobaron sin permisos `anyone` ni `domain`.
- El maximo del servicio es una instancia y la concurrencia de la revision es 10.
- `GET /api/health` devuelve `emailConfigured`, `spreadsheetConfigured` y
  `driveConfigured` con valor `true`.
- El frontend actualizado esta publicado en
  `https://loesport-new-web.vercel.app`. El alojamiento Apache de `loesport.es`
  conserva de momento el bundle anterior, pero el backend traduce sus etiquetas
  historicas y rellena igualmente los enlaces individuales de los documentos.

La migracion real conservo las cuatro filas que habia en la hoja. La prueba de la
vista minima quedo en correo `sent`, Drive `stored` y devolvio `deduplicated: true`
al repetirla. Despues se eliminaron de ambas pestanas sus datos de prueba y su
carpeta se envio a la papelera de Drive; solo queda el correo tecnico en el buzon.

No se debe crear ni subir una clave JSON. Sheets usa ADC con la identidad de Cloud
Run, Gmail mantiene su OAuth actual y Drive usa un refresh token separado.

## Verificacion automatizada

- `test/form-payload.test.js`
- `test/inscripcion-sheet.test.js`
- `test/form-submission-orchestrator.test.js`
- `npm test` ejecuta todas las pruebas.
- `npm run check` ejecuta auditoria i18n, pruebas y build.
- El `Dockerfile` ejecuta `npm run check` antes de construir la imagen final.

## Riesgos y limites conocidos

- La hoja y Drive contendran datos de menores, DNI/NIE, IBAN y salud/alergias.
  Deben ser privados, con acceso nominal minimo y una politica de retencion/RGPD.
- Google Sheets no ofrece una reserva atomica por UUID. La implementacion serializa
  dentro de una instancia y vuelve a comprobar la fila despues del append para
  reducir carreras entre instancias. Una garantia estricta requeriria Firestore u
  otro almacen con escritura condicional.
- Una fila `pending` reciente devuelve 409 para evitar dos correos simultaneos; al
  superar 120 segundos puede recuperarse con el mismo UUID.
- Para ordenar la hoja se deben usar vistas de filtro, sin reordenar ni borrar
  fisicamente filas mientras haya envios en curso.
- Si falta Sheets o Drive, solo `inscripcion` falla antes de Gmail; los demas
  formularios continuan enviando correo.

## Cambios previos preservados

- Los cambios que ya existian en `.env.example`, `README.md` y `server/index.js`
  sobre destinatarios de correo se han conservado.
