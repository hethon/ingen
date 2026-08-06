import type { CAC } from "cac";
import { generate } from "../generate";

export function registerGenerateCommand(
  cli: CAC,
  provider: { source: string; version: string },
  templatesDir: string,
) {
  cli
    .command("generate <manifest> [output-dir]", "Generate shell/PowerShell installers")
    .option("--app-version <version>", "Override the app_version field in the manifest")
    .action((manifestPath: string, outDirArg: string | undefined, options: { appVersion?: string }) => {
      const outDir = outDirArg ?? "./out";

      generate({
        manifestPath,
        templatesDir,
        outDir,
        provider,
        appVersionOverride: options.appVersion,
      });
      console.log(`✓ wrote ${outDir}/installer.sh`);
      console.log(`✓ wrote ${outDir}/installer.ps1`);
    });
}
