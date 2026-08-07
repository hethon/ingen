import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CAC } from "cac";
import pkg from "../../package.json";
import exampleManifest from "./example.manifest.json";

export function registerInitCommand(cli: CAC) {
  cli.command("init", "Bootstrap a new installer.manifest.json in the current directory").action(() => {
    const targetPath = join(process.cwd(), "installer.manifest.json");

    if (existsSync(targetPath)) {
      console.error(`✗ Error: ${targetPath} already exists.`);
      process.exit(1);
    }

    const template = {
      $schema: `https://raw.githubusercontent.com/hethon/ingen/v${pkg.version}/schema/manifest.schema.json`,
      ...exampleManifest,
    };

    // biome-ignore lint/style/useTemplate: intentional
    writeFileSync(targetPath, JSON.stringify(template, null, 2) + "\n");
    console.log(`✓ Created placeholder manifest at ./installer.manifest.json`);
    console.log(`  Open it in your editor to configure your project!`);
  });
}
