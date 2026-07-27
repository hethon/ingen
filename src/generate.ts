import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { Environment } from "minijinja-js";
import { z } from "zod";
import { manifestSchema } from "./manifest-parser/manifest.schema";
import { resolveManifest } from "./manifest-parser/manifest_to_context";
import { ps1ContextSchema } from "./template-context/ps1_context.schema";
import { shContextSchema } from "./template-context/sh_context.schema";

const SH_TEMPLATE_NAME = "installer.sh.j2";
const PS1_TEMPLATE_NAME = "installer.ps1.j2";

interface GenerateOptions {
  manifestPath: string;
  templatesDir: string;
  outDir: string;
  provider: {
    source: string;
    version: string;
  };
}

function buildEnvironment(templatesDir: string): Environment {
  const env = new Environment();

  env.addGlobal("error", (msg: string) => {
    throw new Error(`template error(): ${msg}`);
  });
  env.keepTrailingNewline = true;

  env.addTemplate(SH_TEMPLATE_NAME, readFileSync(`${templatesDir}/${SH_TEMPLATE_NAME}`, "utf8"));
  env.addTemplate(PS1_TEMPLATE_NAME, readFileSync(`${templatesDir}/${PS1_TEMPLATE_NAME}`, "utf8"));

  return env;
}

function readJson(path: string): Record<string, unknown> {
  const result = JSON.parse(readFileSync(path, "utf8"));
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error("Expected the manifest file to contain a JSON object.");
  }
  return result;
}

export function generate(opts: GenerateOptions): void {
  const { $schema: _, ...rawManifest } = readJson(opts.manifestPath);

  const manifest = manifestSchema.parse(rawManifest);

  const shContext = shContextSchema.parse(resolveManifest(manifest, "sh", opts.provider));
  const ps1Context = ps1ContextSchema.parse(resolveManifest(manifest, "ps1", opts.provider));

  const env = buildEnvironment(opts.templatesDir);

  const shOutput = env.renderTemplate(SH_TEMPLATE_NAME, shContext);
  const ps1Output = env.renderTemplate(PS1_TEMPLATE_NAME, ps1Context);

  const outSh = `${opts.outDir}/installer.sh`;
  const outPs1 = `${opts.outDir}/installer.ps1`;

  mkdirSync(dirname(outSh), { recursive: true });
  mkdirSync(dirname(outPs1), { recursive: true });

  writeFileSync(outSh, shOutput, { mode: 0o755 });
  writeFileSync(outPs1, ps1Output);

  // generate json schema

  const { dir, name } = parse(opts.manifestPath);
  const schemaPath = join(dir, `${name}.schema.json`);

  const manifestJsonSchema = z.toJSONSchema(
    manifestSchema.extend({
      $schema: z.string().optional(),
    }),
    {
      io: "input",
    },
  );

  writeFileSync(schemaPath, JSON.stringify(manifestJsonSchema, null, 2));
}
