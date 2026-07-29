# Caddy Example

This directory contains a sample `ingen` manifest for [Caddy](https://github.com/caddyserver/caddy), a popular web server written in Go. It demonstrates how to map a non-Rust project's build artifacts into standard target triples to generate installation scripts.

## Generating the Installers

To regenerate the scripts in the `installers/` directory, navigate to this folder and run:

```bash
bun run ingen installer.manifest.json installers
```

## Manifest Design Notes

- **Statically Linked Linux Binaries:** Caddy builds its Linux binaries with `CGO_ENABLED=0`, meaning they contain absolutely no external dependencies (not even `libc`). Because they are fully static, they are mapped to the `-musl` triple (e.g., `x86_64-unknown-linux-musl`) rather than `-gnu`. This ensures the installer scripts correctly recognize them as portable across any Linux distribution.

- **Windows Mapping:** Go doesn't natively differentiate between `msvc` and `gnu` builds. We mapped the Windows artifacts to `-msvc` as it is the default convention expected by the installer script's fallback hierarchy.

## Known Issues

- **Flat `tar.gz` Archives:** Caddy's `.tar.gz` files are packaged "flat" (the executable sits at the root of the archive rather than inside a wrapper directory). The current `installer.sh.j2` template may attempt to strip a wrapper directory when unpacking. *A future patch will add a configuration option to handle flat archives.*

- **Unreachable Targets:** We included Caddy's `armv5` and `FreeBSD+ARM` binaries in the manifest for completeness. However, the OS/architecture detection logic in the underlying `installer.sh.j2` template does not currently recognize these specific environments, making these specific binaries practically unreachable for end-users running the script.
