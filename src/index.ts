#!/usr/bin/env node

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { ZodError } from "zod";
import pkg from "../package.json";
import { generate } from "./generate";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER = {
  source: "cargo-dist",
  version: "0.32.0",
} as const;

const cli = cac("ingen");

cli
  .command("<manifest> [output-dir]", "Generate shell/PowerShell installers")
  .action((manifestPath: string, outDirArg: string | undefined) => {
    const outDir = outDirArg ?? "./out";
    const templatesDir = join(__dirname, "..", "templates", PROVIDER.version);

    try {
      generate({ manifestPath, templatesDir, outDir, provider: PROVIDER });
      console.log(`✓ wrote ${outDir}/installer.sh`);
      console.log(`✓ wrote ${outDir}/installer.ps1`);
    } catch (err) {
      if (err instanceof ZodError) {
        console.error("✗ invalid manifest:\n");
        for (const issue of err.issues) {
          console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
        }
        process.exit(1);
      }
      console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

cli.help();
cli.version(pkg.version);

try {
  cli.parse();
} catch (err) {
  // CAC throws if a required argument (like <manifest>) is missing.
  // We catch it here to print a clean error instead of a stack trace.
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
