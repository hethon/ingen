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
  tabSize: 4,
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
        throw new Error(`Failed to fetch GitHub release: ${response.status} ${response.statusText}`);
      }

      const release = githubReleaseSchema.parse(await response.json());

      const checksums = new Map(
        release.assets.filter((asset) => asset.digest).map((asset) => [asset.name, asset.digest]),
      );

      const edits = [];

      let updated = 0;
      let unchanged = 0;
      let missing = 0;

      for (const [idx, archive] of manifest.archives.entries()) {
        const checksum = checksums.get(archive.id);

        if (!checksum) {
          console.warn(`⚠ No GitHub digest found for ${archive.id}`);
          missing++;
          continue;
        }

        if (archive.checksum === checksum) {
          unchanged++;
          continue;
        }

        edits.push(...modify(source, ["archives", idx, "checksum"], checksum, { formattingOptions }));

        updated++;

        console.log(`✓ Updated checksum for ${archive.id}`);
      }

      if (updated > 0) {
        writeFileSync(manifestPath, applyEdits(source, edits));
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
