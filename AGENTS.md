# Flow2Print Project Guardrails

## Product Intent

- `Flow2Print` is a separate Web2Print platform.
- `Magento 2` is an external commerce system, not the host for Web2Print logic.
- There are three distinct UX surfaces:
  - `designer-web`: end-user design workspace
  - `customer workspace`: projects, reorders, outputs, account-facing flows
  - `admin workspace`: CRUD, templates, blueprints, assets, users, mail, settings
- Do not collapse these surfaces into one confusing portal.

## Hard Facts About The Current Codebase

- Main platform code lives in [`flow2print-platform`](./flow2print-platform).
- Magento connector code lives in [`flow2print-magento2-connector`](./flow2print-magento2-connector).
- Admin workspace currently runs on `5177`.
- Designer currently runs on `5173`.
- Edge API currently runs on `3000`.
- The current backend persistence is PostgreSQL + Prisma by default. Do not reintroduce JSON fallback persistence.
- The admin workspace is now built with `Refine + React + TypeScript + Ant Design`.
- The edge API currently uses `Fastify` directly, not `NestJS`.
- The designer uses `Fabric.js` for the interactive stage. Do not regress back to a custom DOM stage.

## Non-Negotiable Architecture Rules

- Never hardcode environment-specific hosts, ports, or URLs in app code.
- Public app URLs must come from environment or system settings.
- Do not hardcode `127.0.0.1`, `localhost`, or fixed storefront URLs into UI actions.
- The UI may show local URLs in docs or seed configs, but runtime behavior must stay configurable.
- CRUD screens must load live data from the API or DB-backed service layer, never from hardcoded screen fixtures.
- `Settings` is the source for brand-, sender-, and wrapper-level configuration.
- Email rendering must come from:
  - template content from storage
  - wrapper/header/footer from settings
  - runtime variable interpolation

## UX Guardrails

- Do not build demo landing pages where the user needs a workspace.
- Do not mix `customer workspace` and `admin workspace` into equal-weight sections on one start page.
- Avoid duplicate navigation.
- A user should not have to decide between multiple overlapping entry points to do one task.
- Prefer one clear left navigation in backoffice apps.
- Put account/profile in the header dropdown, not as a competing primary nav destination.
- CRUD pages must be understandable without reading implementation terminology.
- Never expose raw IDs as the primary way to create or manage records when a human-readable selector is possible.
- Replace technical fields like `templateId` or `blueprintId` with actual resource pickers in forms.
- Replace raw IDs in tables with meaningful labels wherever possible.
- Preview/read-only states must not show dead editing controls.
- If a screen is read-only, say so clearly and remove edit affordances.

## Designer UX Guardrails

- The designer must feel like a real tool, not a developer control panel.
- Avoid form-first editing where direct manipulation is expected.
- Do not ship interactions like `selected item -> move up/down` as the primary ordering UX.
- Standard designer expectations matter:
  - visible selection
  - direct object actions near the canvas
  - understandable layers
  - clear edit vs preview state
- Embedded mode for Magento must stay compact and operational, not page-like or marketing-like.

## Admin UX Guardrails

- Admin is an operational workspace, not a marketing site.
- Every list screen should answer:
  - what records exist
  - what can I create
  - what can I inspect/edit/delete
- Every detail screen should answer:
  - what is this object
  - what related outputs/previews/config apply
  - what is the next admin action
- `Mail Log` should render HTML previews, not dump raw HTML into the main details table.
- `Email Templates` must support CRUD plus preview before save and after save.
- `Settings` must include real system settings, not just a tiny brand stub.
- Settings should cover at least:
  - brand identity
  - support and sender addresses
  - public application URLs
  - localization defaults
  - mail wrapper HTML

## Testing Guardrails

- Do not claim UI work is done unless it has been checked in a running browser.
- Build success is not enough.
- At minimum, UI changes should be checked by:
  - opening the live route
  - verifying navigation
  - verifying the primary form or action
  - verifying the resulting state change or preview
- For admin CRUD changes, verify at least:
  - list page
  - create page
  - show page
  - edit/save flow when applicable
- For email/template/settings changes, verify both:
  - API response shape
  - browser rendering

## Data And Integration Rules

- Project creation must come from API-backed records, not front-end-only placeholders.
- Template selection must be constrained by blueprint/product context where applicable.
- Email previews must use the same rendering path as actual sent mail whenever possible.
- Magento integration should stay thin:
  - launch session
  - return/status handling
  - quote/order linking
- Do not push designer, template, or preflight business logic into Magento.

## Refactoring Rules

- If a surface is structurally wrong, do not keep layering patches on top of it.
- Prefer replacing fake or misleading UI with a smaller honest flow over shipping a larger broken one.
- Remove duplicated or contradictory navigation once a cleaner pattern exists.
- Keep terminology consistent across list, form, show, and API responses.

## Immediate Priorities When Continuing Work

- Keep the PostgreSQL-backed path as the only runtime persistence path.
- Keep admin CRUD and previews working while refactoring the backend.
- Continue replacing technical/raw values in the UI with human-readable labels and selectors.
- Keep mail, settings, and project flows browser-tested after each meaningful change.
