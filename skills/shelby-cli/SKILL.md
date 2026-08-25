---
name: shelby-cli
description: CLI tool for Shelby decentralized storage. Use when working with the shelby command for file uploads/downloads, account management, context/network switching, or generating file commitments.
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
# 1. Initialize configuration (default context is shelbynet)
shelby init

# 2. Create an account
shelby account create --name myaccount --scheme ed25519

# 3. Fund the account (browser-driven + BLOCKING — a human must open the printed
#    URL and complete it; funds both APT and ShelbyUSD)
shelby faucet

# 4. Upload a file (two positional args: source, destination).
#    A fresh account has no default location, so pass --location (or set a
#    location hint once with `shelby locations use <name>`).
shelby locations                       # currently the only location is `shelbynet-1`
shelby upload ./myfile.txt hello.txt --location shelbynet-1

# 5. Download a file (two positional args: source, destination)
shelby download hello.txt ./downloaded.txt
```

> **Which network?** ShelbyNet is currently the only available network. See [Networks](#networks) before you start.
>
> **Scripting?** Output has no `--json` mode — read creds from `config.yaml`, not `account list`. See [Scripting the CLI](references/commands.md#scripting-the-cli).

## Configuration

Configuration is stored in `~/.shelby/config.yaml`. This is the actual structure written
by `shelby init --setup-default` (abridged to the ShelbyNet context):

```yaml
contexts:
  shelbynet:
    aptos_network:                 # nested object, NOT a scalar string
      name: shelbynet
      fullnode: https://api.shelbynet.shelby.xyz/v1
      faucet: https://faucet.shelbynet.shelby.xyz
      indexer: https://api.shelbynet.shelby.xyz/v1/graphql
      pepper: https://api.shelbynet.aptoslabs.com/keyless/pepper/v0
      prover: https://api.shelbynet.aptoslabs.com/keyless/prover/v0
    shelby_network:
      rpc_endpoint: https://api.shelbynet.shelby.xyz/shelby   # note: no `/v1`
accounts:
  shelby-demo:
    address: "0xec4c...e52a"                    # listed FIRST, quoted
    private_key: ed25519-priv-0xc2da...79cf     # SECOND, UNQUOTED, AIP-80 format
default_context: shelbynet
default_account: shelby-demo
```

Notes on the real schema:
- `aptos_network` is a **nested object** (`name`/`fullnode`/`faucet`/`indexer`/`pepper`/`prover`), and endpoints live under a separate **`shelby_network`** key whose `rpc_endpoint` ends in `.../shelby` (no `/v1`).
- Under each account, **`address` is quoted and comes first**; **`private_key` is unquoted and in AIP-80 format** (`ed25519-priv-0x…`, not a bare `0x…`). Import it back with that same `ed25519-priv-0x…` form.
- `shelby init --setup-default` seeds the standard contexts (`local`, `shelbynet`) and one **generated account named `default`**, with `default_context: shelbynet`. It refuses to overwrite an existing config (remove it first, or use interactive `shelby init`).
- `default_context` / `default_account` are set for you by `shelby context use <name>` / `shelby account use <name>` — prefer those over hand-editing. To read an account's address/key in a script, parse this file (see [Scripting the CLI](references/commands.md#scripting-the-cli)), not `shelby account list`.

### Contexts

Contexts define network configurations (Shelby RPC & Aptos endpoints). Switch between them:

```bash
# Switch the active context and persist it as the default
shelby context use shelbynet

# List contexts (shows which one is current)
shelby context list

# Create a custom context (uses --aptos-* / --shelby-* flags, not --network/--rpc-url)
shelby context create --name custom \
  --aptos-network shelbynet \
  --shelby-rpc-endpoint https://custom.shelby.xyz/shelby/v1
