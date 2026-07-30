import { catalogue } from "./catalog.js";

const STORAGE_KEY = "loesport-language";
const SUPPORTED_LANGUAGES = ["es", "ca", "gl", "eu"];
const LANGUAGE_NAMES = {
  es: "ES",
  ca: "CA",
  gl: "GL",
  eu: "EU",
};
const TRANSLATABLE_ATTRIBUTES = [
  "aria-label",
  "alt",
  "content",
  "data-category",
  "data-future",
  "data-price",
  "data-success",
  "data-summary",
  "data-title",
  "placeholder",
  "title",
];
const originalTextNodes = new WeakMap();
const originalAttributes = new WeakMap();

let currentLanguage = "es";

function normalizeText(value) {
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function interpolate(value, params = {}) {
  return Object.entries(params).reduce((text, [key, replacement]) => {
    return text.replaceAll(`{${key}}`, replacement);
  }, value);
}

function normalizeLanguageCode(value) {
  if (!value) return "";
  const language = String(value).toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : "";
}

function readStoredLanguage() {
  try {
    return normalizeLanguageCode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "";
  }
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Language selection still works for the current page if storage is unavailable.
  }
}

function detectBrowserLanguage() {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const supported = normalizeLanguageCode(language);
    if (supported) return supported;
  }
  return "es";
}

function getInitialLanguage() {
  return readStoredLanguage() || detectBrowserLanguage();
}

export function translatePhrase(value, params = {}, language = currentLanguage) {
  const key = normalizeText(value);
  const entry = catalogue[key];
  const translated = language === "es" ? key : entry?.[language] || key;
  return interpolate(translated, params);
}

function shouldSkipTextNode(node) {
  if (!node.textContent.trim()) return true;
  return Boolean(node.parentElement?.closest("script, style, noscript, svg, canvas, video"));
}

function translateTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.textContent);
    const original = originalTextNodes.get(node);
    const key = normalizeText(original);
    const entry = catalogue[key];

    if (currentLanguage === "es") {
      node.textContent = original;
      return;
    }

    if (!entry?.[currentLanguage]) {
      node.textContent = original;
      return;
    }

    const leading = original.match(/^\s*/)?.[0] || "";
    const trailing = original.match(/\s*$/)?.[0] || "";
    node.textContent = `${leading}${entry[currentLanguage]}${trailing}`;
  });
}

function translateAttributes(root) {
  root.querySelectorAll("*").forEach((element) => {
    if (element.matches("script, style, noscript, svg")) return;

    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;

      if (!originalAttributes.has(element)) originalAttributes.set(element, {});
      const originals = originalAttributes.get(element);
      if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);

      const original = originals[attribute];
      const key = normalizeText(original);
      const entry = catalogue[key];
      const value = currentLanguage === "es" ? original : entry?.[currentLanguage] || original;
      element.setAttribute(attribute, value);
    });
  });
}

function updateGeneratedLabels() {
  document.querySelectorAll(".marquee-label").forEach((label) => {
    label.dataset.label = translatePhrase("Patrocinadores");
  });

  document.querySelectorAll(".language-switcher span").forEach((label) => {
    label.textContent = translatePhrase("Idioma");
  });

  document.querySelectorAll(".language-switcher select").forEach((select) => {
    select.value = currentLanguage;
    select.setAttribute("aria-label", translatePhrase("Idioma"));
  });
}

function applyLanguage(language, { emit = true } = {}) {
  currentLanguage = normalizeLanguageCode(language) || "es";
  document.documentElement.lang = currentLanguage;
  translateTextNodes(document.documentElement);
  translateAttributes(document.documentElement);
  updateGeneratedLabels();
  saveLanguage(currentLanguage);

  if (emit) {
    document.dispatchEvent(new CustomEvent("loesport:languagechange", { detail: { language: currentLanguage } }));
  }
}

function createLanguageSwitcher(kind) {
  const wrapper = document.createElement("label");
  wrapper.className = `language-switcher language-switcher-${kind}`;

  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = "Idioma";

  const select = document.createElement("select");
  select.name = "language";
  select.setAttribute("aria-label", "Idioma");

  SUPPORTED_LANGUAGES.forEach((language) => {
    const option = document.createElement("option");
    option.value = language;
    option.textContent = LANGUAGE_NAMES[language];
    select.append(option);
  });

  select.addEventListener("change", () => {
    applyLanguage(select.value);
  });

  wrapper.append(label, select);
  return wrapper;
}

function injectLanguageSelectors() {
  document.querySelectorAll(".site-header .nav-actions").forEach((actions) => {
    if (actions.querySelector(".language-switcher")) return;
    actions.append(createLanguageSwitcher("desktop"));
  });

  document.querySelectorAll(".site-header .nav-identity").forEach((identity) => {
    if (identity.querySelector(".language-switcher")) return;
    const switcher = createLanguageSwitcher("mobile");
    const season = identity.querySelector(".nav-season");
    identity.insertBefore(switcher, season);
  });
}

export function initI18n() {
  currentLanguage = getInitialLanguage();
  injectLanguageSelectors();
  applyLanguage(currentLanguage, { emit: false });

  return {
    get language() {
      return currentLanguage;
    },
    setLanguage: applyLanguage,
    translate: translatePhrase,
  };
}
