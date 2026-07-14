export function initNavigation(i18n) {
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
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
