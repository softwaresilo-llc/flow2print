# Flow2Print Platform

Flow2Print is an open source Web2Print platform built as a separate system with its own APIs, document schema, rendering pipeline, and Magento 2 connector.

## Included bootstrap

- React + TypeScript frontends for `designer-web` and `portal-web`
- Fastify-based HTTP services aligned to the planned service boundaries
- Shared `design-document`, `domain`, `runtime-store`, and `event-contracts` packages
- Local JSON-backed runtime state for launch sessions, projects, assets, outputs, preflight reports, and Magento commerce links
- Docker Compose infrastructure for Postgres, Redis, RabbitMQ, MinIO, Mailpit, Prometheus, and Grafana
- Exported JSON schema and OpenAPI contract snapshots under `schemas/`

## Working vertical slices

- create launch session from Magento-style product context
- draft project autosave with versioned Flow2Print document validation
- finalize project into preflight report and output artifacts
- manage asset metadata records from the designer
- create Magento quote links and order links against the same project
- expose Magento-facing project status with artifact references

## Workspaces

- `apps/*` deployable services, workers, and web apps
- `packages/*` shared contracts and cross-cutting libraries
- `schemas/*` exported public contracts
- `infra/*` local and production infrastructure
- `docs/*` architecture and operations notes

## Getting started

```bash
pnpm install
pnpm schema:export
pnpm build
pnpm test
```
