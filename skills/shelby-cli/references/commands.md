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
- [shelby locations](#shelby-locations)
- [shelby commitment](#shelby-commitment)
- [Scripting the CLI](#scripting-the-cli)
- [Configuration overrides](#configuration-overrides)
- [Exit Codes](#exit-codes)

## shelby init

Initialize Shelby CLI configuration.

```bash
shelby init [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--setup-default` | Generate standard contexts and a fresh account non-interactively |

**Interactive Prompts (default, without `--setup-default`):**
- Network / context selection
- Account creation (optional)

**Example:**
```bash
shelby init
# Creates ~/.shelby/config.yaml with standard contexts

# Non-interactive: generate standard contexts + a fresh account
shelby init --setup-default
```

> **Network note:** ShelbyNet is the default context after `init`. Testnet has been retired — the CLI rejects `testnet` contexts and won't create new ones. See [Networks](../SKILL.md#networks).

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
| `--name <account-name>` | Account name |
| `--scheme <signature-scheme>` | Signature scheme of the private key (choices: `ed25519`) |
| `--private-key <key>` | Import existing raw private key |
| `--address <account-address>` | Aptos account address (hex-encoded) |

**Examples:**
```bash
# Generate new account
shelby account create --name myaccount

# Import existing key
shelby account create --name imported --private-key "0x..."

# Import a key with an explicit scheme and address
shelby account create --name imported --private-key "0x..." --scheme ed25519 --address "0x..."
```

### shelby account list

List all accounts in a table view.

```bash
shelby account list
```

**Output** — a colorized, bordered table with columns **Name / Address / Private Key**.
The active account is marked `(default)` under its name. The **address wraps across two
rows** and the **private key is truncated**:
```
┌─────────────┬─────────────────────────────────────────────┬────────────────┐
│ Name        │ Address                                     │ Private Key    │
├─────────────┼─────────────────────────────────────────────┼────────────────┤
│ alice       │ 0x1857639c70f976f94a30d3d1510b9e172ff82c7e0 │ ed25519-priv-0 │
│             │ 17f1227d864885b37c9b960                     │ x46527...      │
├─────────────┼─────────────────────────────────────────────┼────────────────┤
│ shelby-demo │ 0xec4c50f0d42f1ec5e87df46b19887a169b9c53c15f │ ed25519-priv-0 │
│  (default)  │ 8edff58fe6e9c2ba48e52a                      │ xc2dad...      │
└─────────────┴─────────────────────────────────────────────┴────────────────┘
```

> **Don't parse this.** It's a human-oriented ANSI table with line-wrapped, truncated
> cells and no `--json` flag (verified on v0.2.0). To read an account's full address or
> private key programmatically, read `~/.shelby/config.yaml` instead — see
> [Scripting the CLI](#scripting-the-cli).

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
| `-a, --account <account-name>` | Account to list blobs for (defaults to the active account) |

**Output** — a header block (account address + Explorer link) followed by a bordered
table with columns **Name / Size / Status** (the `Expires` column was dropped in v0.2.0
when blob expiration was removed):
```
🔍  Retrieving blobs for shelby-demo
👤  Address: 0xec4c50f0d42f1ec5e87df46b19887a169b9c53c15f8edff58fe6e9c2ba48e52a
🗂️  Shelby Explorer: https://explorer.shelby.xyz/shelbynet/account/0xec4c...

Name                Size       Status
images/photo.jpg    1.2 MB     Written
data.json           4.5 KB     Written
```

> Requires network access to the Shelby indexer. With no connectivity it prints
> `Error listing blobs: fetch failed`.

### shelby account balance

Display the APT and ShelbyUSD balances for an account.

```bash
shelby account balance [address]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `[address]` | Account address to query (defaults to the active account) |

**Examples:**
```bash
# Active account
shelby account balance

# Any address
shelby account balance 0x1234...abcd
```

**Output** — a bordered table with columns **Token / Asset / Balance / Raw Units**. The
token name may wrap (`ShelbyUSD` → `ShelbyU` / `SD`). An unfunded account shows a
"No balances found" warning:
```
Token      Asset                          Balance         Raw Units
APT        0x1::aptos_coin::AptosCoin      1.5 APT         150000000
ShelbyUSD  <shelby-usd-asset>              10000 ShelbyUSD  10000000000
```

> **Parsing note:** No `--json` flag exists. To read a balance in a script, strip ANSI
> and match the `<number> <UNIT>` token rather than assuming column positions — see
> [Scripting the CLI](#scripting-the-cli).

## shelby config

Manage global configuration.

Global configuration controls how the CLI finds your `config.yaml`. To change the
default context or account, use `shelby context use <name>` / `shelby account use <name>`
(which set `default_context` / `default_account` in the config), not this command.

### shelby config set-global-config

Set global configuration, such as where to load the `.shelby/config.yaml` file from.

```bash
shelby config set-global-config [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--config-location-behavior <behavior>` | `global` — always load `~/.shelby/config.yaml`. `walk` — try `.shelby/config.yaml`, then parent directories, then fall back to the global `~/.shelby/config.yaml`. |

**Example:**
```bash
# Enable project-local config discovery
shelby config set-global-config --config-location-behavior walk
```

### shelby config describe-global-config

Describe the current global configuration.

```bash
shelby config describe-global-config
```

### shelby config get-global-config

Display the global config file content as YAML.

```bash
shelby config get-global-config
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
| `--name <context-name>` | Name of the context |
| `--aptos-network <network>` | Aptos network (`local`, `shelbynet`; `testnet` is retired and rejected) |
| `--aptos-fullnode <url>` | Aptos fullnode URL |
| `--aptos-faucet <url>` | Aptos faucet URL |
| `--aptos-indexer <url>` | Aptos indexer URL |
| `--aptos-pepper <url>` | Aptos pepper URL |
| `--aptos-prover <url>` | Aptos prover URL |
| `--aptos-api-key <key>` | Aptos API key |
| `--shelby-rpc-endpoint <url>` | Shelby RPC endpoint |
| `--shelby-indexer-endpoint <url>` | Shelby indexer endpoint |
| `--shelby-rpc-api-key <key>` | Shelby RPC API key |
| `--shelby-indexer-api-key <key>` | Shelby indexer API key |
| `--shelby-rpc-receiver-address <address>` | Shelby RPC receiver address for micropayments |

**Examples:**
```bash
# Create a context on ShelbyNet
shelby context create --name shelbynet --aptos-network shelbynet

# Create a context with custom Shelby endpoints
shelby context create --name custom \
  --aptos-network shelbynet \
  --shelby-rpc-endpoint https://custom.shelby.xyz/shelby/v1
```

### shelby context update

Update an existing context. Accepts the same options as `create` (except `--name`).

```bash
shelby context update <context-name> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<context-name>` | Name of the context to update |

**Options:** same `--aptos-*` and `--shelby-*` options as [`context create`](#shelby-context-create) above.

**Example:**
```bash
shelby context update shelbynet --shelby-rpc-api-key "AG-***"
```

### shelby context list

List all contexts.

```bash
shelby context list
```

**Output:**
```
NAME        NETWORK     RPC URL                                      CURRENT
shelbynet   shelbynet   https://api.shelbynet.shelby.xyz/shelby/v1   *
local       local       http://localhost:9090/
```

> The CLI's default context is `shelbynet`. A retired `testnet` context may still appear
> here if it was created by an older CLI, but selecting it errors — switch or delete it.

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
| `--location <name>` | Write location (region). If omitted, the write follows the account's location preference and the context's `location_hint`. **A freshly created account has neither, so uploads fail without it** (see error below). Run `shelby locations` to list valid names — currently the only one is `shelbynet-1` — or set a hint once with `shelby locations use <name>`. |
| `-r, --recursive` | Upload directory recursively |
| `--assume-yes` | Skip confirmation prompts |
| `--output-commitments <filename>` | Save commitment data computed during the upload to a file |

> Blob expiration was removed in v0.2.0 — there is no longer an `-e/--expiration` flag, and
> registrations use the protocol's fixed payment window.

**Examples:**
```bash
# Resolve the write location first (currently the only one is `shelbynet-1`)
shelby locations

# Upload single file (pass --location on a fresh account)
shelby upload ./myfile.txt data/myfile.txt --location shelbynet-1

# Upload directory recursively
shelby upload ./images/ backups/images/ -r --location shelbynet-1 --assume-yes

# Upload and save commitments
shelby upload ./data.bin data.bin --location shelbynet-1 --output-commitments ./commitments.json
```

**Failure without a location** (fresh, funded account, no `--location`):
```
❌ 1 file failed (24.0 MB)
   Last error: registration failed for blob-1-24mb.bin: Registration failed after 5 attempts:
   No write location could be resolved: none was selected and the account has no default
   location or location hint.
```
Fix: pass `--location <name>` (see `shelby locations`), or set a default location on the
account / a `location_hint` on the context.

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
| `-r, --recursive` | Download all blobs matching the prefix (canonical `/`-separated directory layout) |
| `-f, --force` | Overwrite existing files/directories |
| `--allow-concurrent` | Bypass download lock (micropayments may not work correctly) |
| `--price-per-gb <price>` | Price per gigabyte in ShelbyUSD for micropayments (default: `0.03`) |

**Examples:**
```bash
# Download single file
shelby download myfile.txt ./downloaded.txt

# Download directory recursively — BOTH source prefix and destination MUST end with '/'
shelby download images/ ./local-images/ -r

# Force overwrite
shelby download config.json ./config.json -f
```

**Recursive downloads — trailing-slash rule:** for `-r`, **both** the source prefix
**and** the destination must end with `/` (or `\`). Omitting either fails with:
```
❌ Invalid Download Options
⚠️  Recursive downloads require:
    - The source prefix must end with '/'
    - The destination path must end with '/' or '\'
```
The prefix is stripped on the way down, so `blobs/foo.bin` lands at `./local-images/foo.bin`.

**Notes:**
- Only one download can run at a time (lock file in `~/.shelby/`). Use `--allow-concurrent` to bypass.
- The destination directory's parent must exist; the CLI creates the leaf directory.

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
- Deletion is on-chain only (removes metadata); blob data is subsequently reclaimed from storage nodes.

**Output:**
```
Deleting myfile.txt...
  Transaction: 0xdef456...

Delete complete!
```

## shelby faucet

Open the Shelby faucet web page to request tokens for the active account.

```bash
shelby faucet [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--network <network>` | Network to request tokens for. Only `shelbynet` is accepted. Defaults to the current context's network. |
| `--no-open` | Don't automatically open the browser, just print the URL |

**Behavior:**
- Opens the Shelby faucet page in your browser (or just prints the URL with `--no-open`).
- Displays the account address to fund.
- Then **blocks**, waiting for the funds to land (`Waiting for funds... Ctrl+C to cancel`).

> **This step is not automatable.** The faucet is browser-driven — a human must open the
> printed URL and complete it; the command only returns once funds arrive. It is the one
> manual step in any otherwise-scripted workflow. A single completion funds **both APT
> (gas) and ShelbyUSD (storage/micropayments)** on ShelbyNet.

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

## shelby locations

List the Shelby locations (regions) available for writes, or set the location **hint** on
the active context.

```bash
shelby locations              # list available locations
shelby locations use <name>   # persist <name> as the active context's location_hint
```

**Subcommands:**
| Command | Description |
|---------|-------------|
| `shelby locations` | List every activated location (region). Requires network access. |
| `shelby locations use <location>` | Validate `<location>` against the contract and store it as `location_hint` on the current context, so subsequent uploads resolve a location without `--location`. Prints `✅ Location hint for context '<ctx>' set to '<location>'`. |

**Use Case:**
There is currently a **single location, `shelbynet-1`** — but a freshly created account has
no default location, so `shelby upload` **fails** until a location can be resolved (see
[`shelby upload`](#shelby-upload)). Either pass `--location` per upload, or set the hint
once:
```bash
# One-time: set the context's default write location
shelby locations use shelbynet-1
shelby upload ./file.bin file.bin           # resolves via the context hint

# Or resolve it inline per upload
LOCATION="$(shelby locations | awk '/^  / {print $1; exit}')"
shelby upload ./file.bin file.bin --location "$LOCATION"
```

## shelby commitment

Compute commitments for a file and write them to an output JSON file. Intended for
debugging and introspection.

```bash
shelby commitment <input> <output>
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `<input>` | File to compute the commitment for |
| `<output>` | Path to the output JSON file to write |

**Example:**
```bash
shelby commitment ./myfile.txt ./myfile.commitment.json
```

**Use Case:**
Commitments are used for verifying file integrity and for advanced upload flows where you need to pre-register blobs before uploading.

## Scripting the CLI

The CLI is built for humans: command output is colorized, line-wrapped ANSI tables and
**there is no `--json` / machine-readable flag** (verified on v0.2.0). Don't scrape
`account list` / `account balance` / `account blobs` for values. Instead:

**Read account address & private key from the config file, not `account list`:**
```bash
CONFIG="$HOME/.shelby/config.yaml"
# Values live under accounts.<name>.{address,private_key}. address is quoted;
# private_key is unquoted AIP-80 (ed25519-priv-0x...). A YAML tool is most robust:
ADDRESS=$(yq '.accounts["shelby-demo"].address' "$CONFIG")
PRIVATE_KEY=$(yq '.accounts["shelby-demo"].private_key' "$CONFIG")
```

**Read a balance by stripping ANSI and matching `<number> <UNIT>`** (robust to column
wrapping — don't assume column positions):
```bash
shelby account balance \
  | sed $'s/\x1b\\[[0-9;]*m//g' \
  | grep -oE '[0-9][0-9.,]*[[:space:]]+ShelbyUSD' | head -n1 | grep -oE '^[0-9.,]+'
```

**Resolve the write location** rather than hard-coding it:
```bash
LOCATION="$(shelby locations | awk 'NR>1 {print $1; exit}')"
```

**End-to-end pattern:** `init --setup-default` → `context use shelbynet` →
`account create` → read `address`/`private_key` from `config.yaml` → **`faucet`
(manual, blocking — a human completes it)** → `locations` → `upload --location <name>` →
`download -r` with a trailing `/` on **both** paths → verify checksums. The faucet is the
only step that can't be automated.

## Configuration overrides

The CLI reads configuration from `~/.shelby/config.yaml` (or a project-local
`.shelby/config.yaml` when `config_location_behavior` is set to `walk`). Override
selection per-invocation with the global flags:

```bash
# Use a specific config file, context, and account for one command
shelby -C ./my-config.yaml -c shelbynet -a default upload ./file.txt file.txt --location shelbynet-1
```

| Flag | Description |
|------|-------------|
| `-C, --config-file <path>` | Path to the config file to load |
| `-c, --context <name>` | Context to load endpoints from |
| `-a, --account <name>` | Account to load signing credentials from |
| `-v, --verbose` | Enable verbose logging |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| Non-zero | Failure (the CLI exits `1` on error and prints a message describing the cause) |
