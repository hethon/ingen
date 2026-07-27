// resolves the user-facing manifest into the shape the template-context schemas expect

import type { Fragment } from "../template-context/common_context.schema";
import type { Ps1Context } from "../template-context/ps1_context.schema";
import type { ShContext } from "../template-context/sh_context.schema";
import { getOrThrow } from "../utils";
import type { Manifest } from "./manifest.schema";

type Context = Ps1Context & ShContext;

type TargetTriplet = Context["platform_support"]["archives"][number]["target_triple"];
type PlatformEntry = Context["platform_support"]["platforms"][string][number];
type SupportQuality =
  Manifest["platform_support"]["archives"][number]["platforms"][number]["support_quality"];
type Checksum = Context["platform_support"]["archives"][number]["checksum"];

const QUALITY_RANK: Record<SupportQuality, number> = {
  HostNative: 0,
  BulkyNative: 1,
  ImperfectNative: 2,
  Emulated: 3,
  Hellmulated: 4,
};

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

type ReconstructedArchiveWithPlatforms = Context["platform_support"]["archives"][number] & {
  platforms: Manifest["platform_support"]["archives"][number]["platforms"];
};

/**
 * Resolves each archive's zip_style/executables/cdylibs/cstaticlibs: uses
 * the archive's own explicit value if present, otherwise falls back to the
 * top-level default (windows_archive/unix_archive for zip_style based on
 * whether the triple is Windows; the top-level executables/cdylibs/
 * cstaticlibs otherwise).
 *
 * The archive's own representative target_triple is picked by highest
 * support_quality (lowest QUALITY_RANK).
 */
function reconstructArchives(
  manifest: Pick<
    Manifest,
    | "platform_support"
    | "executables"
    | "cdylibs"
    | "cstaticlibs"
    | "windows_archive"
    | "unix_archive"
    | "checksum_style"
  >,
): ReconstructedArchiveWithPlatforms[] {
  const archives = manifest.platform_support.archives;
  const executables = manifest.executables;
  const cdylibs = manifest.cdylibs;
  const cstaticlibs = manifest.cstaticlibs;
  const windowsArchive = manifest.windows_archive;
  const unixArchive = manifest.unix_archive;
  const checksum_style = manifest.checksum_style;

  return archives.map((archive) => {
    if (archive.platforms.length === 0) {
      throw new Error(`archive "${archive.id}" has an empty platforms[] list`);
    }
    const best = archive.platforms.reduce((a, b) =>
      QUALITY_RANK[a.support_quality] <= QUALITY_RANK[b.support_quality] ? a : b,
    );
    const native_target_triple = best.target_triple;

    // reconstruct checksum
    let checksum: Checksum;
    if (archive.checksum) {
      checksum = {
        style: archive.checksum_style ?? checksum_style,
        value: archive.checksum,
      };
    } else {
      checksum = null;
    }

    return {
      ...archive,
      target_triple: native_target_triple,
      checksum: checksum,
      executables:
        archive.executables ??
        (isWindowsTriple(native_target_triple) ? executables.map((n) => `${n}.exe`) : executables),
      cdylibs: archive.cdylibs ?? cdylibs,
      cstaticlibs: archive.cstaticlibs ?? cstaticlibs,
      zip_style: archive.zip_style ?? (isWindowsTriple(native_target_triple) ? windowsArchive : unixArchive),
    };
  });
}

function reconstructPlatformSupport(
  archivesWithPlatforms: ReconstructedArchiveWithPlatforms[],
): Context["platform_support"] {
  const _nativeTriples = new Set<TargetTriplet>();
  const _seenArchiveIds = new Set<string>();

  for (const { id, platforms } of archivesWithPlatforms) {
    if (_seenArchiveIds.has(id)) {
      throw new Error(`archive id "${id}" is declared more than once`);
    }
    _seenArchiveIds.add(id);

    const _seenInThisArchive = new Set<TargetTriplet>();
    for (const platform of platforms) {
      if (_seenInThisArchive.has(platform.target_triple)) {
        throw new Error(
          `target_triple "${platform.target_triple}" is listed more than once in archive ${id}`,
        );
      }
      _seenInThisArchive.add(platform.target_triple);

      if (platform.support_quality === "HostNative") {
        if (_nativeTriples.has(platform.target_triple)) {
          throw new Error(
            `target_triple "${platform.target_triple}" is claimed as HostNative by` +
              ` archive ${id} and one other archive`,
          );
        }
        _nativeTriples.add(platform.target_triple);
      }
    }
  }

  const platformsByTriple = new Map<string, Array<PlatformEntry & { _rank: number }>>();

  archivesWithPlatforms.forEach(({ platforms }, archiveIdx) => {
    for (const platform of platforms) {
      const list = platformsByTriple.get(platform.target_triple) ?? [];
      list.push({
        _rank: QUALITY_RANK[platform.support_quality],
        runtime_conditions: platform.runtime_conditions,
        archive_idx: archiveIdx,
      });
      platformsByTriple.set(platform.target_triple, list);
    }
  });

  for (const list of platformsByTriple.values()) {
    list.sort((a, b) => a._rank - b._rank || a.archive_idx - b.archive_idx);
  }

  // Sort archives by id, matching real dist output ordering, but this
  // reorders indices, so every archive_idx reference in platformsByTriple
  // must be remapped from old (pre-sort) index to new (post-sort) index.
  const indexed = archivesWithPlatforms.map(({ platforms: _, ...archive }, oldIdx) => ({
    archive,
    oldIdx,
  }));
  indexed.sort((a, b) => a.archive.id.localeCompare(b.archive.id));

  const oldToNewIdx = new Map<number, number>();
  const archivesInOrder = indexed.map(({ archive, oldIdx }, newIdx) => {
    oldToNewIdx.set(oldIdx, newIdx);
    return archive;
  });

  const platforms: Context["platform_support"]["platforms"] = {};
  for (const [triple, entries] of [...platformsByTriple.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    platforms[triple] = entries.map(({ runtime_conditions, archive_idx }) => ({
      runtime_conditions,
      archive_idx: getOrThrow(oldToNewIdx, archive_idx, `remapping archive_idx for triple "${triple}"`),
    }));
  }

  return { archives: archivesInOrder, platforms };
}

/**
 * Takes the validated user-facing manifest and resolves it into the
 * fully-expanded shape shContextSchema/ps1ContextSchema expect.
 */
type Provider = Context["receipt"]["provider"];
export function resolveManifest(manifest: Manifest, target: "sh", provider: Provider): ShContext;
export function resolveManifest(manifest: Manifest, target: "ps1", provider: Provider): Ps1Context;
export function resolveManifest(
  manifest: Manifest,
  target: "sh" | "ps1",
  provider: Provider,
): ShContext | Ps1Context {
  const resolvedTag = substitute(manifest.tag, { version: manifest.version });

  const vars = { owner: manifest.owner, repo: manifest.repo, tag: resolvedTag };
  const resolvedBaseUrls = substituteAll(manifest.base_urls, vars);
  const resolvedArtifactDownloadPath = substitute(manifest.hosting.github.artifact_download_path, vars);

  const reconstructedArchives = reconstructArchives(manifest);

  const reconstructedPlatformSupport = reconstructPlatformSupport(reconstructedArchives);

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
    app_version: manifest.version,
    base_urls: resolvedBaseUrls,
    hosting: {
      github: { artifact_download_path: resolvedArtifactDownloadPath },
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
      version: manifest.version,
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
