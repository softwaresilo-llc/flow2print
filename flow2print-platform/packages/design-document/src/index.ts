import { flow2PrintDocumentSchema } from "./schema.js";

export { flow2PrintDocumentSchema } from "./schema.js";
export type { Flow2PrintDocument } from "./schema.js";

export const validateFlow2PrintDocument = (document: unknown) => {
  return flow2PrintDocumentSchema.safeParse(document);
};
