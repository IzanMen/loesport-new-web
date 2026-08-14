import { getTrainingGroup } from "../data/training-groups.js";

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
    const group = getTrainingGroup(card.id);
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

    const adultGroup = getTrainingGroup(group?.simultaneousAdultGroupId);
    if (group?.familyRole === "school" && adultGroup) {
      const familyNotice = document.createElement("aside");
      familyNotice.className = "group-family-training";
      const copy = document.createElement("div");
      const eyebrow = document.createElement("span");
      eyebrow.textContent = "Entrenamiento simultáneo";
      const title = document.createElement("strong");
      title.textContent = "¿Y si entrenáis también las madres y los padres?";
      const detail = document.createElement("p");
      detail.textContent = `${adultGroup.familySchedule}. Mientras entrena la escuela, con suplemento familiar de 10 € por 1 día o 15 € por 2 días al mes.`;
      copy.append(eyebrow, title, detail);
      const link = createAction(
        `/inscripcion-familiar.html?${query}`,
        "group-family-link",
        "Inscribir a toda la familia",
      );
      familyNotice.append(copy, link);
      card.querySelector(".group-card-details")?.before(familyNotice);
    }
    card.append(actions);
  });
}