```

> The CLI's default context is `shelbynet`. Testnet has been **retired** — the CLI keeps
> existing `testnet` contexts parseable so you can list or delete them, but using one
> errors with "Shelby Testnet has been retired. Update … to use shelbynet or local," and
> new contexts can't select it.

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
| `shelby account` | Manage accounts (create, list, use, delete, blobs, balance) |
| `shelby context` | Manage contexts (create, update, list, use, delete) |
| `shelby config` | Manage global configuration |
| `shelby upload` | Upload files to Shelby storage |
| `shelby download` | Download files from Shelby storage |
| `shelby delete` | Delete files from Shelby storage |
| `shelby faucet` | Open the faucet web page to request tokens |
| `shelby locations` | List write regions, or set the context's location hint (`locations use <name>`) |
| `shelby commitment` | Compute a file's commitment JSON (debugging/introspection) |

See `references/commands.md` for detailed command documentation.

## Common Workflows

### First-Time Setup

```bash
# Bootstrap config (interactive), or `shelby init --setup-default` for a non-interactive setup
shelby init   # default context is shelbynet

# Create and fund an account
shelby account create --name dev
shelby faucet

# Optional: set a default write location so uploads don't need --location each time
shelby locations use shelbynet-1
```

### Set a default write location

Uploads need a resolvable location. Instead of passing `--location` every time, set a
location **hint** on the active context once — it's stored as `location_hint` and applied
to every subsequent write:

```bash
shelby locations              # list available locations (currently: shelbynet-1)
shelby locations use shelbynet-1   # persist it as the context's location hint

# Now uploads resolve the location automatically
shelby upload ./data.json config/data.json
```

> Blobs no longer take an expiration. As of CLI `0.2.0` the `-e/--expiration` flag was
> removed; registrations use the protocol's fixed payment window. (This changed alongside
> `@shelby-protocol/sdk@0.8.0`.)

### Recursive Operations

```bash
# Upload entire directory (destination is a prefix)
shelby upload ./my-folder/ backups/ -r --location shelbynet-1 --assume-yes

# Download all files matching a prefix — BOTH paths must end with '/'
shelby download images/ ./local-images/ -r

# Delete all files under a prefix (destination must end with /)
shelby delete temp/ -r --assume-yes
```

> **Recursive download slash rule:** with `-r`, **both** the source prefix and the
> destination must end with `/`. `shelby download images/ ./local-images -r` (no trailing
> slash on the destination) fails with "Invalid Download Options".

## Key Concepts

### Blob Naming

The upload command takes two positional arguments: source (local file) and destination (blob name):

```bash
shelby upload ./photo.jpg images/vacation/photo.jpg
```

The full blob identifier is: `@{account_address}/{blob_name}`

### Networks

**ShelbyNet is the default and the only available network.** The standard contexts are
`shelbynet` (the default) and `local` (needs a locally running stack).

| Network | Status | Description |
|---------|--------|-------------|
| `shelbynet` | ✅ Available | The Shelby development network and the CLI's **default context** — use this. |
| `local` | ⚙️ Dev only | Requires a locally running Shelby stack. |
| `testnet` | ⛔ Retired | The CLI keeps existing `testnet` contexts parseable (so you can list/delete them), but **using one errors** and new contexts can't select it. |
| Private production | 🔜 Coming soon (restricted) | A private production deployment is planned. Access will be restricted. Details TBD. |

> The `shelby faucet --network` flag now accepts **only `shelbynet`** (it defaults to the
> current context's network).

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No write location could be resolved… account has no default location or location hint" | Upload on a fresh account without `--location` | Pass `--location <name>` (run `shelby locations`; currently `shelbynet-1`) |
| "Invalid Download Options… source prefix / destination path must end with '/'" | Recursive download missing a trailing slash | End **both** the source prefix and destination with `/` |
| "Shelby Testnet has been retired. Update … to use shelbynet or local" | Active context (or one passed via `-c`) is a retired `testnet` context | Switch with `shelby context use shelbynet`, or delete the testnet context |
| "Could not connect to the Shelby RPC endpoint" / "fetch failed" | Wrong/down context, or no network access (sandbox/CI) | Verify the context with `shelby context list`; check network connectivity |
| "Account not funded" | Insufficient balance | Run `shelby faucet` (browser-driven, blocking) |
| "Blob not found" | File doesn't exist | Check the blob name (run `shelby account blobs`) |
| "Context not found" | Invalid context name | Run `shelby context list` |

## Reference

For complete command documentation, see `references/commands.md`.
