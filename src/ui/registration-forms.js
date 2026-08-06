import altaLicensePdfUrl from "../../assets/documents/solicitud-alta-licencia-rfea-2026.pdf?url";
import renewalLicensePdfUrl from "../../assets/documents/solicitud-renovacion-licencia-rfea-2026.pdf?url";
import {
  TRAINING_GROUPS,
  TRAINING_LOCATIONS,
  getTrainingGroup,
  getTrainingLocation,
} from "../data/training-groups.js";
import { sendFormSubmission } from "./form-submission.js";

export const FORM_DEFINITIONS = {
  inscripcion: {
    title: "Inscripción",
    eyebrow: "Temporada 2026-27",
    intro: "Completa el alta o la renovación para entrenar con Lô Esport Menorca.",
    submitLabel: "Enviar inscripción",
    successTitle: "Inscripción recibida",
    success:
      "Bienvenido a Lô Esport. Hemos recibido correctamente tus datos y te deseamos una feliz temporada.",
    sections: [
      {
        title: "Elige tu grupo",
        description: "Confirma el grupo y elige cuántos días y cuáles vas a entrenar.",
        fields: [
          {
            type: "group-selection",
            entry: "2005620554",
            dayCountEntry: "167310009",
            daysEntry: "712946819",
            submissionKey: "inscripcion",
            label: "Dónde y cuándo quieres entrenar",
            required: true,
          },
        ],
      },
      {
        title: "Datos del participante",
        description: "Ahora completa los datos de la persona que va a entrenar.",
        fields: [
          { type: "text", entry: "1045781291", label: "Población de residencia", required: true },
          {
            type: "text",
            entry: "43453506",
            label: "Nombre y Apellidos",
            required: true,
            autocomplete: "name",
          },
          { type: "date-text", entry: "1065046570", label: "Fecha de nacimiento", required: true },
          {
            type: "radio",
            entry: "984531499",
            label: "SEXO",
            required: true,
            options: ["FEMENINO", "MASCULINO"],
          },
          {
            type: "text",
            entry: "839337160",
            label: "Documento de identidad (DNI, NIE o pasaporte)",
            required: true,
            help: "Indica el número del documento y adjunta las dos caras a continuación.",
          },
          {
            type: "file",
            entry: "document-front",
            label: "Documento de identidad · parte delantera",
            required: true,
            accept: "image/*,.pdf",
            help: "Adjunta foto o PDF del anverso del DNI, NIE o pasaporte.",
          },
          {
            type: "file",
            entry: "document-back",
            label: "Documento de identidad · parte trasera",
            required: true,
            accept: "image/*,.pdf",
            help: "Adjunta foto o PDF del reverso. Si tu pasaporte no tiene reverso, adjunta de nuevo la página principal.",
          },
          {
            type: "radio",
            entry: "946002822",
            label: "Eres nuevo en el club?",
            required: true,
            options: ["Nuevo", "Renovación matrícula"],
            help:
              "La matrícula es de 25 €. Los grupos escolares la abonan siempre; desde Sub-20, solo se aplica a nuevas incorporaciones al club.",
          },
        ],
      },
      {
        title: "Datos de contacto",
        description: "Información de residencia y contacto del participante.",
        fields: [
          {
            type: "text",
            entry: "2130323805",
            label: "Dirección",
            required: true,
            autocomplete: "street-address",
          },
          {
            type: "text",
            entry: "566890397",
            label: "Código Postal",
            required: true,
            autocomplete: "postal-code",
            inputmode: "numeric",
          },
          { type: "text", entry: "948638642", label: "Nacionalidad", required: true },
          {
            type: "tel",
            entry: "97509970",
            label: "Teléfono de contacto",
            required: true,
            autocomplete: "tel",
          },
        ],
      },
      {
        title: "Menores de 18 años",
        description: "Completa estos datos únicamente si el participante es menor de edad.",
        fields: [
          {
            type: "text",
            entry: "432248214",
            label: "Menores de 18 años indicar:\nNombre y Apellidos de la madre/padre ó tutor legal ",
          },
          {
            type: "text",
            entry: "851097291",
            label: "Menores de 18 años indicar:\nDNI de la madre/padre ó tutor legal ",
          },
          {
            type: "file",
            entry: "guardian-document-front",
            label: "DNI/NIE del tutor legal · parte delantera",
            accept: "image/*,.pdf",
            requiredWhenMinorEntry: "1065046570",
            help: "Obligatorio si el participante es menor de 18 años.",
          },
          {
            type: "file",
            entry: "guardian-document-back",
            label: "DNI/NIE del tutor legal · parte trasera",
            accept: "image/*,.pdf",
            requiredWhenMinorEntry: "1065046570",
            help: "Obligatorio si el participante es menor de 18 años.",
          },
          {
            type: "google-date",
            entry: "326584365",
            label: "Menores de 18 años indicar fecha de nacimiento de la madre/padre ó tutor legal",
          },
        ],
      },
      {
        title: "Forma de pago",
        description:
          "Puedes pagar mes a mes o hacer un solo pago al inicio de temporada con una bonificación del 5 % sobre el total de la cuota.",
        fields: [
          {
            type: "radio",
            entry: "506119602",
            label: "Elige la modalidad y forma de pago",
            required: true,
            options: [
              {
                label: "Pago mensual por domiciliación bancaria · El club ya tiene mis datos bancarios",
                submissionValue: "Mensual · domiciliación bancaria, datos bancarios ya disponibles",
                submitAsOther: true,
              },
              {
                label: "Pago mensual por domiciliación bancaria · Soy nuevo/a en el club",
                submissionValue: "Mensual · domiciliación bancaria, nuevo/a en el club",
                submitAsOther: true,
              },
              {
                label: "Un solo pago al inicio (5 % de bonificación) · Efectivo al entrenador o responsable del club",
                submissionValue: "Anual con bonificación del 5 % · Efectivo",
                submitAsOther: true,
              },
              {
                label: "Un solo pago al inicio (5 % de bonificación) · Domiciliación, el club ya tiene mis datos bancarios",
                submissionValue: "Anual con bonificación del 5 % · Domiciliación, datos bancarios ya disponibles",
                submitAsOther: true,
              },
              {
                label: "Un solo pago al inicio (5 % de bonificación) · Domiciliación, soy nuevo/a en el club",
                submissionValue: "Anual con bonificación del 5 % · Domiciliación, nuevo/a en el club",
                submitAsOther: true,
              },
            ],
            other: true,
          },
          {
            type: "radio",
            entry: "43401703",
            label:
              'Para pagos por domiciliación, los recibos se cargarán en cuenta el día 4. Las bajas deben comunicarse antes del día 20 del mes anterior mediante el formulario de "Solicitud de baja". Autorizo a Lô Esport Menorca a cargar los recibos derivados de la actividad en cuenta.',
            required: true,
            showWhenEntry: "506119602",
            showWhenValueIncludes: "domiciliación",
            options: ["AUTORIZO"],
          },
          {
            type: "bank-details",
            entry: "1121669907",
            label: "Datos bancarios para domiciliación",
            required: true,
            showWhenEntry: "506119602",
            showWhenValueIncludes: "nuevo/a en el club",
            help:
              "Necesario solo si eliges domiciliación y el club todavía no tiene tus datos bancarios.",
          },
        ],
      },
      {
        title: "Autorizaciones",
        fields: [
          {
            type: "notice",
            entry: "license-information",
            label: "Licencia y camiseta por categorías",
            help:
              "La licencia federativa es obligatoria hasta Sub-18 incluida. El club cubre su coste hasta Sub-12 incluida; desde Sub-14, el coste que apruebe la FAIB para cada categoría se abonará en enero. La camiseta Lô Esport está incluida hasta Sub-18; desde Sub-20 se adquiere aparte.",
          },
          {
            type: "radio",
            entry: "207757834",
            label:
              "Autorizo a que la imagen de mi hijo/a o la mía propia pueda ser publicada en fotografías correspondientes a actividades de la escuela deportiva, así como en filmaciones destinadas a difusión pública, no comercial o de ámbito educativo, en cumplimiento al derecho a la propia imagen reconocido en el artículo 18.1 de la constitución española y regulado en la ley 5/1982 sobre el derecho al honor, intimidad familiar y a la propia imagen",
            required: true,
            options: ["AUTORIZO", "NO AUTORIZO"],
          },
          {
            type: "radio",
            entry: "1909582878",
            label:
              "CATEGORIAS ESCOLARES:\nAutorizo a que mi hijo/a pueda hacer actividades puntuales fuera del lugar habitual de entrenamiento",
            options: ["AUTORIZO", "NO AUTORIZO"],
          },
          {
            type: "radio",
            entry: "661439025",
            label:
              "PARA ATLETAS CON LICENCIA DE ATLETISMO SE DEBERÁN CUMPLIR LAS NORMAS DE ACTUACIÓN EN CASO DE ACCIDENTE DEPORTIVO            Solicitar un parte de accidentes al entrenador y acudir al centro médico concertado: Policlínica Virgen de Gracia (Maó). El incumplimiento de esta norma puede generar gastos por parte de la Seguridad Social que irían a cargo y cuenta del adulto responsable del deportista",
            required: true,
            options: ["ENTIENDO LA NORMA"],
          },
          {
            type: "textarea",
            entry: "905211377",
            label: "Informaciones a tener en cuenta sobre el participante (Enfermadades, alergias ...)",
          },
          { type: "textarea", entry: "1933709984", label: "Observaciones o sugerencias:" },
        ],
      },
      {
        title: "Privacidad y condiciones",
        fields: [
          {
            type: "radio",
            entry: "577217566",
            label:
              "De conformidad con la LO 3/2018 y el Reglamento General de Protección de Datos 2016/679, los datos personales recogidos serán tratados por Lô Esport Menorca para gestionar la temporada 2026-27 y tramitar las licencias deportivas. Puedes ejercer tus derechos escribiendo a loesport@gmail.com.",
            required: true,
            options: ["CONOZCO Y ACEPTO PRIVACIDAD Y TRATAMIENTO DE MIS DATOS PERSONALES"],
            legal: true,
          },
          {
            type: "radio",
            entry: "818465818",
            label:
              "Condiciones de uso: quien cumplimenta este formulario declara que los datos consignados son reales. Al pulsar ENVIAR acepta las condiciones de uso y los reglamentos de Lô Esport Menorca.",
            required: true,
            options: ["ACEPTO"],
            legal: true,
          },
        ],
      },
    ],
  },
  preinscripcion: {
    title: "Prueba gratuita",
    eyebrow: "Prueba una semana",
    intro:
      "Ven a probar gratis nuestra actividad durante una semana. Después podrás formalizar la inscripción en nuestra web.",
    submitLabel: "Solicitar prueba",
    successTitle: "Solicitud recibida",
    success:
      "Hemos recibido tu solicitud con el grupo y los días elegidos. Desde el club contactaremos contigo para confirmar la prueba.",
    sections: [
      {
        title: "Elige tu grupo",
        description: "Confirma el grupo y elige cuántos días y cuáles quieres venir a probar.",
        fields: [
          {
            type: "group-selection",
            entry: "1264281896",
            submissionKey: "preinscripcion",
            label: "Dónde y cuándo quieres entrenar",
            required: true,
          },
        ],
      },
      {
        title: "Datos del participante",
        fields: [
          {
            type: "text",
            entry: "43453506",
            label: "Nombre y Apellidos",
            required: true,
            autocomplete: "name",
          },
          { type: "text", entry: "1329993054", label: "Población de residencia", required: true },
          { type: "date-text", entry: "1065046570", label: "Fecha de nacimiento", required: true },
          {
            type: "radio",
            entry: "984531499",
            label: "SEXO",
            required: true,
            options: ["FEMENINO", "MASCULINO"],
          },
          {
            type: "tel",
            entry: "97509970",
            label: "Teléfono de contacto",
            required: true,
            autocomplete: "tel",
          },
          {
            type: "textarea",
            entry: "1933709984",
            label: "Observaciones o sugerencias:",
            appendGroupSelection: true,
          },
        ],
      },
      {
        title: "Compromiso y privacidad",
        fields: [
          {
            type: "checkboxes",
            entry: "1853047302",
            label: "Me comprometo:",
            required: true,
            options: [
              "A rellenar el formulario inscripción que aparece en la página web del club www.loesport.es, una vez transcurrido el periodo de prueba gratuïto de 1 semana.",
            ],
          },
          {
            type: "radio",
            entry: "577217566",
            label:
              "De conformidad con lo previsto en la normativa de protección de datos de carácter personal (la LO 3/2018, de 5 de diciembre, de Protección de datos personales y garantía de los derechos digitales, LOPDyGDD y el Reglamento General sobre Protección de Datos 2016/679, de 27 de abril de 2016, RGPD, o norma que los sustituya), LES INFORMAMOS que los datos personales recogidos en el formulario de inscripción serán tratados por parte del club Alaior Esport como responsable del tratamiento con la única finalidad de programar la temporada 2025/26, así como para tramitar las licencias deportivas si fuera necesario. Les informamos que pueden ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad de los datos y oposición enviando un correo electrónico a loesport@gmail.com",
            required: true,
            options: ["CONOZCO Y ACEPTO PRIVACIDAD Y TRATAMIENTO DE MIS DATOS PERSONALES"],
            legal: true,
          },
          {
            type: "radio",
            entry: "262712769",
            label:
              "Condiciones de uso: Quien ha cumplimentado el presente formulario declara que los datos en él consignado son reales con lo que desde el momento que pulse sobre el botón ENVIAR supone su aceptación y la aceptación de las condiciones de uso y reglamentos del Club ALAIOR ESPORT",
            required: true,
            options: ["ACEPTO"],
            legal: true,
          },
        ],
      },
    ],
  },
  baja: {
    title: "Solicitud de baja",
    eyebrow: "Gestión de actividad",
    intro: "La baja debe solicitarse antes del día 20 del mes anterior a finalizar la actividad.",
    submitLabel: "Solicitar baja",
    successTitle: "Solicitud recibida",
    success:
      "Hemos recibido tu solicitud. En breve tramitaremos la baja. No dudes en contactar si decides reincorporarte.",
    sections: [
      {
        title: "Datos de la baja",
        fields: [
          { type: "text", entry: "1045781291", label: "Población de residencia", required: true },
          {
            type: "text",
            entry: "43453506",
            label: "Nombre y Apellidos",
            required: true,
            autocomplete: "name",
          },
          {
            type: "date-text",
            entry: "1065046570",
            label: "Fecha de nacimiento",
            required: true,
          },
          {
            type: "textarea",
            entry: "117660033",
            label:
              "Si lo desea, indique aquí el motivo por el que cursa baja de la actividad o si tiene alguna observación.",
          },
        ],
      },
      {
        title: "Privacidad y condiciones",
        fields: [
          {
            type: "radio",
            entry: "577217566",
            label:
              "De conformidad con lo previsto en la normativa de protección de datos de carácter personal (la LO 3/2018, de 5 de diciembre, de Protección de datos personales y garantía de los derechos digitales, LOPDyGDD y el Reglamento General sobre Protección de Datos 2016/679, de 27 de abril de 2016, RGPD, o norma que los sustituya), LES INFORMAMOS que los datos personales recogidos en el formulario de inscripción serán tratados por parte del club Alaior Esport como responsable del tratamiento con la única finalidad de programar la temporada 2021/22, así como para tramitar las licencias deportivas si fuera necesario. Les informamos que pueden ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad de los datos y oposición enviando un correo electrónico a loesport@gmail.com",
            required: true,
            options: ["CONOZCO Y ACEPTO PRIVACIDAD Y TRATAMIENTO DE MIS DATOS PERSONALES"],
            legal: true,
          },
          {
            type: "radio",
            entry: "913392475",
            label:
              "Condiciones de uso: Quien ha cumplimentado el presente formulario declara que los datos en él consignado son reales con lo que desde el momento que pulse sobre el botón ENVIAR supone su aceptación y la aceptación de las condiciones de uso y reglamentos del Club ALAIOR ESPORT",
            required: true,
            options: ["ACEPTO"],
            legal: true,
          },
        ],
      },
    ],
  },
  licencias: {
    title: "Licencias de atletismo",
    eyebrow: "Temporada 2026-27",
    intro: "Solicita el alta o la renovación de tu licencia autonómica o nacional.",
    documents: [
      {
        title: "Alta de licencia RFEA",
        description: "Descarga el documento de alta, rellénalo y fírmalo antes de enviarlo al club.",
        href: altaLicensePdfUrl,
      },
      {
        title: "Renovación de licencia RFEA",
        description: "Descarga el documento de renovación, rellénalo y fírmalo antes de enviarlo al club.",
        href: renewalLicensePdfUrl,
      },
    ],
    documentsNote:
      "Descarga el impreso que corresponda, rellénalo y adjúntalo firmado en este formulario junto con el DNI/NIE por las dos caras.",
    submitLabel: "Tramitar licencia",
    successTitle: "Solicitud recibida",
    success:
      "Ponemos en marcha la tramitación de tu licencia. Muchas gracias y feliz temporada.",
    sections: [
      {
        title: "Licencia",
        fields: [
          {
            type: "radio",
            entry: "1498135098",
            label: "TRAMITE",
            required: true,
            options: ["ALTA", "RENOVACION"],
          },
          {
            type: "radio",
            entry: "1973504877",
            label: "LICENCIA BALEAR AUTONÓMICA (Seleccione la licencia que desea)",
            options: [
              "CROSS-RUTA-TRAIL (50€)",
              "ATLETISMO sub.18  (51,50€)",
              "ATLETISMO categoría sub.20 (60€)",
              "ATLETISMO categoría sub.23 (76€)",
              "ATLETISMO categoría Sénior (76€)",
              "ATLETISMO categoria máster (81€)",
            ],
          },
          {
            type: "radio",
            entry: "299386162",
            label:
              "LICENCIA NACIONAL- Válida para competiciones autonómicas y nacionales\nSelecciones la licencia que desea:",
            options: [
              "ATLETISMO sub.16 (71,50€)",
              "ATLETISMO sub.18 (89,50€)",
              "ATLETISMO categoría sub.20 (98€)",
              "ATLETISMO categoría sub.23 (136€)",
              "ATLETISMO categoría Sénior (136€)",
              "ATLETISMO categoria Máster (141€)",
            ],
          },
        ],
      },
      {
        title: "Datos personales",
        fields: [
          {
            type: "text",
            entry: "1286702453",
            label: "NOMBRE Y APELLIDOS",
            required: true,
            autocomplete: "name",
          },
          { type: "date-text", entry: "2606285", label: "FECHA DE NACIMIENTO", required: true },
          { type: "text", entry: "945385681", label: "DNI ó NIE", required: true },
          {
            type: "file",
            entry: "license-signed-form",
            label: "Impreso de licencia firmado",
            required: true,
            accept: "image/*,.pdf",
            help: "Adjunta el documento de alta o renovación RFEA ya rellenado y firmado.",
          },
          {
            type: "file",
            entry: "license-document-front",
            label: "DNI/NIE · parte delantera",
            required: true,
            accept: "image/*,.pdf",
            help: "Adjunta foto o PDF del anverso del DNI o NIE.",
          },
          {
            type: "file",
            entry: "license-document-back",
            label: "DNI/NIE · parte trasera",
            required: true,
            accept: "image/*,.pdf",
            help: "Adjunta foto o PDF del reverso del DNI o NIE.",
          },
          {
            type: "file",
            entry: "license-nie-census",
            label: "Certificado de empadronamiento para NIE",
            accept: "image/*,.pdf",
            requiredWhenNieEntry: "945385681",
            help:
              "Obligatorio solo si el documento indicado es NIE. Debe tener una antigüedad máxima de 3 meses.",
          },
          {
            type: "radio",
            entry: "1992566615",
            label:
              "Para cumplir con el reglamento FAIB y poder validar la licencia, los atletas extranjeros con documentación NIE deberán aportar una fotocopia del NIE y un certificado de empadronamiento con una antigüedad máxima de 3 meses, al correo electrónico del club: loesport@gmail.com ",
            required: true,
            options: ["Entiendo la norma"],
          },
          {
            type: "text",
            entry: "1385629040",
            label: "DOMICILIO",
            required: true,
            autocomplete: "street-address",
          },
          {
            type: "text",
            entry: "405526252",
            label: "CODIGO POSTAL",
            required: true,
            autocomplete: "postal-code",
            inputmode: "numeric",
          },
          { type: "text", entry: "1268392866", label: "CIUDAD Y PROVINCIA" },
          { type: "text", entry: "371836545", label: "NACIONALIDAD" },
          {
            type: "tel",
            entry: "613103488",
            label: "TELEFONO DE CONTACTO",
            required: true,
            autocomplete: "tel",
          },
        ],
      },
      {
        title: "Pago",
        fields: [
          {
            type: "radio",
            entry: "1180835478",
            label: "FORMA DE PAGO LICENCIA",
            options: [
              "EFECTIVO (entregar al entrenador o algún responsable del club)",
              "DOMICILIACION BANCARIA, soy deportista del club y ya tienen mis datos bancarios.",
              "DOMICILACION BANCARIA, soy nuevo en el club.",
            ],
            other: true,
          },
          {
            type: "text",
            entry: "1098533702",
            label:
              "Si eres nuevo en el club y has elegido la opción de pago por domiciliación bancaria, indica el número de cuenta.   ",
            autocomplete: "off",
          },
          {
            type: "radio",
            entry: "171988604",
            label:
              "Doy mi AUTORIZACION a Lô Esport Menorca para que cargue el recibo derivado del coste de la tramitación de la licencia en cuenta.  ",
            options: ["AUTORIZO"],
          },
          { type: "textarea", entry: "1830396874", label: "Observaciones" },
        ],
      },
      {
        title: "Privacidad y condiciones",
        fields: [
          {
            type: "radio",
            entry: "1149625315",
            label:
              "De conformidad con lo previsto en la normativa de protección de datos de carácter personal (la LO 3/2018, de 5 de diciembre, de Protección de datos personales y garantía de los derechos digitales, LOPDyGDD y el Reglamento General sobre Protección de Datos 2016/679, de 27 de abril de 2016, RGPD, o norma que los sustituya), LES INFORMAMOS que los datos personales recogidos en el formulario de inscripción serán tratados por parte del club Lô Esport Menorca como responsable del tratamiento con la única finalidad de programar la temporada 2026 y para tramitar las licencias deportivas. Les informamos que pueden ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad de los datos y oposición enviando un correo electrónico a loesport@gmail.com",
            required: true,
            options: ["CONOZCO Y ACEPTO PRIVACIDAD Y TRATAMIENTO DE MIS DATOS PERSONALES"],
            legal: true,
          },
          {
            type: "radio",
            entry: "2041182478",
            label:
              "Condiciones de uso: Quien ha cumplimentado el presente formulario declara que los datos en él consignado son reales con lo que desde el momento que pulse sobre el botón ENVIAR supone su aceptación y la aceptación de las condiciones de uso y reglamentos del Club Lô Esport Menorca",
            required: true,
            options: ["ACEPTO"],
            legal: true,
          },
        ],
      },
    ],
  },
};

