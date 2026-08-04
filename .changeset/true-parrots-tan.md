---
"@hethon/ingen": minor
---

Simplify checksum configuration by combining the checksum style and value.

The `checksum_style` field has been removed. Checksums are now specified as a single string using the format `<algorithm>:<digest>` (for example, `sha256:abc123...`).

This removes duplicated checksum metadata and keeps the algorithm and digest together as a single value.
