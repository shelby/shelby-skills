# Shelby Protocol SDK - Known Issues

Verified issues and quirks in the current SDK.

## 1. Inconsistent Field Names in BlobMetadata

The `getAccountBlobs()` / `getBlobMetadata()` responses use field names that differ from what developers might expect:

| Intuitive Name | Actual Field |
|----------------|-------------|
| `name` | `blobNameSuffix` |
| `createdAt` | `creationMicros` (microseconds since epoch) |
| `expiresAt` | `expirationMicros` (microseconds since epoch) |

**Workaround:** Map to cleaner structures:
```typescript
const files = blobs.map(blob => ({
  name: blob.blobNameSuffix,
  createdAt: new Date(blob.creationMicros / 1000),
  expiresAt: new Date(blob.expirationMicros / 1000),
  size: blob.size,
}));
```

## 2. `@aptos-labs/ts-sdk` Peer Dependency

`@aptos-labs/ts-sdk` is required as a direct dependency for types like `AccountAddress`, `Account`, and `InputEntryFunctionData`, but this is not listed as a peer dependency in the SDK packages.

**Workaround:** Install it directly:
```bash
pnpm install @aptos-labs/ts-sdk
```

## 3. Microsecond Timestamps

All timestamps in the SDK use microseconds since Unix epoch (not milliseconds). Convert with:
```typescript
// JS Date (milliseconds) → Shelby (microseconds)
const expirationMicros = Date.now() * 1000 + durationMs * 1000;

// Shelby (microseconds) → JS Date
const date = new Date(metadata.creationMicros / 1000);
```

## Resolved Issues

The following previously-reported issues have been fixed:

- **~~React hooks incompatible with cross-chain wallets~~** — Fixed. `useUploadBlobs` and other mutation hooks now accept `WalletAdapterSigner` (returned by ethereum-kit and solana-kit `useStorageAccount` hooks).
- **~~Missing low-level API documentation~~** — Addressed in `advanced.md` and `api-reference.md`.
