# Shelby Skills

Claude Code skills for building with Shelby decentralized storage.

## Skills

### shelby-protocol

Build decentralized storage applications with the Shelby Protocol SDK.

```bash
claude skill add ./shelby-protocol
```

**Covers:**
- `@shelby-protocol/sdk` - Core SDK for Node.js and browser
- `@shelby-protocol/react` - React hooks (Aptos wallets only)
- `@shelby-protocol/ethereum-kit` - Ethereum wallet integration
- `@shelby-protocol/solana-kit` - Solana wallet integration

### shelby-cli

Command-line interface for Shelby storage operations.

```bash
claude skill add ./shelby-cli
```

**Covers:**
- File uploads and downloads
- Account and context management
- Local development with `shelby localnet`

## Critical Warning

**`@shelby-protocol/react` only works with native Aptos wallets.**

If you're using Ethereum or Solana wallets, you cannot use `useUploadBlobs` or other hooks from `@shelby-protocol/react`. Instead, use the manual upload flow documented in the cross-chain kit references.

## Directory Structure

```
shelby-skills/
├── README.md
├── shelby-protocol/
│   ├── SKILL.md
│   └── references/
│       ├── api-reference.md
│       ├── react.md
│       ├── ethereum-kit.md
│       ├── solana-kit.md
│       ├── advanced.md
│       └── sdk-feedback.md
└── shelby-cli/
    ├── SKILL.md
    └── references/
        └── commands.md
```

## Quick Links

**SDK Documentation:**
- [Core SDK Quick Start](./shelby-protocol/SKILL.md#quick-start---core-sdk-nodejs)
- [React Hooks](./shelby-protocol/references/react.md) (Aptos only)
- [Ethereum Kit](./shelby-protocol/references/ethereum-kit.md)
- [Solana Kit](./shelby-protocol/references/solana-kit.md)
- [API Reference](./shelby-protocol/references/api-reference.md)

**CLI Documentation:**
- [CLI Quick Start](./shelby-cli/SKILL.md#quick-start)
- [Command Reference](./shelby-cli/references/commands.md)

## Package Versions

Use these versions (as of 2025):
```json
{
  "@shelby-protocol/sdk": "^0.0.9",
  "@shelby-protocol/react": "^0.0.9",
  "@shelby-protocol/ethereum-kit": "^0.2.0",
  "@shelby-protocol/solana-kit": "^0.2.0",
  "@aptos-labs/ts-sdk": "^5.1.0"
}
```

## Contributing

1. Edit files in the appropriate skill directory
2. Test changes by using the skill in Claude Code
3. Submit a PR with your improvements

## License

MIT
