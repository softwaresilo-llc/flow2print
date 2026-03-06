# ADR 0001: Separate Platform and Magento Connector

## Status

Accepted

## Decision

The Flow2Print platform and the Magento 2 connector live in separate repositories.

## Rationale

- TypeScript and PHP have different toolchains and release cycles.
- The connector must stay thin and integration-focused.
- The platform must remain commerce-system agnostic.

