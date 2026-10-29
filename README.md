# shelby-skills

Agent skills for [Shelby](https://shelby.xyz)'s S3-compatible API. They give AI coding
agents (Claude Code, Cursor, Codex and others) what they need to write Shelby code that
works the first time. That includes the places where habits from Amazon S3 break.

## Skills

| Skill | Use it for |
| --- | --- |
| [shelby-s3](skills/shelby-s3/SKILL.md) | Storing and reading data with the AWS CLI, boto3, the AWS SDK for JavaScript, rclone or DuckDB. Migrating from S3, R2 or MinIO. Training data and checkpoints. |

> **Retired:** the `shelby-sdk`, `shelby-cli` and `shelby-media` skills, along with the
> packages they covered, which are deprecated in favour of the S3 API. They're in the
> history at [`1a32c67`](https://github.com/shelby/shelby-skills/tree/1a32c67435a80a669fb259618b29ba4de44955ca).

## Install

Symlink the repository into your Claude Code skills directory:

```bash
ln -s /path/to/shelby-skills ~/.claude/skills/shelby-skills
```

Then invoke the skill as `/shelby-skills:shelby-s3`, or let the agent load it when you
mention Shelby. For other agents, point them at `skills/shelby-s3/SKILL.md`.

## Where the facts come from

The skill's references and its list of S3 habits that break on Shelby are synced from
[shelby-quickstart](https://github.com/shelby/shelby-quickstart). Its examples run against
the hosted endpoint every night. `quickstart.lock` pins the commit they're copied from, and
CI fails if they drift. See [AGENTS.md](AGENTS.md) to update them.

## Releasing

Versions follow semver and are tracked as git tags. Trigger the
[Release workflow](.github/workflows/release.yml) with a bump type, or run
`scripts/release.sh [major|minor|patch]` locally.

## License

See the repository for license details.
