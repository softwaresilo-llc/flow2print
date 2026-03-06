import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { flow2PrintDocumentSchema } from "../packages/design-document/src/schema.js";
import { defaultEventTopics } from "../packages/event-contracts/src/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const documentSchemaPath = resolve(root, "schemas/jsonschema/flow2print-document.schema.json");
const eventsPath = resolve(root, "schemas/events/default-topics.json");

const main = async () => {
  await mkdir(dirname(documentSchemaPath), { recursive: true });
  await mkdir(dirname(eventsPath), { recursive: true });

  await writeFile(documentSchemaPath, JSON.stringify(z.toJSONSchema(flow2PrintDocumentSchema), null, 2));
  await writeFile(eventsPath, JSON.stringify(defaultEventTopics, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
