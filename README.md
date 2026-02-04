# shelby-protocol-sdk Skill

A Claude Code skill for building decentralized storage applications with the Shelby Protocol TypeScript SDK.

## Overview

This skill enables Claude Code to help you build applications that:

- **Upload and download blobs** to decentralized storage on the Shelby network
- **Integrate cross-chain wallets** via Ethereum Kit (wagmi, ethers) and Solana Kit (@solana/web3.js)
- **Implement micropayment channels** for pay-per-download access
- **Use erasure coding** for fault-tolerant storage
- **Stream large files** with progress tracking and range requests

### Installation

Add this skill to Claude Code:

```bash
claude mcp add-skill /path/to/shelby-skill/shelby-protocol-sdk
```

Or clone and add:

```bash
git clone https://github.com/shelby/skill.git
claude mcp add-skill ./shelby-skill/shelby-protocol-sdk
```

### When to Use

This skill activates when you're working with:
- `@shelby-protocol/sdk` - Core SDK
- `@shelby-protocol/ethereum-kit` - Ethereum wallet integration
- `@shelby-protocol/solana-kit` - Solana wallet integration
- `ShelbyClient`, `ShelbyBlobClient`, `ShelbyRPCClient` classes
- Blob upload/download operations on Shelby network

## Skill Contents

```
shelby-protocol-sdk/
├── SKILL.md                          # Main skill definition
│   └── Quick starts for Node.js, Ethereum Kit, and Solana Kit
│   └── Core operations: upload, download, delete, list
│   └── Key concepts: expiration, naming, networks
│
└── references/
    ├── api-reference.md              # Full API documentation
    │   └── ShelbyClient, ShelbyBlobClient, ShelbyRPCClient
    │   └── Type definitions and static methods
    │
    ├── ethereum-kit.md               # Ethereum wallet integration
    │   └── Node.js and React usage
    │   └── wagmi/ethers integration
    │   └── SIWE (Sign-In with Ethereum)
    │
    ├── solana-kit.md                 # Solana wallet integration
    │   └── Node.js and React usage
    │   └── @solana/web3.js and wallet-adapter
    │   └── Manual upload implementation (required)
    │
    ├── advanced.md                   # Advanced features
    │   └── Micropayment channels
    │   └── Erasure coding (ClayErasureCodingProvider)
    │   └── Streaming and range requests
    │
    └── sdk-feedback.md               # Known issues and recommendations
        └── SDK improvement suggestions
        └── Workarounds for current limitations
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

See `references/solana-kit.md` for a complete implementation example.

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
- Use these versions (as of 2025):
  ```json
  {
    "@shelby-protocol/sdk": "^0.0.9",
    "@shelby-protocol/solana-kit": "^0.2.0",
    "@aptos-labs/ts-sdk": "^5.1.0"
  }
  ```

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

- [ ] **Package skill for distribution**
  - Publish to npm or Claude Code skill registry
  - Add semantic versioning

## Contributing

### Updating Documentation

1. Edit files in `shelby-protocol-sdk/references/` for detailed API docs
2. Edit `shelby-protocol-sdk/SKILL.md` for quick start guides and key concepts
3. Test changes by using the skill in Claude Code

### Adding Examples

1. Create example files in `shelby-protocol-sdk/assets/` (create directory if needed)
2. Ensure examples are self-contained and include all imports
3. Add comments explaining each step
4. Test that examples compile and run

### Reporting Issues

- SDK issues: Document in `references/sdk-feedback.md` with reproduction steps
- Skill issues: Open an issue in this repository

### Skill Development

This skill follows the Claude Code skill format:
- `SKILL.md` is the main entry point Claude reads
- Reference files are loaded on-demand for detailed information
- Keep the main skill file concise; use references for depth

## License

MIT