const groupSelectionControllers = new WeakMap();

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createInput(field) {
  const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
  if (input instanceof HTMLInputElement) {
    input.type = field.type === "date-text" || field.type === "google-date" ? "date" : field.type;
  } else {
    input.rows = field.rows || 4;
  }

  if (field.type === "google-date") {
    input.dataset.googleDate = field.entry;
  } else if (field.type === "file") {
    input.name = `attachment-${field.entry}`;
    input.dataset.fileInput = "";
    if (field.requiredWhenNieEntry) input.dataset.requiredWhenNieEntry = field.requiredWhenNieEntry;
    if (field.requiredWhenMinorEntry) input.dataset.requiredWhenMinorEntry = field.requiredWhenMinorEntry;
  } else if (field.appendGroupSelection) {
    input.dataset.appendGroupSelection = field.entry;
  } else {
    input.name = `entry.${field.entry}`;
  }

  if (field.required) input.required = true;
  if (field.accept) input.accept = field.accept;
  if (field.autocomplete) input.autocomplete = field.autocomplete;
  if (field.inputmode) input.inputMode = field.inputmode;
  input.id = `entry-${field.entry}`;
  return input;
}

function createHiddenSubmissionInput(entry) {
  if (!entry) return null;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = `entry.${entry}`;
  return input;
}

