---
name: shelby-storage
description: Interact with Shelby Protocol decentralized blob storage on Aptos. Upload, download, list, and manage blobs via Shelby CLI. Use when the user mentions Shelby, blob storage, decentralized storage on Aptos, or wants to upload/download files to/from the Shelby network.
author: Jasekeee
version: 1.0.0
license: MIT
tags: [shelby, aptos, blob-storage, decentralized, web3, ai-data]
---

# Shelby Protocol Storage Skill

Interact with Shelby Protocol — decentralized hot storage on Aptos. Upload files, download blobs, manage storage accounts, and run benchmarks.

## Prerequisites

- Node.js >= v22.0.0
- Shelby CLI: `npm install -g @shelby-protocol/cli`
- Initialized config: `shelby init` (creates `~/.shelby/config.yaml`)
- Funded account on shelbynet or testnet (run `shelby faucet` to open the faucet page)
- Optional but recommended: API key from https://geomi.dev to avoid rate limits

## Networks

| Network | Aptos RPC | Shelby RPC | Status |
|---------|-----------|------------|--------|
| shelbynet | https://api.shelbynet.shelby.xyz/v1 | https://api.shelbynet.shelby.xyz/shelby | Developer prototype (wiped weekly) |
| testnet | https://api.testnet.aptoslabs.com/v1 | https://api.testnet.shelby.xyz/shelby | Early Access |

shelbynet is the primary development network. It is isolated from Aptos mainnet/testnet/devnet.

## Core Commands

### Upload a file
```bash
shelby upload <local-path> <blob-name> -e <expiration> --assume-yes
```
- `local-path`: path to the file on disk
- `blob-name`: the name/path the blob will have on Shelby (e.g., `data/myfile.csv`)
- `-e`: expiration — accepts natural language like `"tomorrow"`, `"in 7 days"`, `"in 30 days"`, `"2026-12-31"`, or UNIX timestamps
- `--assume-yes`: skip confirmation prompt
- `--context <name>`: override default network context (e.g., `--context shelbynet`)

Example:
```bash
shelby upload ./report.pdf reports/q2-analysis.pdf -e "in 30 days" --assume-yes
```

### Download a file
```bash
shelby download <blob-name> <local-destination>
```

Example:
```bash
shelby download reports/q2-analysis.pdf ./downloaded-report.pdf
```

### Delete a blob
```bash
shelby delete <blob-name>
```

### Upload a directory
```bash
shelby upload <local-dir>/ <blob-prefix>/ -e <expiration> --assume-yes
```

Example:
```bash
shelby upload ./dataset/ ai-training/v1/ -e "in 30 days" --assume-yes
```

## Account Management

```bash
# List all accounts
shelby account list

# View contexts (networks)
shelby context list

# Open faucet to get test tokens
shelby faucet
```

## Configuration

Config file location: `~/.shelby/config.yaml`

Structure:
```yaml
contexts:
  shelbynet:
    aptos_network:
      name: shelbynet
      fullnode: https://api.shelbynet.shelby.xyz/v1
      faucet: https://faucet.shelbynet.shelby.xyz
      indexer: https://api.shelbynet.shelby.xyz/v1/graphql
    shelby_network:
      rpc_endpoint: https://api.shelbynet.shelby.xyz/shelby
      api_key: aptoslabs_YOUR_KEY_HERE  # optional, reduces rate limits
accounts:
  my-account:
    private_key: ed25519-priv-0x...
    address: "0x..."
default_context: shelbynet
default_account: my-account
```

## Token Requirements

Uploads require two types of tokens:
1. **Aptos tokens** — for gas fees (transaction costs on Aptos blockchain)
2. **ShelbyUSD tokens** — for storage payment

Both are free on testnet/shelbynet. Use `shelby faucet` or the faucet URL for your network.

## Rate Limits

Without an API key, requests are limited to 40,000 compute units per 300 seconds per IP. If you hit `status 429` errors, either:
1. Get an API key from https://geomi.dev and add it to your config
2. Wait 5 minutes before retrying

## Performance Benchmarking

To benchmark upload performance, use the `time` command:
```bash
# Create test files
dd if=/dev/urandom of=test-10kb.bin bs=1024 count=10
dd if=/dev/urandom of=test-100kb.bin bs=1024 count=100
dd if=/dev/urandom of=test-1mb.bin bs=1024 count=1024

# Measure upload time
time shelby upload test-10kb.bin bench/test-10kb.bin -e "in 7 days" --assume-yes
time shelby upload test-100kb.bin bench/test-100kb.bin -e "in 7 days" --assume-yes
time shelby upload test-1mb.bin bench/test-1mb.bin -e "in 7 days" --assume-yes
```

Typical shelbynet latency (May 2026): ~6–11s per upload regardless of file size (0.3KB–1MB), suggesting fixed per-transaction overhead. Downloads are significantly faster (~1.2s for multiple files).

## Multipart Uploads (large files)

For files larger than the single-upload limit, Shelby supports multipart uploads via the API:
1. `POST` to begin a multipart upload session
2. `PUT` each part
3. `POST` to complete the upload

The CLI handles this automatically for large files.

## Verification

After upload, verify your blob exists:
- **Shelby Explorer**: `https://explorer.shelby.xyz/shelbynet/account/<YOUR_ADDRESS>`
- **Aptos Explorer**: Check the transaction hash from the upload output

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `status 429` rate limit | No API key or too many requests | Get API key from geomi.dev or wait 5 min |
| `stream timeout after 300000` | Network timeout | Retry — common on shelbynet |
| `Blob already exists` | Duplicate blob name | Use a different name or delete the existing blob |
| `Insufficient Shelby tokens` | Need ShelbyUSD tokens | Visit the faucet page |
| `Aptos CLI not found` | Missing Aptos CLI | Install via `brew install aptos` or `curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3` |

## SDK (for programmatic access)

```bash
npm install @shelby-protocol/sdk @aptos-labs/ts-sdk
```

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Network } from "@aptos-labs/ts-sdk";

const client = new ShelbyNodeClient({
  network: Network.TESTNET,
  apiKey: "aptoslabs_YOUR_KEY",
});
```

## Resources

- Documentation: https://docs.shelby.xyz
- GitHub: https://github.com/shelby
- Explorer: https://explorer.shelby.xyz
- Feedback & Issues: https://github.com/shelby/feedback
- Discord: https://discord.gg/GEDwKxKKdP
- SDK: `@shelby-protocol/sdk` (npm)
- CLI: `@shelby-protocol/cli` (npm)
