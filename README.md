# Flow2Print

## Docker Stack Access

The local Flow2Print stack is designed to run through Docker Compose from [`flow2print-platform`](./flow2print-platform).

### Core Applications

- Admin workspace: `http://127.0.0.1:5177/login`
- Designer: `http://127.0.0.1:5173`
- Customer workspace: `http://127.0.0.1:5174`
- Edge API: `http://127.0.0.1:3000`
- Healthcheck: `http://127.0.0.1:3000/healthz`

### Infrastructure

- PostgreSQL: `127.0.0.1:55435`
- Redis: `127.0.0.1:6381`
- RabbitMQ AMQP: `127.0.0.1:5673`
- RabbitMQ UI: `http://127.0.0.1:15673`
- MinIO API: `http://127.0.0.1:9100`
- MinIO Console: `http://127.0.0.1:9101`
- Mailpit SMTP: `127.0.0.1:1125`
- Mailpit UI: `http://127.0.0.1:8125`
- Prometheus: `http://127.0.0.1:9091`
- Grafana: `http://127.0.0.1:3031`

### Local Demo Access

- Admin account: `demo@flow2print.local` / `demo1234`
- Customer account: `customer@flow2print.local` / `demo1234`

### Local Service Credentials

- PostgreSQL database: `flow2print`
- PostgreSQL user: `flow2print`
- PostgreSQL password: `flow2print`
- MinIO access key: `flow2print`
- MinIO secret key: `flow2print`
- Grafana user: `admin`
- Grafana password: `admin`

### Start And Stop

```bash
cd /home/patrick/projects/web2print-m2/flow2print-platform
pnpm stack:up
pnpm stack:logs
pnpm stack:down
```

### Docker Compose File

- Compose stack: [`flow2print-platform/infra/compose/docker-compose.yml`](./flow2print-platform/infra/compose/docker-compose.yml)
- Workspace image: [`flow2print-platform/infra/docker/Dockerfile.workspace`](./flow2print-platform/infra/docker/Dockerfile.workspace)

### Runtime URL Configuration

Runtime links must stay configurable and are driven by environment, not hardcoded app URLs.

- `VITE_FLOW2PRINT_API_URL`
- `VITE_FLOW2PRINT_DESIGNER_URL`
- `VITE_FLOW2PRINT_RETURN_URL`
- `DESIGNER_APP_URL`

## Magento 2 Integration

- Magento storefront: `https://magento248.test/`
- Connector launch route: `https://magento248.test/flow2print/launch/index`
- Connector return route: `https://magento248.test/flow2print/return/index`

Magento remains an external commerce system. Web2Print logic belongs to Flow2Print, not to Magento.

## Demo Product Seeds

- `SKU-BUSINESS-CARD`
- `SKU-TSHIRT-BLACK`
- `SKU-FOLDING-CARTON`

## Repositories

- Platform repo: [`flow2print-platform`](./flow2print-platform)
- Magento 2 connector repo: [`flow2print-magento2-connector`](./flow2print-magento2-connector)

## What Lives Where

- `flow2print-platform/apps/*`: web apps, API, workers
- `flow2print-platform/packages/*`: shared domain, rendering, database, contracts
- `flow2print-platform/schemas/*`: exported OpenAPI and JSON schema artifacts
- `flow2print-platform/infra/*`: local and production infrastructure
- `flow2print-platform/docs/*`: architecture and operations notes

## Current Platform Baseline

- Separate `designer-web`, `customer workspace`, and `admin workspace`
- PostgreSQL-backed persistence path
- NestJS/Fastify edge API
- Refine-based admin workspace
- Fabric.js-based designer stage
- Real rendered preview/proof/production files instead of placeholder artifacts