function createFlowStep(number, title, description) {
  const step = document.createElement("section");
  step.className = "registration-flow-step";

  const heading = document.createElement("header");
  heading.className = "registration-flow-heading";
  const marker = createTextElement("span", "registration-flow-number", String(number).padStart(2, "0"));
  marker.setAttribute("aria-hidden", "true");
  heading.append(marker, createTextElement("h3", "", title));
  if (description) heading.append(createTextElement("p", "", description));

  const options = document.createElement("div");
  options.className = "registration-flow-options";
  step.append(heading, options);
  return { step, heading, options };
}

function createFlowChoice({ type, name, id, value, title, meta, detail, className = "" }) {
  const label = document.createElement("label");
  label.className = `registration-flow-choice ${className}`.trim();

  const input = document.createElement("input");
  input.type = type;
  input.name = name;
  input.id = id;
  input.value = value;

  const marker = document.createElement("span");
  marker.className = "registration-flow-marker";
  marker.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "registration-flow-choice-text";
  text.append(createTextElement("strong", "", title));
  if (meta) text.append(createTextElement("span", "", meta));
  if (detail) text.append(createTextElement("small", "", detail));

  label.append(input, marker, text);
  return { label, input };
}

function formatDayCount(count) {
  return `${count} ${count === 1 ? "día" : "días"}`;
}

