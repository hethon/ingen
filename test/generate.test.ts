import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generate } from "../src/generate";

const FIXTURES_DIR = join(__dirname, "fixtures");
const TEMPLATES_DIR = join(__dirname, "..", "templates");

const DEFAULT_TEMPLATE_VERSION = "0.32.0";

// Per-fixture override: which vendored template version to render with
const TEMPLATE_VERSION_OVERRIDES: Record<string, string> = {
  uv: "0.31.0",
};

interface FixtureSourceEntry {
  url: string;
  sha256: string;
}

interface FixtureSource {
  sh: FixtureSourceEntry;
  ps1: FixtureSourceEntry;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Downloads expected.installer.sh/.ps1 from the URLs recorded in this
 * fixture's source.json, if they aren't already present on disk, and
 * verifies each download against its recorded sha256 before writing it.
 *
 * These files are gitignored deliberately as they're real, independently
 * verifiable published artifacts, not something we should commit a
 * possibly-stale local copy of. Delete them and re-run the tests any time
 * you want to confirm they still match what's actually published.
 */
async function ensureExpectedFiles(fixtureDir: string, name: string): Promise<void> {
  const sourcePath = join(fixtureDir, "source.json");
  if (!existsSync(sourcePath)) return; // fixture generated locally, no fetch needed

  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as FixtureSource;

  const targets: Array<[string, FixtureSourceEntry, string]> = [
    [join(fixtureDir, "expected.installer.sh"), source.sh, "sh"],
    [join(fixtureDir, "expected.installer.ps1"), source.ps1, "ps1"],
  ];

  for (const [path, entry, label] of targets) {
    if (existsSync(path)) continue;

    const res = await fetch(entry.url);
    if (!res.ok) {
      throw new Error(
        `fixture "${name}" (${label}): failed to fetch ${entry.url} (${res.status} ${res.statusText})`,
      );
    }
    const body = await res.text();

    const actualHash = sha256(body);
    if (actualHash !== entry.sha256) {
      throw new Error(
        `fixture "${name}" (${label}): sha256 mismatch for ${entry.url}\n` +
          `  expected: ${entry.sha256}\n` +
          `  actual:   ${actualHash}\n` +
          `This means the published file changed, or source.json's recorded hash is wrong/stale.`,
      );
    }

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
}

// Each fixture directory under test/fixtures/ is expected to contain:
//   installer.manifest.json   - our tool's manifest for this project
//   expected.installer.sh   - a real cargo-dist-generated installer.sh
//   expected.installer.ps1  - a real cargo-dist-generated installer.ps1
//
// "Real" here can mean either:
// (a) generated locally via cargo-dist
// (b) fetched directly from a project's actual published GitHub release
const fixtureNames = readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("generate", () => {
  for (const name of fixtureNames) {
    const fixtureDir = join(FIXTURES_DIR, name);
    const manifestPath = join(fixtureDir, "installer.manifest.json");
    const expectedShPath = join(fixtureDir, "expected.installer.sh");
    const expectedPs1Path = join(fixtureDir, "expected.installer.ps1");

    if (!existsSync(manifestPath)) {
      continue;
    }

    const templateVersion = TEMPLATE_VERSION_OVERRIDES[name] ?? DEFAULT_TEMPLATE_VERSION;
    const templatesDir = join(TEMPLATES_DIR, templateVersion);
    if (!existsSync(templatesDir)) {
      throw new Error(
        `fixture "${name}" wants templates/${templateVersion}/, but that directory doesn't exist`,
      );
    }

    test(`${name}: generated installer.sh matches real dist output (templates ${templateVersion})`, async () => {
      await ensureExpectedFiles(fixtureDir, name);

      const outDir = mkdtempSync(join(tmpdir(), `installer-script-generator-${name}-`));
      generate({
        manifestPath: manifestPath,
        templatesDir,
        outDir,
        provider: { source: "cargo-dist", version: templateVersion },
      });

      const actual = readFileSync(join(outDir, "installer.sh"), "utf8");
      const expected = readFileSync(expectedShPath, "utf8");

      expect(actual).toBe(expected);
    });

    test(`${name}: generated installer.ps1 matches real dist output (templates ${templateVersion})`, async () => {
      await ensureExpectedFiles(fixtureDir, name);

      const outDir = mkdtempSync(join(tmpdir(), `installer-script-generator-${name}-`));
      generate({
        manifestPath: manifestPath,
        templatesDir,
        outDir,
        provider: { source: "cargo-dist", version: templateVersion },
      });

      const actual = readFileSync(join(outDir, "installer.ps1"), "utf8");
      const expected = readFileSync(expectedPs1Path, "utf8");

      expect(actual).toBe(expected);
    });
  }

  test("at least one fixture was discovered", () => {
    expect(fixtureNames.length).toBeGreaterThan(0);
  });
});
