# AGENTS.md

Agent skills for Shelby's S3-compatible API. One skill today: `skills/shelby-s3`. The root
`SKILL.md` routes to it.

## Layout

```
SKILL.md                      router: which Shelby skill to load
skills/shelby-s3/SKILL.md     the skill: connection settings, rules, verification
skills/shelby-s3/references/  one file per client and recipe (synced, see below)
scripts/sync-quickstart.py    copies the synced parts from shelby-quickstart
quickstart.lock               the shelby-quickstart commit they're copied from
```

## The synced parts

`skills/shelby-s3/references/*.md`, and the block in `skills/shelby-s3/SKILL.md` between
the `BEGIN SYNC` and `END SYNC` markers, are copied from
[shelby-quickstart](https://github.com/shelby/shelby-quickstart). Its examples run against
the live endpoint in CI, so the facts are checked there. Never edit the synced parts here.

To change them:

1. Change the client or recipe README, or `AGENTS.md`, in shelby-quickstart, and merge it.
2. Here, move the pin and sync: `python3 scripts/sync-quickstart.py --ref <commit>`. Set
   `QUICKSTART_DIR` to a local clone to read from it instead of GitHub.
3. Commit the lock file and the synced files together.

CI runs `python3 scripts/sync-quickstart.py --check`, and fails if a synced file differs
from the pinned commit.

## Writing skill text

- The frontmatter `description` decides when an agent loads a skill. Name the user
  intents and terms that should trigger it.
- Keep `SKILL.md` short. It's loaded whole; references are read on demand.
- State only what the docs or the quickstart's live runs establish. Link the docs' `.md`
  URLs rather than copying them.
- Match the docs' voice: sober and terse.

## Releasing

Trigger the Release workflow in GitHub Actions, or run `scripts/release.sh
[major|minor|patch]`. Either one tags a version and creates a GitHub Release.
