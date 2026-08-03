---
"@hethon/ingen": minor
---

Support the `{version}` placeholder in archive filenames.

Archive identifiers can now use the `{version}` template variable instead of hardcoding a release version. During generation, `ingen` substitutes the placeholder with the version supplied by the `version` field.

This makes manifests largely release-independent and reduces the amount of information that needs to be updated for each release.
