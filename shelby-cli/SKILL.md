---
name: shelby-cli
description: CLI tool for Shelby decentralized storage. Use when working with the shelby command for file uploads/downloads, account management, context switching, or local development with localnet.
---

# Shelby CLI

The Shelby CLI (`shelby`) is a command-line tool for interacting with Shelby decentralized storage. Upload, download, and manage files directly from your terminal.

## Installation

```bash
npm install -g @shelby-protocol/cli
```

Verify installation:

```bash
shelby --version
```

## Quick Start

```bash
# 1. Initialize configuration
shelby init

# 2. Create an account
shelby account create --name myaccount

# 3. Fund the account (testnet)
shelby faucet

# 4. Upload a file
shelby upload ./myfile.txt -n "hello.txt" -e 7d

# 5. Download a file
shelby download hello.txt -o ./downloaded.txt
```

## Configuration

Configuration is stored in `~/.shelby/config.yaml`:

```yaml
global:
  current_context: default
  current_account: myaccount

contexts:
  default:
    network: shelbynet
    rpc_base_url: https://api.shelbynet.shelby.xyz/shelby/v1

accounts:
  myaccount:
    private_key: "0x..."  # Aptos private key
```

### Contexts

Contexts define network configurations. Switch between networks:

```bash
# Create a localnet context
shelby context create --name local --network local

# Switch contexts
shelby context use local

# List contexts
shelby context list
```

### Accounts

Accounts are Aptos keypairs used for signing transactions:

```bash
# Create a new account
shelby account create --name dev

# Switch accounts
shelby account use dev

# List accounts
shelby account list

# Check balance
shelby account balance
```

## Global Options

All commands support these options:

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Enable verbose output |
| `-C, --config <path>` | Use custom config file |
| `-c, --context <name>` | Override current context |
| `-a, --account <name>` | Override current account |
| `--version` | Show version |

## Commands Overview

| Command | Description |
|---------|-------------|
| `shelby init` | Initialize configuration |
| `shelby account` | Manage accounts (create, list, use, delete, balance) |
| `shelby context` | Manage contexts (create, update, list, use, delete) |
| `shelby config` | Manage global configuration |
| `shelby upload` | Upload files to Shelby storage |
| `shelby download` | Download files from Shelby storage |
| `shelby delete` | Delete files from Shelby storage |
| `shelby faucet` | Fund account with testnet tokens |
| `shelby localnet` | Start local development network |
| `shelby commitment` | Generate file commitments |

See `references/commands.md` for detailed command documentation.

## Common Workflows

### Local Development Setup

```bash
# Start localnet (requires Docker)
shelby localnet start

# Create local context
shelby context create --name local --network local

# Use local context
shelby context use local

# Create and fund account
shelby account create --name dev
shelby faucet
```

### Upload with Custom Expiration

```bash
# Upload for 30 days
shelby upload ./data.json -n "config/data.json" -e 30d

# Upload for 1 hour
shelby upload ./temp.txt -n "temp.txt" -e 1h

# Upload until specific date
shelby upload ./file.txt -n "file.txt" -e "2025-12-31"
```

### Batch Operations

```bash
# Upload entire directory
shelby upload ./my-folder -r --prefix "backups/"

# Download all files matching a prefix
shelby download "images/*" -o ./local-images -r

# Delete multiple files
shelby delete "temp/*" -r -y
```

### Download from Any Account

```bash
# Download from another account (public blobs)
shelby download myfile.txt -a 0x1234...abcd -o ./downloaded.txt
```

## Key Concepts

### Blob Naming

Blob names can include path-like structures:

```bash
shelby upload ./photo.jpg -n "images/vacation/photo.jpg"
```

The full blob identifier is: `@{account_address}/{blob_name}`

### Expiration Formats

Files require an expiration time. Supported formats:

| Format | Example | Description |
|--------|---------|-------------|
| Duration | `7d`, `24h`, `30m` | Relative to upload time |
| ISO Date | `2025-12-31` | Specific date |
| Unix timestamp | `1735689600` | Seconds since epoch |

**Important:** Expiration is required for all uploads. There is no "permanent" storage option.

### Networks

| Network | Description |
|---------|-------------|
| `shelbynet` | Main testnet (default) |
| `local` | Local development (requires `shelby localnet start`) |

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Account not funded" | Insufficient balance | Run `shelby faucet` |
| "Blob not found" | File doesn't exist or expired | Check blob name and expiration |
| "Context not found" | Invalid context name | Run `shelby context list` |
| "Connection refused" | Localnet not running | Run `shelby localnet start` |

## Reference

For complete command documentation, see `references/commands.md`.
