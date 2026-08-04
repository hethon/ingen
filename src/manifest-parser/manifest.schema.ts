import { z } from "zod";
import { checksumSchema, fragmentSchema } from "../template-context/common_context.schema";
import { type LibcVersion, shContextSchema } from "../template-context/sh_context.schema";

export const libcVersionSchema = z
  .string()
  .regex(/^\d+\.\d+$/)
  .transform((value): LibcVersion => {
    const [major, series] = value.split(".") as [string, string];

    return {
      major: Number(major),
      series: Number(series),
    };
  });

const archiveLayoutSchema = z.enum(["flat", "wrapped"]);

const manifestArchiveSchema = fragmentSchema
  .omit({
    // reason: renamed to target
    target_triple: true,

    // reason: will be derived from "layout"
    zip_depth: true,
    // reason: no updater support; always a schema-level literal
    // in the template-context schemas.
    updater: true,
  })
  .extend({
    target: fragmentSchema.shape.target_triple,
    checksum_style: checksumSchema.shape.style.optional(),
    checksum: checksumSchema.shape.value.optional(),
    min_glibc_version: libcVersionSchema.optional(),
    layout: archiveLayoutSchema.optional(),
  })
  .partial({
    executables: true,
    cdylibs: true,
    cstaticlibs: true,
    zip_style: true,
  });

const INSTALL_PATH_REGEX = /^(~\/.*|\$[A-Za-z_][A-Za-z0-9_]*(?:\/.*)?)$/;

const manifestInstallPathStringSchema = z
  .string()
  .min(1)
  .regex(
    INSTALL_PATH_REGEX,
    'install path must start with "~/" (home-relative) or "$VAR" (env-var-relative)',
  );

export const manifestSchema = shContextSchema
  .omit({
    // reason: can be derived from archives
    artifacts: true,

    // reason: nearly every field is a fixed sentinel or literal, already
    // pushed down into receiptSchema's own defaults. The two genuinely
    // user-supplied facts it needed (owner, and app_name/version, which
    // already exist elsewhere in this manifest) are captured by the fields
    // added below.
    receipt: true,

    // reason: can be derived from cdylibs/cstaticlibs of archives
    install_libraries: true,

    // reason: can be derived from app_name
    env_vars: true,

    // reason: can be derived from archives
    platform_support: true,
  })
  .extend({
    owner: z.string().min(1),
    repo: z.string().min(1),
    tag: z.string().min(1),

    install_paths: z.array(manifestInstallPathStringSchema),
    bin_aliases: z.record(z.string(), z.array(z.string().min(1))),

    // Global defaults for `manifestArchiveSchema` fields
    windows_archive: z.strictObject({
      style: fragmentSchema.shape.zip_style,
      layout: archiveLayoutSchema,
    }),
    unix_archive: z.strictObject({
      style: fragmentSchema.shape.zip_style,
      layout: archiveLayoutSchema,
    }),
    executables: z.array(z.string().min(1)).min(1),
    cdylibs: z.array(z.string().min(1)),
    cstaticlibs: z.array(z.string().min(1)),
    checksum_style: checksumSchema.shape.style,
    min_glibc_version: libcVersionSchema.optional(),

    archives: z.array(manifestArchiveSchema).min(1),
  });

export type Manifest = z.output<typeof manifestSchema>;
