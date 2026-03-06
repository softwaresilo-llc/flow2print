# Flow2Print Magento 2 Connector

This repository contains the Magento 2 connector for the separate Flow2Print platform.

## Current bootstrap

- module registration
- system configuration
- Flow2Print API client for launch sessions, quote links, order links, and project status
- reusable Magento-side services for launch session creation and quote/order synchronization
- launch redirect controller plus sync-ledger and quote/order persistence services
- return controller skeleton
- declarative schema for quote/order sync tables
- PHPStan and PHPUnit bootstrap files

## Intended responsibilities

- create signed launch sessions against Flow2Print
- persist quote and order references
- handle return callbacks from the Flow2Print designer
- reconcile project and output status

## Platform endpoints expected by the connector

- `POST /v1/launch-sessions`
- `POST /v1/connectors/magento2/quote-links`
- `POST /v1/connectors/magento2/order-links`
- `GET /v1/connectors/magento2/projects/:projectId/status`

## Installation

Place the module in `app/code/Flow2Print/Connector` or install it via Composer and run:

```bash
bin/magento module:enable Flow2Print_Connector
bin/magento setup:upgrade
```
