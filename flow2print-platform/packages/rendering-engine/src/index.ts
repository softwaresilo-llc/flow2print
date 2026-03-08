import { Buffer } from "node:buffer";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import bwipjs from "bwip-js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import sharp from "sharp";
import SVGtoPDF from "svg-to-pdfkit";

import type { Flow2PrintDocument } from "@flow2print/design-document";

type DesignerSurface = Flow2PrintDocument["surfaces"][number];
type DesignerLayer = DesignerSurface["layers"][number];

export interface RenderingAssetSource {
  assetId: string;
  mimeType: string;
  filename: string;
  buffer: Buffer;
}

export interface RenderInput {
  document: Flow2PrintDocument;
  assets: RenderingAssetSource[];
  projectId: string;
  projectVersionId: string;
  preflightStatus: "pass" | "warn" | "fail";
}

export interface RenderOutput {
  previewPng: Buffer;
  productionPdf: Buffer;
  proofPdf: Buffer;
}

const MM_TO_PX = 12;
const MM_TO_PT = 72 / 25.4;
const PREVIEW_MARGIN_PX = 28;
const PREVIEW_SURFACE_GAP_PX = 28;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const mmToPx = (value: number) => Math.max(1, Math.round(value * MM_TO_PX));
const mmToPt = (value: number) => value * MM_TO_PT;
const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const ensureTempDir = async () => {
  const dir = `${tmpdir()}/flow2print-render`;
  await mkdir(dir, { recursive: true });
  return dir;
};

const buildAssetLookup = (assets: RenderingAssetSource[]) =>
  new Map(assets.map((asset) => [asset.assetId, asset] as const));

const asChildren = (layer: DesignerLayer) =>
  Array.isArray(layer.metadata.children) ? (layer.metadata.children as DesignerLayer[]) : [];

const fitImageInFrame = (
  layer: DesignerLayer,
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number,
  unitsPerMm: number
) => {
  const fitMode = String(layer.metadata.fitMode ?? "cover");
  const scale =
    fitMode === "contain"
      ? Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight)
      : fitMode === "stretch"
        ? null
        : Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);

  const renderedWidth = scale === null ? frameWidth : Math.max(1, Math.round(sourceWidth * scale));
  const renderedHeight = scale === null ? frameHeight : Math.max(1, Math.round(sourceHeight * scale));
  const centeredX = Math.round((frameWidth - renderedWidth) / 2);
  const centeredY = Math.round((frameHeight - renderedHeight) / 2);
  const cropX = Math.round(Number(layer.metadata.cropX ?? 0) * unitsPerMm);
  const cropY = Math.round(Number(layer.metadata.cropY ?? 0) * unitsPerMm);

  const left =
    renderedWidth <= frameWidth
      ? centeredX
      : clamp(centeredX + cropX, frameWidth - renderedWidth, 0);
  const top =
    renderedHeight <= frameHeight
      ? centeredY
      : clamp(centeredY + cropY, frameHeight - renderedHeight, 0);

  return { left, top, renderedWidth, renderedHeight };
};

const createMaskSvg = (maskShape: string, width: number, height: number) => {
  if (maskShape === "circle") {
    return `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="white" />`;
  }
  if (maskShape === "rounded") {
    const radius = Math.round(Math.min(width, height) * 0.08);
    return `<rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white" />`;
  }
  return `<rect x="0" y="0" width="${width}" height="${height}" fill="white" />`;
};

const toSvgDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

const readImageDimensions = async (buffer: Buffer) => {
  const metadata = await sharp(buffer, { failOn: "none" }).metadata();
  return {
    width: metadata.width ?? 1,
    height: metadata.height ?? 1
  };
};

const trimSvgDocument = (svg: string) => {
  const match = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1].trim() : svg;
};

const renderQrSvg = async (value: string, width: number) =>
  QRCode.toString(value, {
    type: "svg",
    margin: 0,
    width: Math.max(64, width),
    color: {
      dark: "#111111",
      light: "#ffffff"
    }
  });

const renderBarcodeSvg = (value: string) =>
  bwipjs.toSVG({
    bcid: "code128",
    text: value || "000000000000",
    scale: 3,
    height: 12,
    includetext: false,
    backgroundcolor: "FFFFFF"
  });

