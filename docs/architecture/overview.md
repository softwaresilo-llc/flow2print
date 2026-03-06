# Flow2Print Overview

The initial scaffold follows the platform split defined in the architecture plan:

- `designer-web`: standalone designer shell
- `portal-web`: operations, admin, and customer portal
- `edge-api`: browser-facing aggregation layer
- core services: identity, catalog, template, project, asset, production, connector
- workers: render, preflight

The current implementation is intentionally minimal, but the code structure already mirrors the desired bounded contexts and document contracts.

