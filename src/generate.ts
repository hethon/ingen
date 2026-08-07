import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { render } from "./render";

interface GenerateOptions {
  manifestPath: string;
  templatesDir: string;
  outDir: string;
  provider: {
    source: string;
    version: string;
  };
}

function readJson(path: string): Record<string, unknown> {
  const result = JSON.parse(readFileSync(path, "utf8"));
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new Error("Expected the manifest file to contain a JSON object.");
  }
  return result;
}

export function generate(opts: GenerateOptions): void {
  const rawManifest = readJson(opts.manifestPath);

  const templates = {
    sh: readFileSync(join(opts.templatesDir, "installer.sh.j2"), "utf8"),
    ps1: readFileSync(join(opts.templatesDir, "installer.ps1.j2"), "utf8"),
  };

  const { shOutput, ps1Output } = render({
    rawManifest,
    templates,
    provider: opts.provider,
  });

  const outSh = join(opts.outDir, "installer.sh");
  const outPs1 = join(opts.outDir, "installer.ps1");

  mkdirSync(dirname(outSh), { recursive: true });
  mkdirSync(dirname(outPs1), { recursive: true });

  writeFileSync(outSh, shOutput, { mode: 0o755 });
  writeFileSync(outPs1, ps1Output);
}
