function normalizeText(value) {
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function createSupplementalCatalogue() {
  const catalogue = {};
  const add = (es, ca, gl, eu) => {
    catalogue[normalizeText(es)] = { ca, gl, eu };
  };
  const same = (...values) => values.forEach((value) => add(value, value, value, value));

  same(
    "#0b0c0d",
    "1.500 m",
    "14.06.2026",
    "2026",
    "209",
    "3.000",
    "400 m",
    "689 752 415",
    "800 m",
    "Arnau Ribe",
    "CA",
    "DH · 2026",
    "ES",
    "EU",
    "Facebook",
    "GL",
    "Instagram",
    "Ismail Atriki",
    "Mario Santín",
    "Martí Sánchez",
    "Pablo Colao",
    "loesport@gmail.com",
    "width=device-width, initial-scale=1.0",
    "©",
    "›",
    "↗",
    "→",
    "←",
    "↓",
    "×",
    "0",
    "0 €",
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "05.08.2011",
    "18 €",
    "22 €",
    "25 €",
    "28 €",
    "30 €",
    "35 €",
    "52 €",
    "60 €",
    "08:45–09:45",
    "17:15–18:15",
    "18:00–19:00",
    "17:30–18:30",
    "18:30–19:30",
    "2010",
    "2011",
    "2012",
    "2013",
    "2014",
    "2015",
    "2016",
    "2017",
    "2018",
    "2019",
    "2020",
    "2021",
    "2022",
    "2025",
    "ALAIOR",
    "MAÓ",
    "MERCADAL",
    "100 €",
    "Ajuntament d'Alaior",
    "Catalina Cardona",
    "Colonya Caixa Pollença",
    "ConectaBalear",
    "Consell Insular de Menorca",
    "Cova d'en Xoroi",
    "Cristina",
    "Distribuciones Goñalons",
    "Esports CIME",
    "Esports Illes Balears",
    "FAIB",
    "Fatness Free Sugar",
    "Izan Sánchez",
    "Julia Carreras",
    "Lô News",
    "Marc Gomila",
    "Marta Orives",
    "Miguel Quesada",
    "Mode Marquès",
    "Proyecto IX",
    "Reclam",
    "Rewind Lab.",
    "Sergi Reurer",
    "Tenim Pla",
    "Yzabelle Maciel",
    "ES00 0000 0000 0000 0000 0000",
    "IBAN",
    ".",
    "Alaior Esport (LO ESPORT)",
    "NIF G57722951",
    "/",
    "12/14",
    "2XL",
    "3/5",
    "6/8",
    "9/11",
    "L",
    "M",
    "S",
    "XL",
    "XS",
    "XXL",
    "10-11A",
    "12-13A",
    "14-15A",
    "5-6A",
    "7-8A",
    "8-9A",
    "3/5, 6/8, 9/11, 12/14, XS, S, M, L, XL, 2XL.",
    "XS, S, M, L, XL.",
    "S, M, L, XL, XXL.",
    "XS, S, M, L, XL, XXL.",
    "5-6A, 7-8A, 8-9A, 10-11A, 12-13A, 14-15A.",
    "Alaior Esport - NIF: G57722951",
    "Avenida Monte Toro, 56, 07730-Alaior",
  );

  add("Menorca · Illes Balears", "Menorca · Illes Balears", "Menorca · Illas Baleares", "Menorca · Balear Uharteak");
  add("Pamplona", "Pamplona", "Pamplona", "Iruñea");
  add("Atletismo desde Menorca. Compitiendo entre los mejores.", "Atletisme des de Menorca. Competint entre els millors.", "Atletismo desde Menorca. Competindo entre os mellores.", "Atletismoa Menorcatik. Onenen artean lehiatzen.");
  add("Formularios del club", "Formularis del club", "Formularios do club", "Klubeko formularioak");
  add("Ver todos", "Veure tots", "Ver todos", "Ikusi guztiak");
  add("los trámites ↗", "els tràmits ↗", "os trámites ↗", "izapideak ↗");
  add("¿Necesitas ayuda?", "Necessites ajuda?", "Necesitas axuda?", "Laguntza behar duzu?");

  add("Comunícanos la baja con antelación.", "Comunica'ns la baixa amb antelació.", "Comunícanos a baixa con antelación.", "Jakinarazi baja aldez aurretik.");
  add("Formulario de solicitud de baja de las actividades de Lô Esport Menorca.", "Formulari de sol·licitud de baixa de les activitats de Lô Esport Menorca.", "Formulario de solicitude de baixa das actividades de Lô Esport Menorca.", "Lô Esport Menorcako jardueretan baja eskatzeko formularioa.");
  add("Para que sea efectiva al finalizar el mes, envía la solicitud antes del día 20 del mes anterior.", "Perquè sigui efectiva en acabar el mes, envia la sol·licitud abans del dia 20 del mes anterior.", "Para que sexa efectiva ao finalizar o mes, envía a solicitude antes do día 20 do mes anterior.", "Hilabete amaieran indarrean egon dadin, bidali eskaera aurreko hilaren 20a baino lehen.");
  add("Plazo de solicitud", "Termini de sol·licitud", "Prazo da solicitude", "Eskaera-epea");
  add("Solicitud de baja — Lô Esport Menorca", "Sol·licitud de baixa — Lô Esport Menorca", "Solicitude de baixa — Lô Esport Menorca", "Baja-eskaera — Lô Esport Menorca");

  add("13 productos", "13 productes", "13 produtos", "13 produktu");
  add("Abre la ficha del producto y selecciona talla, patrón y cantidad.", "Obre la fitxa del producte i selecciona talla, patró i quantitat.", "Abre a ficha do produto e selecciona talla, patrón e cantidade.", "Ireki produktuaren fitxa eta hautatu neurria, patroia eta kopurua.");
  add("Añade todas las prendas que necesites a una única solicitud.", "Afegeix totes les peces que necessitis a una única sol·licitud.", "Engade todas as prendas que necesites a unha única solicitude.", "Gehitu behar dituzun jantzi guztiak eskaera bakarrean.");
  add("CLUB", "CLUB", "CLUB", "KLUBA");
  add("Catálogo de equipación de Lô Esport Menorca. Consulta prendas, precios y tallas y envía tu solicitud al club.", "Catàleg d'equipació de Lô Esport Menorca. Consulta peces, preus i talles i envia la teva sol·licitud al club.", "Catálogo de equipación de Lô Esport Menorca. Consulta prendas, prezos e tallas e envía a túa solicitude ao club.", "Lô Esport Menorcaren ekipazio-katalogoa. Kontsultatu jantziak, prezioak eta neurriak, eta bidali eskaera klubari.");
  add("Colección Lô Esport.", "Col·lecció Lô Esport.", "Colección Lô Esport.", "Lô Esport bilduma.");
  add("Confirma", "Confirma", "Confirma", "Baieztatu");
  add("Cómo funciona", "Com funciona", "Como funciona", "Nola funtzionatzen du");
  add("Destacados", "Destacats", "Destacados", "Nabarmenduak");
  add("El club comprueba disponibilidad y contacta contigo para cerrar el pedido.", "El club comprova la disponibilitat i contacta amb tu per tancar la comanda.", "O club comproba a dispoñibilidade e contacta contigo para pechar o pedido.", "Klubak erabilgarritasuna egiaztatzen du eta zurekin harremanetan jartzen da eskaera ixteko.");
  add("Elige", "Tria", "Elixe", "Hautatu");
  add("Júnior", "Júnior", "Júnior", "Juniorra");
  add("Ordenar productos", "Ordenar productes", "Ordenar produtos", "Produktuak ordenatu");
  add("Precio: mayor a menor", "Preu: de major a menor", "Prezo: de maior a menor", "Prezioa: handienetik txikienera");
  add("Precio: menor a mayor", "Preu: de menor a major", "Prezo: de menor a maior", "Prezioa: txikienetik handienera");
  add("Prendas de entrenamiento, competición y club. Selecciona tus variantes, prepara la solicitud y el equipo confirmará la disponibilidad.", "Peces d'entrenament, competició i club. Selecciona les variants, prepara la sol·licitud i l'equip confirmarà la disponibilitat.", "Prendas de adestramento, competición e club. Selecciona as variantes, prepara a solicitude e o equipo confirmará a dispoñibilidade.", "Entrenamendu, lehiaketa eta klubeko jantziak. Hautatu aldaerak, prestatu eskaera eta taldeak erabilgarritasuna baieztatuko du.");
  add("Revisa", "Revisa", "Revisa", "Berrikusi");
  add("Solicitud", "Sol·licitud", "Solicitude", "Eskaera");
  add("Una solicitud, sin pago online.", "Una sol·licitud, sense pagament en línia.", "Unha solicitude, sen pagamento en liña.", "Eskaera bakarra, lineako ordainketarik gabe.");
  add("Ver", "Veure", "Ver", "Ikusi");
  add("colección", "col·lecció", "colección", "bilduma");

  add("1 de septiembre de 2026", "1 de setembre de 2026", "1 de setembro de 2026", "2026ko irailaren 1a");
  add("15 de septiembre de 2026", "15 de setembre de 2026", "15 de setembro de 2026", "2026ko irailaren 15a");
  add("5 de septiembre de 2026", "5 de setembre de 2026", "5 de setembro de 2026", "2026ko irailaren 5a");
  add("14 de septiembre de 2026", "14 de setembre de 2026", "14 de setembro de 2026", "2026ko irailaren 14a");
  add("1 día: 15 € · 2 días: 20 € · 3 días mujeres: 23 €/mes", "1 dia: 15 € · 2 dies: 20 € · 3 dies dones: 23 €/mes", "1 día: 15 € · 2 días: 20 € · 3 días mulleres: 23 €/mes", "Egun 1: 15 € · 2 egun: 20 € · 3 egun emakumeentzat: 23 €/hilean");
  add("1 día: 15 € · 2 días: 20 €/mes", "1 dia: 15 € · 2 dies: 20 €/mes", "1 día: 15 € · 2 días: 20 €/mes", "Egun 1: 15 € · 2 egun: 20 €/hilean");
  add("1 día: 18 €/mes · 2 días: 25 €/mes", "1 dia: 18 €/mes · 2 dies: 25 €/mes", "1 día: 18 €/mes · 2 días: 25 €/mes", "Egun 1: 18 €/hilean · 2 egun: 25 €/hilean");
  add("15 € · 20 € / mes", "15 € · 20 € / mes", "15 € · 20 € / mes", "15 € · 20 € / hilean");
  add("18 € · 25 € / mes", "18 € · 25 € / mes", "18 € · 25 € / mes", "18 € · 25 € / hilean");
  add("20 €/mes", "20 €/mes", "20 €/mes", "20 €/hilean");
  add("25 € solo para nuevas altas desde Sub-20", "25 € només per a noves altes des de Sub-20", "25 € só para novas altas desde Sub-20", "25 € Sub-20tik aurrerako alta berrientzat soilik");
  add("Acceso ilimitado a todos los grupos por 50 € al mes. Matrícula de 25 € solo para nuevas altas.", "Accés il·limitat a tots els grups per 50 € al mes. Matrícula de 25 € només per a noves altes.", "Acceso ilimitado a todos os grupos por 50 € ao mes. Matrícula de 25 € só para novas altas.", "Talde guztietarako sarbide mugagabea hilean 50 €-ren truke. 25 €-ko matrikula alta berrientzat soilik.");
  add("Con 3 o más miembros se descuentan 5 € por persona; en cuotas de 1 día, el descuento es de 2,50 €.", "Amb 3 membres o més es descompten 5 € per persona; en quotes d'1 dia, el descompte és de 2,50 €.", "Con 3 ou máis membros descóntanse 5 € por persoa; nas cotas de 1 día, o desconto é de 2,50 €.", "3 kide edo gehiagorekin 5 € deskontatzen dira pertsonako; egun 1eko kuotetan, deskontua 2,50 € da.");
  add("Días de entrenamiento para Iniciación", "Dies d'entrenament per a Iniciació", "Días de adestramento para Iniciación", "Hastapenetarako entrenamendu-egunak");
  add("Días de entrenamiento para Sub-10 y Sub-12", "Dies d'entrenament per a Sub-10 i Sub-12", "Días de adestramento para Sub-10 e Sub-12", "Sub-10 eta Sub-12rako entrenamendu-egunak");
  add("Días de entrenamiento para Sub-14, Sub-16 y Sub-18", "Dies d'entrenament per a Sub-14, Sub-16 i Sub-18", "Días de adestramento para Sub-14, Sub-16 e Sub-18", "Sub-14, Sub-16 eta Sub-18rako entrenamendu-egunak");
  add("Días de entrenamiento para Women's iniciación", "Dies d'entrenament per a Women's iniciació", "Días de adestramento para Women's iniciación", "Women's hastapenetarako entrenamendu-egunak");
  add("Días de entrenamiento para adultos 18:00", "Dies d'entrenament per a adults 18:00", "Días de adestramento para adultos 18:00", "18:00etako helduentzako entrenamendu-egunak");
  add("Días de entrenamiento para adultos con sábado", "Dies d'entrenament per a adults amb dissabte", "Días de adestramento para adultos con sábado", "Larunbata duten helduentzako entrenamendu-egunak");
  add("El grupo Women's es solo los sábados. Para hacer más días, se entrena martes y jueves con adultos 17:15.", "El grup Women's és només els dissabtes. Per fer més dies, s'entrena dimarts i dijous amb adults 17:15.", "O grupo Women's é só os sábados. Para facer máis días, adéstrase martes e xoves con adultos 17:15.", "Women's taldea larunbatetan bakarrik da. Egun gehiago egiteko, astearte eta ostegunetan entrenatzen da 17:15eko helduekin.");
  add("Es Mercadal", "Es Mercadal", "Es Mercadal", "Es Mercadal");
  add("Es obligatoria hasta Sub-18 incluida. El club la cubre hasta Sub-12; desde Sub-14, el coste FAIB de cada categoría se abona en enero. Desde Sub-20 es opcional.", "És obligatòria fins a Sub-18 inclosa. El club la cobreix fins a Sub-12; des de Sub-14, el cost FAIB de cada categoria s'abona al gener. Des de Sub-20 és opcional.", "É obrigatoria ata Sub-18 incluída. O club cóbrea ata Sub-12; desde Sub-14, o custo FAIB de cada categoría abóase en xaneiro. Desde Sub-20 é opcional.", "Sub-18ra arte derrigorrezkoa da. Klubak Sub-12ra arte estaltzen du; Sub-14tik aurrera, kategoria bakoitzaren FAIB kostua urtarrilean ordaintzen da. Sub-20tik aurrera aukerakoa da.");
  add("La matrícula es de 25 € e incluye gestión, material y acceso a las instalaciones. En escolares se abona siempre; desde Sub-20, solo las nuevas incorporaciones. La camiseta es gratuita hasta Sub-18 y de pago desde Sub-20.", "La matrícula és de 25 € i inclou gestió, material i accés a les instal·lacions. En escolars s'abona sempre; des de Sub-20, només les noves incorporacions. La samarreta és gratuïta fins a Sub-18 i de pagament des de Sub-20.", "A matrícula é de 25 € e inclúe xestión, material e acceso ás instalacións. En escolares abóase sempre; desde Sub-20, só as novas incorporacións. A camiseta é gratuíta ata Sub-18 e de pagamento desde Sub-20.", "Matrikula 25 € da eta kudeaketa, materiala eta instalazioetarako sarbidea barne hartzen ditu. Eskola-taldeetan beti ordaintzen da; Sub-20tik aurrera, kide berriek bakarrik. Kamiseta doakoa da Sub-18ra arte eta ordainpekoa Sub-20tik aurrera.");
  add("Licencia federativa", "Llicència federativa", "Licenza federativa", "Federazio-lizentzia");
  add("Martes y jueves con adultos 17:15", "Dimarts i dijous amb adults 17:15", "Martes e xoves con adultos 17:15", "Astearte eta ostegunetan 17:15eko helduekin");
  add("Matrícula", "Matrícula", "Matrícula", "Matrikula");
  add("Matrícula y camiseta", "Matrícula i samarreta", "Matrícula e camiseta", "Matrikula eta kamiseta");
  add("Precio exacto por días", "Preu exacte per dies", "Prezo exacto por días", "Egunen araberako prezio zehatza");
  add("Solo sábados · 08:45–09:45", "Només dissabtes · 08:45–09:45", "Só sábados · 08:45–09:45", "Larunbatetan soilik · 08:45–09:45");
  add("Sábado · 08:45–09:45", "Dissabte · 08:45–09:45", "Sábado · 08:45–09:45", "Larunbata · 08:45–09:45");
  add("Tarifa plana adultos", "Tarifa plana adults", "Tarifa plana adultos", "Helduentzako tarifa finkoa");
  add("+10 € · +15 € / mes", "+10 € · +15 € / mes", "+10 € · +15 € / mes", "+10 € · +15 € / hilean");
  add("1 a 5 días", "1 a 5 dies", "1 a 5 días", "1etik 5 egunera");
  add("1 día: +10 €/mes · 2 días o más: +15 €/mes", "1 dia: +10 €/mes · 2 dies o més: +15 €/mes", "1 día: +10 €/mes · 2 días ou máis: +15 €/mes", "Egun 1: +10 €/hilean · 2 egun edo gehiago: +15 €/hilean");
  add("1 día: 22 €/mes · 2 días: 27 €/mes", "1 dia: 22 €/mes · 2 dies: 27 €/mes", "1 día: 22 €/mes · 2 días: 27 €/mes", "Egun 1: 22 €/hilean · 2 egun: 27 €/hilean");
  add("1 día: 25 € · 2 días: 30 € · 3 días: 35 € · 4 días: 40 €/mes", "1 dia: 25 € · 2 dies: 30 € · 3 dies: 35 € · 4 dies: 40 €/mes", "1 día: 25 € · 2 días: 30 € · 3 días: 35 € · 4 días: 40 €/mes", "Egun 1: 25 € · 2 egun: 30 € · 3 egun: 35 € · 4 egun: 40 €/hilean");
  add("1 día: 25 € · 2 días: 30 € · 3 días: 35 € · 4-5 días: 40 €/mes", "1 dia: 25 € · 2 dies: 30 € · 3 dies: 35 € · 4-5 dies: 40 €/mes", "1 día: 25 € · 2 días: 30 € · 3 días: 35 € · 4-5 días: 40 €/mes", "Egun 1: 25 € · 2 egun: 30 € · 3 egun: 35 € · 4-5 egun: 40 €/hilean");
  add("22 € · 27 € / mes", "22 € · 27 € / mes", "22 € · 27 € / mes", "22 € · 27 € / hilean");
  add("25 · 30 · 35 · 40 € / mes", "25 · 30 · 35 · 40 € / mes", "25 · 30 · 35 · 40 € / mes", "25 · 30 · 35 · 40 € / hilean");
  add("25 € matrícula + 27 €/mes", "25 € matrícula + 27 €/mes", "25 € matrícula + 27 €/mes", "25 € matrikula + 27 €/hilean");
  add("25 € matrícula + 30 €/mes", "25 € matrícula + 30 €/mes", "25 € matrícula + 30 €/mes", "25 € matrikula + 30 €/hilean");
  add("25 € matrícula + 35 €/mes", "25 € matrícula + 35 €/mes", "25 € matrícula + 35 €/mes", "25 € matrikula + 35 €/hilean");
  add("25 € matrícula + 40 €/mes", "25 € matrícula + 40 €/mes", "25 € matrícula + 40 €/mes", "25 € matrikula + 40 €/hilean");
  add("25 €/mes", "25 €/mes", "25 €/mes", "25 €/hilean");
  add("30 €/mes", "30 €/mes", "30 €/mes", "30 €/hilean");
  add("35 €/mes", "35 €/mes", "35 €/mes", "35 €/hilean");
  add("40 €/mes", "40 €/mes", "40 €/mes", "40 €/hilean");
  add("22 €/mes", "22 €/mes", "22 €/mes", "22 €/hilean");
  add("27 €/mes", "27 €/mes", "27 €/mes", "27 €/hilean");
  add("Días de entrenamiento para Iniciación / Sub-8", "Dies d'entrenament per a Iniciació / Sub-8", "Días de adestramento para Iniciación / Sub-8", "Hastapenak / Sub-8rako entrenamendu-egunak");
  add("Días de entrenamiento para Sub-10", "Dies d'entrenament per a Sub-10", "Días de adestramento para Sub-10", "Sub-10erako entrenamendu-egunak");
  add("Días de entrenamiento para Sub-12", "Dies d'entrenament per a Sub-12", "Días de adestramento para Sub-12", "Sub-12rako entrenamendu-egunak");
  add("Días de entrenamiento para Sub-14 y Sub-16", "Dies d'entrenament per a Sub-14 i Sub-16", "Días de adestramento para Sub-14 e Sub-16", "Sub-14 eta Sub-16rako entrenamendu-egunak");
  add("Días de entrenamiento para fondistas", "Dies d'entrenament per a fondistes", "Días de adestramento para fondistas", "Fondistentzako entrenamendu-egunak");
  add("Días de entrenamiento para madres y padres", "Dies d'entrenament per a mares i pares", "Días de adestramento para nais e pais", "Gurasoentzako entrenamendu-egunak");
  add("Días de entrenamiento para velocistas", "Dies d'entrenament per a velocistes", "Días de adestramento para velocistas", "Abiadura-lasterkarientzako entrenamendu-egunak");
  add("Grupo madres y padres", "Grup mares i pares", "Grupo nais e pais", "Gurasoen taldea");
  add("Lunes, martes, miércoles y jueves · de 1 a 4 días", "Dilluns, dimarts, dimecres i dijous · d'1 a 4 dies", "Luns, martes, mércores e xoves · de 1 a 4 días", "Astelehen, astearte, asteazken eta ostegun · 1etik 4 egunera");
  add("Lunes, martes, miércoles y jueves · máximo 2 días", "Dilluns, dimarts, dimecres i dijous · màxim 2 dies", "Luns, martes, mércores e xoves · máximo 2 días", "Astelehen, astearte, asteazken eta ostegun · gehienez 2 egun");
  add("Lunes, miércoles y viernes · 18:30–19:30", "Dilluns, dimecres i divendres · 18:30–19:30", "Luns, mércores e venres · 18:30–19:30", "Astelehen, asteazken eta ostiral · 18:30–19:30");
  add("Tipo", "Tipus", "Tipo", "Mota");
  add("Es obligatoria hasta Sub-18. El club la cubre hasta Sub-12; desde Sub-14, el coste FAIB de cada categoría se abona en enero.", "És obligatòria fins a Sub-18. El club la cobreix fins a Sub-12; des de Sub-14, el cost FAIB de cada categoria s'abona al gener.", "É obrigatoria ata Sub-18. O club cóbrea ata Sub-12; desde Sub-14, o custo FAIB de cada categoría abóase en xaneiro.", "Sub-18ra arte derrigorrezkoa da. Klubak Sub-12ra arte estaltzen du; Sub-14tik aurrera, kategoria bakoitzaren FAIB kostua urtarrilean ordaintzen da.");
  add("La matrícula escolar es de 25 €. Incluye gestión, material, acceso a las instalaciones y camiseta Lô Esport hasta Sub-18.", "La matrícula escolar és de 25 €. Inclou gestió, material, accés a les instal·lacions i samarreta Lô Esport fins a Sub-18.", "A matrícula escolar é de 25 €. Inclúe xestión, material, acceso ás instalacións e camiseta Lô Esport ata Sub-18.", "Eskola-matrikula 25 € da. Kudeaketa, materiala, instalazioetarako sarbidea eta Lô Esport kamiseta Sub-18ra arte barne hartzen ditu.");
  add("Martes", "Dimarts", "Martes", "Asteartea");

  add(", pasas a formar parte de la entidad y contribuyes a su gestión, crecimiento y evolución.", ", passes a formar part de l'entitat i contribueixes a la seva gestió, creixement i evolució.", ", pasas a formar parte da entidade e contribúes á súa xestión, crecemento e evolución.", ", erakundeko kide bihurtzen zara eta haren kudeaketan, hazkundean eta bilakaeran laguntzen duzu.");
  add("100 € al año", "100 € l'any", "100 € ao ano", "100 € urtean");
  add("Al año", "A l'any", "Ao ano", "Urtean");
  add("Ayudas a construir una entidad estable, ambiciosa y preparada para evolucionar.", "Ajudes a construir una entitat estable, ambiciosa i preparada per evolucionar.", "Axudas a construír unha entidade estable, ambiciosa e preparada para evolucionar.", "Erakunde egonkor, handinahi eta aurrera egiteko prestatua eraikitzen laguntzen duzu.");
  add("Cada nuevo socio refuerza la entidad y suma una mirada al crecimiento y la evolución de Lô Esport Menorca.", "Cada nou soci reforça l'entitat i aporta una mirada al creixement i l'evolució de Lô Esport Menorca.", "Cada novo socio reforza a entidade e achega unha mirada ao crecemento e á evolución de Lô Esport Menorca.", "Bazkide berri bakoitzak erakundea sendotzen du eta Lô Esport Menorcaren hazkundeari eta bilakaerari ikuspegi berri bat eransten dio.");
  add("Con una aportación anual de", "Amb una aportació anual de", "Cunha achega anual de", "Urteko ekarpen honekin:");
  add("Contribuye a construir un club más fuerte y con más futuro.", "Contribueix a construir un club més fort i amb més futur.", "Contribúe a construír un club máis forte e con máis futuro.", "Klub sendoagoa eta etorkizun handiagokoa eraikitzen laguntzen du.");
  add("Contribuyes a consolidar el club y a ampliar el alcance de su proyecto.", "Contribueixes a consolidar el club i a ampliar l'abast del seu projecte.", "Contribúes a consolidar o club e a ampliar o alcance do seu proxecto.", "Kluba sendotzen eta haren proiektuaren irismena zabaltzen laguntzen duzu.");
  add("Crecimiento", "Creixement", "Crecemento", "Hazkundea");
  add("Forma parte", "Forma'n part", "Forma parte", "Izan parte");
  add("Formas parte de la entidad y de las decisiones que marcan su camino.", "Formes part de l'entitat i de les decisions que marquen el seu camí.", "Formas parte da entidade e das decisións que marcan o seu camiño.", "Erakundearen eta haren bidea zehazten duten erabakien parte zara.");
  add("Futuro", "Futur", "Futuro", "Etorkizuna");
  add("Hazte socio de Lô Esport Menorca por 100 € al año y forma parte de la gestión, el crecimiento y el futuro del club.", "Fes-te soci de Lô Esport Menorca per 100 € l'any i forma part de la gestió, el creixement i el futur del club.", "Faite socio de Lô Esport Menorca por 100 € ao ano e forma parte da xestión, do crecemento e do futuro do club.", "Egin Lô Esport Menorcako bazkide urtean 100 €-ren truke, eta izan klubaren kudeaketaren, hazkundearen eta etorkizunaren parte.");
  add("Hazte socio y forma parte del futuro del club.", "Fes-te soci i forma part del futur del club.", "Faite socio e forma parte do futuro do club.", "Egin bazkide eta izan klubaren etorkizunaren parte.");
  add("La cuota es de 100 € anuales. El club te indicará cómo completar el pago después de recibir la solicitud.", "La quota és de 100 € anuals. El club t'indicarà com completar el pagament després de rebre la sol·licitud.", "A cota é de 100 € anuais. O club indicarache como completar o pagamento despois de recibir a solicitude.", "Kuota urteko 100 € da. Klubak eskaera jaso ondoren ordainketa nola osatu adieraziko dizu.");
  add("No. Puedes ser socio aunque no entrenes ni compitas; basta con querer formar parte del proyecto del club.", "No. Pots ser soci encara que no entrenis ni competeixis; basta voler formar part del projecte del club.", "Non. Podes ser socio aínda que non adestres nin compitas; abonda con querer formar parte do proxecto do club.", "Ez. Bazkide izan zaitezke entrenatu edo lehiatu ez arren; nahikoa da klubaren proiektuaren parte izan nahi izatea.");
  add("Participa en la vida y la evolución de la entidad.", "Participa en la vida i l'evolució de l'entitat.", "Participa na vida e na evolución da entidade.", "Parte hartu erakundearen bizitzan eta bilakaeran.");
  add("Participación", "Participació", "Participación", "Parte-hartzea");
  add("Pasas a formar parte de la entidad y contribuyes a su gestión, crecimiento y evolución.", "Passes a formar part de l'entitat i contribueixes a la seva gestió, creixement i evolució.", "Pasas a formar parte da entidade e contribúes á súa xestión, crecemento e evolución.", "Erakundeko kide bihurtzen zara eta haren kudeaketan, hazkundean eta bilakaeran laguntzen duzu.");
  add("Ser socio significa implicarte en un proyecto compartido y contribuir a que Lô Esport Menorca siga creciendo con una base social fuerte.", "Ser soci significa implicar-te en un projecte compartit i contribuir que Lô Esport Menorca continuï creixent amb una base social forta.", "Ser socio significa implicarte nun proxecto compartido e contribuír a que Lô Esport Menorca siga medrando cunha base social forte.", "Bazkide izateak proiektu partekatu batean inplikatzea eta Lô Esport Menorcak gizarte-oinarri sendo batekin hazten jarrai dezan laguntzea esan nahi du.");
  add("Socios Lô Esport Menorca", "Socis Lô Esport Menorca", "Socios Lô Esport Menorca", "Lô Esport Menorcako bazkideak");
  add("Tu aportación ayuda a sostener y hacer crecer el proyecto colectivo.", "La teva aportació ajuda a sostenir i fer créixer el projecte col·lectiu.", "A túa achega axuda a soster e facer medrar o proxecto colectivo.", "Zure ekarpenak proiektu kolektiboa sostengatzen eta hazten laguntzen du.");
  add("Tu voz también construye el club.", "La teva veu també construeix el club.", "A túa voz tamén constrúe o club.", "Zure ahotsak ere kluba eraikitzen du.");
  add("Tu voz. Tu club. Nuestro futuro.", "La teva veu. El teu club. El nostre futur.", "A túa voz. O teu club. O noso futuro.", "Zure ahotsa. Zure kluba. Gure etorkizuna.");
  add("Un proyecto compartido", "Un projecte compartit", "Un proxecto compartido", "Proiektu partekatua");
  add("Una aportación anual de 100 €. Una voz más para seguir creciendo juntos.", "Una aportació anual de 100 €. Una veu més per continuar creixent junts.", "Unha achega anual de 100 €. Unha voz máis para seguir medrando xuntos.", "Urteko 100 €-ko ekarpena. Elkarrekin hazten jarraitzeko beste ahots bat.");
  add("¿Qué significa ser socio?", "Què significa ser soci?", "Que significa ser socio?", "Zer esan nahi du bazkide izateak?");

  add("Abrir proceso de cancelación", "Obrir el procés de cancel·lació", "Abrir o proceso de cancelación", "Ezeztapen-prozesua ireki");
  add("Desplegar grupos de MAÓ", "Desplegar grups de MAÓ", "Despregar grupos de MAÓ", "MAÓ taldeak zabaldu");
  add("Desplegar grupos de MERCADAL", "Desplegar grups de MERCADAL", "Despregar grupos de MERCADAL", "MERCADAL taldeak zabaldu");
  add("Grupos de ALAIOR desplegados", "Grups de ALAIOR desplegats", "Grupos de ALAIOR despregados", "ALAIOR taldeak zabalik");
  add("Email", "Correu electrònic", "Correo electrónico", "Posta elektronikoa");
  add("Inscripciones de la temporada 2026-27", "Inscripcions de la temporada 2026-27", "Inscricións da tempada 2026-27", "2026-27 denboraldiko izen-emateak");
  add("Inscripciones temporada 2026-27", "Inscripcions temporada 2026-27", "Inscricións tempada 2026-27", "2026-27 denboraldiko izen-emateak");
  add("Madres y padres", "Mares i pares", "Nais e pais", "Gurasoak");
  add("Menorca, 2026", "Menorca, 2026", "Menorca, 2026", "Menorca, 2026");
  add("Newsletter", "Butlletí", "Boletín", "Buletina");
  add("Solicitar periodo de prueba", "Sol·licitar període de prova", "Solicitar período de proba", "Probaldia eskatu");
  add("Tramitar licencia de atletismo", "Tramitar llicència d'atletisme", "Tramitar licenza de atletismo", "Atletismo-lizentzia tramitatu");
  add("Women's", "Women's", "Women's", "Women's");

  add("(Obligatorio si menor)", "(Obligatori si és menor)", "(Obrigatorio se é menor)", "(Derrigorrezkoa adingabea bada)");
  add("Adjunta foto o PDF del anverso del DNI, NIE o pasaporte.", "Adjunta una foto o PDF de l'anvers del DNI, NIE o passaport.", "Achega unha foto ou PDF do anverso do DNI, NIE ou pasaporte.", "Erantsi NANaren, AIZaren edo pasaportearen aurrealdeko argazkia edo PDFa.");
  add("Adjunta foto o PDF del reverso. Si tu pasaporte no tiene reverso, adjunta de nuevo la página principal.", "Adjunta una foto o PDF del revers. Si el passaport no té revers, torna a adjuntar la pàgina principal.", "Achega unha foto ou PDF do reverso. Se o teu pasaporte non ten reverso, achega de novo a páxina principal.", "Erantsi atzealdeko argazkia edo PDFa. Pasaporteak atzealderik ez badu, erantsi berriro orri nagusia.");
  add("Ahora completa los datos de la persona que va a entrenar.", "Ara completa les dades de la persona que entrenarà.", "Agora completa os datos da persoa que vai adestrar.", "Orain bete entrenatuko duen pertsonaren datuak.");
  add("Antes de empezar", "Abans de començar", "Antes de empezar", "Hasi aurretik");
  add("Condiciones de uso: quien cumplimenta este formulario declara que los datos consignados son reales. Al pulsar ENVIAR acepta las condiciones de uso y los reglamentos de Lô Esport Menorca.", "Condicions d'ús: qui emplena aquest formulari declara que les dades consignades són reals. En prémer ENVIAR accepta les condicions d'ús i els reglaments de Lô Esport Menorca.", "Condicións de uso: quen cobre este formulario declara que os datos consignados son reais. Ao premer ENVIAR acepta as condicións de uso e os regulamentos de Lô Esport Menorca.", "Erabilera-baldintzak: formulario hau betetzen duenak adierazten du emandako datuak egiazkoak direla. BIDALI sakatzean Lô Esport Menorcaren erabilera-baldintzak eta araudiak onartzen ditu.");
  add("DNI/NIE del tutor legal · parte delantera", "DNI/NIE del tutor legal · part davantera", "DNI/NIE do titor legal · parte dianteira", "Legezko tutorearen NAN/AIZ · aurrealdea");
  add("DNI/NIE del tutor legal · parte trasera", "DNI/NIE del tutor legal · part posterior", "DNI/NIE do titor legal · parte traseira", "Legezko tutorearen NAN/AIZ · atzealdea");
  add("Datos bancarios para domiciliación", "Dades bancàries per a domiciliació", "Datos bancarios para domiciliación", "Helbideratzerako banku-datuak");
  add("Gastos bancarios", "Despeses bancàries", "Gastos bancarios", "Banku-gastuak");
  add("Si eliges pagar por domiciliación bancaria, hay que sumar 0,50 € por gastos bancarios.", "Si tries pagar per domiciliació bancària, cal sumar 0,50 € per despeses bancàries.", "Se escolles pagar por domiciliación bancaria, hai que sumar 0,50 € por gastos bancarios.", "Banku-helbideratze bidez ordaintzea aukeratzen baduzu, 0,50 € gehitu behar dira banku-gastuengatik.");
  add("De conformidad con la LO 3/2018 y el Reglamento General de Protección de Datos 2016/679, los datos personales recogidos serán tratados por Lô Esport Menorca para gestionar la temporada 2026-27 y tramitar las licencias deportivas. Puedes ejercer tus derechos escribiendo a loesport@gmail.com.", "D'acord amb la LO 3/2018 i el Reglament General de Protecció de Dades 2016/679, Lô Esport Menorca tractarà les dades personals recollides per gestionar la temporada 2026-27 i tramitar les llicències esportives. Pots exercir els teus drets escrivint a loesport@gmail.com.", "De conformidade coa LO 3/2018 e o Regulamento Xeral de Protección de Datos 2016/679, os datos persoais recollidos serán tratados por Lô Esport Menorca para xestionar a tempada 2026-27 e tramitar as licenzas deportivas. Podes exercer os teus dereitos escribindo a loesport@gmail.com.", "3/2018 Lege Organikoarekin eta 2016/679 Datuak Babesteko Erregelamendu Orokorrarekin bat, Lô Esport Menorcak jasotako datu pertsonalak tratatuko ditu 2026-27 denboraldia kudeatzeko eta kirol-lizentziak tramitatzeko. Zure eskubideak erabil ditzakezu loesport@gmail.com helbidera idatzita.");
  add("Documento de identidad (DNI, NIE o pasaporte)", "Document d'identitat (DNI, NIE o passaport)", "Documento de identidade (DNI, NIE ou pasaporte)", "Nortasun-agiria (NAN, AIZ edo pasaportea)");
  add("Documento de identidad · parte delantera", "Document d'identitat · part davantera", "Documento de identidade · parte dianteira", "Nortasun-agiria · aurrealdea");
  add("Documento de identidad · parte trasera", "Document d'identitat · part posterior", "Documento de identidade · parte traseira", "Nortasun-agiria · atzealdea");
  add("Elige el grupo y los días: verás el precio exacto de cada opción. Si procede, completa también los datos del tutor y la cuenta bancaria.", "Tria el grup i els dies: veuràs el preu exacte de cada opció. Si escau, completa també les dades del tutor i el compte bancari.", "Elixe o grupo e os días: verás o prezo exacto de cada opción. Se procede, completa tamén os datos do titor e a conta bancaria.", "Hautatu taldea eta egunak: aukera bakoitzaren prezio zehatza ikusiko duzu. Beharrezkoa bada, bete tutorearen eta banku-kontuaren datuak ere.");
  add("Elige la modalidad y forma de pago", "Tria la modalitat i la forma de pagament", "Elixe a modalidade e a forma de pagamento", "Hautatu modalitatea eta ordainketa-modua");
  add("Formulario de inscripción de Lô Esport Menorca para la temporada de atletismo 2026-27.", "Formulari d'inscripció de Lô Esport Menorca per a la temporada d'atletisme 2026-27.", "Formulario de inscrición de Lô Esport Menorca para a tempada de atletismo 2026-27.", "Lô Esport Menorcaren 2026-27 atletismo-denboraldirako izen-emate formularioa.");
  add("Indica el número del documento y adjunta las dos caras a continuación.", "Indica el número del document i adjunta les dues cares a continuació.", "Indica o número do documento e achega as dúas caras a continuación.", "Adierazi agiriaren zenbakia eta erantsi bi aldeak jarraian.");
  add("Inscripción — Lô Esport Menorca", "Inscripció — Lô Esport Menorca", "Inscrición — Lô Esport Menorca", "Izen-ematea — Lô Esport Menorca");
  add("Inscríbete.", "Inscriu-t'hi.", "Inscríbete.", "Eman izena.");
  add("La licencia federativa es obligatoria hasta Sub-18 incluida. El club cubre su coste hasta Sub-12 incluida; desde Sub-14, el coste que apruebe la FAIB para cada categoría se abonará en enero. La camiseta Lô Esport está incluida hasta Sub-18; desde Sub-20 se adquiere aparte.", "La llicència federativa és obligatòria fins a Sub-18 inclosa. El club en cobreix el cost fins a Sub-12 inclosa; des de Sub-14, el cost que aprovi la FAIB per a cada categoria s'abonarà al gener. La samarreta Lô Esport està inclosa fins a Sub-18; des de Sub-20 s'adquireix a part.", "A licenza federativa é obrigatoria ata Sub-18 incluída. O club cobre o seu custo ata Sub-12 incluída; desde Sub-14, o custo que aprobe a FAIB para cada categoría aboarase en xaneiro. A camiseta Lô Esport está incluída ata Sub-18; desde Sub-20 adquírese á parte.", "Federazio-lizentzia derrigorrezkoa da Sub-18ra arte. Klubak kostua Sub-12ra arte estaltzen du; Sub-14tik aurrera, FAIBek kategoria bakoitzerako onartzen duen kostua urtarrilean ordainduko da. Lô Esport kamiseta Sub-18ra arte barne dago; Sub-20tik aurrera aparte erosten da.");
  add("La matrícula es de 25 €. Los grupos escolares la abonan siempre; desde Sub-20, solo se aplica a nuevas incorporaciones al club.", "La matrícula és de 25 €. Els grups escolars l'abonen sempre; des de Sub-20, només s'aplica a noves incorporacions al club.", "A matrícula é de 25 €. Os grupos escolares abóana sempre; desde Sub-20, só se aplica ás novas incorporacións ao club.", "Matrikula 25 € da. Eskola-taldeek beti ordaintzen dute; Sub-20tik aurrera, klubeko kide berriei soilik aplikatzen zaie.");
  add("Licencia y camiseta por categorías", "Llicència i samarreta per categories", "Licenza e camiseta por categorías", "Lizentzia eta kamiseta kategorien arabera");
  add("Precios licencias de 2026", "Preus llicències de 2026", "Prezos licenzas de 2026", "2026ko lizentzien prezioak");
  add("El precio de las licencias 2027 está pendiente de aprobar por la federación.", "El preu de les llicències 2027 està pendent d'aprovar per la federació.", "O prezo das licenzas 2027 está pendente de aprobar pola federación.", "2027ko lizentzien prezioa federazioak onartzeko zain dago.");
  add("Necesario solo si eliges domiciliación y el club todavía no tiene tus datos bancarios.", "Necessari només si tries domiciliació i el club encara no té les teves dades bancàries.", "Necesario só se elixes domiciliación e o club aínda non ten os teus datos bancarios.", "Helbideratzea aukeratzen baduzu eta klubak oraindik zure banku-daturik ez badu bakarrik beharrezkoa.");
  add("Ningún archivo seleccionado", "Cap arxiu seleccionat", "Ningún ficheiro seleccionado", "Ez da fitxategirik hautatu");
  add("Obligatorio si el participante es menor de 18 años.", "Obligatori si el participant és menor de 18 anys.", "Obrigatorio se o participante é menor de 18 anos.", "Derrigorrezkoa parte-hartzailea 18 urtetik beherakoa bada.");
  add("Pago mensual por domiciliación bancaria · El club ya tiene mis datos bancarios", "Pagament mensual per domiciliació bancària · El club ja té les meves dades bancàries", "Pagamento mensual por domiciliación bancaria · O club xa ten os meus datos bancarios", "Hileko ordainketa banku-helbideratzez · Klubak baditu nire banku-datuak");
  add("Pago mensual por domiciliación bancaria · Soy nuevo/a en el club", "Pagament mensual per domiciliació bancària · Som nou/nova al club", "Pagamento mensual por domiciliación bancaria · Son novo/a no club", "Hileko ordainketa banku-helbideratzez · Berria naiz klubean");
  add("Para pagos por domiciliación, los recibos se cargarán en cuenta el día 4. Las bajas deben comunicarse antes del día 20 del mes anterior mediante el formulario de \"Solicitud de baja\". Autorizo a Lô Esport Menorca a cargar los recibos derivados de la actividad en cuenta.", "Per als pagaments per domiciliació, els rebuts es carregaran en compte el dia 4. Les baixes s'han de comunicar abans del dia 20 del mes anterior mitjançant el formulari de \"Sol·licitud de baixa\". Autoritz Lô Esport Menorca a carregar en compte els rebuts derivats de l'activitat.", "Para os pagamentos por domiciliación, os recibos cargaranse na conta o día 4. As baixas deben comunicarse antes do día 20 do mes anterior mediante o formulario de \"Solicitude de baixa\". Autorizo a Lô Esport Menorca a cargar na conta os recibos derivados da actividade.", "Helbideratze bidezko ordainketetan, ordainagiriak hilaren 4an kargatuko dira kontuan. Bajak aurreko hilaren 20a baino lehen jakinarazi behar dira \"Baja-eskaera\" formularioaren bidez. Lô Esport Menorcari jardueratik eratorritako ordainagiriak kontuan kargatzeko baimena ematen diot.");
  add("Puedes pagar mes a mes o hacer un solo pago al inicio de temporada con una bonificación del 5 % sobre el total de la cuota.", "Pots pagar mes a mes o fer un únic pagament a l'inici de temporada amb una bonificació del 5 % sobre el total de la quota.", "Podes pagar mes a mes ou facer un único pagamento ao inicio da tempada cunha bonificación do 5 % sobre o total da cota.", "Hilero ordain dezakezu edo denboraldi hasieran ordainketa bakarra egin, kuota osoaren % 5eko hobariarekin.");
  add("Seleccionar archivo", "Seleccionar arxiu", "Seleccionar ficheiro", "Fitxategia hautatu");
  add("Titular de la cuenta", "Titular del compte", "Titular da conta", "Kontuaren titularra");
  add("Un solo pago al inicio (5 % de bonificación) · Domiciliación, el club ya tiene mis datos bancarios", "Un únic pagament a l'inici (5 % de bonificació) · Domiciliació, el club ja té les meves dades bancàries", "Un único pagamento ao inicio (5 % de bonificación) · Domiciliación, o club xa ten os meus datos bancarios", "Ordainketa bakarra hasieran (% 5eko hobaria) · Helbideratzea, klubak baditu nire banku-datuak");
  add("Un solo pago al inicio (5 % de bonificación) · Domiciliación, soy nuevo/a en el club", "Un únic pagament a l'inici (5 % de bonificació) · Domiciliació, som nou/nova al club", "Un único pagamento ao inicio (5 % de bonificación) · Domiciliación, son novo/a no club", "Ordainketa bakarra hasieran (% 5eko hobaria) · Helbideratzea, berria naiz klubean");
  add("Un solo pago al inicio (5 % de bonificación) · Efectivo al entrenador o responsable del club", "Un únic pagament a l'inici (5 % de bonificació) · Efectiu a l'entrenador o responsable del club", "Un único pagamento ao inicio (5 % de bonificación) · Efectivo ao adestrador ou responsable do club", "Ordainketa bakarra hasieran (% 5eko hobaria) · Eskudirutan entrenatzaileari edo klubeko arduradunari");

  add("(Obligatorio si NIE)", "(Obligatori si NIE)", "(Obrigatorio se NIE)", "(Derrigorrezkoa AIZ bada)");
  add("Abrir PDF ↗", "Obrir PDF ↗", "Abrir PDF ↗", "PDFa ireki ↗");
  add("Adjunta el documento de alta o renovación RFEA ya rellenado y firmado.", "Adjunta el document d'alta o renovació RFEA ja emplenat i signat.", "Achega o documento de alta ou renovación RFEA xa cuberto e asinado.", "Erantsi beteta eta sinatuta dagoen RFEA alta edo berritze agiria.");
  add("Adjunta foto o PDF del anverso del DNI o NIE.", "Adjunta una foto o PDF de l'anvers del DNI o NIE.", "Achega unha foto ou PDF do anverso do DNI ou NIE.", "Erantsi NANaren edo AIZaren aurrealdeko argazkia edo PDFa.");
  add("Adjunta foto o PDF del reverso del DNI o NIE.", "Adjunta una foto o PDF del revers del DNI o NIE.", "Achega unha foto ou PDF do reverso do DNI ou NIE.", "Erantsi NANaren edo AIZaren atzealdeko argazkia edo PDFa.");
  add("Alta de licencia RFEA", "Alta de llicència RFEA", "Alta de licenza RFEA", "RFEA lizentziaren alta");
  add("Alta o renovación", "Alta o renovació", "Alta ou renovación", "Alta edo berritzea");
  add("Certificado de empadronamiento para NIE", "Certificat d'empadronament per a NIE", "Certificado de empadroamento para NIE", "AIZrako errolda-ziurtagiria");
  add("DNI/NIE · parte delantera", "DNI/NIE · part davantera", "DNI/NIE · parte dianteira", "NAN/AIZ · aurrealdea");
  add("DNI/NIE · parte trasera", "DNI/NIE · part posterior", "DNI/NIE · parte traseira", "NAN/AIZ · atzealdea");
  add("Descarga el documento de alta, rellénalo y fírmalo antes de enviarlo al club.", "Descarrega el document d'alta, emplena'l i signa'l abans d'enviar-lo al club.", "Descarga o documento de alta, cúbreo e asínao antes de envialo ao club.", "Deskargatu alta-agiria, bete eta sinatu klubari bidali aurretik.");
  add("Descarga el documento de renovación, rellénalo y fírmalo antes de enviarlo al club.", "Descarrega el document de renovació, emplena'l i signa'l abans d'enviar-lo al club.", "Descarga o documento de renovación, cúbreo e asínao antes de envialo ao club.", "Deskargatu berritze-agiria, bete eta sinatu klubari bidali aurretik.");
  add("Descarga el impreso que corresponda, rellénalo y adjúntalo firmado en este formulario junto con el DNI/NIE por las dos caras.", "Descarrega l'imprès que correspongui, emplena'l i adjunta'l signat en aquest formulari juntament amb el DNI/NIE per les dues cares.", "Descarga o impreso que corresponda, cúbreo e achégao asinado neste formulario xunto co DNI/NIE polas dúas caras.", "Deskargatu dagokion inprimakia, bete eta erantsi sinatuta formulario honetan, NAN/AIZaren bi aldeekin batera.");
  add("Descarga y completa el impreso correspondiente", "Descarrega i completa l'imprès corresponent", "Descarga e completa o impreso correspondente", "Deskargatu eta bete dagokion inprimakia");
  add("Documentación RFEA", "Documentació RFEA", "Documentación RFEA", "RFEA dokumentazioa");
  add("Elige la licencia que corresponde.", "Tria la llicència que correspon.", "Elixe a licenza que corresponde.", "Hautatu dagokion lizentzia.");
  add("Formulario de alta y renovación de licencias de atletismo de Lô Esport Menorca.", "Formulari d'alta i renovació de llicències d'atletisme de Lô Esport Menorca.", "Formulario de alta e renovación de licenzas de atletismo de Lô Esport Menorca.", "Lô Esport Menorcaren atletismo-lizentzien alta eta berritze formularioa.");
  add("Impreso de licencia firmado", "Imprès de llicència signat", "Impreso de licenza asinado", "Sinatutako lizentzia-inprimakia");
  add("Licencias de atletismo — Lô Esport Menorca", "Llicències d'atletisme — Lô Esport Menorca", "Licenzas de atletismo — Lô Esport Menorca", "Atletismo-lizentziak — Lô Esport Menorca");
  add("Obligatorio solo si el documento indicado es NIE. Debe tener una antigüedad máxima de 3 meses.", "Obligatori només si el document indicat és NIE. Ha de tenir una antiguitat màxima de 3 mesos.", "Obrigatorio só se o documento indicado é NIE. Debe ter unha antigüidade máxima de 3 meses.", "Adierazitako agiria AIZ bada bakarrik derrigorrezkoa. Gehienez 3 hilabeteko antzinatasuna izan behar du.");
  add("Puedes tramitar licencia autonómica o nacional. Descarga el impreso RFEA de alta o renovación, rellénalo y envíalo firmado al club.", "Pots tramitar llicència autonòmica o nacional. Descarrega l'imprès RFEA d'alta o renovació, emplena'l i envia'l signat al club.", "Podes tramitar licenza autonómica ou nacional. Descarga o impreso RFEA de alta ou renovación, cúbreo e envíao asinado ao club.", "Autonomia- edo estatu-lizentzia tramita dezakezu. Deskargatu alta edo berritzeko RFEA inprimakia, bete eta bidali sinatuta klubari.");
  add("Renovación de licencia RFEA", "Renovació de llicència RFEA", "Renovación de licenza RFEA", "RFEA lizentziaren berritzea");

  add("Cookies.", "Galetes.", "Cookies.", "Cookieak.");
  add("Google Chrome: Configuración> Mostrar opciones avanzadas > Privacidad> Configuración de contenido.", "Google Chrome: Configuració > Mostra opcions avançades > Privadesa > Configuració de contingut.", "Google Chrome: Configuración > Mostrar opcións avanzadas > Privacidade > Configuración de contido.", "Google Chrome: Ezarpenak > Erakutsi aukera aurreratuak > Pribatutasuna > Edukiaren ezarpenak.");
  add("Microsoft Edge: Configuración> Configuración Avanzada> Cookies.", "Microsoft Edge: Configuració > Configuració avançada > Galetes.", "Microsoft Edge: Configuración > Configuración avanzada > Cookies.", "Microsoft Edge: Ezarpenak > Ezarpen aurreratuak > Cookieak.");
  add("Mozilla Firefox: Herramientas> Opciones> Privacidad> Historial> Configuración Personalizada.", "Mozilla Firefox: Eines > Opcions > Privadesa > Historial > Configuració personalitzada.", "Mozilla Firefox: Ferramentas > Opcións > Privacidade > Historial > Configuración personalizada.", "Mozilla Firefox: Tresnak > Aukerak > Pribatutasuna > Historia > Ezarpen pertsonalizatuak.");
  add("Opera (Opera Software): Configuración > Opciones > Avanzada > Cookies", "Opera (Opera Software): Configuració > Opcions > Avançada > Galetes", "Opera (Opera Software): Configuración > Opcións > Avanzada > Cookies", "Opera (Opera Software): Ezarpenak > Aukerak > Aurreratua > Cookieak");
  add("Opera (Opera Software): Configuración > Opciones > Avanzado > Cookies", "Opera (Opera Software): Configuració > Opcions > Avançat > Galetes", "Opera (Opera Software): Configuración > Opcións > Avanzado > Cookies", "Opera (Opera Software): Ezarpenak > Aukerak > Aurreratua > Cookieak");
  add("Safari (Apple): Preferencias> Seguridad.", "Safari (Apple): Preferències > Seguretat.", "Safari (Apple): Preferencias > Seguridade.", "Safari (Apple): Hobespenak > Segurtasuna.");
  add("aquí", "aquí", "aquí", "hemen");

  add("Formulario para probar durante una semana las actividades de atletismo de Lô Esport Menorca.", "Formulari per provar durant una setmana les activitats d'atletisme de Lô Esport Menorca.", "Formulario para probar durante unha semana as actividades de atletismo de Lô Esport Menorca.", "Lô Esport Menorcaren atletismo-jarduerak astebetez probatzeko formularioa.");
  add("Hemos recibido tu solicitud con el grupo y los días elegidos. Desde el club contactaremos contigo para confirmar la prueba.", "Hem rebut la teva sol·licitud amb el grup i els dies triats. Des del club contactarem amb tu per confirmar la prova.", "Recibimos a túa solicitude co grupo e os días elixidos. Desde o club contactaremos contigo para confirmar a proba.", "Zure eskaera jaso dugu hautatutako taldearekin eta egunekin. Klubetik zurekin harremanetan jarriko gara proba baieztatzeko.");
  add("Prueba gratuita — Lô Esport Menorca", "Prova gratuïta — Lô Esport Menorca", "Proba gratuíta — Lô Esport Menorca", "Doako proba — Lô Esport Menorca");
  add("Una semana de prueba", "Una setmana de prova", "Unha semana de proba", "Astebeteko proba");

  add("Añade este producto o vuelve al catálogo para descubrir la colección.", "Afegeix aquest producte o torna al catàleg per descobrir la col·lecció.", "Engade este produto ou volve ao catálogo para descubrir a colección.", "Gehitu produktu hau edo itzuli katalogora bilduma ezagutzeko.");
  add("Completa tu equipación.", "Completa la teva equipació.", "Completa a túa equipación.", "Osatu zure ekipazioa.");
  add("Ficha de producto", "Fitxa de producte", "Ficha de produto", "Produktu-fitxa");
  add("Ficha de producto de la equipación oficial de Lô Esport Menorca.", "Fitxa de producte de l'equipació oficial de Lô Esport Menorca.", "Ficha de produto da equipación oficial de Lô Esport Menorca.", "Lô Esport Menorcaren ekipazio ofizialeko produktu-fitxa.");
  add("Migas de pan", "Fil d'Ariadna", "Migas de pan", "Ogi-apurrak");
  add("Seguir viendo el producto", "Continuar veient el producte", "Seguir vendo o produto", "Jarraitu produktua ikusten");
  add("También puede interesarte", "També et pot interessar", "Tamén che pode interesar", "Hau ere interesgarria izan daiteke");
  add("Volver al", "Tornar al", "Volver ao", "Itzuli");
  add("Volver al catálogo", "Tornar al catàleg", "Volver ao catálogo", "Itzuli katalogora");
  add("catálogo", "catàleg", "catálogo", "katalogora");
  add("Correo electrónico: loesport@gmail.com", "Correu electrònic: loesport@gmail.com", "Correo electrónico: loesport@gmail.com", "Posta elektronikoa: loesport@gmail.com");
  add("Teléfono: 68907233", "Telèfon: 68907233", "Teléfono: 68907233", "Telefonoa: 68907233");
  add("Pack mochila + sudadera — Equipación Lô Esport Menorca", "Pack motxilla + dessuadora — Equipació Lô Esport Menorca", "Pack mochila + suadoiro — Equipación Lô Esport Menorca", "Motxila + sudadera packa — Lô Esport Menorca ekipazioa");
  add("Mochila — Equipación Lô Esport Menorca", "Motxilla — Equipació Lô Esport Menorca", "Mochila — Equipación Lô Esport Menorca", "Motxila — Lô Esport Menorca ekipazioa");
  add("Sudadera — Equipación Lô Esport Menorca", "Dessuadora — Equipació Lô Esport Menorca", "Suadoiro — Equipación Lô Esport Menorca", "Sudadera — Lô Esport Menorca ekipazioa");
  add("Top mujer — Equipación Lô Esport Menorca", "Top dona — Equipació Lô Esport Menorca", "Top muller — Equipación Lô Esport Menorca", "Emakumezkoen topa — Lô Esport Menorca ekipazioa");
  add("Braga mujer — Equipación Lô Esport Menorca", "Braga dona — Equipació Lô Esport Menorca", "Braga muller — Equipación Lô Esport Menorca", "Emakumezkoen braga — Lô Esport Menorca ekipazioa");
  add("Short mujer — Equipación Lô Esport Menorca", "Short dona — Equipació Lô Esport Menorca", "Short muller — Equipación Lô Esport Menorca", "Emakumezkoen shorta — Lô Esport Menorca ekipazioa");
  add("Camiseta mujer — Equipación Lô Esport Menorca", "Samarreta dona — Equipació Lô Esport Menorca", "Camiseta muller — Equipación Lô Esport Menorca", "Emakumezkoen kamiseta — Lô Esport Menorca ekipazioa");
  add("Camiseta hombre — Equipación Lô Esport Menorca", "Samarreta home — Equipació Lô Esport Menorca", "Camiseta home — Equipación Lô Esport Menorca", "Gizonezkoen kamiseta — Lô Esport Menorca ekipazioa");
  add("Pantalón hombre — Equipación Lô Esport Menorca", "Pantaló home — Equipació Lô Esport Menorca", "Pantalón home — Equipación Lô Esport Menorca", "Gizonezkoen galtzak — Lô Esport Menorca ekipazioa");
  add("Mallas cortas hombre — Equipación Lô Esport Menorca", "Malles curtes home — Equipació Lô Esport Menorca", "Mallas curtas home — Equipación Lô Esport Menorca", "Gizonezkoen malla motzak — Lô Esport Menorca ekipazioa");
  add("Mallas júnior — Equipación Lô Esport Menorca", "Malles júnior — Equipació Lô Esport Menorca", "Mallas júnior — Equipación Lô Esport Menorca", "Junior malla luzeak — Lô Esport Menorca ekipazioa");
  add("Mallas adulto — Equipación Lô Esport Menorca", "Malles adult — Equipació Lô Esport Menorca", "Mallas adulto — Equipación Lô Esport Menorca", "Helduen malla luzeak — Lô Esport Menorca ekipazioa");
  add("Equipación oficial del club", "Equipació oficial del club", "Equipación oficial do club", "Klubaren ekipazio ofiziala");
  add("Mono competición — Equipación Lô Esport Menorca", "Mono competició — Equipació Lô Esport Menorca", "Mono competición — Equipación Lô Esport Menorca", "Lehiaketako monoa — Lô Esport Menorca ekipazioa");

  add("Lunes", "Dilluns", "Luns", "Astelehena");
  add("Miércoles", "Dimecres", "Mércores", "Asteazkena");
  add("Jueves", "Dijous", "Xoves", "Osteguna");
  add("Lunes a viernes · horarios según el día", "Dilluns a divendres · horaris segons el dia", "Luns a venres · horarios segundo o día", "Astelehenetik ostiralera · egunaren araberako ordutegiak");
  add("Maó lunes, miércoles y viernes · Alaior martes y jueves", "Maó dilluns, dimecres i divendres · Alaior dimarts i dijous", "Maó luns, mércores e venres · Alaior martes e xoves", "Maó astelehen, asteazken eta ostiral · Alaior astearte eta ostegun");
  add("Martes y jueves · tercer día solo para mujeres el sábado", "Dimarts i dijous · tercer dia només per a dones el dissabte", "Martes e xoves · terceiro día só para mulleres o sábado", "Asteartea eta osteguna · hirugarren eguna emakumeentzat bakarrik larunbatean");
  add("Sábado Women · más días con Adultos 17:15", "Dissabte Women · més dies amb Adults 17:15", "Sábado Women · máis días con Adultos 17:15", "Women larunbata · egun gehiago 17:15eko helduekin");
  add("Consentimiento", "Consentiment", "Consentimento", "Baimena");
  add("Solicitud enviada correctamente.", "Sol·licitud enviada correctament.", "Solicitude enviada correctamente.", "Eskaera behar bezala bidali da.");
  add("No se ha podido enviar la solicitud.", "No s'ha pogut enviar la sol·licitud.", "Non se puido enviar a solicitude.", "Ezin izan da eskaera bidali.");
  add("No se pudo generar la captura.", "No s'ha pogut generar la captura.", "Non se puido xerar a captura.", "Ezin izan da pantaila-argazkia sortu.");
  add("Los archivos superan el límite total de 17 MB.", "Els arxius superen el límit total de 17 MB.", "Os ficheiros superan o límite total de 17 MB.", "Fitxategiek 17 MB-ko guztizko muga gainditzen dute.");
  add("La captura y los archivos superan el límite total de 17 MB.", "La captura i els arxius superen el límit total de 17 MB.", "A captura e os ficheiros superan o límite total de 17 MB.", "Pantaila-argazkiak eta fitxategiek 17 MB-ko guztizko muga gainditzen dute.");
  add("Archivo adjunto", "Arxiu adjunt", "Ficheiro adxunto", "Erantsitako fitxategia");
  add("Campo", "Camp", "Campo", "Eremua");
  add("No se ha podido enviar el formulario.", "No s'ha pogut enviar el formulari.", "Non se puido enviar o formulario.", "Ezin izan da formularioa bidali.");
  add("El envío ha tardado demasiado. Revisa la conexión y vuelve a intentarlo.", "L'enviament ha tardat massa. Revisa la connexió i torna-ho a provar.", "O envío tardou demasiado. Revisa a conexión e volve intentalo.", "Bidalketak denbora gehiegi behar izan du. Egiaztatu konexioa eta saiatu berriro.");
  add("de", "de", "de", "/");
  add("Elige dónde quieres entrenar.", "Tria on vols entrenar.", "Elixe onde queres adestrar.", "Hautatu non entrenatu nahi duzun.");
  add("Elige un grupo.", "Tria un grup.", "Elixe un grupo.", "Hautatu talde bat.");
  add("Elige cuántos días quieres entrenar.", "Tria quants dies vols entrenar.", "Elixe cantos días queres adestrar.", "Hautatu zenbat egunetan entrenatu nahi duzun.");
  add("La opción de 3 días de este grupo es solo para mujeres. Elige 1 o 2 días.", "L'opció de 3 dies d'aquest grup és només per a dones. Tria 1 o 2 dies.", "A opción de 3 días deste grupo é só para mulleres. Elixe 1 ou 2 días.", "Talde honetako 3 eguneko aukera emakumeentzat bakarrik da. Hautatu 1 edo 2 egun.");
  add("Selecciona los días para continuar", "Selecciona els dies per continuar", "Selecciona os días para continuar", "Hautatu egunak jarraitzeko");
  add("Marca los días que quiere entrenar:", "Marca els dies que vol entrenar:", "Marca os días que quere adestrar:", "Markatu entrenatu nahi dituen egunak:");
  add("Indica aquí el horario o días de ese grupo", "Indica aquí l'horari o els dies d'aquest grup", "Indica aquí o horario ou os días dese grupo", "Adierazi hemen talde horren ordutegia edo egunak");
  add("Ejemplo: martes y jueves, 17:15-18:15", "Exemple: dimarts i dijous, 17:15-18:15", "Exemplo: martes e xoves, 17:15-18:15", "Adibidea: asteartea eta osteguna, 17:15-18:15");
  add("Selecciona o indica los días concretos.", "Selecciona o indica els dies concrets.", "Selecciona ou indica os días concretos.", "Hautatu edo adierazi egun zehatzak.");
  add("Preparando la captura y los archivos...", "Preparant la captura i els arxius...", "Preparando a captura e os ficheiros...", "Pantaila-argazkia eta fitxategiak prestatzen...");
  add("Enviando el formulario y los archivos de forma segura...", "Enviant el formulari i els arxius de manera segura...", "Enviando o formulario e os ficheiros de forma segura...", "Formularioa eta fitxategiak modu seguruan bidaltzen...");
  add("No se ha podido enviar el formulario. Inténtalo de nuevo.", "No s'ha pogut enviar el formulari. Torna-ho a provar.", "Non se puido enviar o formulario. Inténtao de novo.", "Ezin izan da formularioa bidali. Saiatu berriro.");
  add("Adjunta este archivo para poder enviar el formulario.", "Adjunta aquest arxiu per poder enviar el formulari.", "Achega este ficheiro para poder enviar o formulario.", "Erantsi fitxategi hau formularioa bidali ahal izateko.");
  add("El certificado de empadronamiento es obligatorio si el documento es NIE.", "El certificat d'empadronament és obligatori si el document és NIE.", "O certificado de empadroamento é obrigatorio se o documento é NIE.", "Errolda-ziurtagiria derrigorrezkoa da agiria AIZ bada.");
  add("Este documento es obligatorio si el participante es menor de 18 años.", "Aquest document és obligatori si el participant és menor de 18 anys.", "Este documento é obrigatorio se o participante é menor de 18 anos.", "Agiri hau derrigorrezkoa da parte-hartzailea 18 urtetik beherakoa bada.");
  add("2 días", "2 dies", "2 días", "2 egun");
  add("3 días", "3 dies", "3 días", "3 egun");
  add("4 días", "4 dies", "4 días", "4 egun");
  add("5 días", "5 dies", "5 días", "5 egun");
  add("Solo puedes elegir 1 día.", "Només pots triar 1 dia.", "Só podes elixir 1 día.", "Egun 1 bakarrik hauta dezakezu.");
  add("Solo puedes elegir 2 días.", "Només pots triar 2 dies.", "Só podes elixir 2 días.", "2 egun bakarrik hauta ditzakezu.");
  add("Solo puedes elegir 3 días.", "Només pots triar 3 dies.", "Só podes elixir 3 días.", "3 egun bakarrik hauta ditzakezu.");
  add("Solo puedes elegir 4 días.", "Només pots triar 4 dies.", "Só podes elixir 4 días.", "4 egun bakarrik hauta ditzakezu.");
  add("Solo puedes elegir 5 días.", "Només pots triar 5 dies.", "Só podes elixir 5 días.", "5 egun bakarrik hauta ditzakezu.");
  add("Selecciona exactamente 1 día.", "Selecciona exactament 1 dia.", "Selecciona exactamente 1 día.", "Hautatu egun 1 zehazki.");
  add("Selecciona exactamente 2 días.", "Selecciona exactament 2 dies.", "Selecciona exactamente 2 días.", "Hautatu 2 egun zehazki.");
  add("Selecciona exactamente 3 días.", "Selecciona exactament 3 dies.", "Selecciona exactamente 3 días.", "Hautatu 3 egun zehazki.");
  add("Selecciona exactamente 4 días.", "Selecciona exactament 4 dies.", "Selecciona exactamente 4 días.", "Hautatu 4 egun zehazki.");
  add("Selecciona exactamente 5 días.", "Selecciona exactament 5 dies.", "Selecciona exactamente 5 días.", "Hautatu 5 egun zehazki.");
  add("El origen del formulario no está autorizado.", "L'origen del formulari no està autoritzat.", "A orixe do formulario non está autorizada.", "Formularioaren jatorria ez dago baimenduta.");
  add("La captura y los archivos superan el límite permitido.", "La captura i els arxius superen el límit permès.", "A captura e os ficheiros superan o límite permitido.", "Pantaila-argazkiak eta fitxategiek baimendutako muga gainditzen dute.");
  add("Se han realizado demasiados envíos. Inténtalo más tarde.", "S'han fet massa enviaments. Torna-ho a provar més tard.", "Realizáronse demasiados envíos. Inténtao máis tarde.", "Bidalketa gehiegi egin dira. Saiatu geroago.");
  add("Falta la captura del formulario.", "Falta la captura del formulari.", "Falta a captura do formulario.", "Formularioaren pantaila-argazkia falta da.");
  add("No se han recibido correctamente todos los archivos.", "No s'han rebut correctament tots els arxius.", "Non se recibiron correctamente todos os ficheiros.", "Ez dira fitxategi guztiak behar bezala jaso.");
  add("Solo se admiten imágenes y documentos PDF.", "Només s'admeten imatges i documents PDF.", "Só se admiten imaxes e documentos PDF.", "Irudiak eta PDF dokumentuak bakarrik onartzen dira.");
  add("Ruta no encontrada.", "Ruta no trobada.", "Ruta non atopada.", "Ez da bidea aurkitu.");
  add("No se ha podido enviar el formulario. Inténtalo de nuevo en unos minutos.", "No s'ha pogut enviar el formulari. Torna-ho a provar d'aquí a uns minuts.", "Non se puido enviar o formulario. Inténtao de novo nuns minutos.", "Ezin izan da formularioa bidali. Saiatu berriro minutu batzuk barru.");
  add("Los datos del formulario no son válidos.", "Les dades del formulari no són vàlides.", "Os datos do formulario non son válidos.", "Formularioaren datuak ez dira baliozkoak.");
  add("El tipo de formulario no es válido.", "El tipus de formulari no és vàlid.", "O tipo de formulario non é válido.", "Formulario mota ez da baliozkoa.");
  add("Las respuestas del formulario no son válidas.", "Les respostes del formulari no són vàlides.", "As respostas do formulario non son válidas.", "Formularioaren erantzunak ez dira baliozkoak.");
  add("No se han podido procesar los archivos. Revisa su tamaño y vuelve a intentarlo.", "No s'han pogut processar els arxius. Revisa'n la mida i torna-ho a provar.", "Non se puideron procesar os ficheiros. Revisa o seu tamaño e volve intentalo.", "Ezin izan dira fitxategiak prozesatu. Egiaztatu tamaina eta saiatu berriro.");
  add("Formulario web", "Formulari web", "Formulario web", "Web-formularioa");
  add("El servicio de correo todavía no está autorizado.", "El servei de correu encara no està autoritzat.", "O servizo de correo aínda non está autorizado.", "Posta-zerbitzua oraindik ez dago baimenduta.");

  return catalogue;
}

export const supplementalCatalogue = createSupplementalCatalogue();
