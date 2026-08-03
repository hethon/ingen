# Ingen (In<sub>staller</sub> Gen<sub>erator</sub>)

Generate `curl | sh` and `irm | iex` installers for your project's binary releases.

`ingen` takes a small JSON manifest describing your release artifacts and generates portable shell and PowerShell installers.

## Why?

One-line installers (`curl | sh` and `irm | iex`) provide a great installation experience for users, but writing and maintaining portable shell and PowerShell installers is surprisingly involved.

While exploring how to add this kind of installer to a project, I discovered [dist](https://github.com/axodotdev/cargo-dist), a distribution automation tool that generates high-quality shell and PowerShell installers while also building, packaging, and publishing software.

`dist` solves a broader problem than the one I was trying to solve. It provides an opinionated, end-to-end release pipeline that automates building, packaging, publishing, and installer generation. For many projects, that's exactly the right solution.

`ingen` is for the cases where you only want the installer generation. You describe the release artifacts you already produce, and `ingen` generates the same style of shell and PowerShell installers without taking over the rest of your release process.

## Quick start

Initialize a new manifest:

```sh
ingen init
```

This creates an `installer.manifest.json` with valid placeholders and a `$schema` reference. Most editors will automatically pick up the schema and provide validation, field suggestions, and documentation as you edit.

Edit the manifest to describe your project's release artifacts, then generate installers:

```sh
ingen installer.manifest.json ./dist
```

This produces:

* `dist/installer.sh`
* `dist/installer.ps1`

Upload both files to any location accessible over HTTPS (for example, as assets on a GitHub release), then link to them from your documentation:

```sh
curl --proto '=https' --tlsv1.2 -LsSf https://example.com/installer.sh | sh
```
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://example.com/installer.ps1 | iex"
```

## Examples

The [`examples/`](./examples) directory contains complete manifests for real-world projects.

In particular, [`examples/caddy`](./examples/caddy) demonstrates how a Go project maps its release artifacts to Rust target triples, which `ingen` uses to identify supported platforms.

## Acknowledgements

`ingen` builds on ideas and engineering from the [dist](https://github.com/axodotdev/cargo-dist) project.

In particular, it [vendors](https://github.com/hethon/ingen/tree/vendor/cargo-dist) `dist`'s installer templates and [ports](https://github.com/hethon/ingen/blob/master/src/manifest-parser/platforms.ts) its platform compatibility logic.
