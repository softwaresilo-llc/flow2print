# Sprint 2: Catalog Core & Templates (Refined)

## Ziel
Definition der konfigurierbaren Produkte. Nach diesem Sprint können Administratoren komplexe Produktregeln, Templates und Druckflächen anlegen.

## Technische Vorgaben
- **Schema Validation:** AJV (Backend) + Zod (Frontend)
- **Data Isolation:** Row-Level Tenant Security via Prisma Middleware/Guards.
- **Search:** PostgreSQL `tsvector` + `pg_trgm` (kein OpenSearch in v1).

## Work Packages

### 2.1 Catalog Data Model (`apps/catalog-service`)
- [ ] **Core Entities (Prisma):**
    - `ProductBlueprint` (Basis-Produktdefinition, z.B. "Visitenkarte 85x55").
    - `BlueprintVersion` (Immutable Snapshot für Produktion).
    - `Surface` (Druckfläche: Front, Back, Ärmel, Boden).
    - `OptionGroup` / `OptionValue` (Papiergrammatur, Veredelung).
- [ ] **Validation Logic:**
    - Sicherstellen, dass Surfaces logisch zusammenpassen (z.B. nicht Front A mit Back B).
    - Versionierung von Blueprints bei Änderungen erzwingen.

### 2.2 Template Service (`apps/template-service`)
- [ ] **Template Entities:**
    - `Template` (Hülle für Versionen).
    - `TemplateVersion` (Verweis auf `BlueprintVersion` + `DocumentJSON`).
- [ ] **Constraint Definitionen:**
    - Speicherung von `constraints.json` pro Template (Sperren von Layern, Farben).
    - Validierung gegen `BlueprintVersion` (Passt das Template noch auf das Produkt?).

### 2.3 Portal Catalog UI (`apps/portal-web`)
- [ ] **Blueprint Builder:**
    - Formular für Maße (mm), Beschnitt (mm), Sicherheitsabstand.
    - Upload von technischen Zeichnungen (SVG Dielines) für Packaging.
- [ ] **Template Manager:**
    - Liste aller Templates pro Tenant.
    - Status-Workflow (Draft -> Published -> Archived).
    - "Clone Template" Funktion.

### 2.4 Design Document Schema (`packages/design-document`)
- [ ] **Zod Schema Finalisierung:**
    - Integration von `layerConstraints` (ADR 0002).
    - Typisierung von `Surface` für Flat, Apparel, Packaging.
    - Integration von `AssetReference` Typen.
- [ ] **Migration Scripts:**
    - CLI-Tool für Schema-Migrationen (`schema:migrate`).

## Definition of Done (DoD)
- [ ] Ein Produkt "T-Shirt" mit Zonen (Front, Back) kann angelegt werden.
- [ ] Ein Produkt "Faltschachtel" mit technischer Zeichnung kann angelegt werden.
- [ ] Ein Template kann gegen eine Blueprint-Version validiert werden.
- [ ] Die API erlaubt keine Änderungen an publizierten Versionen (Immutability).
