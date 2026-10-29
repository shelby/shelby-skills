---
name: shelby
description: Shelby, a data platform with an S3-compatible API. Use when the user asks about Shelby in general or is starting a Shelby integration, to route to the right Shelby skill.
---

# Shelby

Shelby is a data platform for distributed compute: one place to store and read data from
wherever compute runs, through an S3-compatible API.

## Skill routing

| Need | Skill |
| --- | --- |
| Store, read, list or delete data. Use the AWS CLI, boto3, the AWS SDK for JavaScript, rclone or DuckDB. Migrate from S3, R2 or MinIO. Training data and checkpoints. | `skills/shelby-s3/SKILL.md` |

An MCP server, `@shelby-protocol/mcp`, is on its way. Until it's published, use the S3
API.

## Retired packages

The Shelby SDK, CLI, React hooks and media packages (`@shelby-protocol/sdk`, `cli`,
`react`, `player`, `media-prepare`) are deprecated in favour of the S3 API. Their skills
were removed from this repository. If a user's project still uses them, point them to the
S3 API and [Migrating from S3](https://docs.shelby.xyz/tools/s3-gateway/migrating.md).
