---
"ingen-cli": minor
---

Remove the `hosting` field from the manifest.

`ingen` now derives the GitHub artifact download path from the `owner`, `repo`, and `tag` fields. Existing manifests no longer need to specify `hosting.github.artifact_download_path`, reducing duplication and simplifying the manifest.
