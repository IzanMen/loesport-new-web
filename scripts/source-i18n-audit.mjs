import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseAst } from "rollup/parseAst";
import { catalogue } from "../src/i18n/catalog.js";

const root = process.cwd();
const sourceRoots = ["src/data", "src/ui"];
// Audit server modules whose messages can reach the browser. Operational errors
// from the Sheets adapter are deliberately hidden by the API error middleware.
const rootFiles = [
  "equipment.js",
  "groups.js",
  "product-equipment.js",
  "script.js",
  "server/form-payload.js",
  "server/form-submission-orchestrator.js",
  "server/index.js",
];
const interfaceProperties = new Set([
  "category",
  "categoryLabel",
  "color",
  "description",
  "detail",
  "documentsNote",
  "eyebrow",
  "features",
  "genders",
  "help",
  "intro",
  "label",
  "message",
  "meta",
  "name",
  "note",
  "options",
  "placeholder",
  "schedule",
  "success",
  "successTitle",
  "submitLabel",
  "summary",
  "text",
  "title",
]);
const implementationProperties = new Set([
  "accept",
  "allowedDays",
  "autocomplete",
  "categories",
  "className",
  "entry",
  "formValues",
  "href",
  "id",
  "inputmode",
  "location",
  "requiredDays",
  "submissionValue",
  "type",
  "value",
]);

async function listJavaScriptFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(relativePath);
    return entry.isFile() && entry.name.endsWith(".js") ? [relativePath] : [];
  }));
  return files.flat();
}

function normalizeText(value) {
  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeInterfaceText(value) {
  if (!/[A-Za-zÀ-ÿ]/.test(value)) return false;
  if (/[<>]/.test(value)) return false;
  if (/^(?:https?:|mailto:|tel:|image\/|entry\.|--|\.\/|\.\.|\/)/.test(value)) return false;
  if (/^[.#[]/.test(value)) return false;
  if (["attachments", "competicion", "payload", "snapshot", "website"].includes(value)) return false;
  return true;
}

function propertyName(property) {
  if (property.key?.type === "Identifier") return property.key.name;
  if (property.key?.type === "Literal") return property.key.value;
  return "";
}

function callName(call) {
  if (call.callee?.type === "Identifier") return call.callee.name;
  if (call.callee?.type === "MemberExpression") {
    return call.callee.property?.name || call.callee.property?.value || "";
  }
  return "";
}

function isInterfaceCallArgument(call, index) {
  const name = callName(call);
  if (["append", "prepend", "replaceChildren", "setCustomValidity", "showError"].includes(name)) return true;
  if (["createText", "translate", "translatePhrase"].includes(name)) return index === 0;
  if (name === "createTextElement") return index === 2;
  if (name === "createFlowStep") return index === 1 || index === 2;
  if (name === "createAction") return index === 2;
  if (name === "setAttribute" && index === 1) {
    const attribute = call.arguments[0]?.value;
    return ["aria-label", "alt", "placeholder", "title"].includes(attribute);
  }
  return false;
}

function assignedPropertyName(assignment) {
  if (assignment.left?.type !== "MemberExpression") return "";
  return assignment.left.property?.name || assignment.left.property?.value || "";
}

const files = [...rootFiles, ...(await Promise.all(sourceRoots.map(listJavaScriptFiles))).flat()].sort();
const missing = new Map();

for (const file of files) {
  const source = await readFile(path.join(root, file), "utf8");
  const ast = parseAst(source);
  const collect = (node) => {
    if (node.type === "Literal" && typeof node.value === "string") {
      const text = normalizeText(node.value);
      if (text && looksLikeInterfaceText(text) && !catalogue[text]) {
        const line = source.slice(0, node.start).split("\n").length;
        const locations = missing.get(text) || [];
        locations.push(`${file}:${line}`);
        missing.set(text, locations);
      }
      return;
    }

    if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
      collect({ type: "Literal", value: node.quasis[0]?.value?.cooked || "", start: node.start });
    }
  };

  const visit = (node, inheritedInterfaceValue = false) => {
    if (!node || typeof node !== "object") return;

    if (node.type === "Literal" || node.type === "TemplateLiteral") {
      if (inheritedInterfaceValue) collect(node);
      return;
    }

    if (node.type === "Property") {
      const name = propertyName(node);
      const isInterfaceValue = implementationProperties.has(name)
        ? false
        : interfaceProperties.has(name) || inheritedInterfaceValue;
      visit(node.value, isInterfaceValue);
      return;
    }

    if (node.type === "CallExpression" || node.type === "NewExpression") {
      node.arguments?.forEach((argument, index) => {
        const isError = node.type === "NewExpression" && callName(node) === "Error" && index === 0;
        visit(argument, isError || isInterfaceCallArgument(node, index));
      });
      visit(node.callee, false);
      return;
    }

    if (node.type === "AssignmentExpression") {
      const property = assignedPropertyName(node);
      visit(node.right, inheritedInterfaceValue || ["innerHTML", "placeholder", "textContent", "title"].includes(property));
      visit(node.left, false);
      return;
    }

    Object.entries(node).forEach(([key, value]) => {
      if (key === "loc" || key === "start" || key === "end") return;
      if (Array.isArray(value)) value.forEach((child) => visit(child, inheritedInterfaceValue));
      else if (value && typeof value === "object") visit(value, inheritedInterfaceValue);
    });
  };

  visit(ast);
}

const incomplete = Object.entries(catalogue)
  .filter(([, translations]) => ["ca", "gl", "eu"].some((language) => !translations?.[language]?.trim()))
  .map(([text]) => text);
const report = {
  files: files.length,
  missing: [...missing].map(([text, locations]) => ({ text, locations })),
  incomplete,
};

console.log(JSON.stringify(report, null, 2));
if (missing.size || incomplete.length) process.exitCode = 1;
