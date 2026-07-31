import { equipmentProducts, formatEquipmentPrice, getEquipmentProduct } from "./src/data/equipment-products.js";
import { initI18n } from "./src/i18n/index.js";
import { initEquipmentRequest } from "./src/ui/equipment-request.js";
import { initCurrentYear } from "./src/ui/current-year.js";
import { initForms } from "./src/ui/forms.js";
import { initNavigation } from "./src/ui/navigation.js";
import { initRevealAnimations } from "./src/ui/reveal.js";
import { initScrollEffects } from "./src/ui/scroll-effects.js";

const params = new URLSearchParams(window.location.search);
const product = getEquipmentProduct(params.get("producto")) || equipmentProducts[0];
const detailRoot = document.querySelector("[data-product-detail]");
const relatedRoot = document.querySelector("[data-related-products]");

function createOption(value) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
  return option;
}

function renderGallery() {
  const gallery = document.createElement("div");
  gallery.className = "product-gallery";

  const stage = document.createElement("div");
  stage.className = "product-gallery-stage";
  const mainImage = document.createElement("img");
  mainImage.src = product.images[0];
  mainImage.alt = product.name;
  stage.append(mainImage);
  gallery.append(stage);

  if (product.images.length > 1) {
    const thumbnails = document.createElement("div");
    thumbnails.className = "product-gallery-thumbnails";
    product.images.forEach((source, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === 0 ? "is-active" : "";
      button.setAttribute("aria-label", "Ver imagen del producto");
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      button.append(image);
      button.addEventListener("click", () => {
        mainImage.src = source;
        thumbnails.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      });
      thumbnails.append(button);
    });
    gallery.append(thumbnails);
  }

  return gallery;
}

function renderProductInfo() {
  const info = document.createElement("div");
  info.className = "product-info";

  const category = document.createElement("p");
  category.className = "eyebrow";
  category.textContent = product.categoryLabel;

  const heading = document.createElement("div");
  heading.className = "product-heading";
  const title = document.createElement("h1");
  title.textContent = product.name;
  const price = document.createElement("strong");
  price.textContent = formatEquipmentPrice(product.price);
  heading.append(title, price);

  const description = document.createElement("p");
  description.className = "product-lead";
  description.textContent = product.detail;

  const form = document.createElement("form");
  form.className = "product-options";
  form.dataset.productOptions = "";

  if (product.genders.length > 1) {
    const genderField = document.createElement("fieldset");
    genderField.className = "product-option-field";
    const legend = document.createElement("legend");
    legend.textContent = "Género / patrón";
    const choices = document.createElement("div");
    choices.className = "product-segments";
    product.genders.forEach((gender, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "gender";
      input.value = gender;
      input.required = true;
      if (index === 0) input.checked = true;
      const text = document.createElement("span");
      text.textContent = gender;
      label.append(input, text);
      choices.append(label);
    });
    genderField.append(legend, choices);
    form.append(genderField);
  } else {
    const gender = document.createElement("p");
    gender.className = "product-static-option";
    gender.innerHTML = `<span>Patrón</span><strong>${product.genders[0]}</strong>`;
    form.append(gender);
  }

  if (product.sizes.length) {
    const sizeLabel = document.createElement("label");
    sizeLabel.className = "product-select-label";
    const sizeText = document.createElement("span");
    sizeText.textContent = "Talla";
    const select = document.createElement("select");
    select.name = "size";
    select.required = true;
    const placeholder = createOption("Selecciona una talla");
    placeholder.value = "";
    select.append(placeholder, ...product.sizes.map(createOption));
    sizeLabel.append(sizeText, select);
    form.append(sizeLabel);
  } else {
    const size = document.createElement("p");
    size.className = "product-static-option";
    size.innerHTML = "<span>Talla</span><strong>Única</strong>";
    form.append(size);
  }

  const color = document.createElement("div");
  color.className = "product-color";
  color.innerHTML = `<span>Color</span><p><i style="--swatch: ${product.colorHex}" aria-hidden="true"></i><strong>${product.color}</strong></p>`;

  const quantityLabel = document.createElement("label");
  quantityLabel.className = "product-quantity";
  const quantityText = document.createElement("span");
  quantityText.textContent = "Cantidad";
  const quantity = document.createElement("input");
  quantity.type = "number";
  quantity.name = "quantity";
  quantity.min = "1";
  quantity.max = "20";
  quantity.value = "1";
  quantity.required = true;
  quantityLabel.append(quantityText, quantity);

  const optionRow = document.createElement("div");
  optionRow.className = "product-option-row";
  optionRow.append(color, quantityLabel);
  form.append(optionRow);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "product-request-button";
  submit.innerHTML = 'Añadir a la solicitud <span aria-hidden="true">→</span>';
  form.append(submit);

  const note = document.createElement("p");
  note.className = "product-request-note";
  note.textContent = "No se realizará ningún cobro. El club confirmará disponibilidad, talla y forma de pago.";
  form.append(note);

  const details = document.createElement("div");
  details.className = "product-details-list";
  const featureItems = product.features.map((feature) => `<li>${feature}</li>`).join("");
  const sizesCopy = product.sizes.length
    ? `<span>Tallas disponibles:</span> ${product.sizes.join(", ")}. <span>La disponibilidad se confirma al tramitar la solicitud.</span>`
    : `<span>Este artículo es de talla única.</span> <span>La disponibilidad se confirma al tramitar la solicitud.</span>`;
  details.innerHTML = `
    <details open>
      <summary>Detalles del producto</summary>
      <ul>${featureItems}</ul>
    </details>
    <details>
      <summary>Tallas y ajuste</summary>
      <p>${sizesCopy}</p>
    </details>
    <details>
      <summary>Cómo funciona la solicitud</summary>
      <p>Añade los artículos que necesites, revisa la bolsa y envía tus datos. El club contactará contigo para confirmar el pedido y el pago.</p>
    </details>
  `;

  info.append(category, heading, description, form, details);
  return { info, form };
}

function renderRelatedProduct(item) {
  const link = document.createElement("a");
  link.className = "related-product";
  link.href = `/producto-equipacion.html?producto=${encodeURIComponent(item.id)}`;
  const image = document.createElement("img");
  image.src = item.images[0];
  image.alt = item.name;
  image.loading = "lazy";
  const copy = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = item.name;
  const price = document.createElement("strong");
  price.textContent = formatEquipmentPrice(item.price);
  copy.append(name, price);
  link.append(image, copy);
  return link;
}

const gallery = renderGallery();
const { info, form } = renderProductInfo();
detailRoot?.append(gallery, info);

const related = equipmentProducts
  .filter((item) => item.id !== product.id && item.categories.some((category) => product.categories.includes(category)))
  .slice(0, 4);
relatedRoot?.append(...related.map(renderRelatedProduct));

document.title = `${product.name} — Equipación Lô Esport Menorca`;
const request = initEquipmentRequest();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  request.addItem({
    productId: product.id,
    size: product.sizes.length ? data.get("size") : "",
    gender: product.genders.length > 1 ? data.get("gender") : product.genders[0],
    quantity: Math.min(Math.max(Number(data.get("quantity")) || 1, 1), 20),
  });
});

const i18n = initI18n();
const navigation = initNavigation(i18n);
initScrollEffects();
initRevealAnimations();
initForms(i18n);
initCurrentYear();

document.addEventListener("loesport:languagechange", () => {
  navigation.updateMenuButtonLabel();
});
