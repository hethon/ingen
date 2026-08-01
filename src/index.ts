#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { ZodError } from "zod";
import pkg from "../package.json";
import { generate } from "./generate";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER = {
  source: "ingen",
  version: pkg.version,
} as const;

const cli = cac("ingen");

cli
  .command("<manifest> [output-dir]", "Generate shell/PowerShell installers")
  .action((manifestPath: string, outDirArg: string | undefined) => {
    const outDir = outDirArg ?? "./out";
    const templatesDir = join(__dirname, "..", "templates");

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

cli.command("init", "Bootstrap a new installer.manifest.json in the current directory").action(() => {
  const targetPath = join(process.cwd(), "installer.manifest.json");

  if (existsSync(targetPath)) {
    console.error(`✗ Error: ${targetPath} already exists.`);
    process.exit(1);
  }

  const template = {
    $schema: "https://raw.githubusercontent.com/hethon/ingen/master/schema/manifest.schema.json",
    app_name: "my-app",
    version: "0.1.0",
    owner: "my-org",
    repo: "my-app",
    tag: "v{version}",
    base_urls: ["https://github.com/{owner}/{repo}/releases/download/{tag}"],
    hosting: {
      github: {
        artifact_download_path: "/{owner}/{repo}/releases/download/{tag}",
      },
    },
    windows_archive: ".zip",
    unix_archive: ".tar.gz",
    executables: ["my-app"],
    cdylibs: [],
    cstaticlibs: [],
    min_glibc_version: "2.17",
    checksum_style: "sha256",
    bin_aliases: {},
    install_paths: ["~/.local/bin"],
    install_success_msg: "my-app was successfully installed!",
    platform_support: {
      archives: [
        {
          id: "my-app-x86_64-unknown-linux-gnu.tar.gz",
          target_triple: "x86_64-unknown-linux-gnu",
          checksum: "0000000000000000000000000000000000000000000000000000000000000000",
        },
      ],
    },
  };

  // biome-ignore lint/style/useTemplate: intentional
  writeFileSync(targetPath, JSON.stringify(template, null, 2) + "\n");
  console.log(`✓ Created placeholder manifest at ./installer.manifest.json`);
  console.log(`  Open it in your editor to configure your project!`);
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
