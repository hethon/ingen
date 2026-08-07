# Ripgrep Example

This directory contains a sample `ingen` manifest for [ripgrep](https://github.com/BurntSushi/ripgrep), a popular search tool. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## Updating to a New Version

When a new version of Ripgrep is released, updating the installers is a quick two-step process:

```sh
ingen sync installer.manifest.json --app-version <new-version>
ingen generate installer.manifest.json ./installers
```
