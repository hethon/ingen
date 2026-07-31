import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import vendor from "./vendor.json";

const WORKTREE_DIR = join(__dirname, "..", "..", "vendor/cargo-dist");

async function updateVendor() {
  if (!existsSync(WORKTREE_DIR)) {
    console.error("✗ Vendor worktree not found.");
    console.error("Please create it by running (from your project root):");
    console.error(`  git worktree add ${WORKTREE_DIR} vendor/cargo-dist\n`);
    process.exit(1);
  }

  const { repository, ref, files } = vendor;

  console.log(`Preparing to download files from ${repository} @ ${ref}...`);

  for (const [remotePath, localPath] of Object.entries(files)) {
    const rawUrl = `https://raw.githubusercontent.com/${repository}/${ref}/${remotePath}`;
    console.log(`Downloading ${remotePath}...`);

    const response = await fetch(rawUrl);
    if (!response.ok) {
      console.error(`✗ Failed to fetch ${rawUrl}: ${response.statusText}`);
      process.exit(1);
    }

    const content = await response.text();
    const absoluteLocalPath = join(WORKTREE_DIR, localPath);
    writeFileSync(absoluteLocalPath, content);
    console.log(`✓ Saved to ${absoluteLocalPath}`);
  }

  console.log("\n=== Update Complete! ===");
  console.log("The files in the vendor/cargo-dist worktree have been updated.");
  console.log("Follow these steps to apply this update:\n");
  console.log(`  cd ${WORKTREE_DIR}`);
  console.log("  git add .");
  console.log(`  git commit -m "vendor: update templates to ${ref}"`);
  console.log("  cd -");
  console.log("  git merge vendor/cargo-dist\n");
}

updateVendor();
