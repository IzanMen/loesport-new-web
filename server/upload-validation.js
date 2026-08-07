const ISO_IMAGE_BRANDS = new Map([
  ["avif", "image/avif"],
  ["avis", "image/avif"],
  ["heic", "image/heic"],
  ["heix", "image/heic"],
  ["hevc", "image/heic"],
  ["hevx", "image/heic"],
  ["heim", "image/heif"],
  ["heis", "image/heif"],
  ["mif1", "image/heif"],
  ["msf1", "image/heif"],
]);

function startsWithBytes(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

export function detectUploadMimeType(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || []);
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }
  const pdfHeader = buffer.subarray(0, Math.min(buffer.length, 1_024)).indexOf("%PDF-");
  if (pdfHeader !== -1) return "application/pdf";
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    return ISO_IMAGE_BRANDS.get(brand) || "";
  }
  return "";
}

export function normalizeUploadedFile(file, { snapshot = false } = {}) {
  const detectedMimeType = detectUploadMimeType(file?.buffer);
  const allowed = snapshot
    ? new Set(["image/jpeg", "image/png"])
    : new Set([
        "application/pdf",
        "image/avif",
        "image/gif",
        "image/heic",
        "image/heif",
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);
  if (!allowed.has(detectedMimeType)) return null;
  return { ...file, mimetype: detectedMimeType, size: Buffer.from(file.buffer).length };
}
