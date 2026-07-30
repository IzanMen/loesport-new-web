const INSCRIPTION_GROUP_OPTIONS = [
  {
    value: "ATLETISMO MAÓ Escolar",
    title: "Maó · Escuela Sub-8/Sub-10/Sub-12",
    meta: "Nacidos en 2016 y posteriores",
    details: ["Lun/mié o mar/jue", "17:30-18:30", "Pista de atletismo", "Desde 22 €/mes + 30 € matrícula"],
  },
  {
    value: "ATLETISMO MAÓ Escolar",
    title: "Maó · Escuela Sub-14/Sub-16/Sub-18",
    meta: "Nacidos 2010-2015",
    details: ["Lun/mié o mar/jue", "17:30-18:30", "Tecnificación desde 18:30", "Desde 25 €/mes + 30 € matrícula"],
  },
  {
    value: "ATLETISMO MAÓ Tecnificación (a partir de nacidos 2010)",
    title: "Maó · Tecnificación",
    meta: "Sub-14 en adelante",
    details: ["Martes y jueves", "Desde 18:30", "Pista de atletismo", "Cuota a confirmar por el club"],
  },
  {
    value: "ATLETISMO MAÓ Adultos AVANZADO (Fondo) 18:30h",
    title: "Maó · Adultos fondistas",
    meta: "Nacidos 2009 y anteriores",
    details: ["Lun/mié/vie 18:30-19:30", "Sábado 09:30-11:00", "Pista de atletismo", "Desde 25 €/mes + 30 € matrícula"],
  },
  {
    value: "ATLETISMO MAÓ Adultos INICIACIÓN (Esport&Salut) 17:30h",
    title: "Maó · Madres y padres / Running iniciación",
    meta: "Mientras entrena la escuela",
    details: ["Lun/mié o mar/jue", "17:30-18:30", "Suplemento sobre cuota del hijo/a", "10 €/mes 1 día o 15 €/mes 2 días"],
  },
  {
    value: "ATLETISMO ALAIOR Escolar",
    title: "Alaior · Escuela",
    meta: "Nacidos 2010 y posteriores",
    details: ["Martes y jueves", "17:15-18:15", "Campo de fútbol 7", "Desde 18 €/mes + 30 € matrícula"],
  },
  {
    value: "ATLETISMO ALAIOR Adultos (Esport&Salut) 17:15h",
    title: "Alaior · Adultos 17:15",
    meta: "Entrenamiento de adultos",
    details: ["Martes y jueves", "17:15-18:15", "Polideportivo municipal", "Desde 15 €/mes + 30 € matrícula"],
  },
  {
    value: "ATLETISMO ALAIOR Adultos, grupo fondo 18:00h",
    title: "Alaior · Adultos running",
    meta: "Entrenamiento para correr y progresar",
    details: ["Martes y jueves", "17:15-18:15", "Polideportivo municipal", "Desde 15 €/mes + 30 € matrícula"],
  },
  {
    value: 'ATLETISMO ALAIOR "WOMEN"',
    title: "Alaior · Women's iniciación",
    meta: "Mujeres adultas",
    details: ["Sábados", "08:45-09:45", "Polideportivo municipal", "15 €/mes"],
  },
  {
    value: "ATLETISMO MERCADAL Escolar",
    title: "Es Mercadal · Escuela",
    meta: "Niños y niñas de 5 a 14 años",
    details: ["Días y horario por definir", "Campo municipal de fútbol", "Desde 18 €/mes + 30 € matrícula"],
  },
];

