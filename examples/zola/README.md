# Zola Example

This directory contains a sample `ingen` manifest for [Zola](https://github.com/getzola/zola), a fast static site generator. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## Updating to a New Version

When a new version of Zola is released, updating the installers is a quick two-step process:

```sh
ingen sync installer.manifest.json --app-version <new-version>
ingen generate installer.manifest.json ./installers
```

## Try It Out

You can run the generated installers right now directly from this repository to see how they behave:

**Linux / macOS:**
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://raw.githubusercontent.com/hethon/ingen/master/examples/zola/installers/installer.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/hethon/ingen/master/examples/zola/installers/installer.ps1 | iex"
```
