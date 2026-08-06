import type { Fragment } from "../template-context/common_context.schema";
import type { Ps1Context } from "../template-context/ps1_context.schema";
import type { ShContext } from "../template-context/sh_context.schema";
import type { Manifest } from "./manifest.schema";
import { computePlatformSupport } from "./platforms";

type Context = Ps1Context & ShContext;

type TargetTriplet = Context["platform_support"]["archives"][number]["target_triple"];

function substitute(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function substituteAll(templates: string[], vars: Record<string, string>): string[] {
  return templates.map((t) => substitute(t, vars));
}

function reconstructInstallPaths(raw: Manifest["install_paths"]): Context["install_paths"] {
  return raw.map((path) => {
    if (path === "~") return { kind: "HomeSubdir", subdir: "" };
    if (path.startsWith("~/")) return { kind: "HomeSubdir", subdir: path.slice(2) };

    if (path.startsWith("$")) {
      const withoutDollar = path.slice(1);
      const slashIdx = withoutDollar.indexOf("/");
      if (slashIdx === -1)
        return {
          kind: "EnvSubdir",
          env_key: withoutDollar,
          subdir: "",
        };
      const env_key = withoutDollar.slice(0, slashIdx);
      const subdir = withoutDollar.slice(slashIdx + 1).replace(/\/$/, "");
      return { kind: "EnvSubdir", env_key, subdir };
    }

    throw new Error(`install path "${path}" must start with "~/" or "$VAR"`);
  });
}

function driveEnvVars(appName: Manifest["app_name"]): Context["env_vars"] {
  const prefix = appName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return {
    install_dir_env_var: `${prefix}_INSTALL_DIR`,
    unmanaged_dir_env_var: `${prefix}_UNMANAGED_INSTALL`,
    disable_update_env_var: `${prefix}_DISABLE_UPDATE`,
    no_modify_path_env_var: `${prefix}_NO_MODIFY_PATH`,
    print_quiet_env_var: `${prefix}_PRINT_QUIET`,
    print_verbose_env_var: `${prefix}_PRINT_VERBOSE`,
    download_url_env_var: `${prefix}_DOWNLOAD_URL`,
    github_base_url_env_var: `${prefix}_INSTALLER_GITHUB_BASE_URL`,
    ghe_base_url_env_var: `${prefix}_INSTALLER_GHE_BASE_URL`,
    github_token_env_var: `${prefix}_GITHUB_TOKEN`,
  };
}

function isWindowsTriple(triple: TargetTriplet): boolean {
  return triple.includes("-pc-windows-");
}

function isWindowsMsvcTriple(triple: TargetTriplet): boolean {
  return triple.endsWith("-msvc");
}

function reconstructBinAliases(
  flatAliases: Manifest["bin_aliases"],
  artifacts: Pick<Context["artifacts"][number], "target_triple">[],
): Context["bin_aliases"] {
  const result: Context["bin_aliases"] = {};

  for (const { target_triple } of artifacts) {
    if (!isWindowsTriple(target_triple)) {
      result[target_triple] = flatAliases;
      continue;
    }

    result[target_triple] = Object.fromEntries(
      Object.entries(flatAliases).map(([execName, aliases]) => [
        `${execName}.exe`,
        aliases.map((alias) => `${alias}.exe`),
      ]),
    );
  }

  return result;
}

/**
 * Mirrors PlatformSupport::fragments(): for every platform key, resolves
 * the first (highest-priority) candidate against `archives`, producing one
 * fully-resolved entry per triple with that triple baked in as
 * target_triple.
 */
function computeFragments(platformSupport: Context["platform_support"]): Fragment[] {
  return Object.entries(platformSupport.platforms).map(([triple, entries]) => {
    const best = entries[0];
    if (!best) {
      throw new Error(`platform "${triple}" has no candidates in platform_support.platforms`);
    }
    const archive = platformSupport.archives[best.archive_idx];
    if (!archive) {
      throw new Error(`archive_idx ${best.archive_idx} out of range for platform "${triple}"`);
    }
    return { ...archive, target_triple: triple };
  });
}

function reconstructPlatformSupport(
  manifest: Pick<
    Manifest,
    | "archives"
    | "executables"
    | "cdylibs"
    | "cstaticlibs"
    | "windows_archive"
    | "unix_archive"
    | "min_glibc_version"
    | "app_version"
  >,
): Context["platform_support"] {
  // collect global settings:
  const executables = manifest.executables;
  const cdylibs = manifest.cdylibs;
  const cstaticlibs = manifest.cstaticlibs;
  const windowsArchiveStyle = manifest.windows_archive.style;
  const unixArchiveStyle = manifest.unix_archive.style;
  const min_glibc_version = manifest.min_glibc_version;
  // ---

  const archivesIntermediate = manifest.archives.map((archive) => {
    const isWindows = isWindowsTriple(archive.target);

    const archiveLayout =
      archive.layout ?? (isWindows ? manifest.windows_archive.layout : manifest.unix_archive.layout);
    const zip_depth: "0" | "1" = archiveLayout === "wrapped" ? "1" : "0";

    return {
      id: archive.id,
      target_triple: archive.target,
      checksum: archive.checksum ?? null,
      executables: archive.executables ?? (isWindows ? executables.map((n) => `${n}.exe`) : executables),
      cdylibs: archive.cdylibs ?? cdylibs,
      cstaticlibs: archive.cstaticlibs ?? cstaticlibs,
      zip_style: archive.zip_style ?? (isWindows ? windowsArchiveStyle : unixArchiveStyle),
      zip_depth: zip_depth,
      min_glibc_version: archive.min_glibc_version ?? min_glibc_version,
    };
  });

  archivesIntermediate.sort((a, b) => a.id.localeCompare(b.id));

  const { archives, platforms } = computePlatformSupport(archivesIntermediate);
  return {
    archives,
    platforms,
  };
}

// Resolve all the placeholder tokens in the fields of manifest
export function resolveManifest(manifest: Manifest): void {
  const app_version = manifest.app_version;

  const resolvedTag = substitute(manifest.tag, { app_version });
  manifest.tag = resolvedTag;

  manifest.base_urls = substituteAll(manifest.base_urls, {
    owner: manifest.owner,
    repo: manifest.repo,
    tag: resolvedTag,
  });

  manifest.archives = manifest.archives.map(({ id, ...rest }) => ({
    id: substitute(id, { app_version }),
    ...rest,
  }));
}

/**
 * Takes the validated user-facing manifest and resolves it into the
 * fully-expanded shape shContextSchema/ps1ContextSchema expect.
 */
type Provider = Context["receipt"]["provider"];
export function reconstructContext(manifest: Manifest, target: "sh", provider: Provider): ShContext;
export function reconstructContext(manifest: Manifest, target: "ps1", provider: Provider): Ps1Context;
export function reconstructContext(
  manifest: Manifest,
  target: "sh" | "ps1",
  provider: Provider,
): ShContext | Ps1Context {
  resolveManifest(manifest);

  const reconstructedPlatformSupport = reconstructPlatformSupport(manifest);

  const fragments = computeFragments(reconstructedPlatformSupport);

  const install_libraries: Context["install_libraries"] = [];
  if (manifest.cdylibs.length > 0) {
    install_libraries.push("cdylib");
  }

  if (manifest.cstaticlibs.length > 0) {
    install_libraries.push("cstaticlib");
  }

  const common = {
    app_name: manifest.app_name,
    app_version: manifest.app_version,
    base_urls: manifest.base_urls,
    hosting: {
      github: {
        artifact_download_path: `/${manifest.owner}/${manifest.repo}/releases/download/${manifest.tag}`,
      },
    },
    install_success_msg: manifest.install_success_msg,
    install_paths: reconstructInstallPaths(manifest.install_paths),
    env_vars: driveEnvVars(manifest.app_name),
    install_libraries: install_libraries,
    receipt: {
      provider: {
        source: provider.source,
        version: provider.version,
      },
      source: {
        owner: manifest.owner,
        name: manifest.repo,
        app_name: manifest.app_name,
      },
      version: manifest.app_version,
    },
  };

  if (target === "sh") {
    const reconstructedArtifacts = fragments
      .filter((a) => !isWindowsMsvcTriple(a.target_triple))
      .map(({ target_triple }) => ({ target_triple }));
    return {
      ...common,
      artifacts: reconstructedArtifacts,
      bin_aliases: reconstructBinAliases(manifest.bin_aliases, reconstructedArtifacts),
      platform_support: reconstructedPlatformSupport,
    };
  }

  const reconstructedArtifacts = fragments
    .filter((a) => isWindowsTriple(a.target_triple))
    .map(({ checksum, ...ps1Fields }) => ps1Fields);

  return {
    ...common,
    artifacts: reconstructedArtifacts,
    bin_aliases: reconstructBinAliases(manifest.bin_aliases, reconstructedArtifacts),
  };
}
