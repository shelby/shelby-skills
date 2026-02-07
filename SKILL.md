---
name: shelby
description: Shelby decentralized storage protocol on Aptos. Use when the user asks general questions about Shelby, needs help choosing which Shelby package to use, or is starting a new Shelby integration.
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

- General storage operations → load shelby-skills:shelby-sdk
- User mentions Ethereum, wagmi, viem, ethers, SIWE, MetaMask → load shelby-skills:shelby-ethereum-kit
- User mentions Solana, wallet-adapter, SIWS, Phantom → load shelby-skills:shelby-solana-kit
- User mentions CLI, terminal, `shelby` command, localnet → load shelby-skills:shelby-cli
- User mentions video, player, transcoding, HLS, DASH, DRM, CMAF, FFmpeg → load shelby-skills:shelby-media
- User mentions cross-chain, DAA, or Derived Account Abstraction → check if Ethereum or Solana context, load the appropriate kit
