function getMatchingCards(finder, value) {
  const mode = finder.dataset.finderMode;
  const cards = [...document.querySelectorAll("[data-group-card]")];

  if (value === "adult") {
    return cards.filter((card) => card.dataset.audience === "adult");
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return [];

  const minimumKey = mode === "age" ? "ageMin" : "yearMin";
  const maximumKey = mode === "age" ? "ageMax" : "yearMax";

  return cards.filter((card) => {
    const minimum = Number(card.dataset[minimumKey]);
    const maximum = Number(card.dataset[maximumKey]);
    return Number.isFinite(minimum) && Number.isFinite(maximum) && number >= minimum && number <= maximum;
  });
}

function createResultCard(card, i18n) {
  const item = document.createElement("article");
  item.className = "group-match-card";

  const category = document.createElement("p");
  category.className = "group-match-category";
  category.textContent = card.dataset.category;

  const title = document.createElement("h3");
  title.textContent = card.dataset.title;

  const summary = document.createElement("p");
  summary.className = "group-match-summary";
  summary.textContent = card.dataset.summary;

  const price = document.createElement("p");
  price.className = "group-match-price";
  price.textContent = card.dataset.price;

  const link = document.createElement("a");
  link.href = `#${card.id}`;
  link.textContent = i18n.translate("Ver horarios y precios");

  item.append(category, title, summary, price, link);
  return item;
}

export function initGroupFinder(i18n) {
  document.querySelectorAll("[data-group-finder]").forEach((finder) => {
    const form = finder.querySelector("form");
    const select = finder.querySelector("[data-group-value]");
    const result = finder.querySelector("[data-group-result]");
    const resultTitle = finder.querySelector("[data-group-result-title]");
    const resultList = finder.querySelector("[data-group-result-list]");
    const empty = finder.querySelector("[data-group-empty]");

    if (!form || !select || !result || !resultTitle || !resultList || !empty) return;

    const updateResults = () => {
      const value = select.value;
      resultList.replaceChildren();
      empty.hidden = true;

      if (!value) {
        result.hidden = true;
        return;
      }

      const matches = getMatchingCards(finder, value);
      result.hidden = false;

      if (!matches.length) {
        resultTitle.textContent = i18n.translate("No encontramos una coincidencia exacta");
        empty.hidden = false;
        return;
      }

      resultTitle.textContent =
        matches.length === 1
          ? i18n.translate("Este es el grupo que encaja")
          : i18n.translate("Estas {count} opciones pueden encajar", { count: matches.length });
      matches.forEach((card) => resultList.append(createResultCard(card, i18n)));
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateResults();
    });

    select.addEventListener("change", updateResults);
    document.addEventListener("loesport:languagechange", () => {
      if (!result.hidden) updateResults();
    });
  });
}