const TRIAL_GROUP_OPTIONS = [
  {
    value: "ATLETISMO ALAIOR (Escolar)",
    title: "Alaior · Escuela",
    meta: "Nacidos 2010 y posteriores",
    details: ["Martes y jueves", "17:15-18:15", "Campo de fútbol 7", "Desde 18 €/mes"],
  },
  {
    value: "ATLETISMO ALAIOR (Adultos)",
    title: "Alaior · Adultos 17:15 / running",
    meta: "Entrenamiento de adultos",
    details: ["Martes y jueves", "17:15-18:15", "Polideportivo municipal", "Desde 15 €/mes"],
  },
  {
    value: "ATLETISMO WOMENS ALAIOR (Sábados de 8:45h a 9:45h)",
    title: "Alaior · Women's iniciación",
    meta: "Mujeres adultas",
    details: ["Sábados", "08:45-09:45", "Polideportivo municipal", "15 €/mes"],
  },
  {
    value: "ATLETISMO MAÓ (Escolar)",
    title: "Maó · Escuela Sub-8 a Sub-18",
    meta: "Nacidos 2010 y posteriores",
    details: ["Lun/mié o mar/jue", "17:30-18:30", "Pista de atletismo", "Desde 22 €/mes"],
  },
  {
    value: "ATLETISMO MAÓ (Adultos)",
    title: "Maó · Adultos fondistas/velocistas",
    meta: "Nacidos 2009 y anteriores",
    details: ["Lun/mié/vie por la tarde", "Sábado por la mañana según grupo", "Pista de atletismo", "Desde 25 €/mes"],
  },
  {
    value: "ATLETISMO MERCADAL (Escolar)",
    title: "Es Mercadal · Escuela",
    meta: "Niños y niñas de 5 a 14 años",
    details: ["Días y horario por definir", "Campo municipal de fútbol", "Desde 18 €/mes"],
  },
  {
    value:
      "GRUPO ENTRENAMIENTO PARA PAPÁS I MAMÁS A LA MISMA HORA QUE LOS NIÑOS (Alaior) - Grupo completo. Marcar esta opción para quedar en lista de espera. Contactaremos cuando tengamos plazas disponibles",
    title: "Alaior · Madres y padres",
    meta: "A la misma hora que la escuela",
    details: ["Martes y jueves", "17:15-18:15", "Suplemento 10 €/mes 1 día o 15 €/mes 2 días"],
  },
  {
    value: "GRUPO ENTRENAMIENTO PARA PAPÁS I MAMÁS A LA MISMA HORA QUE LOS NIÑOS (Maó)",
    title: "Maó · Madres y padres / Running iniciación",
    meta: "A la misma hora que la escuela",
    details: ["Lun/mié o mar/jue", "17:30-18:30", "Suplemento 10 €/mes 1 día o 15 €/mes 2 días"],
  },
];

