# Shelby CLI Command Reference

Complete reference for all Shelby CLI commands.

## shelby init

Initialize Shelby CLI configuration.

```bash
shelby init [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing configuration |

**Interactive Prompts:**
- Network selection (shelbynet, local)
- Account creation (optional)

**Example:**
```bash
shelby init
# Creates ~/.shelby/config.yaml with default context
```

## shelby account

Manage Shelby accounts (Aptos keypairs).

### shelby account create

Create a new account.

```bash
shelby account create [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--name <name>` | Account name (required) |
| `--private-key <key>` | Import existing private key |

**Examples:**
```bash
# Generate new account
shelby account create --name myaccount

# Import existing key
shelby account create --name imported --private-key "0x..."
```

### shelby account list

List all accounts.

```bash
shelby account list
```

**Output:**
```
NAME        ADDRESS                                    CURRENT
myaccount   0x1234...abcd                              *
dev         0x5678...efgh
```

### shelby account use

Switch to a different account.

```bash
shelby account use <name>
```

**Example:**
```bash
shelby account use dev
```

### shelby account delete

Delete an account.

```bash
shelby account delete <name>
```

**Example:**
```bash
shelby account delete oldaccount
```

### shelby account blobs

List blobs owned by the current account.

```bash
shelby account blobs [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--limit <n>` | Maximum blobs to list (default: 100) |
| `--offset <n>` | Skip first n blobs |

**Output:**
```
NAME                SIZE        EXPIRES
images/photo.jpg    1.2 MB      2025-06-15
data.json           4.5 KB      2025-04-01
```

### shelby account balance

Check account balance.

```bash
shelby account balance
```

**Output:**
```
APT:        1.5
ShelbyUSD:  10000
```

## shelby config

Manage global configuration.

### shelby config set-global-config

Set a global configuration value.

```bash
shelby config set-global-config <key> <value>
```

**Available Keys:**
| Key | Description |
|-----|-------------|
| `current_context` | Default context name |
| `current_account` | Default account name |

**Example:**
```bash
shelby config set-global-config current_context local
```

### shelby config describe-global-config

Show all configuration values with descriptions.

```bash
shelby config describe-global-config
```

### shelby config get-global-config

Get a specific configuration value.

```bash
shelby config get-global-config <key>
```

**Example:**
```bash
shelby config get-global-config current_context
# Output: default
```

## shelby context

Manage network contexts.

### shelby context create

Create a new context.

```bash
shelby context create [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--name <name>` | Context name (required) |
| `--network <network>` | Network: `shelbynet` or `local` |
| `--rpc-url <url>` | Custom RPC URL |

**Examples:**
```bash
# Create localnet context
shelby context create --name local --network local

# Create custom context
shelby context create --name custom --rpc-url https://custom.shelby.xyz
```

### shelby context update

Update an existing context.

```bash
shelby context update <name> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--network <network>` | New network |
| `--rpc-url <url>` | New RPC URL |

### shelby context list

List all contexts.

```bash
shelby context list
```

**Output:**
```
NAME        NETWORK     RPC URL                                    CURRENT
default     shelbynet   https://api.shelbynet.shelby.xyz/shelby/v1 *
local       local       http://localhost:8080/shelby/v1
```

### shelby context use

Switch to a different context.

```bash
shelby context use <name>
```

**Example:**
```bash
shelby context use local
```

### shelby context delete

Delete a context.

```bash
shelby context delete <name>
```

## shelby upload

Upload files to Shelby storage.

```bash
shelby upload <path> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<path>` | File or directory to upload |

**Options:**
| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Blob name (default: filename) |
| `-e, --expiration <exp>` | Expiration time (required) |
| `-r, --recursive` | Upload directory recursively |
| `--prefix <prefix>` | Prefix for blob names |

**Expiration Formats:**
| Format | Example | Description |
|--------|---------|-------------|
| Duration | `7d`, `24h`, `30m`, `1w` | Relative duration |
| ISO Date | `2025-12-31` | Specific date |
| ISO DateTime | `2025-12-31T23:59:59Z` | Specific datetime |
| Unix timestamp | `1735689600` | Seconds since epoch |

**Examples:**
```bash
# Upload single file
shelby upload ./myfile.txt -n "data/myfile.txt" -e 7d

# Upload directory
shelby upload ./images -r --prefix "backups/images/" -e 30d

# Upload with specific expiration date
shelby upload ./important.pdf -n "docs/important.pdf" -e "2025-12-31"
```

**Output:**
```
Uploading myfile.txt...
  Size: 1.2 KB
  Blob name: data/myfile.txt
  Expires: 2025-03-15 14:30:00 UTC
  Transaction: 0xabc123...

Upload complete!
```

## shelby download

Download files from Shelby storage.

```bash
shelby download <blob-name> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<blob-name>` | Name of blob to download (supports wildcards) |

**Options:**
| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Output file/directory path |
| `-r, --recursive` | Download matching prefix recursively |
| `-f, --force` | Overwrite existing files |
| `--allow-concurrent` | Allow concurrent downloads |
| `-a, --account <addr>` | Download from specific account address |

**Examples:**
```bash
# Download single file
shelby download myfile.txt -o ./downloaded.txt

# Download to directory
shelby download "images/*" -o ./local-images -r

# Download from another account
shelby download public-data.json -a 0x1234...abcd -o ./data.json

# Force overwrite
shelby download config.json -o ./config.json -f
```

**Output:**
```
Downloading myfile.txt...
  Size: 1.2 KB
  Saved to: ./downloaded.txt

Download complete!
```

## shelby delete

Delete files from Shelby storage.

```bash
shelby delete <blob-name> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<blob-name>` | Name of blob to delete (supports wildcards) |

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --recursive` | Delete matching prefix recursively |
| `-y, --yes` | Skip confirmation prompt |

**Examples:**
```bash
# Delete single file
shelby delete myfile.txt

# Delete with pattern
shelby delete "temp/*" -r -y

# Interactive delete (prompts for confirmation)
shelby delete important-file.txt
```

**Output:**
```
Deleting myfile.txt...
  Transaction: 0xdef456...

Delete complete!
```

## shelby faucet

Fund account with testnet tokens.

```bash
shelby faucet [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--network <network>` | Network to fund on (default: current context) |
| `--no-open` | Don't open faucet URL in browser |

**Behavior:**
- Opens the Shelby faucet page in your browser
- Displays the account address to fund
- Waits for funding confirmation

**Example:**
```bash
shelby faucet
# Opens: https://faucet.shelbynet.shelby.xyz?address=0x...
```

**Output:**
```
Opening faucet for account: 0x1234...abcd
Faucet URL: https://faucet.shelbynet.shelby.xyz?address=0x1234...abcd

Waiting for funds... (Ctrl+C to cancel)
Funded! New balance:
  APT: 1.0
  ShelbyUSD: 10000
```

## shelby localnet

Manage local development network.

### shelby localnet start

Start the local Shelby network.

```bash
shelby localnet start [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--docker-image <image>` | Custom Docker image |
| `--port <port>` | RPC port (default: 8080) |
| `--detach` | Run in background |

**Requirements:**
- Docker must be installed and running

**Example:**
```bash
# Start localnet
shelby localnet start

# Start in background
shelby localnet start --detach

# Start with custom port
shelby localnet start --port 9090
```

**Output:**
```
Starting Shelby localnet...
  Docker image: shelby/localnet:latest
  RPC URL: http://localhost:8080/shelby/v1

Localnet is running!
Press Ctrl+C to stop.
```

### shelby localnet stop

Stop the local network (if running in detached mode).

```bash
shelby localnet stop
```

### shelby localnet status

Check localnet status.

```bash
shelby localnet status
```

**Output:**
```
Localnet status: running
  RPC URL: http://localhost:8080/shelby/v1
  Uptime: 2h 15m
```

## shelby commitment

Generate file commitments (for advanced use cases).

```bash
shelby commitment <path> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<path>` | File to generate commitment for |

**Options:**
| Option | Description |
|--------|-------------|
| `--output <format>` | Output format: `json`, `hex` (default: json) |

**Example:**
```bash
shelby commitment ./myfile.txt
```

**Output:**
```json
{
  "commitment": "0x...",
  "size": 1234,
  "chunks": 3
}
```

**Use Case:**
Commitments are used for verifying file integrity and for advanced upload flows where you need to pre-register blobs before uploading.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHELBY_CONFIG` | Path to config file (default: `~/.shelby/config.yaml`) |
| `SHELBY_CONTEXT` | Override current context |
| `SHELBY_ACCOUNT` | Override current account |
| `SHELBY_VERBOSE` | Enable verbose output (`1` or `true`) |

**Example:**
```bash
SHELBY_CONTEXT=local shelby upload ./file.txt -n "file.txt" -e 7d
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Network error |
| 4 | Authentication error |
| 5 | File not found |
| 6 | Blob not found |
