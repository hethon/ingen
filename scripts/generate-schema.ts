import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { manifestSchema } from "../src/manifest-parser/manifest.schema";

const SCHEMA_PATH = join(__dirname, "..", "schema", "manifest.schema.json");

function generateSchema() {
  const manifestJsonSchema = z.toJSONSchema(
    manifestSchema.extend({
      $schema: z.string().optional(),
    }),
    {
      io: "input",
    },
  );

  mkdirSync(dirname(SCHEMA_PATH), { recursive: true });
  // biome-ignore lint/style/useTemplate: intentional
  writeFileSync(SCHEMA_PATH, JSON.stringify(manifestJsonSchema, null, 2) + "\n");

  console.log(`✓ Schema written to ${SCHEMA_PATH}`);
}

generateSchema();