export const FORM_DEFINITIONS = {
  inscripcion: {
    action:
      "https://docs.google.com/forms/d/e/1FAIpQLSdMWe7S9acL9BdQe7rmp6-As_kgEJrBNBTnpAgoi3nxqNa0wA/formResponse",
    title: "Inscripción",
    eyebrow: "Temporada 2026",
    intro: "Completa el alta o la renovación para entrenar con Lô Esport Menorca.",
    submitLabel: "Enviar inscripción",
    successTitle: "Inscripción recibida",
    success:
      "Bienvenido a Lô Esport. Hemos recibido correctamente tus datos y te deseamos una feliz temporada.",
    sections: [
      {
        title: "Actividad",
        description: "Selecciona una o varias actividades y dinos tus datos principales.",
        fields: [
          {
            type: "checkboxes",
            entry: "2005620554",
            label: "Seleccione para hacer inscripción a:",
            required: true,
            help:
              "Cada opción incluye sede, edad orientativa, días, horario, lugar y cuota base para que no tengas que consultar la página de grupos.",
            options: INSCRIPTION_GROUP_OPTIONS,
          },
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
          { type: "text", entry: "839337160", label: "DNI", required: true },
          {
            type: "radio",
            entry: "946002822",
            label: "Eres nuevo en el club?",
            required: true,
            options: ["Nuevo", "Renovación matrícula"],
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
            type: "google-date",
            entry: "326584365",
            label: "Menores de 18 años indicar fecha de nacimiento de la madre/padre ó tutor legal",
          },
        ],
      },
      {
        title: "Entrenamientos",
        fields: [
          {
            type: "checkboxes",
            entry: "167310009",
            label:
              "Indique cuántos días de entrenamiento semanal realizará. El club confirmará la cuota final según la sede y grupo elegidos.",
            options: [
              "1 día a la semana",
              "2 días a la semana",
              "3 días a la semana",
              "4 días a la semana (tecnificación)",
              "5 días a la semana (tecnificación)",
            ],
          },
          {
            type: "textarea",
            entry: "712946819",
            label:
              'Si en la pregunta anterior ha elegido la respuesta "Asistirá 1 día de entreno a la semana", indique aquí el día que asistirá',
          },
          {
            type: "radio",
            entry: "1166853484",
            label:
              'Grupo para madres y padres mientras entrena la escuela. Maó: lun/mié o mar/jue, 17:30-18:30. Alaior: martes y jueves, 17:15-18:15. Indique si quiere participar añadiendo el suplemento sobre la cuota de su hijo/a.',
            options: [
              "QUIERO PARTICIPAR, 1 día a la semana",
              "QUIERO PARTICIPAR, 2 días a la semana",
              "NO quiero participar",
            ],
            other: true,
          },
          {
            type: "text",
            entry: "1858276911",
            label:
              'En caso de participar en el "GRUPO PARA PADRES Y MADRES" Indíque su nombre y apellidos (madre, padre o ambos)',
          },
        ],
      },
      {
        title: "Forma de pago",
        fields: [
          {
            type: "radio",
            entry: "506119602",
            label:
              "Forma de pago. Matrícula general: 30 €. Cuota mensual según grupo, sede y días seleccionados.",
            required: true,
            options: ["Mensual", "Anual"],
            other: true,
          },
          {
            type: "radio",
            entry: "43401703",
            label:
              'Los recibos se cargarán en cuenta el dia 4 de cada mes. Las bajas se deberán comunicar antes del día 20 del mes anterior mediante formulario de "Solicitud de baja" que encontrará en nuestra página web.  Doy mi AUTORIZACION a ALAIOR ESPORT para que cargue los recibos derivados de la actividad en cuenta.',
            options: ["AUTORIZO"],
          },
          {
            type: "textarea",
            entry: "1121669907",
            label:
              'NUMERO DE CUENTA BANCARIA\n\n* Si eres nuevo en el club indica el número de cuenta bancario.\n\n* Renovaciones sin cambios en el número cuenta indicar "Igual anterior temporada"',
            required: true,
            rows: 2,
            autocomplete: "off",
          },
        ],
      },
      {
        title: "Autorizaciones",
        fields: [
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
              "De conformidad con lo previsto en la normativa de protección de datos de carácter personal (la LO 3/2018, de 5 de diciembre, de Protección de datos personales y garantía de los derechos digitales, LOPDyGDD y el Reglamento General sobre Protección de Datos 2016/679, de 27 de abril de 2016, RGPD, o norma que los sustituya), LES INFORMAMOS que los datos personales recogidos en el formulario de inscripción serán tratados por parte del club Alaior Esport como responsable del tratamiento con la única finalidad de programar la temporada 2024/25, así como para tramitar las licencias deportivas si fuera necesario. Les informamos que pueden ejercer sus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad de los datos y oposición enviando un correo electrónico a loesport@gmail.com",
            required: true,
            options: ["CONOZCO Y ACEPTO PRIVACIDAD Y TRATAMIENTO DE MIS DATOS PERSONALES"],
            legal: true,
          },
          {
            type: "radio",
            entry: "818465818",
            label:
              "Condiciones de uso: Quien ha cumplimentado el presente formulario declara que los datos en él consignado son reales con lo que desde el momento que pulse sobre el botón ENVIAR supone su aceptación y la aceptación de las condiciones de uso y reglamentos del Club ALAIOR ESPORT.",
            required: true,
            options: ["ACEPTO"],
            legal: true,
          },
        ],
      },
    ],
  },
  preinscripcion: {
    action:
      "https://docs.google.com/forms/d/e/1FAIpQLSdffePyj9_NxbcwiocttaZMJQB6IhWPI8zlme8Q78kThlwl9w/formResponse",
    title: "Preinscripción",
    eyebrow: "Prueba una semana",
    intro:
      "Esta preinscripción te permite venir a probar nuestra actividad durante una semana. Después deberás formalizar la inscripción en nuestra web.",
    submitLabel: "Solicitar prueba",
    successTitle: "Solicitud recibida",
    success:
      "Hemos recibido tu solicitud para probar la actividad. Desde el club contactaremos contigo para asignarte un grupo.",
    sections: [
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
            type: "checkboxes",
            entry: "1264281896",
            label: "Quiero probar durante 1 semana la actividad de:",
            required: true,
            help:
              "Cada opción incluye la información básica de horario y cuota para elegir sin tener que revisar otra página.",
            options: TRIAL_GROUP_OPTIONS,
          },
          {
            type: "text",
            entry: "831247409",
            label:
              'En caso de participar en el "GRUPO PARA PADRES Y MADRES" Indíque su nombre y apellidos (madre, padre o ambos)',
          },
          {
            type: "tel",
            entry: "97509970",
            label: "Teléfono de contacto",
            required: true,
            autocomplete: "tel",
          },
          { type: "textarea", entry: "1933709984", label: "Observaciones o sugerencias:" },
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
    action:
      "https://docs.google.com/forms/d/e/1FAIpQLSeU7EANvKoiskWkCxwBshrWIvv724VenGGO_a-GY5CeNYzrpQ/formResponse",
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
    action:
      "https://docs.google.com/forms/d/e/1FAIpQLSfs_2fTOwvmd8Vx_XinsH7Fvy4HJMhO3Of6kXteU-xb8IAT2w/formResponse",
    title: "Licencias de atletismo",
    eyebrow: "Temporada 2026",
    intro: "Solicita el alta o la renovación de tu licencia autonómica o nacional.",
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
  } else {
    input.name = `entry.${field.entry}`;
  }

  if (field.required) input.required = true;
  if (field.autocomplete) input.autocomplete = field.autocomplete;
  if (field.inputmode) input.inputMode = field.inputmode;
  input.id = `entry-${field.entry}`;
  return input;
}

