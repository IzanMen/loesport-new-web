const days = {
  lunes: { id: "lunes", label: "Lunes" },
  martes: { id: "martes", label: "Martes" },
  miercoles: { id: "miercoles", label: "Miércoles" },
  jueves: { id: "jueves", label: "Jueves" },
  viernes: { id: "viernes", label: "Viernes" },
  sabado: { id: "sabado", label: "Sábado" },
};

function trainingDay(id, detail = "") {
  return { ...days[id], detail };
}

function dayCount(count, price, options = {}) {
  return { count, price, ...options };
}

const maoSchoolDays = ["lunes", "martes", "miercoles", "jueves"].map((id) =>
  trainingDay(id, "17:30–18:30"),
);

const alaiorSchoolDays = ["martes", "jueves"].map((id) => trainingDay(id, "17:15–18:15"));

export const TRAINING_LOCATIONS = [
  { id: "mao", title: "Maó" },
  { id: "alaior", title: "Alaior" },
  { id: "mercadal", title: "Es Mercadal" },
];

export const TRAINING_GROUPS = [
  {
    id: "mao-iniciacion",
    location: "mao",
    title: "Iniciación / Sub-8",
    category: "2020 y posteriores",
    schedule: "Lunes, martes, miércoles y jueves · 17:30–18:30",
    days: maoSchoolDays,
    dayCounts: [dayCount(1, "22 €/mes"), dayCount(2, "27 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Escolar",
      preinscripcion: "ATLETISMO MAÓ (Escolar)",
    },
  },
  {
    id: "mao-sub10",
    location: "mao",
    title: "Sub-10",
    category: "2018–2019",
    schedule: "Lunes, martes, miércoles y jueves · 17:30–18:30",
    days: maoSchoolDays,
    dayCounts: [dayCount(1, "22 €/mes"), dayCount(2, "27 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Escolar",
      preinscripcion: "ATLETISMO MAÓ (Escolar)",
    },
  },
  {
    id: "mao-sub12",
    location: "mao",
    title: "Sub-12",
    category: "2016–2017",
    schedule: "Lunes, martes, miércoles y jueves · 17:30–18:30",
    days: maoSchoolDays,
    dayCounts: [dayCount(1, "22 €/mes"), dayCount(2, "27 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Escolar",
      preinscripcion: "ATLETISMO MAÓ (Escolar)",
    },
  },
  {
    id: "mao-sub14-sub16",
    location: "mao",
    title: "Sub-14 y Sub-16",
    category: "2012–2015",
    schedule: "Lunes, martes, miércoles y jueves · 17:30–18:30",
    days: maoSchoolDays,
    dayCounts: [
      dayCount(1, "25 €/mes"),
      dayCount(2, "30 €/mes"),
      dayCount(3, "35 €/mes"),
      dayCount(4, "40 €/mes"),
    ],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Escolar",
      preinscripcion: "ATLETISMO MAÓ (Escolar)",
    },
  },
  {
    id: "mao-velocistas",
    location: "mao",
    title: "Velocistas",
    category: "2009 y anteriores",
    schedule: "Lunes a viernes · horarios según el día",
    days: [
      trainingDay("lunes", "18:30–19:30"),
      trainingDay("martes"),
      trainingDay("miercoles", "18:30–19:30"),
      trainingDay("jueves"),
      trainingDay("viernes", "18:00–19:00"),
    ],
    dayCounts: [
      dayCount(1, "25 €/mes"),
      dayCount(2, "30 €/mes"),
      dayCount(3, "35 €/mes"),
      dayCount(4, "40 €/mes"),
      dayCount(5, "40 €/mes"),
    ],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Adultos AVANZADO (Velocidad) 18:30h",
      preinscripcion: "ATLETISMO MAÓ (Adultos)",
    },
  },
  {
    id: "mao-fondistas",
    location: "mao",
    title: "Fondistas",
    category: "2009 y anteriores",
    schedule: "Maó lunes, miércoles y viernes · Alaior martes y jueves",
    days: [
      trainingDay("lunes", "Maó · 18:30–19:30"),
      trainingDay("martes", "Alaior · 17:15–18:15"),
      trainingDay("miercoles", "Maó · 18:30–19:30"),
      trainingDay("jueves", "Alaior · 17:15–18:15"),
      trainingDay("viernes", "Maó · 18:30–19:30"),
    ],
    dayCounts: [
      dayCount(1, "25 €/mes"),
      dayCount(2, "30 €/mes"),
      dayCount(3, "35 €/mes"),
      dayCount(4, "40 €/mes"),
      dayCount(5, "40 €/mes"),
    ],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Adultos AVANZADO (Fondo) 18:30h",
      preinscripcion: "ATLETISMO MAÓ (Adultos)",
    },
  },
  {
    id: "mao-running-iniciacion",
    location: "mao",
    title: "Madres y padres / Running iniciación",
    category: "Adultos · Madres y padres",
    schedule: "Lunes, martes, miércoles y jueves · 17:30–18:30",
    days: maoSchoolDays,
    dayCounts: [
      dayCount(1, "20 €/mes", { note: "Con hijo/a en la escuela: suplemento de 10 €/mes" }),
      dayCount(2, "27 €/mes", { note: "Con hijo/a en la escuela: suplemento de 15 €/mes" }),
    ],
    formValues: {
      inscripcion: "ATLETISMO MAÓ Adultos INICIACIÓN (Esport&Salut) 17:30h",
      preinscripcion: "GRUPO ENTRENAMIENTO PARA PAPÁS I MAMÁS A LA MISMA HORA QUE LOS NIÑOS (Maó)",
    },
  },
  {
    id: "alaior-iniciacion",
    location: "alaior",
    title: "Iniciación",
    category: "2020 y posteriores",
    schedule: "Martes y jueves · 17:15–18:15",
    days: alaiorSchoolDays,
    dayCounts: [dayCount(1, "18 €/mes"), dayCount(2, "25 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO ALAIOR Escolar",
      preinscripcion: "ATLETISMO ALAIOR (Escolar)",
    },
  },
  {
    id: "alaior-sub10-sub12",
    location: "alaior",
    title: "Sub-10 y Sub-12",
    category: "2016–2019",
    schedule: "Martes y jueves · 17:15–18:15",
    days: alaiorSchoolDays,
    dayCounts: [dayCount(1, "18 €/mes"), dayCount(2, "25 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO ALAIOR Escolar",
      preinscripcion: "ATLETISMO ALAIOR (Escolar)",
    },
  },
  {
    id: "alaior-sub14-sub16-sub18",
    location: "alaior",
    title: "Sub-14, Sub-16 y Sub-18",
    category: "2010–2015",
    schedule: "Martes y jueves · 17:15–18:15",
    days: alaiorSchoolDays,
    dayCounts: [dayCount(1, "18 €/mes"), dayCount(2, "25 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO ALAIOR Escolar",
      preinscripcion: "ATLETISMO ALAIOR (Escolar)",
    },
  },
  {
    id: "alaior-adultos-running",
    location: "alaior",
    title: "Adultos 17:15 / Madres y padres",
    category: "Adultos · Madres y padres",
    schedule: "Martes y jueves · tercer día solo para mujeres el sábado",
    days: [
      trainingDay("martes", "17:15–18:15"),
      trainingDay("jueves", "17:15–18:15"),
      trainingDay("sabado", "Solo mujeres · Grupo Women · 08:45–09:45"),
    ],
    dayCounts: [
      dayCount(1, "15 €/mes", {
        note: "Con hijo/a en la escuela: suplemento de 10 €/mes",
        allowedDays: ["martes", "jueves"],
      }),
      dayCount(2, "20 €/mes", {
        note: "Con hijo/a en la escuela: suplemento de 15 €/mes",
        allowedDays: ["martes", "jueves"],
      }),
      dayCount(3, "23 €/mes", {
        note: "Solo para mujeres",
        allowedDays: ["martes", "jueves", "sabado"],
        restriction: "female",
      }),
    ],
    formValues: {
      inscripcion: "ATLETISMO ALAIOR Adultos (Esport&Salut) 17:15h",
      preinscripcion: "ATLETISMO ALAIOR (Adultos)",
    },
  },
  {
    id: "alaior-adultos-1800",
    location: "alaior",
    title: "Adultos · 18:00",
    category: "Adultos",
    schedule: "Martes y jueves · 18:00–19:00",
    days: ["martes", "jueves"].map((id) => trainingDay(id, "18:00–19:00")),
    dayCounts: [dayCount(1, "15 €/mes"), dayCount(2, "20 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO ALAIOR Adultos, grupo fondo 18:00h",
      preinscripcion: "ATLETISMO ALAIOR (Adultos)",
    },
  },
  {
    id: "alaior-womens",
    location: "alaior",
    title: "Women's iniciación",
    category: "Mujeres · Iniciación",
    schedule: "Sábado Women · más días con Adultos 17:15",
    days: [
      trainingDay("sabado", "Grupo Women · 08:45–09:45"),
      trainingDay("martes", "Adultos 17:15 · 17:15–18:15"),
      trainingDay("jueves", "Adultos 17:15 · 17:15–18:15"),
    ],
    dayCounts: [
      dayCount(1, "15 €/mes", { allowedDays: ["sabado"], requiredDays: ["sabado"] }),
      dayCount(2, "20 €/mes", { requiredDays: ["sabado"] }),
      dayCount(3, "23 €/mes", { requiredDays: ["sabado", "martes", "jueves"] }),
    ],
    formValues: {
      inscripcion: 'ATLETISMO ALAIOR "WOMEN"',
      preinscripcion: "ATLETISMO WOMENS ALAIOR (Sábados de 8:45h a 9:45h)",
    },
  },
  {
    id: "mercadal-escolares",
    location: "mercadal",
    title: "Escolares",
    category: "De 5 a 14 años",
    schedule: "Martes · 16:15–17:15",
    days: [trainingDay("martes", "16:15–17:15")],
    dayCounts: [dayCount(1, "18 €/mes")],
    formValues: {
      inscripcion: "ATLETISMO MERCADAL Escolar",
      preinscripcion: "ATLETISMO MERCADAL (Escolar)",
    },
  },
];

export function getTrainingGroup(groupId) {
  return TRAINING_GROUPS.find((group) => group.id === groupId);
}

export function getTrainingLocation(locationId) {
  return TRAINING_LOCATIONS.find((location) => location.id === locationId);
}
