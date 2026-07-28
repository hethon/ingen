import type { Ps1Context } from "../template-context/ps1_context.schema";
import type { ShContext } from "../template-context/sh_context.schema";
import type { Manifest } from "./manifest.schema";

type Context = Ps1Context & ShContext;

type SupportQuality = "HostNative" | "ImperfectNative" | "BulkyNative" | "Emulated" | "Hellmulated";

type TargetTriplet = Context["platform_support"]["archives"][number]["target_triple"];

type PlatformEntry = Context["platform_support"]["platforms"][string][number];
type PlatformEntryInternal = PlatformEntry & { support_quality: SupportQuality; archive_id: Archive["id"] };

type LibcVersion = Manifest["min_glibc_version"];
type Archive = Context["platform_support"]["archives"][number];
type ArchiveInternal = Archive & { min_glibc_version: LibcVersion };

type PlatformSupport = Context["platform_support"];

// Constants:
const LINUX_STATIC_LIBCS: string[] = ["linux-musl-static"];
const LINUX_STATIC_REPLACEABLE_LIBCS: string[] = ["linux-gnu", "linux-musl-dynamic"];

const TARGET_X86_WINDOWS = "i686-pc-windows-msvc";
const TARGET_X64_WINDOWS = "x86_64-pc-windows-msvc";
const TARGET_ARM64_WINDOWS = "aarch64-pc-windows-msvc";

const TARGET_X86_MINGW = "i686-pc-windows-gnu";
const TARGET_X64_MINGW = "x86_64-pc-windows-gnu";
const TARGET_ARM64_MINGW = "aarch64-pc-windows-gnu";

const TARGET_X64_MAC = "x86_64-apple-darwin";
const TARGET_ARM64_MAC = "aarch64-apple-darwin";
// ---

export function isLinuxGnu(target_triple: TargetTriplet): boolean {
  return target_triple.includes("linux") && target_triple.includes("-gnu");
}

/**
 * Given an archive, compute all the platforms it technically supports,
 * and to what level of quality.
 */
export function supports(
  archive_idx: PlatformEntryInternal["archive_idx"],
  archive: ArchiveInternal,
): Array<[TargetTriplet, PlatformEntryInternal]> {
  const res: Array<[TargetTriplet, PlatformEntryInternal]> = [];

  let target = archive.target_triple;

  // For the following linux checks we want to pull off any "eabihf" suffix while
  // comparing/parsing libc types.
  let degunked_target = target;
  let abigunk = "";
  if (target.endsWith("eabihf")) {
    degunked_target = target.slice(0, -"eabihf".length);
    abigunk = "eabihf";
  }

  // If this is the ambiguous-soon-to-be-changed "musl" target, rename it to musl-static,
  // which is its current behaviour.
  if (degunked_target.endsWith("musl")) {
    const system = degunked_target.slice(0, -"musl".length);
    target = `${system}musl-static${abigunk}`;
    degunked_target = `${degunked_target}-static`;
  }

  // First, add the target itself as a HostNative entry
  res.push([
    target,
    {
      support_quality: "HostNative",
      runtime_conditions: isLinuxGnu(target)
        ? {
            min_glibc_version: archive.min_glibc_version,
          }
        : {},
      archive_idx,
      archive_id: archive.id,
    },
  ]);

  // If this is a static linux libc, say it can support any linux at ImperfectNative quality
  for (const static_libc of LINUX_STATIC_LIBCS) {
    if (degunked_target.endsWith(static_libc)) {
      const system = degunked_target.slice(0, -static_libc.length);

      for (const libc of LINUX_STATIC_REPLACEABLE_LIBCS) {
        res.push([
          `${system}${libc}${abigunk}`,
          {
            support_quality: "ImperfectNative",
            runtime_conditions: {},
            archive_idx,
            archive_id: archive.id,
          },
        ]);
      }
      break;
    }
  }

  // If this is x64 macos, say it can run on arm64 macos using Rosetta2
  if (target === TARGET_X64_MAC) {
    res.push([
      TARGET_ARM64_MAC,
      {
        support_quality: "Emulated",
        runtime_conditions: { rosetta2: true },
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  // x86_32 windows binaries run fine on x86_64, but it's Imperfect compared to actual x86_64 binaries
  if (target === TARGET_X86_WINDOWS) {
    res.push([
      TARGET_X64_WINDOWS,
      {
        support_quality: "ImperfectNative",
        runtime_conditions: {},
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  if (target === TARGET_X86_MINGW) {
    res.push([
      TARGET_X64_MINGW,
      {
        support_quality: "ImperfectNative",
        runtime_conditions: {},
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  // Windows' equivalent to Rosetta2 (CHPE) is in fact installed-by-default so no need to detect!
  if (target === TARGET_X64_WINDOWS || target === TARGET_X86_WINDOWS) {
    const support_quality = target === TARGET_X86_WINDOWS ? "Hellmulated" : "Emulated";
    res.push([
      TARGET_ARM64_WINDOWS,
      {
        support_quality,
        runtime_conditions: {},
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  if (target === TARGET_X64_MINGW || target === TARGET_X86_MINGW) {
    const support_quality = target === TARGET_X86_MINGW ? "Hellmulated" : "Emulated";
    res.push([
      TARGET_ARM64_MINGW,
      {
        support_quality,
        runtime_conditions: {},
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  // windows-msvc binaries should always be acceptable on windows-gnu (mingw)
  if (target.endsWith("windows-msvc")) {
    const system = target.slice(0, -"windows-msvc".length);
    res.push([
      `${system}windows-gnu`,
      {
        support_quality: "ImperfectNative",
        runtime_conditions: {},
        archive_idx,
        archive_id: archive.id,
      },
    ]);
  }

  return res;
}

const QUALITY_RANK: Record<SupportQuality, number> = {
  HostNative: 1,
  BulkyNative: 2,
  ImperfectNative: 3,
  Emulated: 4,
  Hellmulated: 5,
};

export function computePlatformSupport(archives: ArchiveInternal[]): PlatformSupport {
  const platforms: Record<TargetTriplet, PlatformEntryInternal[]> = {};

  // Compute what platforms each archive Really supports
  for (const [archive_idx, archive] of archives.entries()) {
    const supportedPlatforms = supports(archive_idx, archive);

    // Group the results into the Record
    for (const [target, support] of supportedPlatforms) {
      // If the array doesn't exist for this target yet, create it
      platforms[target] ??= [];
      platforms[target].push(support);
    }
  }

  // Now sort the platform-support so the best options come first
  for (const supportList of Object.values(platforms)) {
    supportList.sort((a, b) => {
      // Sort by SupportQuality
      const qualityDiff = QUALITY_RANK[a.support_quality] - QUALITY_RANK[b.support_quality];

      if (qualityDiff !== 0) {
        return qualityDiff;
      }
      // Tie break by artifact name (for stability)
      const archiveA = a.archive_id;
      const archiveB = b.archive_id;
      return archiveA.localeCompare(archiveB);
    });
  }

  return {
    archives: archives.map(({ min_glibc_version, ...archive }) => archive),
    platforms: Object.fromEntries(
      Object.entries(platforms)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([target, entries]) => [
          target,
          entries.map(({ support_quality, archive_id, ...entry }) => entry),
        ]),
    ),
  };
}
