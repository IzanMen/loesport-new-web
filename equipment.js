import { equipmentProducts, formatEquipmentPrice } from "./src/data/equipment-products.js";
import { initI18n } from "./src/i18n/index.js";
import { initEquipmentRequest } from "./src/ui/equipment-request.js";
import { initCurrentYear } from "./src/ui/current-year.js";
import { initForms } from "./src/ui/forms.js";
import { initNavigation } from "./src/ui/navigation.js";
import { initRevealAnimations } from "./src/ui/reveal.js";
import { initScrollEffects } from "./src/ui/scroll-effects.js";

const catalog = document.querySelector("[data-equipment-catalog]");
const sortSelect = document.querySelector("[data-equipment-sort]");
const productCount = document.querySelector("[data-product-count]");

function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "equipment-card reveal";
  article.dataset.equipmentCard = "";
  article.dataset.equipmentCategory = product.categories.join(" ");
  article.dataset.productName = product.name;
  article.dataset.productPrice = String(product.price);

  const link = document.createElement("a");
  link.className = "equipment-card-link";
  link.href = `/producto-equipacion.html?producto=${encodeURIComponent(product.id)}`;
  link.setAttribute("aria-label", "Ver producto");

  const media = document.createElement("div");
  media.className = `equipment-card-media${product.images.length > 1 ? " equipment-pack-media" : ""}`;
  product.images.forEach((source, index) => {
    const image = document.createElement("img");
    image.src = source;
    image.alt = index === 0 ? product.name : "";
    image.loading = "lazy";
    media.append(image);
  });

  const body = document.createElement("div");
  body.className = "equipment-card-body";
  const meta = document.createElement("div");
  const category = document.createElement("span");
  category.textContent = product.categoryLabel;
  const price = document.createElement("strong");
  price.textContent = formatEquipmentPrice(product.price);
  meta.append(category, price);

  const name = document.createElement("h3");
  name.textContent = product.name;
  const description = document.createElement("p");
  description.textContent = product.description;
  const sizes = document.createElement("p");
  sizes.className = "equipment-sizes";
  if (product.sizes.length) {
    const label = document.createElement("span");
    label.textContent = "Tallas:";
    sizes.append(label, " ", product.sizes.join(", "));
  } else {
    sizes.textContent = "Talla única";
  }
  const action = document.createElement("span");
  action.className = "equipment-card-action";
  action.innerHTML = 'Ver producto <span aria-hidden="true">→</span>';

  body.append(meta, name, description, sizes, action);
  link.append(media, body);
  article.append(link);
  return article;
}

function sortedProducts(products) {
  const next = [...products];
  switch (sortSelect?.value) {
    case "price-asc":
      return next.sort((a, b) => a.price - b.price);
    case "price-desc":
      return next.sort((a, b) => b.price - a.price);
    case "name":
      return next.sort((a, b) => a.name.localeCompare(b.name, "es"));
    default:
      return next;
  }
}

function renderCatalog() {
  const products = sortedProducts(equipmentProducts);
  catalog?.replaceChildren(...products.map(createProductCard));
  if (productCount) {
    productCount.textContent = `${products.length} producto${products.length === 1 ? "" : "s"}`;
  }
  initRevealAnimations();
}

sortSelect?.addEventListener("change", renderCatalog);

renderCatalog();

const i18n = initI18n();
const navigation = initNavigation(i18n);
initScrollEffects();
initRevealAnimations();
initForms(i18n);
initCurrentYear();
initEquipmentRequest();

document.addEventListener("loesport:languagechange", () => {
  navigation.updateMenuButtonLabel();
});
