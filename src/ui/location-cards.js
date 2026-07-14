export function initLocationCards(i18n) {
  const locationCards = [...document.querySelectorAll(".location-card")];

  function updateLocationToggleLabels() {
    locationCards.forEach((item) => {
      const toggle = item.querySelector(".location-toggle");
      const locationName = item.querySelector("h3")?.textContent.trim() || "la sede";
      const isActive = item.classList.contains("is-active");

      toggle?.setAttribute(
        "aria-label",
        i18n.translate(isActive ? "Grupos de {location} desplegados" : "Desplegar grupos de {location}", {
          location: locationName,
        }),
      );
    });
  }

  locationCards.forEach((card) => {
    const activate = () => {
      locationCards.forEach((item) => {
        const isActive = item === card;
        const toggle = item.querySelector(".location-toggle");
        const groupList = item.querySelector(".location-groups");

        item.classList.toggle("is-active", isActive);
        if (groupList) groupList.hidden = !isActive;
        if (toggle) {
          toggle.setAttribute("aria-expanded", String(isActive));
        }
      });
      updateLocationToggleLabels();
    };

    card.addEventListener("click", () => {
      activate();
    });

    card.addEventListener("keydown", (event) => {
      if (event.target === card && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        activate();
      }
    });
  });

  updateLocationToggleLabels();

  return {
    updateLocationToggleLabels,
  };
}
