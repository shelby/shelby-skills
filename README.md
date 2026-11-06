# shelby-skills

Agent skills for [Shelby](https://shelby.xyz)'s S3-compatible API. They give AI coding
agents (Claude Code, Cursor, Codex and others) what they need to write Shelby code that
works the first time, including the places where Shelby still differs from Amazon S3.

## Skills

| Skill | Use it for |
| --- | --- |
| [shelby](skills/shelby/SKILL.md) | Storing and reading data with the AWS CLI, boto3, the AWS SDK for JavaScript, rclone or DuckDB. Migrating from S3, R2 or MinIO. Training data and checkpoints. Download links to files and folders. |

## Install

In Claude Code, add this repository as a plugin marketplace and install the plugin:

```
/plugin marketplace add shelby/shelby-skills
/plugin install shelby@shelby-skills
```

The agent loads the skill when you mention Shelby, or you can invoke it as
`/shelby:shelby`. To get new releases automatically, turn on auto-update for the
`shelby-skills` marketplace under `/plugin` > Marketplaces.

For other agents, copy `skills/shelby` into the agent's skills directory, or point the
agent at `skills/shelby/SKILL.md`.

## Where the facts come from

The skill's references and its list of differences from S3 aren't written here. They're
copied from [shelby-quickstart](https://github.com/shelby/shelby-quickstart), whose
examples run against the hosted endpoint on every change and every night, so the skill
only states what a live run has shown.

| Synced here | Copied from shelby-quickstart |
| --- | --- |
| The block between `BEGIN SYNC` and `END SYNC` in `skills/shelby/SKILL.md` | The "Where Shelby differs from Amazon S3" section of `AGENTS.md` |
| `skills/shelby/references/*.md` | The client and recipe READMEs listed in `scripts/sync-quickstart.py` |

A change reaches people who have the plugin installed in four steps:

1. **Change shelby-quickstart.** Edit the README or `AGENTS.md` there, never the synced
   copies here, and merge it. Its `verify` workflow runs every example against the hosted
   endpoint.
2. **Move the pin.** `quickstart.lock` names the quickstart commit the synced files come
   from. Each day the [sync workflow](.github/workflows/sync.yml) opens a pull request that
   moves it to the newest commit on the quickstart's main whose `verify` run passed. Review
   and merge it. To move it by hand, run `python3 scripts/sync-quickstart.py --ref <commit>`
   and commit the lock file with the synced files.
3. **Release.** A merged sync reaches no one yet: bump the version in
   `.claude-plugin/plugin.json`, as described under [Releasing](#releasing).
4. **Plugins update.** The Release workflow tags `v<version>`, and Claude Code installs it
   for anyone with auto-update on.

CI runs `python3 scripts/sync-quickstart.py --check` and fails if a synced file differs
from the pinned commit. The sync finds the differences list by its heading, so a change
that renames that section in the quickstart also needs `HABITS` in
`scripts/sync-quickstart.py` updated. See [AGENTS.md](AGENTS.md) for the details.

## Releasing

The version in `.claude-plugin/plugin.json` is the release: installed plugins update only
when it changes. Bump it in a pull request, following semver. When it merges, the
[Release workflow](.github/workflows/release.yml) tags `v<version>` and creates a GitHub
Release.

## License

See the repository for license details.
