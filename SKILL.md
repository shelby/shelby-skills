---
name: shelby
description: "Route to the correct Shelby skill for decentralized storage on Aptos — upload/download files, connect Ethereum/Solana wallets, transcode video, or manage storage via CLI. Use when the user asks general questions about Shelby, needs help choosing a Shelby package, or is starting a new Shelby integration."
---

# Shelby Protocol

Shelby is a decentralized storage protocol built on Aptos. This suite provides skills for core storage, cross-chain wallet integration, CLI tooling, and video streaming.

## Skill routing

Choose the right skill based on what the user needs:

| Need | Skill | Packages |
|------|-------|----------|
| Upload, download, delete files; React hooks for storage | shelby-sdk | `@shelby-protocol/sdk`, `@shelby-protocol/react` |
| Ethereum wallet → Shelby storage (DAA + SIWE) | shelby-ethereum-kit | `@shelby-protocol/ethereum-kit` |
| Solana wallet → Shelby storage (DAA + SIWS) | shelby-solana-kit | `@shelby-protocol/solana-kit` |
| CLI uploads, downloads, account management | shelby-cli | `shelby` (npm) |
| Video transcoding, adaptive streaming, DRM, player | shelby-media | `@shelby-protocol/player`, `@shelby-protocol/media-prepare` |

## How skills relate

- **shelby-sdk** is the foundation — most apps start here
- **shelby-ethereum-kit** and **shelby-solana-kit** add cross-chain wallet support on top of the SDK
- **shelby-media** extends the SDK for video/streaming use cases
- **shelby-cli** is standalone for command-line workflows

## Routing guidance

- General storage operations → Read `skills/shelby-sdk/SKILL.md`
- User mentions Ethereum, wagmi, viem, ethers, SIWE, MetaMask → Read `skills/shelby-ethereum-kit/SKILL.md`
- User mentions Solana, wallet-adapter, SIWS, Phantom → Read `skills/shelby-solana-kit/SKILL.md`
- User mentions CLI, terminal, `shelby` command, localnet → Read `skills/shelby-cli/SKILL.md`
- User mentions video, player, transcoding, HLS, DASH, DRM, CMAF, FFmpeg → Read `skills/shelby-media/SKILL.md`
- User mentions cross-chain, DAA, or Derived Account Abstraction → check if Ethereum or Solana context, read the appropriate kit's SKILL.md
