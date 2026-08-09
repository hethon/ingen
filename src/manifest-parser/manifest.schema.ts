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

const archiveLayoutSchema = z
  .enum(["flat", "wrapped"])
  .describe(
    "The directory structure inside the archives." +
      " 'flat' means the executable and other files are at the root." +
      " 'wrapped' means the executable and other files nested inside a single top-level folder.",
  );

const zipStyleSchema = fragmentSchema.shape.zip_style.describe("The file extension of the archives.");

const checksumAlgorithms = checksumSchema.shape.style.options;
const checksumStringRegex = new RegExp(`^(${checksumAlgorithms.join("|")}):[0-9a-fA-F]+$`);

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
    id: fragmentSchema.shape.id.describe(
      "The exact filename of the archive in the release (e.g., 'my-app-x86_64-linux.tar.gz')." +
        " Supports '{app_version}' substitution.",
    ),

    target: fragmentSchema.shape.target_triple.describe(
      "The Rust-style target triple this archive is compiled for" +
        " (e.g., 'x86_64-unknown-linux-gnu', 'aarch64-apple-darwin').",
    ),

    checksum: z
      .string()
      .regex(checksumStringRegex)
      .transform((checksum) => {
        type ChecksumAlgorithm = (typeof checksumAlgorithms)[number];
        const [style, value] = checksum.split(":", 2) as [ChecksumAlgorithm, string];

        return {
          style,
          value,
        };
      })
      .optional()
      .describe(
        "The cryptographic checksum, formatted as 'algorithm:hash' (e.g., 'sha256:abcd...')." +
          " If omitted, checksum verification is skipped for this archive." +
          " Can be auto-populated by running `ingen sync.",
      ),

    min_glibc_version: libcVersionSchema
      .optional()
      .describe("The minimum glibc version required for this specific archive."),

    executables: fragmentSchema.shape.executables
      .optional()
      .describe("The list of executables to extract from this specific archive."),

    cdylibs: fragmentSchema.shape.cdylibs
      .optional()
      .describe("The list of dynamic libraries to extract from this specific archive."),

    cstaticlibs: fragmentSchema.shape.cstaticlibs
      .optional()
      .describe("The list of static libraries to extract from this specific archive."),

    layout: archiveLayoutSchema.optional().describe("The archive layout of this specific archive."),

    zip_style: zipStyleSchema.optional().describe("The file extension of this specific archive."),
  });

const INSTALL_PATH_REGEX = /^(~\/.*|\$[A-Za-z_][A-Za-z0-9_]*(?:\/.*)?)$/;

const manifestInstallPathStringSchema = z.string().min(1).regex(INSTALL_PATH_REGEX);

export const manifestSchema = shContextSchema
  .omit({
    // reason: can be derived from archives
    artifacts: true,

    // reason: computed internally from owner, repo and tag
    hosting: true,

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
    // Inherited fields redefined strictly to add descriptions
    app_name: shContextSchema.shape.app_name.describe("The name of the application (e.g., 'ripgrep')."),

    app_version: shContextSchema.shape.app_version.describe(
      "The release version of the application (e.g., '1.0.0').",
    ),

    base_urls: shContextSchema.shape.base_urls.describe(
      "List of URLs where archives are hosted." +
        " The installer tries each URL one after another." +
        " The URLs support {owner}, {repo}, {tag}, and {app_version} substitutions.",
    ),

    install_success_msg: shContextSchema.shape.install_success_msg.describe(
      "The message printed to the console upon successful installation.",
    ),

    // New fields
    owner: z.string().min(1).describe("The organization or username that owns the repository."),

    repo: z.string().min(1).describe("The repository name."),

    tag: z
      .string()
      .min(1)
      .describe(
        "The Git tag used for the release. Supports '{app_version}' substitution (e.g., 'v{app_version}').",
      ),

    install_paths: z
      .array(manifestInstallPathStringSchema)
      .describe(
        "List of target directories where the executables should be placed, in order of preference." +
          " The installer tries each path in order and uses the first one that is valid on the user's machine." +
          " Supports `~/` (home relative) and `$VAR/` (environment variable relative).",
      ),

    bin_aliases: z
      .record(z.string(), z.array(z.string().min(1)))
      .describe(
        "A mapping of executable names to a list of aliases." +
          " The installer creates symlinks or copies for these aliases" +
          " and places them in the chosen install path.",
      ),

    // Global defaults for `manifestArchiveSchema` fields
    windows_archive: z
      .strictObject({
        style: zipStyleSchema,
        layout: archiveLayoutSchema,
      })
      .describe("Layout and extension settings for Windows archives. Can be overridden per archive."),

    unix_archive: z
      .strictObject({
        style: zipStyleSchema,
        layout: archiveLayoutSchema,
      })
      .describe(
        "Layout and extension settings for Unix (Linux/macOS) archives." + " Can be overridden per archive.",
      ),

    executables: z
      .array(z.string().min(1))
      .min(1)
      .describe(
        "A list of executable filenames expected to be found inside the archives." +
          " Can be overridden per archive.",
      ),

    cdylibs: z
      .array(z.string().min(1))
      .describe("A list of dynamic libraries to extract from the archives. Can be overridden per archive."),

    cstaticlibs: z
      .array(z.string().min(1))
      .describe("A list of static libraries to extract from the archives. Can be overridden per archive."),

    min_glibc_version: libcVersionSchema
      .optional()
      .describe(
        "The minimum glibc version required by the archives (e.g., '2.17')." +
          " Applies only to archives with a '*-linux-gnu-*' target." +
          " If set, the installer will check that the user's glibc version meets this minimum before installation." +
          " If omitted, no glibc floor is enforced." +
          " Can be overridden per archive.",
      ),

    archives: z
      .array(manifestArchiveSchema)
      .min(1)
      .describe("A list of all archives that contain executables."),
  });

export type Manifest = z.output<typeof manifestSchema>;
