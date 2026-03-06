# Sprint 5: Production, Rendering & Preflight (Refined)

## Ziel
Transformation des JSON-Dokuments in ein druckfertiges PDF/X-4 sowie die Validierung aller Druckregeln.

## Technische Vorgaben
- **PDF Engine:** PDFKit (Node.js) + svg-to-pdfkit.
- **Post-Processing:** qpdf (Linearization, Version Fixes).
- **Color Mgmt:** ICC Profile Handling (kein LittleCMS in JS, aber Metadaten-Handling).
- **Architecture:** `render-worker` (Stateless, Scale-out via RabbitMQ).

## Work Packages

### 5.1 Production Service (`apps/production-service`)
- [ ] **Job Queue:**
    - `POST /outputs/preview` (Schnell, Low-Res).
    - `POST /outputs/production-pdf` (Langsam, High-Res, Async Job).
- [ ] **Artifact Management:**
    - Lifecycle (TTL für Previews: 24h, TTL für Production: 30 Tage).
    - Download Links (Signed URLs).

### 5.2 Render Worker (`apps/render-worker`)
- [ ] **Pipeline Steps (ADR 0003):**
    - 1. Load `ProjectVersion` & `BlueprintVersion`.
    - 2. Download High-Res Assets (S3).
    - 3. Initialize PDFKit Document (MediaBox, TrimBox, BleedBox).
    - 4. Render Layers (Text via `fontkit`, Image via `sharp` buffer).
    - 5. Handle Spot Colors (Separation Names).
    - 6. Embed Fonts (Subset).
    - 7. Write Output Stream -> S3.
- [ ] **Preview Renderer:**
    - Erzeugt PNG/WebP (RGB) für Magento-Warenkorb.
    - Optional: Mockup-Overlay Rendering (Sharp Composite).

### 5.3 Preflight Engine (`apps/preflight-worker`)
- [ ] **Rule Execution (ADR 0004):**
    - `ResolutionCheck` (DPI < 300).
    - `BleedCheck` (Element reicht bis Kante?).
    - `SafetyCheck` (Text zu nah am Rand?).
    - `FontCheck` (Missing glyphs?).
- [ ] **Reporting:**
    - Generierung von JSON-Report (`{ issues: [...] }`).
    - Blocking Status für Finalize-Flow.

## Definition of Done (DoD)
- [ ] Ein PDF wird generiert, das in Adobe Acrobat als PDF/X valide angezeigt wird (oder zumindest strukturell korrekt ist).
- [ ] Texte sind selektierbar (kein Raster-Bild).
- [ ] Sonderfarben (Pantone) bleiben als Separationskanal erhalten.
- [ ] Preflight blockiert den Export, wenn ein 72 DPI Bild verwendet wird (konfigurierbar).
