# Ripgrep Example

This directory contains a sample `ingen` manifest for [ripgrep](https://github.com/BurntSushi/ripgrep), a popular search tool. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory, navigate to this folder and run:

```bash
bun run ingen installer.manifest.json installers
```