function createChoice(field, option, index, isOther = false) {
  const hasStructuredDetails = !isOther && typeof option === "object" && Array.isArray(option.details);
  const container = hasStructuredDetails ? document.createElement("div") : null;
  if (container) container.className = "registration-choice-card";

  const choice = document.createElement("label");
  choice.className = "registration-choice";

  const input = document.createElement("input");
  input.type = field.type === "checkboxes" ? "checkbox" : "radio";
  input.name = `entry.${field.entry}`;
  const optionLabel = typeof option === "object" ? option.label || option.title : option;
  const optionValue = typeof option === "object" ? option.value : option;
  input.value = isOther ? "__other_option__" : optionValue;
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

  if (isOther) {
    const otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.className = "registration-other-input";
    otherInput.name = `entry.${field.entry}.other_option_response`;
    otherInput.setAttribute("aria-label", "Otra respuesta");
    otherInput.addEventListener("focus", () => {
      input.checked = true;
    });
    input.addEventListener("change", () => {
      if (input.checked) otherInput.focus();
    });
    choice.append(otherInput);
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

function createField(field) {
  const wrapper = document.createElement("fieldset");
  wrapper.className = `registration-field${field.legal ? " is-legal" : ""}`;
  wrapper.dataset.entry = field.entry;

  const legend = createTextElement("legend", "registration-label", field.label);
  if (field.required) {
    const required = createTextElement("span", "registration-required", "(Obligatorio)");
    legend.append(" ", required);
  }
  wrapper.append(legend);

  if (field.help) wrapper.append(createTextElement("p", "registration-help", field.help));

  if (field.type === "radio" || field.type === "checkboxes") {
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

function prepareGoogleDates(form) {
  form.querySelectorAll("[data-generated-date]").forEach((input) => input.remove());

  form.querySelectorAll("[data-google-date]").forEach((input) => {
    if (!input.value) return;
    const [year, month, day] = input.value.split("-");
    [
      ["year", year],
      ["month", month],
      ["day", day],
    ].forEach(([part, value]) => {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = `entry.${input.dataset.googleDate}_${part}`;
      hidden.value = value;
      hidden.dataset.generatedDate = "";
      form.append(hidden);
    });
  });
}

function setSubmittingState(form, submitting) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = submitting;
  button.classList.toggle("is-loading", submitting);
  button.querySelector("span:first-child").textContent = submitting ? "Enviando..." : form.dataset.submitLabel;
}

function renderForm(root, definition, key) {
  const frameName = `registration-response-${key}`;
  const form = document.createElement("form");
  form.className = "registration-form";
  form.action = definition.action;
  form.method = "POST";
  form.target = frameName;
  form.dataset.googleForm = "";
  form.dataset.submitLabel = definition.submitLabel;
  form.noValidate = false;

  definition.sections.forEach((section, index) => form.append(createSection(section, index)));

  const hiddenFields = {
    fvv: "1",
    pageHistory: "0",
    submissionTimestamp: "-1",
  };
  Object.entries(hiddenFields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  });

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

  const iframe = document.createElement("iframe");
  iframe.name = frameName;
  iframe.title = "Respuesta del formulario";
  iframe.className = "registration-response-frame";

  let submitted = false;
  form.querySelectorAll("[data-required-checkboxes]").forEach((group) => {
    group.addEventListener("change", () => validateCheckboxGroups(form));
  });
  form.querySelectorAll(".registration-other-input").forEach((input) => {
    input.addEventListener("input", () => validateOtherResponses(form));
  });

  form.addEventListener("submit", (event) => {
    validateCheckboxGroups(form);
    validateOtherResponses(form);
    if (!form.reportValidity()) {
      event.preventDefault();
      form.querySelector(":invalid")?.focus();
      return;
    }

    prepareGoogleDates(form);
    submitted = true;
    setSubmittingState(form, true);
  });

  iframe.addEventListener("load", () => {
    if (!submitted) return;
    form.hidden = true;
    success.hidden = false;
    success.focus({ preventScroll: true });
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  root.append(form, success, iframe);
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
