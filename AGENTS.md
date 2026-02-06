# Shelby Skills

Shelby is a decentralized storage protocol built on Aptos. These skills give you the context needed to help developers build with Shelby's npm packages — from core storage operations to cross-chain wallet integration and video streaming.

## Available skills

| Skill | When to use | Packages |
|---|---|---|
| shelby-sdk | Core storage operations & React hooks | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| shelby-ethereum-kit | Ethereum wallet integration (DAA + SIWE) | `@shelby-protocol/ethereum-kit` |
| shelby-solana-kit | Solana wallet integration (DAA + SIWS) | `@shelby-protocol/solana-kit` |
| shelby-cli | CLI for uploads, downloads, account management | `shelby` |
| shelby-media | Video transcoding, adaptive streaming, DRM | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

## How skills relate

**shelby-sdk** is the foundation — most apps start here for uploading, downloading, and managing files on Shelby. **shelby-ethereum-kit** and **shelby-solana-kit** add cross-chain wallet support on top of the SDK, enabling Ethereum or Solana users to authenticate and interact with Shelby without an Aptos wallet. **shelby-media** extends the SDK for video and streaming use cases (transcoding, adaptive bitrate, DRM). **shelby-cli** is standalone and covers command-line workflows for uploads, downloads, and account management.

## Navigating skill files

Each skill has a `SKILL.md` entry point and a `references/` directory with deeper API docs and guides. Read `SKILL.md` first for the overview and quick reference, then drill into `references/` as needed for detailed API surfaces, advanced usage, and examples.
