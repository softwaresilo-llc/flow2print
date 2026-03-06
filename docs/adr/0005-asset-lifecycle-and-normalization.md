# ADR 0005: Asset Lifecycle & Normalization Specification

## Status

Proposed

## Decision

We will implement a structured asset ingestion pipeline in the `asset-service`. Every uploaded file will undergo a normalization process that extracts metadata, validates technical constraints, and generates optimized variants for both the web designer and the production rendering engine.

## Rationale

Web2Print systems deal with untrusted, often non-optimized user files. To ensure system stability and high-quality output:
- Original files must be preserved but should not be served directly to the browser for performance reasons.
- Metadata (DPI, ICC profiles, Dimensions) must be extracted once and stored in the database to avoid repeated heavy processing.
- Files must be "normalized" to ensure that the rendering engine (PDFKit/Sharp) can process them without crashing or yielding unpredictable results.

## Technical Specification

### 1. Ingestion & Validation
- **Virus/Malware Scanning:** Integration with tools like ClamAV for all public uploads.
- **MIME-Type Verification:** Deep inspection of file headers to prevent extension spoofing.
- **Resource Limits:** Enforce maximum file size and pixel dimensions to prevent "Zip-Bomb" style DoS attacks.

### 2. Normalization Process (per Kind)
- **Images (JPG, PNG, TIFF):**
  - Extract EXIF/IPTC metadata (DPI, ICC Profile Name).
  - Strip unnecessary metadata (GPS, Author) for privacy and size.
  - Convert to a standardized "Internal High-Res" format if necessary (e.g., stripping broken ICC profiles).
- **Vectors (SVG, PDF):**
  - Sanitize SVGs (remove scripts, external refs).
  - Flatten certain PDF features that might break the renderer.
- **Fonts (TTF, OTF):**
  - Extract font metrics (cap height, x-height) via `fontkit`.
  - Validate font subsetting/embedding permissions.

### 3. Variant Generation
For every asset, the `asset-service` generates:
- **`thumb`:** Small square thumbnail (e.g., 200x200px) for the UI asset library.
- **`web`:** Optimized WebP/PNG for the Designer Canvas (balanced quality/speed).
- **`technical-preview`:** Low-res version for Preflight analysis if needed.
- **`normalized`:** The high-res version used by the `render-worker` for final PDF output.

### 4. Storage & Security
- **Immutable Storage:** Assets are stored in an S3-compatible bucket (`assets-original`, `assets-derived`).
- **Content-Addressable Storage (CAS):** Files are indexed by their SHA-256 hash to avoid duplicates.
- **Access Control:** Original files are never public. Browser access is only allowed via signed, short-lived URLs.

### 5. Effective DPI Tracking
The `asset-service` provides the "Source DPI" and "Pixel Dimensions". The `editor-engine` then calculates the "Effective DPI" based on the object's current scale on the artboard:
`Effective DPI = (Source Pixel Width / (Object Width in mm / 25.4))`

## Consequences

- Uploading is an asynchronous process. The UI must handle "Processing..." states for assets.
- Storage requirements will be roughly 1.5x to 2x the original file size due to variant generation.
- The `asset-service` requires significant CPU/Memory resources for image processing (Sharp/Vips).
- We need a robust cleanup strategy for orphan assets (uploads never used in a project).
