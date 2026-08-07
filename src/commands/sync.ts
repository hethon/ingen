import { readFileSync, writeFileSync } from "node:fs";
import type { CAC } from "cac";
import { applyEdits, modify } from "jsonc-parser";
import { z } from "zod";
import { manifestSchema } from "../manifest-parser/manifest.schema";
import { resolveManifest } from "../manifest-parser/manifest_to_context";

const githubReleaseSchema = z.object({
  assets: z.array(
    z.object({
      name: z.string(),
      digest: z.string().nullable().optional(),
    }),
  ),
});

const formattingOptions = {
  insertSpaces: true,
  tabSize: 2,
};

export function registerSyncCommand(cli: CAC) {
  cli
    .command("sync <manifest>", "Fetch checksums from GitHub releases and update the manifest")
    .action(async (manifestPath: string) => {
      const source = readFileSync(manifestPath, "utf8");
      const { $schema: _, ...rawManifestData } = JSON.parse(source);
      const manifest = manifestSchema.parse(rawManifestData);
      resolveManifest(manifest);

      console.log(`Syncing checksums from ${manifest.owner}/${manifest.repo}@${manifest.tag}...`);

      const headers: Record<string, string> = {
        "User-Agent": "ingen-cli",
        Accept: "application/vnd.github+json",
      };

      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${manifest.owner}/${manifest.repo}/releases/tags/${manifest.tag}`,
        { headers },
      );

      if (!response.ok) {
        const hasToken = Boolean(process.env.GITHUB_TOKEN);

        const remaining = response.headers.get("x-ratelimit-remaining");
        const reset = response.headers.get("x-ratelimit-reset");

        if (response.status === 403 && remaining === "0") {
          let message = "GitHub API rate limit exceeded.";

          if (reset) {
            const resetAt = new Date(Number(reset) * 1000).toLocaleString();
            message += ` Try again after ${resetAt}.`;
          }

          if (!hasToken) {
            message += " Set the GITHUB_TOKEN environment variable to increase the API rate limit.";
          }

          throw new Error(message);
        }

        if (response.status === 404 && !hasToken) {
          throw new Error(
            "GitHub release not found. If this is a private repository, set the GITHUB_TOKEN environment variable.",
          );
        }

        throw new Error(`Failed to fetch GitHub release: ${response.status} ${response.statusText}`);
      }

      const release = githubReleaseSchema.parse(await response.json());

      const assetsByName = new Map(release.assets.map((asset) => [asset.name, asset]));

      let updatedSource = source;

      let updated = 0;
      let unchanged = 0;
      let missing = 0;

      for (const [idx, archive] of manifest.archives.entries()) {
        const asset = assetsByName.get(archive.id);

        if (!asset) {
          throw new Error(
            `Archive "${archive.id}" was not found in the assets for ${manifest.owner}/${manifest.repo}@${manifest.tag}. ` +
              `Check for a typo, or ensure the archive was uploaded to this release.`,
          );
        }

        if (!asset.digest) {
          console.warn(`⚠ No GitHub digest found for ${archive.id}`);
          missing++;
          continue;
        }

        const checksum = asset.digest;

        if (archive.checksum && `${archive.checksum.style}:${archive.checksum.value}` === checksum) {
          unchanged++;
          continue;
        }

        updatedSource = applyEdits(
          updatedSource,
          modify(updatedSource, ["archives", idx, "checksum"], checksum, { formattingOptions }),
        );

        updated++;

        console.log(`✓ Updated checksum for ${archive.id}`);
      }

      if (updated > 0) {
        writeFileSync(manifestPath, updatedSource);
      }

      console.log("");

      if (updated > 0) {
        console.log(`Updated ${updated} archive checksum(s).`);
      }

      if (unchanged > 0) {
        console.log(`${unchanged} archive checksum(s) already up to date.`);
      }

      if (missing > 0) {
        console.log(`${missing} archive checksum(s) could not be resolved.`);
      }

      if (updated === 0 && missing === 0) {
        console.log("Manifest is already synchronized.");
      }
    });
}
