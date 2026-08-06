import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.argv[2] || "http://127.0.0.1:4321";
const debuggingUrl = process.argv[3] || "http://127.0.0.1:9224";
const languages = ["es", "ca", "gl", "eu"];
const viewports = [
  { label: "desktop", width: 1440, height: 1000 },
  { label: "mobile", width: 390, height: 844 },
];

const pages = (await readdir(root))
  .filter((file) => file.endsWith(".html"))
  .sort()
  .map((file) => `/${file === "index.html" ? "" : file}`);

const productSource = await readFile(path.join(root, "src/data/equipment-products.js"), "utf8");
const productIds = [...productSource.matchAll(/^\s{4}id: "([^"]+)",$/gm)].map((match) => match[1]);
productIds.forEach((productId) => {
  pages.push(`/producto-equipacion.html?producto=${encodeURIComponent(productId)}`);
});

const targets = await fetch(`${debuggingUrl}/json/list`).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === "page");
if (!target) throw new Error(`No hay una pestaña disponible en ${debuggingUrl}.`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const eventWaiters = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }

  const waiters = eventWaiters.get(message.method) || [];
  eventWaiters.delete(message.method);
  waiters.forEach((resolve) => resolve(message.params));
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const auditExpression = `
  (async () => {
    const { catalogue } = await import("/src/i18n/catalog.js");
    const languages = ${JSON.stringify(languages)};
    const attributes = [
      "aria-label", "alt", "content", "data-category", "data-future", "data-price",
      "data-success", "data-summary", "data-title", "placeholder", "title"
    ];
    const normalize = (value) => String(value || "")
      .replace(/\\u00a0/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
    const shouldSkip = (node) => !normalize(node.textContent)
      || Boolean(node.parentElement?.closest("script, style, noscript, svg, canvas, video"));

    const firstSwitcher = document.querySelector(".language-switcher select");
    if (!firstSwitcher) {
      return { missingSwitcher: true, missing: [], failures: [] };
    }

    firstSwitcher.value = "es";
    firstSwitcher.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    if (location.pathname.endsWith("ascenso-division-honor.html")) {
      localStorage.removeItem("loesport-equipment-request");
    }

    const finderSelect = document.querySelector("[data-group-finder] [data-group-value]");
    if (finderSelect?.options.length > 1) {
      finderSelect.selectedIndex = 1;
      finderSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const registrationForm = document.querySelector(".registration-form");
    if (registrationForm) {
      const choose = (input) => {
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      choose(registrationForm.querySelector('[name^="training-location-"]'));
      choose(registrationForm.querySelector('[name^="training-group-"]'));
      choose(registrationForm.querySelector('[name^="training-count-"]:not(:checked)'));
      const selectedCount = Number(registrationForm.querySelector('[name^="training-count-"]:checked')?.value) || 0;
      const selectedDays = [...registrationForm.querySelectorAll('[name^="training-days-"]')];
      for (const day of selectedDays) {
        if (selectedDays.filter((input) => input.checked).length >= selectedCount) break;
        if (!day.disabled && !day.checked) choose(day);
      }
      registrationForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }

    const productForm = document.querySelector("[data-product-options]");
    if (productForm) {
      const size = productForm.querySelector('select[name="size"]');
      if (size?.options.length > 1) size.selectedIndex = 1;
      productForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }

    const textEntries = [];
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      textEntries.push({ node, key: normalize(node.textContent), kind: "text" });
    }

    const attributeEntries = [];
    document.querySelectorAll("*").forEach((element) => {
      if (element.matches("script, style, noscript, svg")) return;
      attributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        attributeEntries.push({
          element,
          attribute,
          key: normalize(element.getAttribute(attribute)),
          kind: "attribute",
        });
      });
    });

    const entries = [...textEntries, ...attributeEntries].filter((entry) => entry.key);
    const missing = [...new Set(entries
      .filter((entry) => /[A-Za-zÀ-ÿ]/.test(entry.key) && !catalogue[entry.key])
      .map((entry) => entry.key))].sort();
    const failures = [];

    for (const language of languages) {
      const switcher = document.querySelector(".language-switcher select");
      switcher.value = language;
      switcher.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();

      const selectorValues = [...document.querySelectorAll(".language-switcher select")]
        .map((select) => select.value);
      if (document.documentElement.lang !== language) {
        failures.push(language + ": html.lang=" + document.documentElement.lang);
      }
      if (localStorage.getItem("loesport-language") !== language) {
        failures.push(language + ": la preferencia no se guardó");
      }
      if (!selectorValues.length || selectorValues.some((value) => value !== language)) {
        failures.push(language + ": selectores desincronizados (" + selectorValues.join(",") + ")");
      }
      if ([...document.querySelectorAll(".language-switcher select")]
        .some((select) => select.dataset.languageSwitcherBound !== "true")) {
        failures.push(language + ": hay un selector sin controlador");
      }
      const visibleSelectors = [...document.querySelectorAll(".language-switcher select")]
        .filter((select) => {
          const rect = select.getBoundingClientRect();
          const style = getComputedStyle(select);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        });
      if (!visibleSelectors.length) failures.push(language + ": no hay un selector visible");
      const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      if (pageWidth > window.innerWidth + 2) {
        failures.push(language + ": desbordamiento horizontal " + pageWidth + "/" + window.innerWidth);
      }
      const headerItems = [...document.querySelectorAll(".site-header .nav-identity > *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        })
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .sort((a, b) => a.rect.left - b.rect.left);
      for (let index = 1; index < headerItems.length; index += 1) {
        const previous = headerItems[index - 1];
        const current = headerItems[index];
        if (previous.rect.right > current.rect.left + 1) {
          failures.push(language + ": elementos solapados en la cabecera");
          break;
        }
      }

      if (registrationForm) {
        registrationForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        const requiredFile = registrationForm.querySelector('input[type="file"][required]');
        if (requiredFile) {
          const key = "Adjunta este archivo para poder enviar el formulario.";
          const expected = language === "es" ? key : catalogue[key][language];
          if (normalize(requiredFile.validationMessage) !== normalize(expected)) {
            failures.push(language + ": validación de archivo [" + requiredFile.validationMessage + "]");
          }
        }
      }

      entries.forEach((entry) => {
        if (entry.kind === "text" && !entry.node.isConnected) return;
        if (entry.kind === "attribute" && !entry.element.isConnected) return;
        const translation = language === "es" ? entry.key : catalogue[entry.key]?.[language];
        if (!translation) return;
        const current = entry.kind === "text"
          ? normalize(entry.node.textContent)
          : normalize(entry.element.getAttribute(entry.attribute));
        if (current !== normalize(translation)) {
          failures.push(language + ": " + entry.kind + " [" + entry.key + "] -> [" + current + "]");
        }
      });

      if (language !== "es") {
        const untranslated = new Set();
        const currentWalker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
        });
        while (currentWalker.nextNode()) {
          const value = normalize(currentWalker.currentNode.textContent);
          const expected = catalogue[value]?.[language];
          if (expected && normalize(expected) !== value) untranslated.add(value);
        }
        document.querySelectorAll("*").forEach((element) => {
          attributes.forEach((attribute) => {
            if (!element.hasAttribute(attribute)) return;
            const value = normalize(element.getAttribute(attribute));
            const expected = catalogue[value]?.[language];
            if (expected && normalize(expected) !== value) untranslated.add(value);
          });
        });
        untranslated.forEach((value) => failures.push(language + ": texto actual sin traducir [" + value + "]"));
      }
    }

    return {
      missingSwitcher: false,
      selectorCount: document.querySelectorAll(".language-switcher select").length,
      checkedEntries: entries.length,
      missing,
      failures: [...new Set(failures)],
    };
  })()
`;