function createGroupSelectionField(wrapper, field) {
  wrapper.classList.add("registration-group-flow-field");
  wrapper.dataset.groupSelection = "";

  const requestedGroupId = new URLSearchParams(window.location.search).get("grupo");
  const requestedGroup = getTrainingGroup(requestedGroupId);
  const contextualGroup = requestedGroup?.formValues[field.submissionKey] ? requestedGroup : null;
  const stepOffset = contextualGroup ? 1 : 0;
  const state = {
    locationId: contextualGroup?.location || "",
    group: null,
    dayCount: null,
    selectedDays: new Set(),
  };

  const groupSubmission = createHiddenSubmissionInput(field.entry);
  const dayCountSubmission = createHiddenSubmissionInput(field.dayCountEntry);
  const daysSubmission = createHiddenSubmissionInput(field.daysEntry);

  const flow = document.createElement("div");
  flow.className = "registration-group-flow";

  const locationStep = createFlowStep(
    1,
    "¿Dónde quieres entrenar?",
    "Elige una sede para ver únicamente los grupos de ese pueblo.",
  );
  locationStep.options.classList.add("registration-location-options");

  const groupStep = createFlowStep(
    2 - stepOffset,
    contextualGroup ? "Grupo seleccionado" : "Elige tu grupo",
    contextualGroup
      ? "Has llegado desde la página de este grupo."
      : "Solo aparecen los grupos de la sede que acabas de elegir.",
  );
  groupStep.options.classList.add("registration-group-options");
  groupStep.step.hidden = !contextualGroup;

  const countStep = createFlowStep(
    3 - stepOffset,
    "¿Cuántos días quieres entrenar?",
    "Verás únicamente las opciones disponibles para este grupo.",
  );
  countStep.options.classList.add("registration-count-options");
  countStep.step.hidden = true;

  const daysStep = createFlowStep(
    4 - stepOffset,
    "¿Qué días vas a venir?",
    "Marca los días concretos de entrenamiento.",
  );
  daysStep.options.classList.add("registration-specific-day-options");
  daysStep.step.hidden = true;
  const dayStatus = createTextElement("p", "registration-day-status", "");
  daysStep.step.append(dayStatus);

  const error = createTextElement("p", "registration-flow-error", "");
  error.hidden = true;
  error.setAttribute("role", "alert");

  function clearError() {
    error.hidden = true;
    error.textContent = "";
  }

  function showError(message, target, focus = false) {
    error.textContent = message;
    error.hidden = false;
    if (focus) target?.focus();
    return false;
  }

  function resetSchedule() {
    state.group = null;
    state.dayCount = null;
    state.selectedDays.clear();
    groupSubmission.value = "";
    if (dayCountSubmission) dayCountSubmission.value = "";
    if (daysSubmission) daysSubmission.value = "";
    countStep.options.replaceChildren();
    daysStep.options.replaceChildren();
    dayStatus.textContent = "";
    countStep.step.hidden = true;
    daysStep.step.hidden = true;
  }

  function selectedDayObjects() {
    if (!state.group) return [];
    return state.group.days.filter((day) => state.selectedDays.has(day.id));
  }

  function updateSubmissionValues() {
    if (!state.group || !state.dayCount) return;
    const selectedDays = selectedDayObjects();
    if (dayCountSubmission) {
      dayCountSubmission.value = `${state.dayCount.count} ${state.dayCount.count === 1 ? "día" : "días"} a la semana`;
    }
    if (daysSubmission) {
      const schedule = selectedDays
        .map((day) => `${day.label}${day.detail ? ` (${day.detail})` : ""}`)
        .join(" · ");
      daysSubmission.value = `${state.group.title} · ${formatDayCount(state.dayCount.count)} por semana · ${schedule}`;
    }
    dayStatus.replaceChildren(
      String(selectedDays.length),
      " de ",
      String(state.dayCount.count),
      " días seleccionados",
    );
  }

  function renderDays(dayCount) {
    state.dayCount = dayCount;
    state.selectedDays.clear();
    daysStep.options.replaceChildren();
    clearError();

    const allowedIds = dayCount.allowedDays || state.group.days.map((day) => day.id);
    const requiredIds = new Set(dayCount.requiredDays || []);
    const fixedIds = new Set(requiredIds);
    if (allowedIds.length === dayCount.count) allowedIds.forEach((id) => fixedIds.add(id));
    fixedIds.forEach((id) => state.selectedDays.add(id));

    state.group.days
      .filter((day) => allowedIds.includes(day.id))
      .forEach((day, index) => {
        const choice = createFlowChoice({
          type: "checkbox",
          name: `training-days-${field.entry}`,
          id: `training-day-${field.entry}-${day.id}`,
          value: day.id,
          title: day.label,
          meta: day.detail,
          detail: fixedIds.has(day.id) ? "Incluido en esta opción" : "",
          className: "registration-specific-day-choice",
        });
        choice.input.checked = state.selectedDays.has(day.id);
        choice.input.disabled = fixedIds.has(day.id);
        choice.label.classList.toggle("is-fixed", fixedIds.has(day.id));
        choice.input.addEventListener("change", () => {
          clearError();
          if (choice.input.checked && state.selectedDays.size >= dayCount.count) {
            choice.input.checked = false;
            showError(`Solo puedes elegir ${formatDayCount(dayCount.count)}.`, choice.input);
            return;
          }

          if (choice.input.checked) state.selectedDays.add(day.id);
          else state.selectedDays.delete(day.id);
          updateSubmissionValues();
        });
        if (index === 0) choice.input.dataset.firstTrainingDay = "";
        daysStep.options.append(choice.label);
      });

    daysStep.step.hidden = false;
    updateSubmissionValues();
  }

  function selectDayCount(dayCount) {
    renderDays(dayCount);
  }

  function renderDayCounts(group) {
    countStep.options.replaceChildren();
    daysStep.step.hidden = true;
    group.dayCounts.forEach((dayCount, index) => {
      const choice = createFlowChoice({
        type: "radio",
        name: `training-count-${field.entry}`,
        id: `training-count-${field.entry}-${dayCount.count}`,
        value: String(dayCount.count),
        title: formatDayCount(dayCount.count),
        meta: dayCount.price,
        detail: dayCount.note,
        className: "registration-count-choice",
      });
      choice.input.required = true;
      choice.input.addEventListener("change", () => {
        clearError();
        selectDayCount(dayCount);
      });
      countStep.options.append(choice.label);

      if (group.dayCounts.length === 1 && index === 0) {
        choice.input.checked = true;
        selectDayCount(dayCount);
      }
    });
    countStep.step.hidden = false;
  }

  function selectGroup(group) {
    state.group = group;
    state.dayCount = null;
    state.selectedDays.clear();
    groupSubmission.value = group.formValues[field.submissionKey];
    if (dayCountSubmission) dayCountSubmission.value = "";
    if (daysSubmission) daysSubmission.value = "";
    clearError();
    renderDayCounts(group);
  }

  function renderGroups(locationId, fixedGroup = null) {
    groupStep.options.replaceChildren();
    resetSchedule();
    const groups = fixedGroup
      ? [fixedGroup]
      : TRAINING_GROUPS.filter((group) => group.location === locationId);

    groups.forEach((group, index) => {
      const location = getTrainingLocation(group.location);
      const choice = createFlowChoice({
        type: "radio",
        name: `training-group-${field.entry}`,
        id: `training-group-${field.entry}-${group.id}`,
        value: group.id,
        title: group.title,
        meta: `${location.title} · ${group.category}`,
        detail: group.schedule,
        className: "registration-group-choice",
      });
      choice.input.required = true;
      choice.input.addEventListener("change", () => selectGroup(group));
      groupStep.options.append(choice.label);

      if ((fixedGroup || groups.length === 1) && index === 0) {
        choice.input.checked = true;
        selectGroup(group);
      }
    });
    groupStep.step.hidden = false;
  }

  function selectLocation(locationId) {
    state.locationId = locationId;
    clearError();
    renderGroups(locationId);
  }

  if (!contextualGroup) {
    TRAINING_LOCATIONS.forEach((location) => {
      const choice = createFlowChoice({
        type: "radio",
        name: `training-location-${field.entry}`,
        id: `training-location-${field.entry}-${location.id}`,
        value: location.id,
        title: location.title,
        meta: "Ver grupos de esta sede",
        className: "registration-location-choice",
      });
      choice.input.required = true;
      choice.input.addEventListener("change", () => selectLocation(location.id));
      locationStep.options.append(choice.label);
    });
    flow.append(locationStep.step);
  }

  flow.append(groupStep.step, countStep.step, daysStep.step, error);

  if (contextualGroup) {
    renderGroups(contextualGroup.location, contextualGroup);
    const changeLink = createTextElement("a", "registration-change-group", "Cambiar de grupo");
    changeLink.href = window.location.pathname;
    groupStep.heading.append(changeLink);
  }

  wrapper.append(flow, groupSubmission);
  if (dayCountSubmission) wrapper.append(dayCountSubmission);
  if (daysSubmission) wrapper.append(daysSubmission);

  groupSelectionControllers.set(wrapper, {
    validate({ focus = false } = {}) {
      if (!state.locationId) {
        return showError(
          "Elige dónde quieres entrenar.",
          locationStep.options.querySelector("input"),
          focus,
        );
      }
      if (!state.group) {
        return showError("Elige un grupo.", groupStep.options.querySelector("input"), focus);
      }
      if (!state.dayCount) {
        return showError(
          "Elige cuántos días quieres entrenar.",
          countStep.options.querySelector("input"),
          focus,
        );
      }
      if (state.selectedDays.size !== state.dayCount.count) {
        return showError(
          `Selecciona exactamente ${formatDayCount(state.dayCount.count)}.`,
          daysStep.options.querySelector("input:not(:disabled)") || countStep.options.querySelector("input:checked"),
          focus,
        );
      }

      if (state.dayCount.restriction === "female") {
        const selectedSex = wrapper.closest("form")?.querySelector('input[name="entry.984531499"]:checked');
        if (selectedSex?.value === "MASCULINO") {
          return showError(
            "La opción de 3 días de este grupo es solo para mujeres. Elige 1 o 2 días.",
            countStep.options.querySelector("input:checked"),
            focus,
          );
        }
      }

      clearError();
      return true;
    },
    getSummary() {
      if (!state.group || !state.dayCount) return [];
      const location = getTrainingLocation(state.group.location);
      const selectedDays = selectedDayObjects().map(
        (day) => `${day.label}${day.detail ? ` · ${day.detail}` : ""}`,
      );
      return [
        `Sede: ${location.title}`,
        `Grupo: ${state.group.title}`,
        `Días por semana: ${state.dayCount.count}`,
        `Días elegidos: ${selectedDays.join(" | ")}`,
      ];
    },
  });
}

