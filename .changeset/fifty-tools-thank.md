---
"@hethon/ingen": minor
---

`min_glibc_version` is now optional in the global configuration.

The per-archive `min_glibc_version` setting remains optional and always overrides the global value. If neither the global nor the per-archive `min_glibc_version` is specified, no minimum glibc version will be enforced for that archive.
