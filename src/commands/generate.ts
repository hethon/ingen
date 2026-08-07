import type { CAC } from "cac";
import { generate } from "../generate";

export function registerGenerateCommand(
  cli: CAC,
  provider: { source: string; version: string },
  templatesDir: string,
) {
  cli
    .command("generate <manifest> [output-dir]", "Generate shell/PowerShell installers")
    .action((manifestPath: string, outDirArg: string | undefined) => {
      const outDir = outDirArg ?? "./out";

      generate({
        manifestPath,
        templatesDir,
        outDir,
        provider,
      });
      console.log(`✓ wrote ${outDir}/installer.sh`);
      console.log(`✓ wrote ${outDir}/installer.ps1`);
    });
}
