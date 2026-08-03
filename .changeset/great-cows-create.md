---
"@hethon/ingen": minor
---

Add a `--app-version` option to `ingen generate`.

When provided, it overrides the `app_version` field in the manifest. This allows CI pipelines to generate installers for new releases without modifying the manifest before each release.
