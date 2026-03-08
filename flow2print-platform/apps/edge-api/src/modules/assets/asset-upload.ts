import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { AssetKind } from "@flow2print/domain";

const storageRoot = resolve(process.cwd(), process.env.FLOW2PRINT_STORAGE_DIR ?? ".flow2print-object-storage");

const normalizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "upload.bin";

export const buildOriginalObjectKey = (assetId: string, filename: string) =>
  `assets-original/org/demo/${assetId}/${normalizeFilename(filename)}`;

export const resolveObjectPath = (objectKey: string) => resolve(storageRoot, objectKey);

export const writeObjectBuffer = async (objectKey: string, buffer: Buffer) => {
  const filePath = resolveObjectPath(objectKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return filePath;
};

export const readObjectBuffer = async (objectKey: string) => readFile(resolveObjectPath(objectKey));

export const hashBufferSha256 = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

type DetectedAssetFormat = {
  kind: AssetKind | "unknown";
  mimeType: string | null;
};

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const detectAssetFormat = (buffer: Buffer): DetectedAssetFormat => {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature)) {
    return { kind: "image", mimeType: "image/png" };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: "image", mimeType: "image/jpeg" };
  }

  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { kind: "image", mimeType: "image/webp" };
  }

  if (buffer.length >= 6) {
    const gifHeader = buffer.subarray(0, 6).toString("ascii");
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      return { kind: "image", mimeType: "image/gif" };
    }
  }

  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    return { kind: "image", mimeType: "image/tiff" };
  }

  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { kind: "pdf", mimeType: "application/pdf" };
  }

  if (buffer.length >= 4) {
    const head = buffer.subarray(0, 4).toString("ascii");
    if (head === "wOFF") {
      return { kind: "font", mimeType: "font/woff" };
    }
    if (head === "wOF2") {
      return { kind: "font", mimeType: "font/woff2" };
    }
    if (head === "OTTO") {
      return { kind: "font", mimeType: "font/otf" };
    }
  }

  if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x01 && buffer[2] === 0x00 && buffer[3] === 0x00) {
    return { kind: "font", mimeType: "font/ttf" };
  }

  const headerText = buffer.subarray(0, Math.min(buffer.length, 2048)).toString("utf8").trimStart();
  if (headerText.startsWith("<svg") || (headerText.startsWith("<?xml") && headerText.includes("<svg"))) {
    return { kind: "svg", mimeType: "image/svg+xml" };
  }

  return { kind: "unknown", mimeType: null };
};

export const isAllowedAssetKind = (expectedKind: AssetKind, detectedKind: AssetKind | "unknown") => {
  if (expectedKind === "technical") {
    return detectedKind !== "unknown";
  }

  return expectedKind === detectedKind;
};