function createChoice(field, option, index, isOther = false) {
  const hasStructuredDetails = !isOther && typeof option === "object" && Array.isArray(option.details);
  const submitsAsOther = !isOther && typeof option === "object" && option.submitAsOther;
  const container = hasStructuredDetails ? document.createElement("div") : null;
  if (container) container.className = "registration-choice-card";

  const choice = document.createElement("label");
  choice.className = "registration-choice";

  const input = document.createElement("input");
  input.type = field.type === "checkboxes" ? "checkbox" : "radio";
  input.name = `entry.${field.entry}`;
  const optionLabel = typeof option === "object" ? option.label || option.title : option;
  const optionValue =
    typeof option === "object" ? option.value || option.submissionValue || option.label || option.title : option;
  input.value = isOther || submitsAsOther ? "__other_option__" : optionValue;
  input.dataset.optionLabel = optionLabel;
  input.dataset.submissionValue = optionValue;
  input.id = `entry-${field.entry}-${index}`;
  if (field.required && field.type === "radio") input.required = true;

  const marker = document.createElement("span");
  marker.className = "registration-choice-marker";
  marker.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "registration-choice-text";
  if (hasStructuredDetails) {
    const title = createTextElement("strong", "registration-choice-title", option.title);
    const meta = createTextElement("span", "registration-choice-meta", option.meta);
    text.append(title, meta);
  } else {
    text.textContent = isOther ? "Otro:" : optionLabel;
  }
  choice.append(input, marker, text);

  if (submitsAsOther) {
    const fixedResponse = document.createElement("input");
    fixedResponse.type = "hidden";
    fixedResponse.name = `entry.${field.entry}.other_option_response`;
    fixedResponse.value = option.submissionValue;
    fixedResponse.disabled = true;
    fixedResponse.dataset.otherResponse = "";
    choice.append(fixedResponse);
  }

  if (isOther) {
    const otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.className = "registration-other-input";
    otherInput.name = `entry.${field.entry}.other_option_response`;
    otherInput.dataset.otherResponse = "";
    otherInput.setAttribute("aria-label", "Otra respuesta");
    otherInput.addEventListener("focus", () => {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    choice.append(otherInput);
  }

  if (field.other || submitsAsOther) {
    input.addEventListener("change", () => {
      const choices = choice.closest(".registration-choices");
      choices?.querySelectorAll("[data-other-response]").forEach((response) => {
        const responseChoice = response.closest(".registration-choice");
        response.disabled = !responseChoice?.querySelector('input[type="radio"]')?.checked;
      });
      if (isOther && input.checked) choice.querySelector(".registration-other-input")?.focus();
    });
  }

  if (!container) return choice;

  const details = document.createElement("details");
  details.className = "registration-choice-details";
  details.innerHTML = `
    <summary>Ver horario y cuota</summary>
    <ul>${option.details.map((detail) => `<li>${detail}</li>`).join("")}</ul>
  `;
  container.append(choice, details);
  return container;
}

function createTrainingOptionsField(wrapper, field) {
  const stateInput = document.createElement("input");
  stateInput.type = "text";
  stateInput.name = `entry.${field.entry}`;
  stateInput.id = `entry-${field.entry}`;
  stateInput.className = "registration-training-value";
  stateInput.placeholder = "Selecciona los días para continuar";
  stateInput.readOnly = true;
  if (field.required) stateInput.required = true;

  const choices = document.createElement("div");
  choices.className = "registration-training-options";

  const daysPanel = document.createElement("div");
  daysPanel.className = "registration-day-selector";
  daysPanel.hidden = true;

  const daysIntro = createTextElement("p", "", "Marca los días que quiere entrenar:");
  const dayChoices = document.createElement("div");
  dayChoices.className = "registration-day-options";
  const availableDays = ["Lunes", "Martes", "Miércoles", "Jueves"];
  availableDays.forEach((day) => {
    const label = document.createElement("label");
    label.className = "registration-day-choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = day;
    const marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    label.append(input, marker, document.createTextNode(day));
    dayChoices.append(label);
  });
  daysPanel.append(daysIntro, dayChoices);

  const manualPanel = document.createElement("div");
  manualPanel.className = "registration-manual-schedule";
  manualPanel.hidden = true;
  const manualLabel = document.createElement("label");
  manualLabel.textContent = "Indica aquí el horario o días de ese grupo";
  const manualInput = document.createElement("textarea");
  manualInput.rows = 2;
  manualInput.placeholder = "Ejemplo: martes y jueves, 17:15-18:15";
  manualLabel.append(manualInput);
  manualPanel.append(manualLabel);

  function selectedOption() {
    return choices.querySelector('input[type="radio"]:checked');
  }

  function updateValue() {
    const option = selectedOption();
    if (!option) {
      stateInput.value = "";
    } else if (option.dataset.customDays === "true") {
      const selectedDays = [...dayChoices.querySelectorAll("input:checked")].map((input) => input.value);
      stateInput.value = selectedDays.length
        ? `${option.dataset.title} · ${selectedDays.join(", ")}`
        : "";
    } else if (option.dataset.manual === "true") {
      stateInput.value = manualInput.value.trim() ? `${option.dataset.title} · ${manualInput.value.trim()}` : "";
    } else {
      stateInput.value = `${option.dataset.title} · ${option.dataset.summary} · ${option.dataset.detail}`;
    }

    daysPanel.hidden = option?.dataset.customDays !== "true";
    manualPanel.hidden = option?.dataset.manual !== "true";
    stateInput.setCustomValidity(stateInput.value ? "" : "Selecciona o indica los días concretos.");
  }

  field.options.forEach((option, index) => {
    const label = document.createElement("label");
    label.className = "registration-training-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `training-option-${field.entry}`;
    input.value = option.title;
    input.dataset.title = option.title;
    input.dataset.summary = option.summary;
    input.dataset.detail = option.detail;
    if (option.customDays) input.dataset.customDays = "true";
    if (option.manual) input.dataset.manual = "true";
    input.id = `training-option-${field.entry}-${index}`;

    const marker = document.createElement("span");
    marker.className = "registration-choice-marker";
    marker.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "registration-choice-text";
    text.append(
      createTextElement("strong", "registration-choice-title", option.title),
      createTextElement("span", "registration-choice-meta", option.summary),
      createTextElement("small", "registration-training-detail", option.detail),
    );

    label.append(input, marker, text);
    input.addEventListener("change", updateValue);
    choices.append(label);
  });

  dayChoices.addEventListener("change", updateValue);
  manualInput.addEventListener("input", updateValue);
  stateInput.addEventListener("invalid", () => {
    choices.querySelector('input[type="radio"]')?.focus();
  });
  updateValue();
  wrapper.classList.add("registration-training-field");
  wrapper.append(choices, daysPanel, manualPanel, stateInput);
}

function createBankDetailsField(wrapper, field) {
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = `entry.${field.entry}`;
  hidden.id = `entry-${field.entry}`;
  hidden.dataset.bankDetailsValue = "";

  const fields = document.createElement("div");
  fields.className = "registration-bank-grid";

  const accountHolder = document.createElement("label");
  accountHolder.className = "registration-bank-input";
  accountHolder.append(createTextElement("span", "", "Titular de la cuenta"));
  const accountHolderInput = document.createElement("input");
  accountHolderInput.type = "text";
  accountHolderInput.autocomplete = "name";
  accountHolderInput.dataset.conditionalRequiredInput = "";
  accountHolder.append(accountHolderInput);

  const iban = document.createElement("label");
  iban.className = "registration-bank-input";
  iban.append(createTextElement("span", "", "IBAN"));
  const ibanInput = document.createElement("input");
  ibanInput.type = "text";
  ibanInput.autocomplete = "off";
  ibanInput.inputMode = "text";
  ibanInput.placeholder = "ES00 0000 0000 0000 0000 0000";
  ibanInput.dataset.conditionalRequiredInput = "";
  iban.append(ibanInput);

  function updateValue() {
    hidden.value = [
      accountHolderInput.value.trim() ? `Titular: ${accountHolderInput.value.trim()}` : "",
      ibanInput.value.trim() ? `IBAN: ${ibanInput.value.trim().toUpperCase()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  accountHolderInput.addEventListener("input", updateValue);
  ibanInput.addEventListener("input", updateValue);
  fields.append(accountHolder, iban);
  wrapper.classList.add("registration-bank-field");
  wrapper.append(fields, hidden);
}

function createField(field) {
  const wrapper = document.createElement("fieldset");
  wrapper.className = `registration-field${field.legal ? " is-legal" : ""}`;
  wrapper.dataset.entry = field.entry;
  if (field.showWhenEntry) {
    wrapper.dataset.showWhenEntry = field.showWhenEntry;
    if (field.showWhenValueIncludes) wrapper.dataset.showWhenValueIncludes = field.showWhenValueIncludes;
    if (field.required) wrapper.dataset.conditionalRequired = "true";
  }

  const legend = createTextElement("legend", "registration-label", field.label);
  if (field.required) {
    const required = createTextElement("span", "registration-required", "(Obligatorio)");
    legend.append(" ", required);
  } else if (field.requiredWhenNieEntry) {
    const required = createTextElement("span", "registration-required", "(Obligatorio si NIE)");
    legend.append(" ", required);
  } else if (field.requiredWhenMinorEntry) {
    const required = createTextElement("span", "registration-required", "(Obligatorio si menor)");
    legend.append(" ", required);
  }
  wrapper.append(legend);

  if (field.help) wrapper.append(createTextElement("p", "registration-help", field.help));

  if (field.type === "notice") {
    wrapper.classList.add("is-notice");
  } else if (field.type === "group-selection") {
    createGroupSelectionField(wrapper, field);
  } else if (field.type === "training-options") {
    createTrainingOptionsField(wrapper, field);
  } else if (field.type === "bank-details") {
    createBankDetailsField(wrapper, field);
  } else if (field.type === "file") {
    wrapper.classList.add("registration-file-field");
    const input = createInput(field);
    const shell = document.createElement("label");
    shell.className = "registration-file-drop";
    shell.htmlFor = input.id;
    shell.append(
      createTextElement("span", "registration-file-action", "Seleccionar archivo"),
      createTextElement("span", "registration-file-name", "Ningún archivo seleccionado"),
    );
    input.addEventListener("change", () => {
      const fileName = input.files?.[0]?.name || "Ningún archivo seleccionado";
      shell.querySelector(".registration-file-name").textContent = fileName;
    });
    wrapper.append(input, shell);
  } else if (field.type === "radio" || field.type === "checkboxes") {
    const choices = document.createElement("div");
    choices.className = "registration-choices";
    if (field.type === "checkboxes" && field.required) {
      choices.dataset.requiredCheckboxes = "";
      choices.dataset.error = "Selecciona al menos una opción.";
    }
    field.options.forEach((option, index) => choices.append(createChoice(field, option, index)));
    if (field.other) choices.append(createChoice(field, "", field.options.length, true));
    wrapper.append(choices);
  } else {
    wrapper.append(createInput(field));
  }

  return wrapper;
}

function createSection(section, index) {
  const wrapper = document.createElement("section");
  wrapper.className = "registration-section";
  wrapper.setAttribute("aria-labelledby", `registration-section-${index}`);

  const heading = document.createElement("header");
  heading.className = "registration-section-heading";
  heading.append(
    createTextElement("span", "registration-section-number", String(index + 1).padStart(2, "0")),
    createTextElement("h2", "", section.title),
  );
  if (section.description) heading.append(createTextElement("p", "", section.description));

  const fields = document.createElement("div");
  fields.className = "registration-fields";
  section.fields.forEach((field) => fields.append(createField(field)));
  wrapper.append(heading, fields);
  return wrapper;
}

function validateCheckboxGroups(form) {
  let valid = true;
  form.querySelectorAll("[data-required-checkboxes]").forEach((group) => {
    const first = group.querySelector('input[type="checkbox"]');
    const hasSelection = Boolean(group.querySelector('input[type="checkbox"]:checked'));
    first.setCustomValidity(hasSelection ? "" : group.dataset.error);
    if (!hasSelection) valid = false;
  });
  return valid;
}

function validateOtherResponses(form) {
  let valid = true;
  form.querySelectorAll(".registration-other-input").forEach((input) => {
    const otherOption = input.closest(".registration-choice")?.querySelector('input[type="radio"]');
    const missingResponse = Boolean(otherOption?.checked && !input.value.trim());
    input.setCustomValidity(missingResponse ? "Escribe la otra respuesta." : "");
    if (missingResponse) valid = false;
  });
  return valid;
}

function validateTrainingOptions(form) {
  let valid = true;
  form.querySelectorAll(".registration-training-value").forEach((input) => {
    const isComplete = Boolean(input.value.trim());
    input.setCustomValidity(isComplete ? "" : "Selecciona o indica los días concretos.");
    if (!isComplete) valid = false;
  });
  return valid;
}

function selectedEntryText(form, entry) {
  const selected = form.querySelector(`[name="entry.${entry}"]:checked`);
  if (!selected) return "";
  const otherResponse = selected
    .closest(".registration-choice")
    ?.querySelector("[data-other-response]:not(:disabled)");
  return [
    selected.value,
    selected.dataset.submissionValue,
    selected.dataset.optionLabel,
    otherResponse?.value,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function updateConditionalFields(form) {
  form.querySelectorAll("[data-show-when-entry]").forEach((field) => {
    const selectedText = selectedEntryText(form, field.dataset.showWhenEntry);
    const expectedText = (field.dataset.showWhenValueIncludes || "").toLowerCase();
    const isVisible = expectedText ? selectedText.includes(expectedText) : Boolean(selectedText);

    field.hidden = !isVisible;
    field.querySelectorAll("input, textarea, select").forEach((input) => {
      const isGeneratedValue = input.dataset.bankDetailsValue !== undefined;
      input.disabled = !isVisible;
      if (input.dataset.conditionalRequiredInput !== undefined) {
        input.required = isVisible && field.dataset.conditionalRequired === "true";
      } else if (field.dataset.conditionalRequired === "true") {
        input.required = isVisible && !isGeneratedValue;
      }
      if (!isVisible && !isGeneratedValue && input instanceof HTMLInputElement) {
        if (input.type === "radio" || input.type === "checkbox") input.checked = false;
        else input.value = "";
      } else if (!isVisible && isGeneratedValue) {
        input.value = "";
      } else if (!isVisible && input instanceof HTMLTextAreaElement) {
        input.value = "";
      }
      input.setCustomValidity("");
    });
  });
}

function validateGroupSelections(form, { focus = false } = {}) {
  for (const wrapper of form.querySelectorAll("[data-group-selection]")) {
    const controller = groupSelectionControllers.get(wrapper);
    if (controller && !controller.validate({ focus })) return false;
  }
  return true;
}

function looksLikeNie(value) {
  return /^[XYZ]/i.test(value.trim());
}

function isMinorFromDate(value) {
  if (!value) return false;
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age < 18;
}

function validateFileInputs(form) {
  let valid = true;
  form.querySelectorAll("[data-file-input]").forEach((input) => {
    let message = "";
    if (input.required && !input.files?.length) {
      message = "Adjunta este archivo para poder enviar el formulario.";
    }

    const relatedEntry = input.dataset.requiredWhenNieEntry;
    if (!message && relatedEntry) {
      const documentInput = form.querySelector(`[name="entry.${relatedEntry}"]`);
      const isRequired = documentInput && looksLikeNie(documentInput.value);
      if (isRequired && !input.files?.length) {
        message = "El certificado de empadronamiento es obligatorio si el documento es NIE.";
      }
    }

    const minorEntry = input.dataset.requiredWhenMinorEntry;
    if (!message && minorEntry) {
      const birthDateInput = form.querySelector(`[name="entry.${minorEntry}"]`);
      const isRequired = birthDateInput && isMinorFromDate(birthDateInput.value);
      if (isRequired && !input.files?.length) {
        message = "Este documento es obligatorio si el participante es menor de 18 años.";
      }
    }

    input.setCustomValidity(message);
    input.closest(".registration-file-field")?.classList.toggle("has-error", Boolean(message));
    if (message) valid = false;
  });
  return valid;
}

function choiceValue(input) {
  const response = input
    .closest(".registration-choice")
    ?.querySelector("[data-other-response]:not(:disabled)")
    ?.value?.trim();
  return response || input.dataset.optionLabel || input.dataset.submissionValue || input.value;
}

function collectRegistrationSubmission(definition, form) {
  const answers = [];
  const attachments = [];

  definition.sections.forEach((section) => {
    section.fields.forEach((field) => {
      const wrapper = form.querySelector(`[data-entry="${CSS.escape(field.entry)}"]`);
      if (!wrapper || wrapper.hidden || field.type === "notice") return;

      if (field.type === "group-selection") {
        const controller = groupSelectionControllers.get(wrapper);
        (controller?.getSummary() || []).forEach((line) => {
          const separator = line.indexOf(":");
          answers.push({
            section: section.title,
            label: separator === -1 ? field.label : line.slice(0, separator),
            value: separator === -1 ? line : line.slice(separator + 1).trim(),
          });
        });
        return;
      }

      if (field.type === "file") {
        const input = wrapper.querySelector("[data-file-input]");
        const files = [...(input?.files || [])];
        files.forEach((file) => attachments.push({ label: field.label, file }));
        answers.push({
          section: section.title,
          label: field.label,
          value: files.map((file) => file.name).join(", ") || "Sin archivo",
        });
        return;
      }

      if (field.type === "radio" || field.type === "checkboxes") {
        const selected = [...wrapper.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked')];
        answers.push({
          section: section.title,
          label: field.label,
          value: selected.map(choiceValue).filter(Boolean).join(", ") || "Sin respuesta",
        });
        return;
      }

      const generatedValue = wrapper.querySelector(`[name="entry.${CSS.escape(field.entry)}"]`);
      const visibleInput = wrapper.querySelector(
        'input:not([type="hidden"]):not([type="file"]), textarea, select',
      );
      answers.push({
        section: section.title,
        label: field.label,
        value: (generatedValue?.value || visibleInput?.value || "").trim() || "Sin respuesta",
      });
    });
  });

  return { answers, attachments };
}

function setSubmittingState(form, submitting) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = submitting;
  button.classList.toggle("is-loading", submitting);
  button.querySelector("span:first-child").textContent = submitting ? "Enviando..." : form.dataset.submitLabel;
}

function createDocumentDownloads(definition) {
  if (!definition.documents?.length) return null;

  const section = document.createElement("section");
  section.className = "registration-documents";
  section.append(
    createTextElement("p", "eyebrow", "Documentación RFEA"),
    createTextElement("h2", "", "Descarga y completa el impreso correspondiente"),
  );

  const list = document.createElement("div");
  list.className = "registration-document-list";
  definition.documents.forEach((documentDefinition) => {
    const link = document.createElement("a");
    link.className = "registration-document-card";
    link.href = documentDefinition.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(
      createTextElement("strong", "", documentDefinition.title),
      createTextElement("span", "", documentDefinition.description),
      createTextElement("small", "", "Abrir PDF ↗"),
    );
    list.append(link);
  });
  section.append(list);

  section.append(createTextElement("p", "registration-document-note", definition.documentsNote));
  return section;
}

function renderForm(root, definition, key) {
  const form = document.createElement("form");
  form.className = "registration-form";
  form.enctype = "multipart/form-data";
  form.dataset.emailForm = "";
  form.dataset.formType = key;
  form.dataset.submitLabel = definition.submitLabel;
  form.noValidate = false;

  const documentDownloads = createDocumentDownloads(definition);
  if (documentDownloads) form.append(documentDownloads);

  definition.sections.forEach((section, index) => form.append(createSection(section, index)));

  const submitArea = document.createElement("div");
  submitArea.className = "registration-submit";
  const note = createTextElement(
    "p",
    "registration-submit-note",
    "Los campos marcados como obligatorios deben completarse antes de enviar.",
  );
  const button = document.createElement("button");
  button.type = "submit";
  button.append(
    createTextElement("span", "", definition.submitLabel),
    createTextElement("span", "", "→"),
  );
  button.lastElementChild.setAttribute("aria-hidden", "true");
  submitArea.append(note, button);
  form.append(submitArea);

  const success = document.createElement("section");
  success.className = "registration-success";
  success.hidden = true;
  success.tabIndex = -1;
  success.append(
    createTextElement("p", "eyebrow", "Formulario enviado"),
    createTextElement("h2", "", definition.successTitle),
    createTextElement("p", "", definition.success),
  );
  const homeLink = createTextElement("a", "button button-primary", "Volver a la web");
  homeLink.href = "/#gestiones";
  success.append(homeLink);

  let submitted = false;
  form.querySelectorAll("[data-required-checkboxes]").forEach((group) => {
    group.addEventListener("change", () => validateCheckboxGroups(form));
  });
  form.querySelectorAll(".registration-other-input").forEach((input) => {
    input.addEventListener("input", () => validateOtherResponses(form));
  });
  form.querySelectorAll(".registration-training-field").forEach((field) => {
    field.addEventListener("change", () => validateTrainingOptions(form));
    field.addEventListener("input", () => validateTrainingOptions(form));
  });
  form.querySelectorAll("[data-show-when-entry]").forEach((field) => {
    const controllingEntry = field.dataset.showWhenEntry;
    form.querySelectorAll(`[name="entry.${controllingEntry}"]`).forEach((input) => {
      input.addEventListener("change", () => updateConditionalFields(form));
      input.addEventListener("input", () => updateConditionalFields(form));
    });
  });
  form.querySelectorAll("[data-file-input]").forEach((input) => {
    input.addEventListener("change", () => validateFileInputs(form));
  });
  form.querySelectorAll("[data-required-when-nie-entry]").forEach((input) => {
    const documentInput = form.querySelector(`[name="entry.${input.dataset.requiredWhenNieEntry}"]`);
    documentInput?.addEventListener("input", () => validateFileInputs(form));
  });
  form.querySelectorAll("[data-required-when-minor-entry]").forEach((input) => {
    const birthDateInput = form.querySelector(`[name="entry.${input.dataset.requiredWhenMinorEntry}"]`);
    birthDateInput?.addEventListener("input", () => validateFileInputs(form));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitted) return;
    updateConditionalFields(form);
    validateCheckboxGroups(form);
    validateOtherResponses(form);
    validateTrainingOptions(form);
    validateFileInputs(form);
    if (!validateGroupSelections(form, { focus: true })) {
      return;
    }
    if (!form.reportValidity()) {
      form.querySelector(":invalid")?.focus();
      return;
    }

    submitted = true;
    note.classList.remove("has-error");
    note.textContent = "Preparando la captura y los archivos...";
    try {
      const submission = collectRegistrationSubmission(definition, form);
      await sendFormSubmission({
        form,
        type: key,
        title: definition.title,
        answers: submission.answers,
        attachments: submission.attachments,
        onCaptured: () => {
          setSubmittingState(form, true);
          note.textContent = "Enviando el formulario y los archivos de forma segura...";
        },
      });
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      submitted = false;
      setSubmittingState(form, false);
      note.classList.add("has-error");
      note.textContent = error.message || "No se ha podido enviar el formulario. Inténtalo de nuevo.";
      note.focus?.();
    }
  });

  root.append(form, success);
  updateConditionalFields(form);
}

export function initRegistrationForms() {
  const root = document.querySelector("[data-registration-form]");
  if (!root) return;

  const key = root.dataset.registrationForm;
  const definition = FORM_DEFINITIONS[key];
  if (!definition) return;

  document.title = `${definition.title} — Lô Esport Menorca`;
  root.closest(".registration-page")?.querySelector("[data-form-eyebrow]")?.replaceChildren(definition.eyebrow);
  root.closest(".registration-page")?.querySelector("[data-form-title]")?.replaceChildren(definition.title);
  root.closest(".registration-page")?.querySelector("[data-form-intro]")?.replaceChildren(definition.intro);
  renderForm(root, definition, key);
}