const renderImagePreviewBuffer = async (layer: DesignerLayer, asset: RenderingAssetSource) => {
  const frameWidth = mmToPx(layer.width);
  const frameHeight = mmToPx(layer.height);
  const source = sharp(asset.buffer, { failOn: "none" });
  const metadata = await source.metadata();
  const sourceWidth = metadata.width ?? frameWidth;
  const sourceHeight = metadata.height ?? frameHeight;
  const fitted = fitImageInFrame(layer, sourceWidth, sourceHeight, frameWidth, frameHeight, MM_TO_PX);
  const rendered = await source
    .resize({
      width: fitted.renderedWidth,
      height: fitted.renderedHeight,
      fit: "fill"
    })
    .png()
    .toBuffer();

  const maskSvg = createMaskSvg(String(layer.metadata.maskShape ?? "rect"), frameWidth, frameHeight);
  return sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([
      { input: rendered, left: fitted.left, top: fitted.top },
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}">
            <mask id="mask">${maskSvg}</mask>
            <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" fill="white" mask="url(#mask)" />
          </svg>`
        ),
        blend: "dest-in"
      }
    ])
    .png()
    .toBuffer();
};

const createTextSpans = (text: string, lineHeightPx: number) =>
  text
    .split(/\r?\n/)
    .map((line, index) => `<tspan x="0" dy="${index === 0 ? 0 : lineHeightPx}">${escapeXml(line || " ")}</tspan>`)
    .join("");

type PreviewContext = {
  assetLookup: Map<string, RenderingAssetSource>;
};

const renderPreviewLayer = async (
  layer: DesignerLayer,
  originX: number,
  originY: number,
  context: PreviewContext
): Promise<string> => {
  if (!layer.visible) {
    return "";
  }

  const x = originX + mmToPx(layer.x);
  const y = originY + mmToPx(layer.y);
  const width = mmToPx(layer.width);
  const height = mmToPx(layer.height);
  const opacity = clamp(layer.opacity, 0, 1);
  const rotation = layer.rotation ? ` rotate(${layer.rotation} ${x + width / 2} ${y + height / 2})` : "";
  const transform = rotation ? ` transform="${rotation.trim()}"` : "";

  if (layer.type === "group") {
    const children = await Promise.all(
      asChildren(layer).map((child) => renderPreviewLayer(child, originX - mmToPx(layer.x), originY - mmToPx(layer.y), context))
    );
    return `<g opacity="${opacity}"${transform}>${children.join("")}</g>`;
  }

  if (layer.type === "text") {
    const fontSize = Math.max(14, Math.round(Number(layer.metadata.fontSize ?? 18) * 0.75));
    const fontWeight = escapeXml(String(layer.metadata.fontWeight ?? "600"));
    const fill = escapeXml(String(layer.metadata.color ?? "#1b2430"));
    const text = String(layer.metadata.text ?? layer.name);
    const align = String(layer.metadata.textAlign ?? "left");
    const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
    const textX = anchor === "middle" ? x + width / 2 : anchor === "end" ? x + width : x;
    const textY = y + fontSize;
    return `<g opacity="${opacity}"${transform}>
      <text x="${textX}" y="${textY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}">
        ${createTextSpans(text, Math.round(fontSize * 1.15))}
      </text>
    </g>`;
  }

  if (layer.type === "shape") {
    const fill = escapeXml(String(layer.metadata.fill ?? "#dbe8ff"));
    const variant = String(layer.metadata.variant ?? "");
    const radius = variant === "divider" ? Math.round(height / 2) : Math.round(Math.min(width, height) * 0.08);
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="${fill}" opacity="${opacity}"${transform} />`;
  }

  if (layer.type === "qr" || layer.type === "barcode") {
    const value = String(layer.metadata.value ?? layer.name);
    const svg = layer.type === "qr" ? await renderQrSvg(value, width) : renderBarcodeSvg(value);
    return `<g opacity="${opacity}"${transform}>
      <svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        ${trimSvgDocument(svg)}
      </svg>
    </g>`;
  }

  if (layer.type === "image") {
    const assetId = String(layer.metadata.assetId ?? "");
    const asset = context.assetLookup.get(assetId);
    if (!asset) {
      return `<g opacity="${opacity}"${transform}>
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" ry="10" fill="#eef4fb" stroke="#aac2e8" />
        <text x="${x + 12}" y="${y + 24}" font-family="Arial, sans-serif" font-size="14" fill="#40608f">${escapeXml(layer.name)}</text>
      </g>`;
    }
    const imageBuffer = await renderImagePreviewBuffer(layer, asset);
    return `<image x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}"${transform} href="${toSvgDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <image href="data:image/png;base64,${imageBuffer.toString("base64")}" width="${width}" height="${height}" />
      </svg>`
    )}" />`;
  }

  return `<g opacity="${opacity}"${transform}>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f3f5f8" stroke="#c9d0da" stroke-dasharray="6 4" />
    <text x="${x + 10}" y="${y + 22}" font-family="Arial, sans-serif" font-size="13" fill="#5f6d7a">${escapeXml(layer.name)}</text>
  </g>`;
};

