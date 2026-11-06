# shelby-skills

Agent skills for [Shelby](https://shelby.xyz)'s S3-compatible API. They give AI coding
agents (Claude Code, Cursor, Codex and others) what they need to write Shelby code that
works the first time, including the places where Shelby still differs from Amazon S3.

## Skills

| Skill | Use it for |
| --- | --- |
| [shelby](skills/shelby/SKILL.md) | Storing and reading data with the AWS CLI, boto3, the AWS SDK for JavaScript, rclone or DuckDB. Migrating from S3, R2 or MinIO. Training data and checkpoints. |

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

The skill's references and its list of differences from S3 are synced from
[shelby-quickstart](https://github.com/shelby/shelby-quickstart). Its examples run against
the hosted endpoint on every change and every night. `quickstart.lock` pins the commit
they're copied from, a daily workflow proposes moving it to the newest commit whose live
run passed, and CI fails if the synced files drift. See [AGENTS.md](AGENTS.md).

## Releasing

The version in `.claude-plugin/plugin.json` is the release: installed plugins update only
when it changes. Bump it in a pull request, following semver. When it merges, the
[Release workflow](.github/workflows/release.yml) tags `v<version>` and creates a GitHub
Release.

## License

See the repository for license details.
