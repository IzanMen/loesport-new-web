import { formatEquipmentPrice, getEquipmentProduct } from "../data/equipment-products.js";

const STORAGE_KEY = "loesport-equipment-request";

function readRequest() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeRequest(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The request remains usable for the current page if storage is unavailable.
  }
}

function itemKey(item) {
  return `${item.productId}|${item.size || ""}|${item.gender || ""}`;
}

function createText(text) {
  return document.createTextNode(text);
}

function lineDescription(item) {
  return [item.size && ["Talla", item.size], item.gender && ["Patrón", item.gender]].filter(Boolean);
}

export function initEquipmentRequest() {
  const drawer = document.querySelector("[data-request-drawer]");
  const backdrop = document.querySelector("[data-request-backdrop]");
  const list = document.querySelector("[data-request-items]");
  const empty = document.querySelector("[data-request-empty]");
  const form = document.querySelector("[data-request-form]");
  const total = document.querySelector("[data-request-total]");
  const openButtons = [...document.querySelectorAll("[data-open-request]")];
  const closeButtons = [...document.querySelectorAll("[data-close-request]")];
  let items = readRequest();
  let lastFocusedElement;

  function itemCount() {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  function requestTotal() {
    return items.reduce((sum, item) => {
      const product = getEquipmentProduct(item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  }

  function updateCounters() {
    document.querySelectorAll("[data-request-count]").forEach((counter) => {
      counter.textContent = String(itemCount());
      counter.hidden = itemCount() === 0;
    });
  }

  function createRequestItem(item) {
    const product = getEquipmentProduct(item.productId);
    if (!product) return null;

    const row = document.createElement("article");
    row.className = "request-item";
    row.dataset.requestItem = itemKey(item);

    const image = document.createElement("img");
    image.src = product.images[0];
    image.alt = "";

    const content = document.createElement("div");
    content.className = "request-item-content";

    const heading = document.createElement("div");
    heading.className = "request-item-heading";
    const name = document.createElement("h3");
    name.textContent = product.name;
    const price = document.createElement("strong");
    price.textContent = formatEquipmentPrice(product.price * item.quantity);
    heading.append(name, price);

    const variant = document.createElement("p");
    const variantParts = lineDescription(item);
    if (variantParts.length) {
      variantParts.forEach(([label, value], index) => {
        if (index) variant.append(" · ");
        variant.append(createText(label), " ", value);
      });
    } else {
      variant.textContent = "Talla única";
    }

    const actions = document.createElement("div");
    actions.className = "request-item-actions";
    const quantityLabel = document.createElement("label");
    const quantityText = document.createElement("span");
    quantityText.className = "sr-only";
    quantityText.append(createText("Cantidad"), " ", product.name);
    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "20";
    quantity.value = String(item.quantity);
    quantity.dataset.requestQuantity = itemKey(item);
    quantityLabel.append(quantityText, quantity);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeRequestItem = itemKey(item);
    remove.textContent = "Eliminar";
    actions.append(quantityLabel, remove);
    content.append(heading, variant, actions);
    row.append(image, content);
    return row;
  }

  function render() {
    items = items.filter((item) => getEquipmentProduct(item.productId));
    list?.replaceChildren(...items.map(createRequestItem).filter(Boolean));
    if (empty) empty.hidden = items.length > 0;
    if (form) form.hidden = items.length === 0;
    if (total) total.textContent = formatEquipmentPrice(requestTotal());
    updateCounters();
    writeRequest(items);
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocusedElement = document.activeElement;
    drawer.hidden = false;
    drawer.inert = false;
    backdrop.hidden = false;
    document.body.classList.add("request-drawer-open");
    requestAnimationFrame(() => {
      drawer.classList.add("is-open");
      backdrop.classList.add("is-visible");
      drawer.querySelector("[data-close-request]")?.focus();
    });
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    document.body.classList.remove("request-drawer-open");
    window.setTimeout(() => {
      drawer.hidden = true;
      drawer.inert = true;
      backdrop.hidden = true;
    }, 220);
    lastFocusedElement?.focus?.();
  }

  function addItem(nextItem, { open = true } = {}) {
    const key = itemKey(nextItem);
    const existing = items.find((item) => itemKey(item) === key);
    if (existing) {
      existing.quantity += nextItem.quantity;
    } else {
      items.push(nextItem);
    }
    render();
    if (open) openDrawer();
  }

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openDrawer();
    });
  });
  closeButtons.forEach((button) => button.addEventListener("click", closeDrawer));
  backdrop?.addEventListener("click", closeDrawer);

  list?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-request-item]");
    if (!button) return;
    items = items.filter((item) => itemKey(item) !== button.dataset.removeRequestItem);
    render();
  });

  list?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-request-quantity]");
    if (!input) return;
    const item = items.find((entry) => itemKey(entry) === input.dataset.requestQuantity);
    if (!item) return;
    item.quantity = Math.min(Math.max(Number(input.value) || 1, 1), 20);
    render();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !items.length) return;

    const data = new FormData(form);
    const productLines = items.map((item, index) => {
      const product = getEquipmentProduct(item.productId);
      const variant = lineDescription(item).map(([label, value]) => `${label} ${value}`).join(" · ");
      const lineTotal = formatEquipmentPrice(product.price * item.quantity);
      return `${index + 1}. ${product.name} · ${variant || "Talla única"} · ${item.quantity} ud. · ${lineTotal}`;
    });
    const lines = [
      "SOLICITUD DE EQUIPACIÓN",
      "",
      `Nombre: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Teléfono: ${data.get("phone") || "-"}`,
      "",
      "ARTÍCULOS",
      ...productLines,
      "",
      `Total orientativo: ${formatEquipmentPrice(requestTotal())}`,
      `Observaciones: ${data.get("notes") || "-"}`,
      "",
      "Solicitud pendiente de confirmación de disponibilidad y forma de pago por parte del club.",
    ];

    const subject = encodeURIComponent(`Solicitud de equipación · ${itemCount()} artículo${itemCount() === 1 ? "" : "s"}`);
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:loesport@gmail.com?subject=${subject}&body=${body}`;
  });

  document.addEventListener("keydown", (event) => {
    if (!drawer?.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeDrawer();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = [
      ...drawer.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.closest("[hidden]"));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  render();

  return {
    addItem,
    openDrawer,
    get items() {
      return [...items];
    },
  };
}
