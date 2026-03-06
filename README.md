# Flow2Print Platform

## Local Access

The current URLs below are local development endpoints. App-to-app links are no longer hardcoded in source and can be configured with:

- `VITE_FLOW2PRINT_API_URL`
- `VITE_FLOW2PRINT_DESIGNER_URL`
- `VITE_FLOW2PRINT_RETURN_URL`
- `DESIGNER_APP_URL` for the edge API

### Flow2Print Platform

- Admin workspace: `http://127.0.0.1:5177`
- Customer workspace prototype: `http://127.0.0.1:5176`
- Designer launcher: `http://127.0.0.1:5173`
- Designer draft example: `http://127.0.0.1:5173/designer/project/prj_fa59cce8-d564-46c3-b0ac-b10f28d50a10`
- Designer finalized example: `http://127.0.0.1:5173/designer/launch/lsn_878e1a5c-a2f2-4e9f-83e4-c5b792ebe5e4`
- Edge API: `http://127.0.0.1:3000`
- Healthcheck: `http://127.0.0.1:3000/healthz`

### Magento 2

- Magento storefront: `https://magento248.test/`
- Connector launch route: `https://magento248.test/flow2print/launch/index`
- Connector return route: `https://magento248.test/flow2print/return/index`

### Demo Access And Test Data

- Admin workspace login:
  - admin: `demo@flow2print.local` / `demo1234`
  - customer: `customer@flow2print.local` / `demo1234`
- Demo customer email used by launch sessions: `demo@flow2print.local`
- Demo products:
  - `SKU-BUSINESS-CARD`
  - `SKU-TSHIRT-BLACK`
  - `SKU-FOLDING-CARTON`
- Magento connector base API URL: `http://127.0.0.1:3000`
- Magento connector credentials are currently not enforced server-side in local dev.

### Repositories

- Platform repo: [`flow2print-platform`](./flow2print-platform)
- Magento 2 connector repo: [`flow2print-magento2-connector`](./flow2print-magento2-connector)

Initial scaffold for the Flow2Print platform monorepo.

This repository contains the TypeScript platform services, React frontends, shared contracts, schemas, and documentation for the standalone Web2Print system. The Magento 2 connector lives in a sibling repository at [`flow2print-magento2-connector`](./flow2print-magento2-connector).

## Included foundations

- React/Vite frontends for `designer-web` and `portal-web`
- NestJS/Fastify service scaffolds for the core platform services
- Shared `design-document` package with the first canonical document schema
- Shared event contracts and config helpers
- JSON schema and OpenAPI seed documents
- Docker Compose foundation for local development

## Workspaces

- `apps/*`: deployable applications and workers
- `packages/*`: shared TypeScript packages
- `schemas/*`: exported schemas and API/event contracts
- `docs/*`: architecture, API, and operations docs

## Next steps

- Run `pnpm install`
- Run `pnpm build`
- Start a service with `pnpm --filter @flow2print/edge-api dev`
- Start a frontend with `pnpm --filter @flow2print/designer-web dev`
