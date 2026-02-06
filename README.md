# shelby-skills

Agent skills for building with the Shelby ecosystem. Each skill provides structured documentation that AI coding agents (Claude Code, Cursor, Copilot, etc.) can use to assist with Shelby development tasks.

## Skills

| Skill | Description | Packages |
|-------|-------------|----------|
| [shelby-sdk](shelby-sdk/SKILL.md) | Core SDK and React hooks for decentralized storage | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| [shelby-ethereum-kit](shelby-ethereum-kit/SKILL.md) | Ethereum wallet integration via DAA | `@shelby-protocol/ethereum-kit` |
| [shelby-solana-kit](shelby-solana-kit/SKILL.md) | Solana wallet integration via DAA | `@shelby-protocol/solana-kit` |
| [shelby-cli](shelby-cli/SKILL.md) | CLI tool for Shelby decentralized storage | `shelby` CLI |
| [shelby-media](shelby-media/SKILL.md) | Video streaming and media applications | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

## Structure

```
shelby-skills/
  shelby-sdk/
    SKILL.md              # Entry point — core SDK and React hooks
    references/
      api-reference.md
      react.md
      advanced.md
      sdk-feedback.md
  shelby-ethereum-kit/
    SKILL.md              # Entry point — Ethereum DAA integration
    references/
      ethereum-kit.md
  shelby-solana-kit/
    SKILL.md              # Entry point — Solana DAA integration
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

Add a skill to Claude Code as a slash command:

```bash
claude skill add --name shelby-sdk --path ./shelby-sdk
```

Or manually: copy the skill directory into your Claude Code skills configuration.

## Usage

Once installed, skills give your AI agent context about Shelby packages:

- **shelby-sdk** — Scaffold blob storage apps, generate wallet integrations, reference SDK and React hooks APIs
- **shelby-ethereum-kit** — Ethereum wallet integration with Derived Account Authorization (DAA) and SIWE
- **shelby-solana-kit** — Solana wallet integration with Derived Account Authorization (DAA) and SIWS
- **shelby-cli** — Get help with CLI commands for uploading, downloading, and managing decentralized storage
- **shelby-media** — Build video streaming pipelines with transcoding, adaptive streaming, and DRM

## Releasing

Versions follow semver and are tracked via git tags (`v1.0.0`, `v1.1.0`, etc.).

**Local** — Run the release script:

```bash
scripts/release.sh [major|minor|patch]
```

**CI** — Trigger the [Release workflow](.github/workflows/release.yml) from GitHub Actions with a version bump type (`patch`, `minor`, or `major`). This creates a git tag and a GitHub Release with auto-generated notes.

## Contributing

To add a new skill:

1. Create a directory named `shelby-<name>/`
2. Add a `SKILL.md` with frontmatter (`name`, `description`) and structured content
3. Add a `references/` directory for detailed API docs and guides
4. Update the skills table in this README

## License

See repository for license details.
