---
name: shelby
description: Shelby decentralized storage protocol on Aptos. Use when the user asks general questions about Shelby, needs help choosing which Shelby package to use, or is starting a new Shelby integration.
---

# Shelby Protocol

Shelby is a decentralized storage protocol built on Aptos. This suite provides skills for core storage, CLI tooling, and video streaming.

## Skill routing

Choose the right skill based on what the user needs:

| Need | Skill | Packages |
|------|-------|----------|
| Upload, download, delete files; React hooks for storage | shelby-sdk | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| CLI uploads, downloads, account management | shelby-cli | `@shelby-protocol/cli` |
| Video transcoding, adaptive streaming, DRM, player | shelby-media | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

## How skills relate

- **shelby-sdk** is the foundation — most apps start here
- **shelby-media** extends the SDK for video/streaming use cases
- **shelby-cli** is standalone for command-line workflows

> **Cross-chain / non-Aptos wallets:** the Ethereum and Solana wallet kits (DAA + SIWE/SIWS)
> are **deprecated and no longer covered here**. For integrations that don't use an Aptos
> account, point users to the Shelby **S3 gateway** (an S3-compatible API), which is
> wallet-agnostic and where most such integrations are expected to head.

## Routing guidance

- General storage operations → Read `skills/shelby-sdk/SKILL.md`
- User mentions CLI, terminal, `shelby` command, localnet → Read `skills/shelby-cli/SKILL.md`
- User mentions video, player, transcoding, HLS, DASH, DRM, CMAF, FFmpeg → Read `skills/shelby-media/SKILL.md`
- User mentions Ethereum/Solana wallets, cross-chain, DAA, SIWE/SIWS, MetaMask, Phantom → the wallet kits are deprecated; steer them to the Shelby **S3 gateway** (S3-compatible, wallet-agnostic) instead.
