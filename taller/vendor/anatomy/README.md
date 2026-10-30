# Anatomy kit (vendored)

`iso-kit.mjs` and `lathe.mjs` come unchanged from the Anatomy skill, https://github.com/wheresryan22/anatomy (commit `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`), under its MIT license (`LICENSE`).

`build.mjs` inlines them into `index.html`. For the page only, it swaps two inner helpers for faster versions with the same output (see `FAST` in `build.mjs`); the files here are not modified.
