# Biber Example

This directory contains a sample `ingen` manifest for [biber-bin](https://github.com/hethon/biber-bin), a fork of [biber](https://github.com/plk/biber), the backend processor for BibLaTeX, that republishes biber's binaries to github release so that `ingen` can produce installers in for this example.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## Updating to a New Version

`biber-bin` releases a new version, updating the installers is a quick two-step process:

```sh
ingen sync installer.manifest.json --app-version <new-version>
ingen generate installer.manifest.json ./installers
```

## Try It Out

You can run the generated installers right now directly from this repository to see how they behave:

**Linux / macOS:**
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://raw.githubusercontent.com/hethon/ingen/master/examples/biber/installers/installer.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/hethon/ingen/master/examples/biber/installers/installer.ps1 | iex"
```
