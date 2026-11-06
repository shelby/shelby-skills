---
name: shelby
description: Store and read data on Shelby, a data platform with an S3-compatible API, using the AWS CLI, boto3, the AWS SDK for JavaScript, rclone, DuckDB or another S3 client. Use when the user mentions Shelby or s3.beta.shelby.xyz, asks about Shelby in general, is starting a Shelby integration, wants to add Shelby storage to a project, migrate S3, R2 or MinIO code or data to Shelby, train or query on data stored in Shelby, or is debugging a Shelby S3 error.
---

# Shelby

Shelby is a data platform for distributed compute: one place to store and read data from
wherever compute runs, through an S3-compatible API. Code written for Amazon S3 works with
Shelby after a configuration change, except where the rules below say otherwise. Apply
them while writing the code, not after it fails.

For an agent that reads and writes a bucket itself, with no integration code, Shelby has
an MCP server, `@shelby-protocol/mcp`. It authenticates with an agent key
(`shelbyagent_…`), not the S3 keys below. Set it up from
<https://docs.shelby.xyz/tools/mcp.md>.

## Connect

| Setting | Value |
| --- | --- |
| Endpoint | `https://s3.beta.shelby.xyz` |
| Access key ID | `SHELBY_ACCESS_KEY_ID`, which starts with `SHLB` |
| Secret access key | `SHELBY_SECRET_ACCESS_KEY`: the value the console calls the API key |
| Bucket | `SHELBY_BUCKET`: the account's one bucket, for example `shelby-managed-account-1` |
| Region | `default` |
| Addressing | Path-style |

Only the user can get these values, at <https://console.shelby.xyz>. Ask for them. Never
invent, print, log or commit them; read them from the environment in code.

## Pick a client

| The user's stack | Read |
| --- | --- |
| The AWS CLI, shell scripts | [references/aws-cli.md](references/aws-cli.md) |
| Python, boto3, anything on botocore | [references/python.md](references/python.md) |
| Node.js or TypeScript with the AWS SDK v3 | [references/javascript.md](references/javascript.md) |
| Copying or syncing directories | [references/rclone.md](references/rclone.md) |
| SQL over Parquet or CSV | [references/duckdb.md](references/duckdb.md) |
| Moving existing data from S3, R2 or MinIO | [references/migrate-from-s3.md](references/migrate-from-s3.md) |
| PyTorch training data and checkpoints | [references/ml-training.md](references/ml-training.md) |

Each reference has the exact client settings, under "Use it in your project", and that
client's differences from S3. Its "Run it" section is about the runnable example in
[shelby-quickstart](https://github.com/shelby/shelby-quickstart).

Other S3 clients usually work if they support path-style addressing and can upload
without `aws-chunked` checksums. Check the compatibility page before relying on one:
<https://docs.shelby.xyz/tools/s3-gateway/compatibility.md>

## Where Shelby differs from S3

<!-- BEGIN SYNC: shelby-quickstart AGENTS.md. Run scripts/sync-quickstart.py, don't edit. -->
Shelby's API is S3-compatible, so standard S3 clients and code work against it. A few
behaviours don't match Amazon S3 yet. These rules cover them:

- Use the access key ID (`SHLB…`) and the secret as two different values. Never put the
  API key in both fields; older docs did.
- Set the region to `default` and use path-style addressing. Don't discover the region
  with `GetBucketLocation`.
- There is exactly one bucket per account, with a fixed name. Never create, delete or
  rename buckets. Use key prefixes instead.
- Set `request_checksum_calculation` to `when_required` for the AWS CLI and boto3.
  Without it, uploads fail with `501 NotImplemented`.
- Listings lag writes by a few seconds; reads don't. Confirm a write with GET or HEAD,
  track the keys you wrote, and never treat a missing listing entry as a failed upload.
- Retry `503` on reads with backoff. A read just after a write or delete can briefly get
  one. AWS SDKs retry it by default.
- Never use `CopyObject`, `aws s3 mv` or `s3.copy`. There's no server-side copy, so
  download and upload again.
- Presigned URLs are read-only. Sign GET or HEAD for one object, on a server, with
  region `default`, for at most 7 days. Treat the URL as a password: never log it.
  Never presign uploads, deletes or listings, and never upload from a browser. CORS
  isn't configurable, so use presigned URLs as links and media sources, not `fetch()`.
- In the AWS SDK for JavaScript, delete one key at a time. `DeleteObjectsCommand` fails
  and deletes nothing. boto3's `delete_objects` and the AWS CLI's `delete-objects` work.
- In the AWS SDK for JavaScript, set `responseChecksumValidation: "WHEN_REQUIRED"` on the
  client. Without it, presigned GET URLs fail with `501 NotImplemented`.
- Treat a JavaScript SDK "XML parse error" as a `401`. Authentication errors are plain
  text, not S3 XML.
- Keep list page sizes at 1,000 or less. Larger values are rejected, not capped.
- Choose a part size for the 3,000-part limit. At 8 MiB parts, files over about 23 GiB
  fail partway.
- In rclone, always pass `--checksum` to `copy` and `sync`.
- Keep `x-amz-meta-*` under 2 KB.

Full list, with every S3 feature: <https://docs.shelby.xyz/tools/s3-gateway/compatibility.md>
<!-- END SYNC -->

## Design around these

- **`If-Match` on writes isn't enforced yet.** Don't rely on it for optimistic
  concurrency. Create-only writes with `If-None-Match: *` are enforced.
- **No lifecycle rules, versioning or bucket policies.** Delete old objects explicitly,
  and write each version to its own key.

When moving existing S3 code, check it against the migration table:
<https://docs.shelby.xyz/tools/s3-gateway/migrating.md>

## Verify

1. Clone [shelby-quickstart](https://github.com/shelby/shelby-quickstart), put the three
   values in its `.env`, and run `make doctor`. It checks credentials, bucket, clock and
   tools without writing anything, and names the fix for each `401`.
2. Run the matching example, for example `make python`. Each one writes only under
   `quickstart/<example>/<run-id>/`, checks every step, and deletes what it wrote.
3. Run the user's own code against a scratch prefix before it touches real data.

## When a request fails

- **`401` with no S3 error code,** or an XML parse error in JavaScript: a credentials
  problem. The message is plain text. Run `make doctor`, or see the authentication table
  at <https://docs.shelby.xyz/tools/s3-gateway/troubleshooting.md>.
- **`501 NotImplemented`:** `aws-chunked` uploads (set `request_checksum_calculation`) or
  server-side copy.
- **Anything else:** <https://docs.shelby.xyz/tools/s3-gateway/troubleshooting.md>

## Docs

All of Shelby's docs as Markdown: <https://docs.shelby.xyz/llms-full.txt>. Append `.md` to
any docs URL for a single page.
