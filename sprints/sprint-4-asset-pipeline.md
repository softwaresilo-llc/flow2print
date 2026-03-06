# Sprint 4: Asset Pipeline & Normalization (Refined)

## Ziel
Sicherer Upload, Validierung und Optimierung von Assets. Jedes Asset ist ein druckfähiges Original plus Web-Derivate.

## Technische Vorgaben
- **Storage:** MinIO / AWS S3.
- **Processing:** Sharp (Node.js), Vips (optional für sehr große Dateien).
- **Format:** High-Res PNG/TIFF als Master, WebP als Preview.
- **Constraints:** Max 50MB pro Datei, Max 10.000px Kantenlänge (DoS-Schutz).

## Work Packages

### 4.1 Asset Service (`apps/asset-service`)
- [ ] **Upload API (Presigned URLs):**
    - `POST /assets/upload-intent` -> S3 Presigned PUT URL.
    - `POST /assets/confirm-upload` -> Trigger Processing.
- [ ] **Ingest Worker (RabbitMQ):**
    - `asset.uploaded` Event Listener.
    - Download -> Validate (Magic Bytes) -> Normalize.
    - Extract Metadata: `width`, `height`, `dpi`, `colorSpace` (ICC).
- [ ] **Variant Generator:**
    - `thumb` (200x200 crop).
    - `web` (max 1500px edge, WebP 80%).
    - `normalized` (Original colorspace preserved, stripped Exif).

### 4.2 Asset Library UI (`apps/designer-web`)
- [ ] **Upload Handling:**
    - Client-side Resize vor Upload? (Optional, aber empfohlen für Speed).
    - Progress Bar.
- [ ] **Gallery Grid:**
    - Infinite Scroll / Pagination.
    - Drag & Drop auf Canvas.
- [ ] **Image Controls:**
    - "Quality Meter": Zeigt an, ob DPI < 300 (basierend auf Skalierung).
    - "Replace Image" Button (behält Position/Größe).

### 4.3 Font Management (`apps/asset-service`)
- [ ] **Font Ingestion:**
    - Upload von TTF/OTF.
    - Parsing mit `fontkit` (Name, Styles, Weights).
    - Generierung von WOFF2 für Web-Preview.
- [ ] **Font Registry:**
    - Mapping: `fontFamilyRef` (JSON) -> `fileKey` (S3).
    - Whitelisting von Google Fonts (Server-side Download & Cache).

## Definition of Done (DoD)
- [ ] Upload eines 20MB TIFFs resultiert in einem schnellen WebP im Designer.
- [ ] Upload einer `exe` getarnt als `jpg` wird abgelehnt.
- [ ] Im Designer wird "Low Resolution" gewarnt, wenn das Bild zu groß skaliert wird.
- [ ] Fonts werden korrekt im Canvas dargestellt (Custom Fonts).
