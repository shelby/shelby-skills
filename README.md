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

Use these versions (as of 2026):
```json
{
  "@shelby-protocol/sdk": "^0.0.9",
  "@shelby-protocol/react": "^0.0.9",
  "@shelby-protocol/ethereum-kit": "^0.2.0",
  "@shelby-protocol/solana-kit": "^0.2.0",
  "@aptos-labs/ts-sdk": "^5.1.0"
}
```

## Current Limitations

### SDK Limitations

#### 1. `@shelby-protocol/react` Incompatibility with Cross-Chain Kits

The `@shelby-protocol/react` package (including `useUploadBlobs`) **only works with native Aptos wallets**. It does NOT work with Solana Kit or Ethereum Kit despite these being official cross-chain solutions.

**Impact:** Developers using Solana or Ethereum wallets encounter cryptic "Failed to fetch" errors when attempting to use `useUploadBlobs`.

**Workaround:** Implement manual upload using the 4-step process:
1. Generate commitments with `ClayErasureCodingProvider` + `generateCommitments`
2. Create registration payload with `ShelbyBlobClient.createRegisterBlobPayload`
3. Sign and submit the transaction
4. Upload blob data with `client.rpc.putBlob`

See `shelby-protocol/references/solana-kit.md` for a complete implementation example.

#### 2. Inconsistent API Response Field Names

The `getAccountBlobs()` response uses non-intuitive field names:

| Expected | Actual |
|----------|--------|
| `name` | `blobNameSuffix` |
| `createdAt` | `creationMicros` |
| `expiresAt` | `expirationMicros` |

**Workaround:** Map responses to cleaner structures:
```typescript
const files = blobs.map(blob => ({
  name: blob.blobNameSuffix,
  createdAt: new Date(blob.creationMicros / 1000),
  expiresAt: new Date(blob.expirationMicros / 1000),
}));
```

#### 3. Package Version Complexity

- Documentation may reference versions that don't exist on npm
- `@aptos-labs/ts-sdk` is required as a direct dependency but not documented

### Skill Limitations

- No executable example scripts that can be run directly
- No example project templates
- Limited troubleshooting guidance for common errors

## Prioritized Backlog

### P0 - Critical (SDK Workarounds)

- [ ] **Document `useUploadBlobs` incompatibility more prominently**
  - Add warning banner at top of skill
  - Include in error message suggestions when Claude detects React + cross-chain usage

- [ ] **Create troubleshooting guide for common errors**
  - "Failed to fetch" with cross-chain wallets
  - "Account not funded" errors
  - Type mismatches between SDK versions

### P1 - High Priority (Skill Improvements)

- [ ] **Add executable script examples**
  - `examples/upload-nodejs.ts` - Basic upload with core SDK
  - `examples/upload-ethereum.ts` - Upload with Ethereum Kit
  - `examples/upload-solana.ts` - Upload with Solana Kit
  - Scripts should be runnable with `npx ts-node examples/upload-nodejs.ts`

- [ ] **Create compatibility matrix**
  - Table showing which SDK versions work together
  - Which React hooks work with which wallet types
  - Minimum Node.js/TypeScript versions

- [ ] **Add example project templates to `assets/`**
  - Next.js + wagmi template
  - Next.js + Solana wallet-adapter template
  - Node.js CLI template

### P2 - Medium Priority (Documentation)

- [ ] **Add more real-world usage examples**
  - File sharing app pattern
  - NFT metadata storage pattern
  - User-generated content storage

- [ ] **Improve error handling documentation**
  - Catalog all error types and their meanings
  - Add recovery strategies for each error type

- [ ] **Add migration guide between SDK versions**
  - Breaking changes between versions
  - Automated migration scripts

### P3 - Nice to Have

- [ ] **Add automated tests for example code**
  - Verify code snippets compile
  - Integration tests against testnet

- [ ] **Create visual tutorials**
  - Architecture diagrams
  - Flow charts for upload/download process

- [ ] **Package skills for distribution**
  - Publish to npm or Claude Code skill registry
  - Add semantic versioning

## Contributing

### Updating Documentation

1. Edit files in `shelby-protocol/references/` for detailed SDK API docs
2. Edit files in `shelby-cli/references/` for CLI command docs
3. Edit `*/SKILL.md` for quick start guides and key concepts
4. Test changes by using the skill in Claude Code

### Adding Examples

1. Create example files in `*/assets/` (create directory if needed)
2. Ensure examples are self-contained and include all imports
3. Add comments explaining each step
4. Test that examples compile and run

### Reporting Issues

- SDK issues: Document in `shelby-protocol/references/sdk-feedback.md` with reproduction steps
- Skill issues: Open an issue in this repository

### Skill Development

These skills follow the Claude Code skill format:
- `SKILL.md` is the main entry point Claude reads
- Reference files are loaded on-demand for detailed information
- Keep the main skill file concise; use references for depth

## License

MIT
