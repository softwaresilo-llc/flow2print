# Magento Connector Architecture

The Magento connector is intentionally thin.

- Magento remains the source of truth for catalog, quote, order, and checkout.
- Flow2Print remains the source of truth for projects, versions, outputs, and preflight.
- The connector stores references and synchronization metadata only.
- Launch, quote-link, and order-link API calls are performed server-to-server through the Flow2Print client.
- The return controller reads project status from Flow2Print and is ready to become the bridge into quote-item and order-item persistence.
- Quote-item, order-item, and sync-ledger persistence is encapsulated in dedicated storage services backed by Magento's declarative schema tables.
- The launch controller provides a redirect-first entry path so Magento can start a Flow2Print session without embedding the designer.