const createPreviewSvg = async (input: RenderInput) => {
  if (input.document.surfaces.length === 0) {
    throw new Error("Document has no surfaces to render.");
  }

  const assetLookup = buildAssetLookup(input.assets);
  const context: PreviewContext = { assetLookup };
  const surfaceFrames = input.document.surfaces.map((surface) => ({
    surface,
    width: mmToPx(surface.artboard.width),
    height: mmToPx(surface.artboard.height)
  }));
  const maxSurfaceWidth = Math.max(...surfaceFrames.map((entry) => entry.width));
  const totalHeight =
    PREVIEW_MARGIN_PX * 2 +
    surfaceFrames.reduce((sum, entry) => sum + entry.height, 0) +
    PREVIEW_SURFACE_GAP_PX * Math.max(0, surfaceFrames.length - 1) +
    surfaceFrames.length * 34;
  const width = PREVIEW_MARGIN_PX * 2 + maxSurfaceWidth;

  let cursorY = PREVIEW_MARGIN_PX;
  const surfaceBlocks: string[] = [];

  for (const entry of surfaceFrames) {
    const { surface, width: surfaceWidth, height: surfaceHeight } = entry;
    const layerFragments = await Promise.all(surface.layers.map((layer) => renderPreviewLayer(layer, PREVIEW_MARGIN_PX, cursorY + 32, context)));
    const surfaceX = PREVIEW_MARGIN_PX;
    const surfaceY = cursorY + 32;
    surfaceBlocks.push(`
      <text x="${surfaceX}" y="${cursorY + 18}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1b2430">${escapeXml(surface.label)}</text>
      <rect x="${surfaceX}" y="${surfaceY}" width="${surfaceWidth}" height="${surfaceHeight}" rx="14" ry="14" fill="#ffffff" stroke="#bcc7d5" />
      <rect x="${surfaceX + mmToPx(surface.safeBox.x)}" y="${surfaceY + mmToPx(surface.safeBox.y)}" width="${mmToPx(surface.safeBox.width)}" height="${mmToPx(surface.safeBox.height)}" fill="none" stroke="#4a86d3" stroke-dasharray="6 4" />
      ${layerFragments.join("\n")}
    `);
    cursorY += surfaceHeight + PREVIEW_SURFACE_GAP_PX + 34;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}">
    <rect x="0" y="0" width="${width}" height="${totalHeight}" fill="#e9edf3" />
    ${surfaceBlocks.join("\n")}
  </svg>`;
};

const renderPreview = async (input: RenderInput) => {
  const svg = await createPreviewSvg(input);
  return sharp(Buffer.from(svg)).png().toBuffer();
};

type PdfContext = {
  assetLookup: Map<string, RenderingAssetSource>;
};

const drawLabelBox = (doc: PDFKit.PDFDocument, width: number, height: number, label: string) => {
  doc.roundedRect(0, 0, width, height, Math.min(width, height) * 0.08).fillAndStroke("#eef4fb", "#aac2e8");
  doc.fillColor("#40608f").font("Helvetica").fontSize(Math.max(9, Math.min(12, height * 0.32))).text(label, 8, 10, {
    width: Math.max(20, width - 16)
  });
};

const drawPdfLayer = async (
  doc: PDFKit.PDFDocument,
  layer: DesignerLayer,
  offsetX: number,
  offsetY: number,
  context: PdfContext
): Promise<void> => {
  if (!layer.visible) {
    return;
  }

  const x = offsetX + mmToPt(layer.x);
  const y = offsetY + mmToPt(layer.y);
  const width = mmToPt(layer.width);
  const height = mmToPt(layer.height);

  if (layer.type === "group") {
    for (const child of asChildren(layer)) {
      await drawPdfLayer(doc, child, offsetX - mmToPt(layer.x), offsetY - mmToPt(layer.y), context);
    }
    return;
  }

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  doc.save();
  doc.opacity(clamp(layer.opacity, 0, 1));
  doc.translate(centerX, centerY);
  if (layer.rotation) {
    doc.rotate(layer.rotation);
  }
  doc.translate(-width / 2, -height / 2);

  if (layer.type === "text") {
    const text = String(layer.metadata.text ?? layer.name);
    const color = String(layer.metadata.color ?? "#1b2430");
    const fontSize = Math.max(8, Number(layer.metadata.fontSize ?? 18));
    const weight = String(layer.metadata.fontWeight ?? "600");
    const fontName = weight === "700" ? "Helvetica-Bold" : "Helvetica";
    doc.fillColor(color).font(fontName).fontSize(fontSize).text(text, 0, 0, {
      width,
      height,
      align: (layer.metadata.textAlign as "left" | "center" | "right" | undefined) ?? "left"
    });
    doc.restore();
    return;
  }

  if (layer.type === "shape") {
    const fill = String(layer.metadata.fill ?? "#dbe8ff");
    const variant = String(layer.metadata.variant ?? "");
    const radius = variant === "divider" ? height / 2 : Math.min(width, height) * 0.08;
    if (variant === "divider") {
      doc.roundedRect(0, 0, width, height, radius).fill(fill);
    } else {
      doc.roundedRect(0, 0, width, height, radius).fillAndStroke(fill, "#9bb0d8");
    }
    doc.restore();
    return;
  }

  if (layer.type === "qr" || layer.type === "barcode") {
    const value = String(layer.metadata.value ?? layer.name);
    const svg = layer.type === "qr" ? await renderQrSvg(value, Math.max(120, Math.round(width * 2))) : renderBarcodeSvg(value);
    SVGtoPDF(doc, svg, 0, 0, {
      width,
      height,
      preserveAspectRatio: "xMidYMid meet"
    });
    doc.restore();
    return;
  }

  if (layer.type === "image") {
    const assetId = String(layer.metadata.assetId ?? "");
    const asset = context.assetLookup.get(assetId);
    if (!asset) {
      drawLabelBox(doc, width, height, layer.name);
      doc.restore();
      return;
    }

    const dimensions = await readImageDimensions(asset.buffer);
    const fitted = fitImageInFrame(
      layer,
      dimensions.width,
      dimensions.height,
      Math.max(1, Math.round(width)),
      Math.max(1, Math.round(height)),
      MM_TO_PT
    );
    doc.save();
    const maskShape = String(layer.metadata.maskShape ?? "rect");
    if (maskShape === "circle") {
      doc.circle(width / 2, height / 2, Math.min(width, height) / 2).clip();
    } else if (maskShape === "rounded") {
      doc.roundedRect(0, 0, width, height, Math.min(width, height) * 0.08).clip();
    } else {
      doc.rect(0, 0, width, height).clip();
    }
    doc.image(asset.buffer, fitted.left, fitted.top, {
      width: fitted.renderedWidth,
      height: fitted.renderedHeight
    });
    doc.restore();
    doc.restore();
    return;
  }

  drawLabelBox(doc, width, height, layer.name);
  doc.restore();
};

const renderPdf = async (input: RenderInput, mode: "production" | "proof") => {
  const tempDir = await ensureTempDir();
  const tempFile = `${tempDir}/flow2print-${mode}-${randomUUID()}.pdf`;
  const doc = new PDFDocument({ autoFirstPage: false, compress: true, margin: 0 });
  const stream = createWriteStream(tempFile);
  const context: PdfContext = {
    assetLookup: buildAssetLookup(input.assets)
  };
  doc.pipe(stream);

  for (const surface of input.document.surfaces) {
    const pageWidth = mmToPt(surface.artboard.width);
    const pageHeight = mmToPt(surface.artboard.height);
    doc.addPage({
      size: [pageWidth, pageHeight],
      margin: 0
    });

    if (mode === "proof") {
      doc.save();
      doc.fillColor("#f4f6fb").rect(0, 0, pageWidth, 28).fill();
      doc.fillColor("#1b2430").font("Helvetica-Bold").fontSize(10).text(`PROOF • ${surface.label}`, 12, 8);
      doc.fillColor("#566578").font("Helvetica").fontSize(8).text(`Preflight: ${input.preflightStatus.toUpperCase()}`, pageWidth - 110, 10, {
        width: 100,
        align: "right"
      });
      doc.strokeColor("#c97f2b").dash(6, { space: 4 }).rect(
        mmToPt(surface.bleedBox.x),
        mmToPt(surface.bleedBox.y),
        mmToPt(surface.bleedBox.width),
        mmToPt(surface.bleedBox.height)
      ).stroke();
      doc.strokeColor("#4a86d3").dash(6, { space: 4 }).rect(
        mmToPt(surface.safeBox.x),
        mmToPt(surface.safeBox.y),
        mmToPt(surface.safeBox.width),
        mmToPt(surface.safeBox.height)
      ).stroke();
      doc.undash();
      doc.restore();
    }

    for (const layer of surface.layers) {
      await drawPdfLayer(doc, layer, 0, 0, context);
    }
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.on("error", reject);
  });

  const buffer = await readFile(tempFile);
  await unlink(tempFile).catch(() => undefined);
  return buffer;
};

export const renderProjectOutputs = async (input: RenderInput): Promise<RenderOutput> => {
  const previewPng = await renderPreview(input);
  const productionPdf = await renderPdf(input, "production");
  const proofPdf = await renderPdf(input, "proof");
  return {
    previewPng,
    productionPdf,
    proofPdf
  };
};
