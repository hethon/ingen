# Caddy Example

This directory contains a sample `ingen` manifest for [Caddy](https://github.com/caddyserver/caddy), a popular web server written in Go. It demonstrates how to map a non-Rust project's build artifacts into standard target triples to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory using the provided manifest, run:

```bash
ingen generate installer.manifest.json ./installers
```

## The `ingen` Workflow

If you were creating this manifest from scratch, the workflow would look like this:

1. **Initialize:** Run `ingen init` to generate a boilerplate `installer.manifest.json`. It includes a `$schema` link for instant IDE autocomplete and validation.
2. **Configure:** Edit the manifest to define the app information and archive targets. You can safely leave the `checksum` fields completely empty.
3. **Sync Checksums:** Run `ingen sync installer.manifest.json`. The CLI queries the GitHub API, streams the release assets, and automatically injects the SHA-256 checksums into the file without destroying your formatting.
4. **Generate:** Run `ingen generate ...` to build the final shell and PowerShell scripts.

## Manifest Design Notes

- **Statically Linked Linux Binaries:** Caddy builds its Linux binaries with `CGO_ENABLED=0`, meaning they contain absolutely no external dependencies (not even `libc`). Because they are fully static, they are mapped to the `-musl` triple (e.g., `x86_64-unknown-linux-musl`) rather than `-gnu`. This ensures the installer scripts correctly recognize them as portable across any Linux distribution.

- **Windows Mapping:** Go doesn't natively differentiate between `msvc` and `gnu` builds. We mapped the Windows artifacts to `-msvc` as it is the default convention expected by the installer script's fallback hierarchy.

## Known Issues

- **Unreachable Targets:** We included Caddy's `armv5` and `FreeBSD+ARM` binaries in the manifest for completeness. However, the OS/architecture detection logic in the underlying `installer.sh.j2` template does not currently recognize these specific environments, making these specific binaries practically unreachable for end-users running the script.
