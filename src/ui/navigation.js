const PRIMARY_LINKS = [
  { area: "groups", href: "/#grupos", label: "Grupos y horarios" },
  { area: "registration", href: "/inscripcion.html", label: "Inscripción" },
  { area: "paperwork", href: "/#gestiones", label: "Trámites" },
  { area: "club", href: "/historia.html", label: "El club" },
  { area: "equipment", href: "/equipamiento.html", label: "Equipación" },
  { area: "contact", href: "/#contacto", label: "Contacto" },
];

const MENU_SECTIONS = [
  {
    id: "entrenar",
    label: "Quiero entrenar",
    areas: ["groups"],
    links: [
      ["Encontrar mi grupo", "/#grupos"],
      ["Horarios y precios en Maó", "/grupos-mao.html"],
      ["Horarios y precios en Alaior", "/grupos-alaior.html"],
      ["Horarios y precios en Es Mercadal", "/grupos-mercadal.html"],
      ["Probar un entrenamiento", "/preinscripcion.html"],
    ],
  },
  {
    id: "tramites",
    label: "Inscripciones y trámites",
    areas: ["registration", "paperwork"],
    links: [
      ["Inscribirme en el club", "/inscripcion.html"],
      ["Inscribir a mi familia", "/inscripcion-familiar.html"],
      ["Solicitar un entrenamiento de prueba", "/preinscripcion.html"],
      ["Gestionar la licencia", "/licencias.html"],
      ["Solicitar la baja", "/baja.html"],
    ],
  },
  {
    id: "club",
    label: "Conoce el club",
    areas: ["club"],
    links: [
      ["Nuestra historia", "/historia.html"],
      ["Equipo de entrenadores", "/#entrenadores"],
      ["Ascenso a División de Honor", "/ascenso-division-honor.html"],
      ["Patrocinadores del club", "/patrocinadores.html"],
    ],
  },
  {
    id: "comunidad",
    label: "Socios, equipación y apoyo",
    areas: ["equipment", "community"],
    links: [
      ["Hazte socio", "/hazte-socio.html"],
      ["Equipación del club", "/equipamiento.html"],
      ["Patrocina el club", "/patrocinadores.html#colabora"],
    ],
  },
];

function getCurrentArea() {
  const path = window.location.pathname;

  if (path.includes("grupos-")) return "groups";
  if (["/inscripcion.html", "/inscripcion-familiar.html"].some((page) => path.endsWith(page))) {
    return "registration";
  }
  if (["/preinscripcion.html", "/baja.html", "/licencias.html"].some((page) => path.endsWith(page))) {
    return "paperwork";
  }
  if (["/historia.html", "/ascenso-division-honor.html"].some((page) => path.endsWith(page))) return "club";
  if (["/equipamiento.html", "/producto-equipacion.html"].some((page) => path.endsWith(page))) return "equipment";
  if (path.endsWith("/hazte-socio.html") || path.endsWith("/patrocinadores.html")) return "community";
  return "";
}

function renderPrimaryNavigation(currentArea) {
  document.querySelectorAll(".desktop-nav").forEach((navigation) => {
    navigation.replaceChildren(
      ...PRIMARY_LINKS.map(({ area, href, label }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        if (currentArea === area) {
          link.classList.add("is-current");
          link.setAttribute("aria-current", "page");
        }
        return link;
      }),
    );
  });
}

function ensureMenuElements() {
  const identity = document.querySelector(".site-header .nav-identity");
  let menuButton = identity?.querySelector(".menu-toggle");

  if (identity && !menuButton) {
    menuButton = document.createElement("button");
    menuButton.className = "menu-toggle";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Abrir menú");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "site-menu");
    menuButton.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span>';
    identity.prepend(menuButton);
  }

  let backdrop = document.querySelector(".menu-backdrop");
  let mobileMenu = document.querySelector(".mobile-menu");
  const pageHeader = document.querySelector(".page-header");

  if (!backdrop && pageHeader) {
    backdrop = document.createElement("div");
    backdrop.className = "menu-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    pageHeader.after(backdrop);
  }

  if (!mobileMenu && backdrop) {
    mobileMenu = document.createElement("nav");
    mobileMenu.className = "mobile-menu";
    mobileMenu.id = "site-menu";
    mobileMenu.setAttribute("aria-label", "Menú principal");
    mobileMenu.setAttribute("aria-hidden", "true");
    mobileMenu.inert = true;
    mobileMenu.hidden = true;
    backdrop.after(mobileMenu);
  }

  return { menuButton, mobileMenu };
}

function createMenuLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  return link;
}

