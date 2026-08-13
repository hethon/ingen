import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const EXAMPLES_DIR = join(__dirname, "..", "examples");
const CLI_PATH = join(__dirname, "..", "src", "index.ts");

function regenerateExamples() {
  const exampleDirs = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  let successCount = 0;

  for (const dirName of exampleDirs) {
    const manifestPath = join(EXAMPLES_DIR, dirName, "installer.manifest.json");
    const outDir = join(EXAMPLES_DIR, dirName, "installers");

    execSync(`bun run "${CLI_PATH}" generate "${manifestPath}" "${outDir}"`, {
      stdio: "inherit",
    });
    successCount++;
  }

  console.log(`✓ Successfully regenerated installers for ${successCount} examples.`);
}

regenerateExamples();
