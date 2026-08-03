import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import exampleManifest from "../src/example.manifest.json";
import { manifestSchema } from "../src/manifest-parser/manifest.schema";

const EXAMPLES_DIR = join(__dirname, "..", "examples");

describe("example manifests validation", () => {
  // Test the internal boilerplate used by the `init` command
  test("src/example.manifest.json successfully validates", () => {
    expect(() => manifestSchema.parse(exampleManifest)).not.toThrow();
  });

  // Dynamically test all real-world examples in the examples/ directory
  if (existsSync(EXAMPLES_DIR)) {
    const exampleDirs = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dirName of exampleDirs) {
      test(`examples/${dirName}/installer.manifest.json successfully validates`, () => {
        const manifestPath = join(EXAMPLES_DIR, dirName, "installer.manifest.json");
        expect(existsSync(manifestPath)).toBe(true);

        const rawFile = JSON.parse(readFileSync(manifestPath, "utf8"));

        // Strip the $schema key before validating, as our schema is strictly typed
        const { $schema: _, ...manifestData } = rawFile;

        expect(() => manifestSchema.parse(manifestData)).not.toThrow();
      });
    }
  }
});
