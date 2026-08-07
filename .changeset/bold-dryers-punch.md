---
"ingen-cli": minor
---

Added the `ingen sync` command.

You can now run `ingen sync <manifest>` to automatically fetch asset checksums from your GitHub release and inject them directly into your manifest file. It safely edits the file in-place to preserve your formatting and comments, and supports using a `GITHUB_TOKEN` environment variable for private repositories or avoiding rate limits.
