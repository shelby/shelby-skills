# shelby-skills

Agent skills for building with the Shelby ecosystem. Each skill provides structured documentation that AI coding agents (Claude Code, Cursor, Copilot, etc.) can use to assist with Shelby development tasks.

Shelby is a decentralized storage protocol built on Aptos. It uses Derived Account Abstraction (DAA) to let wallets from other chains (Ethereum, Solana) derive and control storage accounts on Aptos.

## Quick Start

Install the plugin in Claude Code:

```bash
claude plugin add --path /path/to/shelby-skills
```

Then invoke any skill:

```
/shelby-skills:shelby-sdk       # Core storage operations
/shelby-skills:shelby-cli       # CLI commands
```

## Which Skill Should I Use?

| I want to... | Use this skill |
|--------------|---------------|
| Upload, download, or manage files with TypeScript/JavaScript | [shelby-sdk](skills/shelby-sdk/SKILL.md) |
| Connect an **Ethereum** wallet (MetaMask, RainbowKit, etc.) to Shelby | [shelby-ethereum-kit](skills/shelby-ethereum-kit/SKILL.md) |
| Connect a **Solana** wallet (Phantom, Backpack, etc.) to Shelby | [shelby-solana-kit](skills/shelby-solana-kit/SKILL.md) |
| Use the **command line** for uploads, downloads, and account management | [shelby-cli](skills/shelby-cli/SKILL.md) |
| **Transcode video** or build a **video player** with adaptive streaming | [shelby-media](skills/shelby-media/SKILL.md) |

## Skills

| Skill | Description | Packages |
|-------|-------------|----------|
| [shelby-sdk](skills/shelby-sdk/SKILL.md) | Core SDK and React hooks for decentralized storage | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| [shelby-ethereum-kit](skills/shelby-ethereum-kit/SKILL.md) | Ethereum wallet integration via DAA + SIWE | `@shelby-protocol/ethereum-kit` |
| [shelby-solana-kit](skills/shelby-solana-kit/SKILL.md) | Solana wallet integration via DAA + SIWS | `@shelby-protocol/solana-kit` |
| [shelby-cli](skills/shelby-cli/SKILL.md) | CLI tool for Shelby decentralized storage | `shelby` CLI |
| [shelby-media](skills/shelby-media/SKILL.md) | Video streaming and media applications | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

### How Skills Relate

```
shelby-sdk (foundation)
├── shelby-ethereum-kit (adds Ethereum wallet support)
├── shelby-solana-kit   (adds Solana wallet support)
└── shelby-media        (adds video transcoding + playback)

shelby-cli (standalone command-line tool)
```

## Structure

```
shelby-skills/
  .claude-plugin/
    plugin.json           # Plugin manifest
  skills/
    shelby-sdk/
      SKILL.md            # Entry point — core SDK and React hooks
      references/
        api-reference.md
        react.md
        advanced.md
        sdk-feedback.md
    shelby-ethereum-kit/
      SKILL.md            # Entry point — Ethereum DAA integration
      references/
        ethereum-kit.md
    shelby-solana-kit/
      SKILL.md            # Entry point — Solana DAA integration
      references/
        solana-kit.md
    shelby-cli/
      SKILL.md
      references/
        commands.md
    shelby-media/
      SKILL.md
      references/
        player.md
        media-prepare.md
  scripts/
    release.sh            # Local release helper
  .github/
    workflows/
      release.yml         # GitHub Actions release workflow
```

Each skill follows the same pattern: a `SKILL.md` at the directory root as the entry point, with a `references/` directory for detailed documentation.

## Installation

Add the plugin to Claude Code:

```bash
claude plugin add --path /path/to/shelby-skills
```

Or manually: symlink the repository into your Claude Code skills directory:

```bash
ln -s /path/to/shelby-skills ~/.claude/skills/shelby-skills
```

## Usage

Once installed, invoke skills with the `shelby-skills:<skill>` syntax:

- `/shelby-skills:shelby-sdk` — Core storage operations & React hooks
- `/shelby-skills:shelby-ethereum-kit` — Ethereum wallet integration (DAA + SIWE)
- `/shelby-skills:shelby-solana-kit` — Solana wallet integration (DAA + SIWS)
- `/shelby-skills:shelby-cli` — CLI commands for uploads, downloads, and account management
- `/shelby-skills:shelby-media` — Video streaming with transcoding, adaptive streaming, and DRM

## Releasing

Versions follow semver and are tracked via git tags (`v1.0.0`, `v1.1.0`, etc.).

**Local** — Run the release script:

```bash
scripts/release.sh [major|minor|patch]
```

**CI** — Trigger the [Release workflow](.github/workflows/release.yml) from GitHub Actions with a version bump type (`patch`, `minor`, or `major`). This creates a git tag and a GitHub Release with auto-generated notes.

## Contributing

To add a new skill:

1. Create a directory named `skills/shelby-<name>/`
2. Add a `SKILL.md` with frontmatter (`name`, `description`) and structured content
3. Add a `references/` directory for detailed API docs and guides
4. Update the skills table in this README

## License

See repository for license details.
