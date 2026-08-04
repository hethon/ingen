---
"@hethon/ingen": minor
---

Move `platform_support.archives` to a top-level `archives` field.

The new layout better reflects what the manifest describes: the release archives published by the project. Platform compatibility continues to be computed by `ingen` from the target specified for each archive.
