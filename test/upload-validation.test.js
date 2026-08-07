import assert from "node:assert/strict";
import test from "node:test";

import {
  detectUploadMimeType,
  normalizeUploadedFile,
} from "../server/upload-validation.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PDF = Buffer.from("\n%PDF-1.7\n");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]);

function isoImage(brand) {
  return Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from("ftyp"),
    Buffer.from(brand),
    Buffer.alloc(12),
  ]);
}

test("detecta por firma todos los formatos de imagen/PDF permitidos", async (t) => {
  const cases = [
    ["jpeg", JPEG, "image/jpeg"],
    ["png", PNG, "image/png"],
    ["pdf", PDF, "application/pdf"],
    ["webp", WEBP, "image/webp"],
    ["gif87a", Buffer.from("GIF87a-resto"), "image/gif"],
    ["gif89a", Buffer.from("GIF89a-resto"), "image/gif"],
    ["avif", isoImage("avif"), "image/avif"],
    ["avis", isoImage("avis"), "image/avif"],
    ["heic", isoImage("heic"), "image/heic"],
    ["heix", isoImage("heix"), "image/heic"],
    ["hevc", isoImage("hevc"), "image/heic"],
    ["hevx", isoImage("hevx"), "image/heic"],
    ["heim", isoImage("heim"), "image/heif"],
    ["heis", isoImage("heis"), "image/heif"],
    ["mif1", isoImage("mif1"), "image/heif"],
    ["msf1", isoImage("msf1"), "image/heif"],
  ];

  for (const [name, bytes, expected] of cases) {
    await t.test(name, () => {
      assert.equal(detectUploadMimeType(bytes), expected);
      assert.equal(detectUploadMimeType(new Uint8Array(bytes)), expected);
    });
  }
});

test("rechaza SVG, texto, firmas desconocidas y archivos truncados", async (t) => {
  const invalid = [
    ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ["texto", Buffer.from("documento de texto plano")],
    ["iso desconocido", isoImage("mp42")],
    ["png truncado", PNG.subarray(0, 7)],
    ["jpeg truncado", JPEG.subarray(0, 2)],
    ["gif truncado", Buffer.from("GIF89")],
    ["webp truncado", WEBP.subarray(0, 11)],
    ["vacío", Buffer.alloc(0)],
  ];

  for (const [name, bytes] of invalid) {
    await t.test(name, () => assert.equal(detectUploadMimeType(bytes), ""));
  }
});

test("normaliza al MIME detectado e impide spoofing por extensión o MIME declarado", () => {
  const spoofedText = {
    originalname: "documento.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from("no soy un PDF"),
    size: 13,
  };
  assert.equal(normalizeUploadedFile(spoofedText), null);

  const disguisedSvg = {
    originalname: "foto.png",
    mimetype: "image/png",
    buffer: Buffer.from("<svg><script>secret()</script></svg>"),
  };
  assert.equal(normalizeUploadedFile(disguisedSvg), null);

  const wrongDeclaredMime = {
    originalname: "foto.txt",
    mimetype: "text/plain",
    buffer: PNG,
    size: PNG.length,
  };
  const normalized = normalizeUploadedFile(wrongDeclaredMime);
  assert.notEqual(normalized, wrongDeclaredMime);
  assert.equal(normalized.mimetype, "image/png");
  assert.equal(normalized.originalname, "foto.txt");
  assert.equal(normalized.buffer, PNG);
});

test("la captura admite solo JPEG/PNG aunque otros formatos sean adjuntos válidos", () => {
  for (const buffer of [JPEG, PNG]) {
    assert.ok(normalizeUploadedFile({ buffer, mimetype: "application/octet-stream" }, { snapshot: true }));
  }
  for (const buffer of [PDF, WEBP, Buffer.from("GIF89a-resto"), isoImage("heic")]) {
    assert.equal(
      normalizeUploadedFile({ buffer, mimetype: "image/jpeg" }, { snapshot: true }),
      null,
    );
    assert.ok(normalizeUploadedFile({ buffer, mimetype: "text/plain" }));
  }
});

test("solo busca la firma PDF dentro de los primeros 1024 bytes", () => {
  const withinLimit = Buffer.concat([Buffer.alloc(1_019, 0x20), Buffer.from("%PDF-")]);
  const outsideLimit = Buffer.concat([Buffer.alloc(1_024, 0x20), Buffer.from("%PDF-")]);
  assert.equal(detectUploadMimeType(withinLimit), "application/pdf");
  assert.equal(detectUploadMimeType(outsideLimit), "");
});
