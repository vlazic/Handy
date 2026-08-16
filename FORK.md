# About this fork

This is [vlazic](https://github.com/vlazic)'s personal fork of
[cjpais/Handy](https://github.com/cjpais/Handy). Upstream is under a feature
freeze (new features need community support in
[Discussions](https://github.com/cjpais/Handy/discussions) before a PR — see
[AGENTS.md](./AGENTS.md)), so feature work lives here until it can be proposed
upstream.

## Changes vs upstream

- **Cloud STT providers** (Groq preset + any OpenAI-compatible endpoint).
  Configured providers surface their models as regular entries in the model
  selector (`cloud/<provider>/<model>`), switchable one click alongside local
  models. Implementation: virtual registry entries derived from settings
  (`src-tauri/src/managers/model/remote.rs`), an HTTP client
  (`src-tauri/src/stt_client.rs`), an async routing seam
  (`TranscriptionManager::transcribe_async`), a Cloud transcription section on
  the Models settings page, i18n keys across all 25 locales. Audio and the
  custom-words list (sent as a transcription hint) go to the provider; API
  keys are stored locally in plain text — both disclosed in the UI.
- **ydotool paste fix (Linux)**: when the direct-typing tool resolves to
  ydotool and the transcription contains non-ASCII text (e.g. š, đ, č, ć, ž),
  paste routes through the clipboard + Ctrl+V instead of being silently
  truncated at the first unmappable character.
- **Updater neutralized**: the update endpoint points at this repo (which
  publishes no releases) and update checks default to off, so an installed
  fork build can never be silently replaced by an upstream release.
- **Versioning**: `X.Y.Z+fork.N` — upstream version plus a fork suffix. The
  `+fork.N` build metadata sorts above upstream's `X.Y.Z` in Debian version
  ordering, so installing the fork `.deb` over an upstream install is a clean
  upgrade. On each upstream sync the base version follows upstream and `N`
  resets to 1; fork-only releases between syncs increment `N`. (Note: Windows
  MSI rejects build metadata in versions — irrelevant for Linux builds.)

## Install (Linux, from source)

```bash
git clone git@github.com:vlazic/Handy.git && cd Handy   # default branch: fork
bun install
bun run tauri build -- --bundles deb
sudo apt install ./src-tauri/target/release/bundle/deb/Handy_*_amd64.deb
```

The installed package needs no `LD_LIBRARY_PATH` (the binary carries an rpath
to `/usr/lib/Handy` where the bundled inference libraries land). The raw
`target/release/handy` binary cannot run standalone — install the deb. See
[BUILD.md](./BUILD.md) for build prerequisites per distro.

## Branch model

- **`main`** — pristine mirror of `upstream/main` (cjpais/Handy). Never
  commit here; it must always fast-forward.
- **`fork`** — the integration branch (default): `main` + fork commits. This
  is what gets built and installed.
- **`feat/*`** — frozen feature anchors kept for future upstream PRs
  (e.g. `feat/cloud-stt-providers`).

## Syncing with upstream

```bash
git fetch upstream
git checkout main && git merge --ff-only upstream/main && git push origin main
git checkout fork && git merge main
# resolve conflicts, then sanity-check:
cargo check --manifest-path src-tauri/Cargo.toml && bun run build
# if upstream's version changed, re-suffix: e.g. 0.9.6 -> 0.9.6+fork.1
#   (src-tauri/tauri.conf.json, package.json, src-tauri/Cargo.toml)
git push origin fork
```

Conflict hotspots: `src-tauri/src/settings.rs`,
`src-tauri/src/managers/transcription.rs`, `src-tauri/src/managers/model.rs`,
`src-tauri/src/clipboard.rs`, and `src/i18n/locales/*/translation.json`. The
fork's i18n keys are purely additive — resolve locale conflicts by taking the
union of both sides. `git config merge.conflictStyle zdiff3` helps.

Rebuild and reinstall (Install section above) whenever a sync touches Rust or
frontend code.

## Upstreaming a feature

1. Open a GitHub Discussion on cjpais/Handy describing the feature (required
   by the upstream feature freeze).
2. If there's support: `git checkout -b pr/<feature> main`, cherry-pick the
   relevant commits from `fork`, drop fork-only bits (updater changes, version
   suffix, FORK.md/README banner), and open the PR following upstream's
   [PULL_REQUEST_TEMPLATE](.github/PULL_REQUEST_TEMPLATE.md).

## Roadmap

- **OpenAI preset**: add OpenAI to the default STT providers
  (`https://api.openai.com/v1`; `gpt-4o-transcribe`,
  `gpt-4o-mini-transcribe`, `whisper-1`). The existing settings migration
  injects new default providers into live installs automatically.
- **Self-hosted Whisper on the home GPU box**: run
  [speaches](https://github.com/speaches-ai/speaches) (faster-whisper) with
  CUDA in Docker on the desktop, exposed over Tailscale; consume it from the
  laptop via the existing custom provider (base URL
  `http://<tailscale-host>:8000/v1`) — no code needed. Promote to a preset if
  it proves out.
- **Provider fallback chain** (LAN GPU first, cloud when unreachable). This
  partially reverses the fork's deliberate "error-only, no fallback" decision,
  so it stays opt-in and explicit: a per-provider
  `fallback_provider_model` (single hop), triggered only on connectivity
  errors (connect timeout / DNS / refused) — never on HTTP 4xx, which must
  surface. The UI/history must show which provider actually transcribed.
  Build after the self-hosted server proves the need.
