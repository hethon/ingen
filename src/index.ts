#!/usr/bin/env node

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { generate } from "./generate";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER = {
  source: "cargo-dist",
  version: "0.32.0",
} as const;

function printUsage(): void {
  console.error(`
installer-script-generator - generate shell/PowerShell installers

Usage:
  installer-script-generator <manifest.json> [output-dir]

Arguments:
  manifest.json        Path to the manifest used to render installer.sh and installer.ps1
  output-dir          Where to write installer.sh / installer.ps1 (default: ./out)
`);
}

function main(): void {
  const [manifestPath, outDirArg] = process.argv.slice(2);

  if (!manifestPath) {
    printUsage();
    process.exit(1);
  }

  const outDir = outDirArg ?? "./out";
  const templatesDir = join(__dirname, "..", "templates", PROVIDER.version);

  try {
    generate({ manifestPath: manifestPath, templatesDir, outDir, provider: PROVIDER });
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
}

main();
