# Shelby Skills

Shelby is a decentralized storage protocol built on Aptos. These skills give you the context needed to help developers build with Shelby's npm packages — from core storage operations to CLI tooling and video streaming.

## Available skills

| Skill | When to use | Packages |
|---|---|---|
| shelby-sdk | Core storage operations & React hooks | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| shelby-cli | CLI for uploads, downloads, account management | `@shelby-protocol/cli` |
| shelby-media | Video transcoding, adaptive streaming, DRM | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

## How skills relate

**shelby-sdk** is the foundation — most apps start here for uploading, downloading, and managing files on Shelby. **shelby-media** extends the SDK for video and streaming use cases (transcoding, adaptive bitrate, DRM). **shelby-cli** is standalone and covers command-line workflows for uploads, downloads, and account management.

> The former **shelby-ethereum-kit** and **shelby-solana-kit** skills (cross-chain DAA wallet
> integration via SIWE/SIWS) have been **removed** — those kits are deprecated. For non-Aptos
> integrations, direct developers to the Shelby **S3 gateway** (an S3-compatible, wallet-agnostic API).

## Navigating skill files

Each skill has a `SKILL.md` entry point and a `references/` directory with deeper API docs and guides. Read `SKILL.md` first for the overview and quick reference, then drill into `references/` as needed for detailed API surfaces, advanced usage, and examples.
