# Ripgrep Example

This directory contains a sample `ingen` manifest for [ripgrep](https://github.com/BurntSushi/ripgrep), a popular search tool. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory, navigate to this folder and run:

```bash
bun run ingen installer.manifest.json installers
```

## Known Issues

- **`installer.sh` (Linux/macOS)**: Works perfectly. It correctly handles `tar.gz` archives where the contents are wrapped in a root folder.
- **`installer.ps1` (Windows)**: Currently fails to install. Ripgrep packages its Windows `.zip` files with a root directory wrapper, but the current version of our vendored PowerShell template expects a flat archive where the executable is at the root. *A patch for the PowerShell template is planned to resolve this.*
