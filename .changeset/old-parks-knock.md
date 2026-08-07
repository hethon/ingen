---
"ingen-cli": minor
---

Removed the `--app-version` flag from the `ingen generate` command.

The `generate` command is now strictly responsible for building scripts based exactly on the manifest file on disk. To update your installers for a new release, you should now update the `app_version` field directly in your `installer.manifest.json`.
