import { z } from "zod";

const installLibrariesSchema = z.array(z.enum(["cdylib", "cstaticlib"]));

export const targetTripleSchema = z
  .string()
  .regex(/^[a-z0-9_]+(-[a-z0-9_.]+){2,4}$/i, "doesn't look like a target triple");

const hostingSchema = z.strictObject({
  github: z.strictObject({
    artifact_download_path: z.string().min(1),
  }),
});

const installPathsSchema = z.array(
  z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("EnvSubdir"),
      env_key: z.string().min(1),
      subdir: z.string(),
    }),
    z.strictObject({ kind: z.literal("HomeSubdir"), subdir: z.string() }),
  ]),
);

const zipStyleSchema = z.enum([".tar.gz", ".tar.xz", ".tar.zst", ".zip"]);

export const checksumSchema = z.strictObject({
  style: z.enum(["sha256", "sha512", "sha3-256", "sha3-512", "blake2s", "blake2b"]),
  value: z.string().min(1),
});

export const fragmentSchema = z.strictObject({
  id: z.string().min(1),
  target_triple: targetTripleSchema,
  checksum: checksumSchema.nullable(),
  executables: z.array(z.string().min(1)).min(1),
  cdylibs: z.array(z.string().min(1)),
  cstaticlibs: z.array(z.string().min(1)),
  zip_style: zipStyleSchema,
  zip_depth: z.enum(["0", "1"]),
  // No updater support, always null.
  updater: z.null().default(null),
});
export type Fragment = z.input<typeof fragmentSchema>;

const receiptSchema = z.strictObject({
  install_prefix: z.literal("AXO_INSTALL_PREFIX").default("AXO_INSTALL_PREFIX"),
  install_layout: z.literal("unspecified").default("unspecified"),
  binaries: z.tuple([z.literal("CARGO_DIST_BINS")]).default(["CARGO_DIST_BINS"]),
  cdylibs: z.tuple([z.literal("CARGO_DIST_DYLIBS")]).default(["CARGO_DIST_DYLIBS"]),
  cstaticlibs: z.tuple([z.literal("CARGO_DIST_STATICLIBS")]).default(["CARGO_DIST_STATICLIBS"]),
  source: z.strictObject({
    release_type: z.literal("github").default("github"),
    owner: z.string().min(1),
    name: z.string().min(1),
    app_name: z.string().min(1),
  }),
  version: z.string().min(1),
  provider: z.strictObject({
    source: z.string().min(1),
    version: z.string().min(1),
  }),
  binary_aliases: z.strictObject({}).default({}),
  modify_path: z.literal(true).default(true),
});

const binAliasesSchema = z.record(targetTripleSchema, z.record(z.string(), z.array(z.string().min(1))));

const envVarsSchema = z.strictObject({
  install_dir_env_var: z.string().min(1),
  unmanaged_dir_env_var: z.string().min(1),
  disable_update_env_var: z.string().min(1),
  no_modify_path_env_var: z.string().min(1),
  print_quiet_env_var: z.string().min(1),
  print_verbose_env_var: z.string().min(1),
  download_url_env_var: z.string().min(1),
  github_base_url_env_var: z.string().min(1),
  ghe_base_url_env_var: z.string().min(1),
  github_token_env_var: z.string().min(1),
});

export const commonContextSchema = z.strictObject({
  app_name: z.string().min(1),
  app_version: z.string().min(1),
  base_urls: z.array(z.url()).min(1),
  hosting: hostingSchema,
  install_success_msg: z.string().min(1),
  install_paths: installPathsSchema,
  receipt: receiptSchema,
  bin_aliases: binAliasesSchema,
  env_vars: envVarsSchema,
  install_libraries: installLibrariesSchema,
});
