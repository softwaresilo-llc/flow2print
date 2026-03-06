export type Flow2PrintEventType =
  | "identity.user.created"
  | "catalog.blueprint.published"
  | "template.published"
  | "project.created"
  | "project.version.saved"
  | "project.finalized"
  | "asset.uploaded"
  | "production.preview.completed"
  | "production.export.completed"
  | "preflight.completed"
  | "commerce.launch.created"
  | "commerce.quote.linked"
  | "commerce.order.linked";

export interface Flow2PrintEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: Flow2PrintEventType;
  occurredAt: string;
  tenantId: string;
  traceId: string;
  schemaVersion: "1.0.0";
  payload: TPayload;
}

export const eventExchangeNames = {
  events: "flow2print.events.v1",
  commands: "flow2print.commands.v1"
} as const;