function renderMenu(currentArea, mobileMenu) {
  if (!mobileMenu) return;

  const activeSection = MENU_SECTIONS.find((section) => section.areas.includes(currentArea)) || MENU_SECTIONS[0];
  const layout = document.createElement("div");
  layout.className = "menu-layout";

  const main = document.createElement("div");
  main.className = "menu-main";

  const quickLinks = document.createElement("div");
  quickLinks.className = "menu-quick-links";
  quickLinks.append(
    createMenuLink("Encontrar mi grupo", "/#grupos"),
    createMenuLink("Inscribirme", "/inscripcion.html"),
    createMenuLink("Pedir ayuda", "/#contacto"),
  );
  main.append(quickLinks);

  MENU_SECTIONS.forEach((section) => {
    const isActive = section === activeSection;
    const button = document.createElement("button");
    button.className = `menu-section-button${isActive ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.menuSection = section.id;
    button.setAttribute("aria-expanded", String(isActive));
    button.setAttribute("aria-controls", `menu-inline-${section.id} menu-panel-${section.id}`);
    button.innerHTML = `<span>${section.label}</span><span aria-hidden="true">›</span>`;
    main.append(button);

    const inlinePanel = document.createElement("div");
    inlinePanel.className = `menu-inline-panel${isActive ? " is-active" : ""}`;
    inlinePanel.id = `menu-inline-${section.id}`;
    inlinePanel.dataset.menuInlinePanel = section.id;
    inlinePanel.hidden = !isActive;
    inlinePanel.append(...section.links.map(([label, href]) => createMenuLink(label, href)));
    main.append(inlinePanel);
  });

  const contactLink = createMenuLink("Contacto y ayuda", "/#contacto");
  contactLink.className = "menu-section-link";
  contactLink.innerHTML = '<span>Contacto y ayuda</span><span aria-hidden="true">›</span>';
  main.append(contactLink);

  const detail = document.createElement("div");
  detail.className = "menu-detail";
  detail.setAttribute("role", "group");
  detail.setAttribute("aria-label", "Opciones de navegación");

  MENU_SECTIONS.forEach((section) => {
    const isActive = section === activeSection;
    const panel = document.createElement("div");
    panel.className = `menu-panel${isActive ? " is-active" : ""}`;
    panel.id = `menu-panel-${section.id}`;
    panel.dataset.menuPanel = section.id;
    panel.hidden = !isActive;
    panel.append(...section.links.map(([label, href]) => createMenuLink(label, href)));
    detail.append(panel);
  });

  layout.append(main, detail);
  mobileMenu.replaceChildren(layout);
}

function improveDefaultAction() {
  document.querySelectorAll(".nav-cta").forEach((action) => {
    if (new URL(action.href, window.location.href).hash !== "#gestiones") return;
    action.href = "/preinscripcion.html";
    action.innerHTML = 'Quiero entrenar <span aria-hidden="true">↗</span>';
  });
}

export function initNavigation(i18n) {
  const currentArea = getCurrentArea();
  renderPrimaryNavigation(currentArea);
  const { menuButton, mobileMenu } = ensureMenuElements();
  renderMenu(currentArea, mobileMenu);
  improveDefaultAction();

  const menuBackdrop = document.querySelector(".menu-backdrop");
  const menuSectionButtons = [...document.querySelectorAll(".menu-section-button")];
  const menuPanels = [...document.querySelectorAll(".menu-panel")];
  const menuInlinePanels = [...document.querySelectorAll(".menu-inline-panel")];

  function isOpen() {
    return Boolean(mobileMenu?.classList.contains("is-open"));
  }

  function updateMenuButtonLabel() {
    menuButton?.setAttribute("aria-label", isOpen() ? i18n.translate("Cerrar menú") : i18n.translate("Abrir menú"));
  }

  function setMenuOpen(nextOpen) {
    if (!menuButton || !mobileMenu) return;

    if (nextOpen) {
      mobileMenu.hidden = false;
      window.requestAnimationFrame(() => {
        document.body.classList.add("menu-open");
        mobileMenu.classList.add("is-open");
      });
    } else {
      document.body.classList.remove("menu-open");
      mobileMenu.classList.remove("is-open");
    }

    mobileMenu.setAttribute("aria-hidden", String(!nextOpen));
    mobileMenu.inert = !nextOpen;
    menuButton.setAttribute("aria-expanded", String(nextOpen));
    updateMenuButtonLabel();
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function activateMenuPanel(section) {
    menuSectionButtons.forEach((button) => {
      const isActive = button.dataset.menuSection === section;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-expanded", String(isActive));
    });

    menuPanels.forEach((panel) => {
      const isActive = panel.dataset.menuPanel === section;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    menuInlinePanels.forEach((panel) => {
      const isActive = panel.dataset.menuInlinePanel === section;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  mobileMenu?.addEventListener("transitionend", (event) => {
    if (event.target !== mobileMenu || event.propertyName !== "transform") return;

    if (!mobileMenu.classList.contains("is-open")) {
      mobileMenu.hidden = true;
    }
  });

  menuButton?.addEventListener("click", () => {
    setMenuOpen(!isOpen());
  });

  menuBackdrop?.addEventListener("click", closeMenu);

  menuSectionButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(button.classList.contains("is-active")));

    button.addEventListener("click", () => {
      activateMenuPanel(button.dataset.menuSection);
    });

    button.addEventListener("pointerenter", () => {
      if (window.matchMedia("(min-width: 901px)").matches) {
        activateMenuPanel(button.dataset.menuSection);
      }
    });
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      closeMenu();
      menuButton?.focus();
    }
  });

  return {
    closeMenu,
    updateMenuButtonLabel,
  };
}
