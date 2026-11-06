# AGENTS.md

Agent skills for Shelby's S3-compatible API, packaged as a Claude Code plugin marketplace
with one plugin, `shelby`. One skill today: `skills/shelby`.

## Layout

```
.claude-plugin/               marketplace.json and plugin.json; the version is in plugin.json
skills/shelby/SKILL.md        the skill: connection settings, rules, verification
skills/shelby/references/     one file per client and recipe (synced, see below)
scripts/sync-quickstart.py    copies the synced parts from shelby-quickstart
quickstart.lock               the shelby-quickstart commit they're copied from
.github/workflows/            check (every push and PR), sync (daily pin bump), Release
```

## The synced parts

`skills/shelby/references/*.md`, and the block in `skills/shelby/SKILL.md` between
the `BEGIN SYNC` and `END SYNC` markers, are copied from
[shelby-quickstart](https://github.com/shelby/shelby-quickstart). Its examples run against
the live endpoint in CI, so the facts are checked there. Never edit the synced parts here.

To change them, change the client or recipe README, or `AGENTS.md`, in shelby-quickstart,
and merge it. Once its `verify` workflow passes on that commit, the daily `sync` workflow
here opens a pull request that moves the pin. Review and merge it.

To move the pin by hand, run `python3 scripts/sync-quickstart.py --ref <commit>` and
commit the lock file and the synced files together. Set `QUICKSTART_DIR` to a local clone
to read from it instead of GitHub. Pin only commits whose `verify` run passed.

The `check` workflow runs `python3 scripts/sync-quickstart.py --check`, and fails if a
synced file differs from the pinned commit.

## Writing skill text

- The frontmatter `description` decides when an agent loads a skill. Name the user
  intents and terms that should trigger it.
- Keep `SKILL.md` short. It's loaded whole; references are read on demand.
- State only what the docs or the quickstart's live runs establish. Link the docs' `.md`
  URLs rather than copying them.
- Match the docs' voice: sober and terse.

## Releasing

Installed plugins update only when `version` in `.claude-plugin/plugin.json` changes, so
that version is the release. To release, bump it in a pull request. When it merges, the
Release workflow checks the synced files, tags `v<version>`, and creates a GitHub Release
with generated notes. Changes merged without a bump reach no one until the next release.

Versions follow semver; while they're `0.x`, a breaking change is a minor bump. Keep the
version out of `marketplace.json`: `plugin.json` wins silently.

The `check` workflow also runs `claude plugin validate .`. To try the plugin locally, run
`claude plugin marketplace add ./` and `claude plugin install shelby@shelby-skills`, then
`/reload-plugins` after each edit.
