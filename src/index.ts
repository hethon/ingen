import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { ZodError } from "zod";
import pkg from "../package.json";
import { registerGenerateCommand } from "./commands/generate";
import { registerInitCommand } from "./commands/init";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER = {
  source: "ingen",
  version: pkg.version,
} as const;

const cli = cac("ingen");

const templatesDir = join(__dirname, "..", "templates");
registerGenerateCommand(cli, PROVIDER, templatesDir);
registerInitCommand(cli);

cli.help();
cli.version(pkg.version);

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (err) {
  if (err instanceof ZodError) {
    console.error("✗ invalid manifest:\n");
    for (const issue of err.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  } else {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exit(1);
}

if (!cli.matchedCommand) {
  console.error("✗ Unknown or missing command.\n");
  cli.outputHelp();
  process.exit(1);
}
