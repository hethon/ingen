# Badness Example

This directory contains a sample `ingen` manifest for [Badness](https://github.com/jolars/badness), LaTeX language server, formatter, and linter. It demonstrates how to configure a real-world project to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## Updating to a New Version

When a new version of Badness is released, updating the installers is a quick two-step process:

```sh
ingen sync installer.manifest.json --app-version <new-version>
ingen generate installer.manifest.json ./installers
```

## Try It Out

You can run the generated installers right now directly from this repository to see how they behave:

**Linux / macOS:**
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://raw.githubusercontent.com/hethon/ingen/master/examples/badness/installers/installer.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/hethon/ingen/master/examples/badness/installers/installer.ps1 | iex"
```
