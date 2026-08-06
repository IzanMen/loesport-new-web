function createAction(href, className, label) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;

  const text = document.createElement("span");
  text.textContent = label;
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  link.append(text, arrow);
  return link;
}

export function initGroupActions() {
  document.querySelectorAll("[data-group-card]").forEach((card) => {
    if (!card.id || card.querySelector(".group-card-actions")) return;

    const actions = document.createElement("div");
    actions.className = "group-card-actions";
    const query = new URLSearchParams({ grupo: card.id }).toString();
    actions.append(
      createAction(
        `/inscripcion.html?${query}`,
        "group-card-action group-card-action-primary",
        "Quiero inscribirme en este grupo",
      ),
      createAction(
        `/preinscripcion.html?${query}`,
        "group-card-action group-card-action-secondary",
        "Quiero probar gratis este grupo",
      ),
    );
    card.append(actions);
  });
}
