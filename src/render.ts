import { Environment } from "minijinja-js";
import { manifestSchema } from "./manifest-parser/manifest.schema";
import { reconstructContext } from "./manifest-parser/manifest_to_context";
import { ps1ContextSchema } from "./template-context/ps1_context.schema";
import { shContextSchema } from "./template-context/sh_context.schema";

const SH_TEMPLATE_NAME = "installer.sh.j2";
const PS1_TEMPLATE_NAME = "installer.ps1.j2";

interface RenderInput {
  rawManifest: Record<string, unknown>;
  templates: {
    sh: string;
    ps1: string;
  };
  provider: {
    source: string;
    version: string;
  };
}

interface RenderOutput {
  shOutput: string;
  ps1Output: string;
}

function buildEnvironment(templates: RenderInput["templates"]): Environment {
  const env = new Environment();

  env.addGlobal("error", (msg: string) => {
    throw new Error(`template error(): ${msg}`);
  });
  env.keepTrailingNewline = true;

  env.addTemplate(SH_TEMPLATE_NAME, templates.sh);
  env.addTemplate(PS1_TEMPLATE_NAME, templates.ps1);

  return env;
}

export function render(input: RenderInput): RenderOutput {
  const { $schema: _, ...rawManifestData } = input.rawManifest;

  const manifest = manifestSchema.parse(rawManifestData);

  const shContextRaw = reconstructContext(manifest, "sh", input.provider);
  const ps1ContextRaw = reconstructContext(manifest, "ps1", input.provider);

  const shContext = shContextSchema.parse(shContextRaw);
  const ps1Context = ps1ContextSchema.parse(ps1ContextRaw);

  const env = buildEnvironment(input.templates);

  const shOutput = env.renderTemplate(SH_TEMPLATE_NAME, shContext);
  const ps1Output = env.renderTemplate(PS1_TEMPLATE_NAME, ps1Context);

  return { shOutput, ps1Output };
}
