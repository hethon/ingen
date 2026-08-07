# Ripgrep Example

This directory contains a sample `ingen` manifest for [ripgrep](https://github.com/BurntSushi/ripgrep), a popular search tool. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## The `ingen` Workflow

If you were creating this manifest from scratch, the workflow would look like this:

1. **Initialize:** Run `ingen init` to generate a boilerplate `installer.manifest.json`. It includes a `$schema` link for instant IDE autocomplete and validation.
2. **Configure:** Edit the manifest to define the app information and archive targets. You can safely leave the `checksum` fields completely empty.
3. **Sync Checksums:** Run `ingen sync installer.manifest.json`. The CLI queries the GitHub API, streams the release assets, and automatically injects the SHA-256 checksums into the file.
4. **Generate:** Run `ingen generate installer.manifest.json` to build the final shell and PowerShell scripts.
