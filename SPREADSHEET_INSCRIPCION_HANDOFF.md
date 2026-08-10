# Volcado a Google Sheets y Drive de formularios

Estado: activo en produccion. Desde el 10 de agosto de 2026, la revision de Cloud
Run `loesport-web-00010-qqg` recibe el 100 % del trafico y atiende tanto
`inscripcion` como `preinscripcion`. El frontend de produccion de Vercel tambien
esta actualizado.

## Alcance acordado

- Se vuelcan a hoja de calculo y Drive `inscripcion` y `preinscripcion`.
- No entran por ahora `licencias`, `baja`, `socio`, `newsletter`, `contacto`, `patrocinio` ni `equipacion`.
- La solucion debe quedar limpia y replicable para anadir otros formularios despues.

## Implementacion actual

- `src/ui/form-submission.js` genera y conserva un UUID durante reintentos.
- `src/ui/registration-forms.js` envia claves semanticas estables para todos los
  campos de inscripcion y periodo de prueba. Una edicion posterior a un intento
  fallido inicia un UUID nuevo mediante el reinicio centralizado para evitar
  mezclar contenidos.
- `server/form-payload.js` valida y sanea el contrato del endpoint.
- `server/form-sheet-store.js` aporta el almacen estructurado reutilizable para
  formularios nuevos sin alterar el esquema existente de inscripciones.
- `server/preinscripcion-sheet.js` define una vista visible de 16 columnas en
  `Periodos de prueba` y el estado tecnico en `_Pruebas sistema`. La vista incluye
  todos los campos rellenados, la captura y la carpeta privadas de Drive.
- `server/inscripcion-sheet.js` mantiene el esquema tecnico de 56 columnas en una
  pestana oculta y proyecta una vista visible de 32 columnas: fecha/hora, campos
  que rellena la persona y enlaces privados en los cuatro campos de documentos.
  Migra la pestana anterior, mapea por clave, conserva respuestas desconocidas y
  escribe con `RAW`.
- `server/inscripcion-drive.js` crea una subcarpeta idempotente por tipo y UUID,
  guarda los adjuntos y la captura opcional y nunca publica permisos. Las pruebas
  se guardan como `preinscripcion-UUID`.
- `server/form-submission-orchestrator.js` coordina fila `pending`, plan y archivo
  de Drive, enlaces persistidos y, por ultimo, Gmail con estados `sent`/`error`;
  deduplica UUID enviados y recupera `pending` antiguos.
- `server/index.js` activa almacenes separados para `inscripcion` y
  `preinscripcion`; `/api/health` conserva los indicadores anteriores y añade el
  detalle por formulario en `formStorage`.
- `server/error-summary.js` evita que errores de Gmail, Sheets o Drive vuelquen datos del
  formulario, MIME o credenciales en los logs.
- Los adjuntos siguen viajando por Gmail y se guardan en Drive. La captura se
  incluye en ambos destinos cuando el navegador puede generarla; es opcional y
  nunca bloquea el envío. Sheets guarda nombres, IDs y enlaces privados, nunca
  los binarios.

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
- Las pestañas de prueba estan creadas y verificadas en la misma hoja con los
  nombres `Periodos de prueba` y `_Pruebas sistema`; se pueden cambiar con
  `GOOGLE_SHEETS_PREINSCRIPCION_TAB` y
  `GOOGLE_SHEETS_PREINSCRIPCION_SYSTEM_TAB`.
- Drive reutiliza por defecto `GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID`, por lo que no
  hace falta un secreto ni una carpeta nueva. Se puede separar con
  `GOOGLE_DRIVE_PREINSCRIPCION_FOLDER_ID` y
  `GOOGLE_DRIVE_PREINSCRIPCION_SHARED_DRIVE_ID`.
- La cuenta de servicio solo puede leer la version activa del secreto de Drive.
- La carpeta y la hoja se comprobaron sin permisos `anyone` ni `domain`.
- El maximo del servicio es una instancia y la concurrencia de la revision es 10.
- `GET /api/health` devuelve `emailConfigured`, `spreadsheetConfigured` y
  `driveConfigured` con valor `true`; `formStorage` confirma tambien Sheets y
  Drive para `inscripcion` y `preinscripcion`.
- El frontend actualizado esta publicado en
  `https://loesport-new-web.vercel.app` mediante el despliegue
  `dpl_7p4rAMo3iH8m1SVMNYWuVH5fyc7j`. El alojamiento Apache de `loesport.es`
  conserva de momento el bundle anterior, pero el backend acepta sus etiquetas
  historicas y rellena igualmente los enlaces individuales de los documentos.

El 10 de agosto se ejecuto en produccion `verify:form-storage` con la cuenta de
servicio y los secretos reales. Verifico escritura en `Inscripciones` y
`Periodos de prueba`, sus pestañas tecnicas y el OAuth privado de Drive. No se
envio ningun formulario ni correo de prueba. Una pestaña tecnica vacia creada con
un nombre incorrecto durante el primer preflight se valido como vacia, se elimino
y una segunda ejecucion confirmo `removed: false`. Los jobs temporales de
preflight y limpieza se eliminaron despues; se pueden recrear desde la imagen si
vuelven a hacer falta.

La migracion real conservo las cuatro filas que habia en la hoja. La prueba de la
vista minima quedo en correo `sent`, Drive `stored` y devolvio `deduplicated: true`
al repetirla. Despues se eliminaron de ambas pestanas sus datos de prueba y su
carpeta se envio a la papelera de Drive; solo queda el correo tecnico en el buzon.

No se debe crear ni subir una clave JSON. Sheets usa ADC con la identidad de Cloud
Run, Gmail mantiene su OAuth actual y Drive usa un refresh token separado.

## Importaciones históricas

El 8 de agosto de 2026 se importaron tres inscripciones que habían llegado por
correo antes de activar Sheets y Drive. Se conservaron sus horas originales, se
extrajeron del EML las capturas y todos los documentos originales, y no se
reenviaron correos. La comprobación posterior confirmó las tres filas, todos los
enlaces visibles, los estados internos `sent`/`stored`, la existencia de 14
elementos de Drive (tres carpetas, tres capturas y ocho documentos) y los hashes
de sus once archivos. Un segundo
intento devolvió `deduplicated: true` para las tres.

`scripts/import-historical-inscriptions.mjs` permite repetir este procedimiento.
Sin `--apply` solo analiza y muestra un resumen sin datos personales; con
`--apply` comprueba primero el documento de identidad para evitar duplicados,
importa sin enviar Gmail y verifica después Sheets, enlaces, Drive y hashes.

## Verificacion automatizada

- `test/form-payload.test.js`
- `test/inscripcion-sheet.test.js`
- `test/preinscripcion-sheet.test.js`
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
- Si falta Sheets o Drive, `inscripcion` y `preinscripcion` fallan antes de Gmail;
  los demas formularios continuan enviando correo.

## Cambios previos preservados

- Los cambios que ya existian en `.env.example`, `README.md` y `server/index.js`
  sobre destinatarios de correo se han conservado.
