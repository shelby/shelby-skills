# Shelby CLI Command Reference

Complete reference for all Shelby CLI commands.

## Table of Contents

- [shelby init](#shelby-init)
- [shelby account](#shelby-account)
- [shelby config](#shelby-config)
- [shelby context](#shelby-context)
- [shelby upload](#shelby-upload)
- [shelby download](#shelby-download)
- [shelby delete](#shelby-delete)
- [shelby faucet](#shelby-faucet)
- [shelby localnet](#shelby-localnet)
- [shelby commitment](#shelby-commitment)
- [Environment Variables](#environment-variables)
- [Exit Codes](#exit-codes)

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
| `--indexer-api-key <key>` | Indexer API key |

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

Upload files to Shelby storage. Takes two positional arguments: `<source>` (local file/directory) and `<destination>` (blob name/prefix).

```bash
shelby upload <source> <destination> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<source>` | Local file or directory path |
| `<destination>` | Destination blob name or prefix |

**Options:**
| Option | Description |
|--------|-------------|
| `-e, --expiration <datetime>` | Expiration date/time (required) |
| `-r, --recursive` | Upload directory recursively |
| `--assume-yes` | Skip confirmation prompts |
| `--output-commitments <file>` | Save commitment data to file |

**Expiration Formats:**
| Format | Example | Description |
|--------|---------|-------------|
| Natural language | `"tomorrow"`, `"in 2 days"`, `"next Friday"` | Parsed by chrono-node |
| ISO Date | `2025-12-31` | Specific date |
| ISO DateTime | `2025-12-31T23:59:59Z` | Specific datetime |
| Unix timestamp | `1735689600` | Seconds since epoch |

**Note:** Duration formats like `7d`, `24h` are NOT supported. Use `"in 7 days"`, `"in 24 hours"` instead.

**Examples:**
```bash
# Upload single file
shelby upload ./myfile.txt data/myfile.txt -e "in 7 days"

# Upload directory recursively
shelby upload ./images/ backups/images/ -e "in 30 days" -r --assume-yes

# Upload with specific expiration date
shelby upload ./important.pdf docs/important.pdf -e "2025-12-31"

# Upload and save commitments
shelby upload ./data.bin data.bin -e "tomorrow" --output-commitments ./commitments.json
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

Download files from Shelby storage. Takes two positional arguments: `<source>` (blob name/prefix) and `<destination>` (local path).

```bash
shelby download <source> <destination> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<source>` | Source blob name or prefix |
| `<destination>` | Destination file or directory path |

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --recursive` | Download all blobs matching the prefix |
| `-f, --force` | Overwrite existing files/directories |
| `--allow-concurrent` | Bypass download lock (micropayments may not work correctly) |

**Examples:**
```bash
# Download single file
shelby download myfile.txt ./downloaded.txt

# Download directory recursively
shelby download images/ ./local-images -r

# Force overwrite
shelby download config.json ./config.json -f
```

**Notes:**
- Only one download can run at a time (lock file in `~/.shelby/`). Use `--allow-concurrent` to bypass.
- For recursive downloads, the source should be a prefix (e.g., `images/`).
- The destination directory's parent must exist.

**Output:**
```
Downloading myfile.txt...
  Size: 1.2 KB
  Saved to: ./downloaded.txt

Download complete!
```

## shelby delete

Delete files from Shelby storage. Takes one positional argument: `<destination>` (blob name or prefix).

```bash
shelby delete <destination> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<destination>` | Blob name to delete, or prefix for recursive deletion |

**Options:**
| Option | Description |
|--------|-------------|
| `-r, --recursive` | Delete all blobs matching the prefix |
| `--assume-yes` | Skip confirmation prompt |

**Examples:**
```bash
# Delete single file
shelby delete myfile.txt

# Delete all blobs under a prefix (must end with /)
shelby delete temp/ -r --assume-yes

# Interactive delete (prompts for confirmation)
shelby delete important-file.txt
```

**Notes:**
- For recursive deletion, the destination must end with `/`.
- Without `--assume-yes`, you'll be prompted to confirm.
- Deletion is on-chain only (removes metadata); blob data expires from storage nodes.

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
SHELBY_CONTEXT=local shelby upload ./file.txt file.txt -e "in 7 days"
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

## Troubleshooting

### Windows Path Issues

On Windows, use forward slashes or quoted paths to avoid escaping issues:

```bash
# Correct
shelby upload ./images/photo.jpg images/photo.jpg -e "in 7 days"

# Incorrect (backslashes may cause issues)
shelby upload .\images\photo.jpg images\photo.jpg -e "in 7 days"
```

If you encounter `ENOENT` errors, verify the file path exists and uses forward slashes.

### Docker Permission Errors (Localnet)

If `shelby localnet start` fails with permission errors:

```bash
# Linux/macOS: Ensure your user is in the docker group
sudo usermod -aG docker $USER
# Then log out and back in

# Windows: Run Docker Desktop as administrator
# Or ensure WSL integration is enabled in Docker Desktop settings
```

Common Docker errors:

| Error | Solution |
|-------|----------|
| `Cannot connect to the Docker daemon` | Start Docker Desktop or the Docker service |
| `Permission denied` | Add user to `docker` group or run with `sudo` |
| `Port already in use` | Use `--port <port>` to specify an available port |

### Config File Not Found

If you see `Configuration file not found`:

```bash
# Re-initialize the config
shelby init --force

# Or set a custom config path
SHELBY_CONFIG=/path/to/config.yaml shelby account list
```

The default config location is `~/.shelby/config.yaml`.

### Expiration Format Errors

Duration shorthand formats like `7d`, `24h`, or `30m` are **not supported**. Use natural language or ISO formats instead:

```bash
# These will fail
shelby upload file.txt file.txt -e "7d"     # Not supported
shelby upload file.txt file.txt -e "24h"    # Not supported

# Use these instead
shelby upload file.txt file.txt -e "in 7 days"
shelby upload file.txt file.txt -e "in 24 hours"
shelby upload file.txt file.txt -e "2025-12-31"
```

### Faucet Timeout

If the faucet command hangs or times out:

1. Check your network connection
2. Verify you're on the correct network context (`shelby context list`)
3. Try opening the faucet URL manually in your browser
4. If the faucet is rate-limited, wait a few minutes before retrying

```bash
# Cancel with Ctrl+C and retry
shelby faucet

# Or use --no-open and visit the URL manually
shelby faucet --no-open
```

### Recursive Upload Large File Limits

When uploading directories recursively, be aware of size limits:

- Individual file size limit depends on available storage credits
- Large directories may take significant time; use `--assume-yes` to skip per-file confirmations
- If uploads fail mid-way, already uploaded blobs are not automatically cleaned up

```bash
# Check your balance before large uploads
shelby account balance

# Upload with auto-confirm
shelby upload ./large-directory/ backups/ -e "in 30 days" -r --assume-yes
```

## Best Practices

### Blob Naming Conventions

Use clear, hierarchical names with forward slashes as separators:

```bash
# Recommended: Use descriptive prefixes
shelby upload ./photo.jpg      images/photos/vacation-2025.jpg    -e "in 30 days"
shelby upload ./report.pdf     documents/reports/q1-2025.pdf      -e "in 90 days"
shelby upload ./config.json    app/config/production.json         -e "in 365 days"

# Avoid: Flat names without structure
shelby upload ./photo.jpg      photo.jpg     -e "in 30 days"
shelby upload ./report.pdf     report.pdf    -e "in 90 days"
```

- Use lowercase names with hyphens (e.g., `my-file.txt` instead of `My File.txt`)
- Avoid special characters in blob names
- Use consistent prefix patterns for related files

### Expiration Strategy

Choose expiration times based on your use case:

| Use Case | Recommended Expiration | Example |
|----------|----------------------|---------|
| Testing / Development | 1–7 days | `"in 1 day"` or `"in 7 days"` |
| Short-term sharing | 7–30 days | `"in 2 weeks"` or `"in 30 days"` |
| Production assets | 90–365 days | `"in 90 days"` or `"2026-12-31"` |
| Long-term archival | 365+ days | `"in 365 days"` |

- Set shorter expirations for test data to avoid unnecessary costs
- Plan for renewal before expiration for important data

### Directory Structure for Recursive Uploads

Organize your local files before uploading:

```
project-assets/
├── images/
│   ├── logo.png
│   └── banner.jpg
├── documents/
│   ├── readme.pdf
│   └── guide.pdf
└── data/
    └── dataset.csv
```

```bash
# Upload preserving structure
shelby upload ./project-assets/ myapp/assets/ -e "in 30 days" -r --assume-yes
```

This creates blobs like `myapp/assets/images/logo.png`, `myapp/assets/documents/readme.pdf`, etc.

### Backup and Restore Workflow

A simple backup and restore pattern using Shelby CLI:

```bash
# Backup: Upload a directory
shelby upload ./my-project/ backups/my-project/2025-03-15/ -e "in 90 days" -r --assume-yes

# Verify: List uploaded blobs
shelby account blobs

# Restore: Download the backup
shelby download backups/my-project/2025-03-15/ ./restored-project/ -r

# Clean up old backups
shelby delete backups/my-project/2025-01-15/ -r --assume-yes
```
