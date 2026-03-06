# ADR 0002: Flow2Print Designer Constraint & Logic System

## Status

Proposed

## Decision

We will implement a declarative constraint system within the `design-document` schema and a corresponding logic engine in the `editor-engine`.

## Rationale

A generic graphic editor allows total freedom. A Web2Print system must enforce brand and print rules. Constraints ensure that:
- Content stays within printable or safe areas.
- Templates remain consistent (e.g., preventing users from changing the brand logo's color).
- Dynamic content (like long names) doesn't break the layout.

## Technical Specification

### 1. Layer Constraints
Each layer in the `Flow2PrintDocument` will have an optional `constraints` object:

```typescript
const layerConstraintsSchema = z.object({
  // Positional constraints
  lockPosition: z.boolean().default(false),
  lockSize: z.boolean().default(false),
  lockAspectRatio: z.boolean().default(false),
  boundaryBox: z.enum(["artboard", "safeBox", "bleedBox", "custom"]).default("safeBox"),
  customBoundary: boxSchema.optional(),

  // Property locks
  lockedProperties: z.array(z.string()).default([]), // e.g., ["color", "fontFamilyRef", "opacity"]

  // Text specific constraints
  text: z.object({
    maxChars: z.number().optional(),
    maxLines: z.number().optional(),
    autoShrink: z.object({
      enabled: z.boolean().default(false),
      minFontSizePt: z.number().default(6),
      maxFontSizePt: z.number().optional()
    }).optional(),
    forbiddenCharacters: z.array(z.string()).optional()
  }).optional(),

  // Image specific constraints
  image: z.object({
    minDpi: z.number().default(300),
    allowUpscaling: z.boolean().default(false),
    fixedAsset: z.boolean().default(false) // If true, user cannot change the image
  }).optional()
});
```

### 2. Variable & Logic Bindings
The root document will support a `logic` section to handle cross-layer dependencies and commerce-driven changes:

```typescript
const logicRuleSchema = z.object({
  id: z.string(),
  condition: z.string(), // A simple DSL or JSON-Logic expression
  action: z.enum(["setVisibility", "setProperty", "triggerPreflight"]),
  target: z.object({
    layerId: z.string(),
    property: z.string(),
    value: z.any()
  })
});
```

## Consequences

- The `editor-engine` must intercept every move/scale/edit command and validate it against these constraints.
- The UI must visually indicate locked or restricted properties (e.g., grayed-out inputs, boundary markers).
- Preflight-Worker will use the same logic to validate final designs server-side.
