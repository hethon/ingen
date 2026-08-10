# Vendored Templates

This directory contains the installation scripts (`installer.sh.j2` and `installer.ps1.j2`) from the [cargo-dist](https://github.com/axodotdev/cargo-dist) project.

`ingen` modifies these templates for its own use. The unmodified upstream templates are kept on the [`vendor/cargo-dist`](https://github.com/hethon/ingen/tree/vendor/cargo-dist) branch. The modified versions are here on `master`.

## Auditing Changes

To see all changes made to the upstream templates:

```bash
git diff vendor/cargo-dist..master -- templates/
```

The `vendor/cargo-dist` branch is intended to contain the unmodified upstream templates. You can verify this by comparing the files in that branch with the corresponding files from the `cargo-dist` `v0.32.0` release:

```bash
git --no-pager diff --no-index \
  <(curl -fsSL 'https://raw.githubusercontent.com/axodotdev/cargo-dist/refs/tags/v0.32.0/cargo-dist/templates/installer/installer.sh.j2') \
  <(curl -fsSL 'https://raw.githubusercontent.com/hethon/ingen/refs/heads/vendor/cargo-dist/templates/installer.sh.j2')
```

```bash
git --no-pager diff --no-index \
  <(curl -fsSL 'https://raw.githubusercontent.com/axodotdev/cargo-dist/refs/tags/v0.32.0/cargo-dist/templates/installer/installer.ps1.j2') \
  <(curl -fsSL 'https://raw.githubusercontent.com/hethon/ingen/refs/heads/vendor/cargo-dist/templates/installer.ps1.j2')
```

If these commands produce no output, the files are identical to the upstream `v0.32.0` versions.

## Applied Patches

### [2026-08-01] Support flat and wrapped archives

**Commit:** 3bb351b

Upstream `cargo-dist` assumed:

* `.zip` archives are flat and should be extracted as-is.
* `.tar.*` archives have one top-level directory, which is always stripped with `--strip-components 1`.

This patch adds `zip_depth` to the archive metadata and uses it when extracting both archive formats.

For `.zip` archives:

* `zip_depth = 0` keeps the existing flat archive behavior.
* `zip_depth = 1` expects exactly one top-level directory, then moves its contents into the extraction directory.

For `.tar.*` archives, `zip_depth` replaces the hardcoded `--strip-components 1`, allowing the number of stripped directory levels to be configured.

The change is applied to both `installer.sh.j2` and `installer.ps1.j2`.

To see the exact diff:

```bash
git diff vendor/cargo-dist..3bb351b -- templates/
```

---

## Updating Upstream

When updating to a new `cargo-dist` release:

### 1. Create the vendor worktree

Create it outside the project root:

```bash
git worktree add ../vendor/cargo-dist vendor/cargo-dist
```

### 2. Update the version

On `master`, update the `"ref"` field in `scripts/vendor.json`:

```json
"ref": "v0.33.0"
```

### 3. Download the upstream files

Run:

```bash
bun run update-vendor
```

The script downloads the upstream files and saves them to the vendor worktree.

### 4. Commit the vendor branch

Follow the instructions printed by the script and commit the unmodified upstream files on the `vendor/cargo-dist` branch.

### 5. Merge into master

Switch back to `master` and run:

```bash
git merge vendor/cargo-dist
```

Git will merge the new upstream changes with the changes on `master`.

If upstream changed the same lines as one of our patches, Git will report a merge conflict that needs to be resolved manually.
