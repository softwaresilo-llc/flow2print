# ADR 0003: High-Fidelity Rendering Pipeline Specification

## Status

Proposed

## Decision

We will implement a multi-stage rendering pipeline that separates "Visual Representation" (Preview) from "Technical Representation" (Production PDF). The pipeline will utilize `PDFKit` for structure, `fontkit` for precise typography, and `Sharp` for image normalization, with an optional post-processing step via `qpdf`.

## Rationale

Most web-to-print systems fail because they treat PDF generation as a "screenshot" of the browser. To be professional, we must:
- Support CMYK and Spot Colors (Pantone/HKS) which the browser cannot nativeley display.
- Ensure 100% font embedding to avoid "missing font" errors at the printer.
- Handle high-resolution assets (300+ DPI) independently of the screen resolution.

## Technical Specification

### 1. Color Management & Spot Colors
- **Color Spaces:** The pipeline will support `DeviceGray`, `DeviceRGB`, `DeviceCMYK`, and `Separation` (Spot Colors).
- **Spot Color Mapping:** We will use a `SpotColorTable` that maps names (e.g., "PANTONE 286 C") to Lab or CMYK values for preview, but preserves the "Separation" name in the PDF.
- **ICC Profiles:** The `production-service` will allow attaching an output ICC profile (e.g., ISO Coated v2) to the rendering job.

### 2. Typography Engine (Server-side)
- **Fontkit Integration:** We will use `fontkit` to read glyph metrics directly from the `.ttf` or `.otf` files.
- **No System Fonts:** Only fonts registered in the `asset-service` and embedded in the document can be used.
- **Text Shaping:** The renderer must support advanced OpenType features (ligatures, kerning) to match the browser's appearance.

### 3. Image Processing
- **Normalization:** Every image is normalized via `Sharp` before being placed in the PDF (converting to the target color space, stripping unnecessary metadata).
- **DPI Calculation:** Images are placed using their natural dimensions in points (72dpi) but the renderer ensures the pixel data is sufficient for the target DPI (e.g., 300).

### 4. Layout & Boxes
- **PDF Page Boxes:** The renderer will correctly set:
  - `MediaBox`: Physical sheet size.
  - `TrimBox`: Final product size.
  - `BleedBox`: TrimBox + Bleed margin.
- **Technical Layers:** Layers marked as `technical` (e.g., cutlines) will be rendered as overprinting spot colors or on specific PDF Optional Content Groups (OCG / Layers).

## Consequences

- The `render-worker` requires access to original high-res assets, not just web-previews.
- We need a robust "Font Mapping" between Fabric.js names and server-side font files.
- Memory usage on `render-worker` will be higher due to high-res image processing (Sharp/V8).