await call("Page.enable");
const results = [];

for (const viewport of viewports) {
  await call("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.label === "mobile",
  });

  for (const page of pages) {
    console.error(`Auditando ${viewport.label} ${page}`);
    await call("Page.navigate", { url: `${baseUrl}${page}` });
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const state = await call("Runtime.evaluate", {
        expression: `document.readyState !== "loading" && document.querySelector(".language-switcher select")?.dataset.languageSwitcherBound === "true"`,
        returnByValue: true,
      });
      if (state.result.value) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!ready) throw new Error(`${viewport.label} ${page}: la página no terminó de inicializarse.`);
    const evaluation = await call("Runtime.evaluate", {
      expression: auditExpression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) {
      const detail = evaluation.exceptionDetails.exception?.description || evaluation.exceptionDetails.text;
      throw new Error(`${viewport.label} ${page}: ${detail}`);
    }
    results.push({ viewport: viewport.label, page, ...evaluation.result.value });
  }
}

socket.close();

const failures = results.filter((result) => result.missingSwitcher || result.failures.length);
const missing = new Map();
results.forEach((result) => {
  result.missing.forEach((text) => {
    const locations = missing.get(text) || [];
    locations.push(result.page);
    missing.set(text, locations);
  });
});

const report = {
  summary: {
    pages: results.length,
    entries: results.reduce((total, result) => total + result.checkedEntries, 0),
    selectorFailures: failures.length,
    missingTexts: missing.size,
  },
  failures,
  missing: [...missing].map(([text, locations]) => ({ text, locations })),
};

if (process.argv[4]) {
  await writeFile(process.argv[4], `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));

if (failures.length || missing.size) process.exitCode = 1;
