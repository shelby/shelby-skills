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

# 4. Upload a file (two positional args: source, destination)
shelby upload ./myfile.txt hello.txt -e "tomorrow"

# 5. Download a file (two positional args: source, destination)
shelby download hello.txt ./downloaded.txt
```

## Configuration

Configuration is stored in `~/.shelby/config.yaml`:

```yaml
contexts:
  default:
    aptos_network: shelbynet
    api_key: "AG-***"  # optional

accounts:
  myaccount:
    private_key: "0x..."  # Aptos private key
    address: "0x..."      # optional, derived from private key

default_context: default
default_account: myaccount
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
| `-C, --config-file <path>` | Use custom config file |
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

The CLI uses natural language date parsing (via chrono-node), ISO dates, or Unix timestamps:

```bash
# Upload expiring tomorrow
shelby upload ./data.json config/data.json -e "tomorrow"

# Upload expiring in 2 days
shelby upload ./temp.txt temp.txt -e "in 2 days"

# Upload until specific date
shelby upload ./file.txt file.txt -e "2025-12-31"

# Upload using Unix timestamp (seconds)
shelby upload ./file.txt file.txt -e 1735689600
```

### Recursive Operations

```bash
# Upload entire directory (source path ends without /, destination is a prefix)
shelby upload ./my-folder/ backups/ -e "in 30 days" -r --assume-yes

# Download all files matching a prefix
shelby download images/ ./local-images -r

# Delete all files under a prefix (destination must end with /)
shelby delete temp/ -r --assume-yes
```

## Key Concepts

### Blob Naming

The upload command takes two positional arguments: source (local file) and destination (blob name):

```bash
shelby upload ./photo.jpg images/vacation/photo.jpg -e "next month"
```

The full blob identifier is: `@{account_address}/{blob_name}`

### Expiration Formats

Files require an expiration time. Supported formats:

| Format | Example | Description |
|--------|---------|-------------|
| Natural language | `"tomorrow"`, `"in 2 days"`, `"next Friday"` | Parsed by chrono-node |
| ISO Date | `2025-12-31` | Specific date |
| ISO DateTime | `2025-12-31T23:59:59Z` | Specific datetime |
| Unix timestamp | `1735689600` | Seconds since epoch |

**Important:** Duration formats like `7d`, `24h`, `30m` are NOT supported. Use natural language instead: `"in 7 days"`, `"in 24 hours"`, `"in 30 minutes"`.

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
