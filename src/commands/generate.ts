import type { CAC } from "cac";
import { ZodError } from "zod";
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

      try {
        generate({
          manifestPath,
          templatesDir,
          outDir,
          provider,
          appVersionOverride: options.appVersion,
        });
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
}
