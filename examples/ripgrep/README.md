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

## Try It Out

You can run the generated installers right now directly from this repository to see how they behave:

**Linux / macOS:**
```bash
curl --proto '=https' --tlsv1.2 -fsSL https://raw.githubusercontent.com/hethon/ingen/refs/heads/master/examples/ripgrep/installers/installer.sh | sh
```

**Windows (PowerShell):**
```ps
irm https://raw.githubusercontent.com/hethon/ingen/refs/heads/master/examples/ripgrep/installers/installer.ps1 | iex
```
