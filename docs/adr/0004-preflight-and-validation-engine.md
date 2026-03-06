# ADR 0004: Preflight & Validation Engine Specification

## Status

Proposed

## Decision

We will implement a unified, rule-based Preflight Engine that provides real-time feedback in the Designer and a mandatory, blocking validation step during Project Finalization. The engine will use a shared "Rule Set" definition that both the `editor-engine` (Frontend) and the `preflight-worker` (Backend) can execute.

## Rationale

Web-to-print users are often not graphics professionals. They might upload low-res images or place text too close to the edge. To ensure print quality:
- We must detect technical issues before the user adds the product to the cart.
- We must provide actionable advice ("Your image has only 120 DPI, please use a higher resolution") rather than cryptic error codes.
- Finalization must be "Zero-Trust": even if the frontend validation was bypassed, the backend must block the export if rules are violated.

## Technical Specification

### 1. Unified Rule Sets
A "Rule Set" is a JSON definition attached to a `ProductBlueprint` or `PrintProfile`. It defines thresholds and severities:

```json
{
  "rules": [
    { "code": "IMAGE_DPI", "threshold": 300, "severity": "warning" },
    { "code": "IMAGE_DPI", "threshold": 150, "severity": "blocking" },
    { "code": "TEXT_SAFE_ZONE", "margin_mm": 5, "severity": "warning" },
    { "code": "BLEED_COVERAGE", "required": true, "severity": "blocking" },
    { "code": "FONT_NOT_EMBEDDABLE", "severity": "blocking" }
  ]
}
```

### 2. Validation Checks
- **Resolution (DPI):** Calculate effective DPI of placed images based on their physical scale on the artboard.
- **Bleed Check:** Ensure that images/shapes intended to bleed actually reach the `BleedBox` edges.
- **Safe Zone Check:** Detect objects (especially text) that are outside the `SafeBox` but within the `TrimBox`.
- **Text Overset:** Detect if a text string is clipped because its bounding box is too small.
- **Color Space:** Detect if RGB assets are used when the profile requires CMYK/Spot colors only.
- **Min Line Weight:** Ensure lines/strokes are thick enough to be printable (e.g., min 0.25pt).

### 3. Implementation Logic
- **Frontend (Live):** The `editor-engine` runs a debounced preflight check on every change. Issues are displayed in a "Preflight Panel" within the designer.
- **Backend (Async):** The `preflight-worker` receives the `ProjectVersion`. It uses the same logic but has access to original high-res assets to perform deep checks (e.g., checking the actual resolution/ICC of the source file).

### 4. Severity Levels
- **Info:** Helpful hints (e.g., "Consider using a different font for better readability").
- **Warning:** Technical issues that might result in poor quality but don't prevent production (e.g., "200 DPI image"). User must explicitly "Ignore" or "Acknowledge".
- **Blocking (Critical):** Errors that make production impossible (e.g., "Missing font", "Resolution < 72 DPI"). Finalization is blocked until resolved.

## Consequences

- The `design-document` must store the "Preflight Status" and "User Acknowledgments" of warnings.
- The `preflight-worker` requires specialized libraries for deep image/PDF analysis (e.g., `Sharp`, `qpdf`).
- Rule definitions must be carefully tuned to avoid "Preflight Fatigue" where users are overwhelmed by too many minor warnings.
