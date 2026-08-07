# ingen-cli

## 0.3.0

### Minor Changes

- [#1](https://github.com/hethon/ingen/pull/1) [`666e857`](https://github.com/hethon/ingen/commit/666e85757fc6f60c458b00ff1769c6008a53ea74) - Added the `ingen sync` command.

  You can now run `ingen sync <manifest>` to automatically fetch asset checksums from your GitHub release and inject them directly into your manifest file. It safely edits the file in-place to preserve your formatting and comments, and supports using a `GITHUB_TOKEN` environment variable for private repositories or avoiding rate limits.

- [`9e2db22`](https://github.com/hethon/ingen/commit/9e2db221d32af231f52d0430458c1a0e9eb268bc) - Remove the `hosting` field from the manifest.

  `ingen` now derives the GitHub artifact download path from the `owner`, `repo`, and `tag` fields. New manifests no longer need to specify `hosting.github.artifact_download_path`, reducing duplication and simplifying the manifest.

- [`866ac40`](https://github.com/hethon/ingen/commit/866ac40c0fa292f95d7d4d005e1575741bafa48a) - The npm package has been renamed from `@hethon/ingen` to `ingen-cli`.

  To upgrade, uninstall `@hethon/ingen` and install `ingen-cli` instead.

- [`18954c2`](https://github.com/hethon/ingen/commit/18954c25ff132d12baf85d508309d4374776fd58) - Simplify checksum configuration by combining the checksum style and value.

  The `checksum_style` field has been removed. Checksums are now specified as a single string using the format `<algorithm>:<digest>` (for example, `sha256:abc123...`).

  This removes duplicated checksum metadata and keeps the algorithm and digest together as a single value.

### Patch Changes

- [`290f8ab`](https://github.com/hethon/ingen/commit/290f8abe5bb9385589b74140cf44ed444052d22f) - Fixed an issue where valid CLI invocations such as `--help` could incorrectly be reported as unknown or missing commands.

## 0.2.0

### Minor Changes

- [`e72878b`](https://github.com/hethon/ingen/commit/e72878b1dcefa9f9a2f5d7368ec2d2a48ccc3b54) - Add a dedicated `generate` subcommand.

  Installer generation now uses `ingen generate`. This provides a clearer CLI structure and leaves room for future commands.

- [`5ff3dd7`](https://github.com/hethon/ingen/commit/5ff3dd7720cee51e2a58a68698be3eb8d4e9e5dc) - Add `--app-version` support to `ingen generate`.

  CI pipelines can now provide the application version at generation time without modifying the manifest for each release.

- [`a1c5e25`](https://github.com/hethon/ingen/commit/a1c5e25d6be7bdfcad0d7234cc41f6f0820db237) - Rename the manifest `version` field to `app_version`.

  Update existing manifests to use `app_version`. Archive filenames can now reference the application version using the `{app_version}` placeholder, making manifests reusable across releases.

- [`dd438b5`](https://github.com/hethon/ingen/commit/dd438b528577b06b88030ab0027fdd220d7c1919) - Simplify the manifest archive configuration.

  Move `platform_support.archives` to the top-level `archives` field. This better reflects that manifests describe published release archives rather than platform compatibility rules.

- [`8bbfa59`](https://github.com/hethon/ingen/commit/8bbfa59e09dd5d3c791406d6db635a8d7e7f98a0) - Rename the archive `target_triple` field to `target`.

  Update existing manifests to use `target`. Values continue to use target triples for identifying supported platforms.

- [`44602a9`](https://github.com/hethon/ingen/commit/44602a97d66f41f3633cdee0f8ed741a912933c1) - Make global `min_glibc_version` optional.

  Archives without a global or per-archive `min_glibc_version` no longer enforce a minimum glibc version.

- [`d2dea05`](https://github.com/hethon/ingen/commit/d2dea05b888b554d68f8f1e7b5dce97dd8917b65) - Improve editor validation for `install_paths`.

  The generated JSON Schema now includes `install_paths` validation rules, allowing editors with JSON Schema support to detect invalid values while editing manifests.

## 0.1.2

### Patch Changes

- f9dad26: Ensure the package is built before publishing.

## 0.1.1

### Patch Changes

- e490204: Fix generated manifest to match the latest schema.

## 0.1.0

### Minor Changes

- 2b178b7: Initial release
