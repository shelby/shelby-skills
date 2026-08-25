# Shelby Protocol SDK - Known Issues

Verified issues and rough edges in the current SDK (`@shelby-protocol/sdk@^0.8.0`, `@shelby-protocol/react@^4.2.0`).

## 1. Wallet uploads are unauthenticated (address-only)

A wallet-adapter signer can't sign the RPC ownership challenge, so `useUploadBlobs` (and the lower-level `useCommitBlobs`) upload a wallet's bytes **address-only / unauthenticated**. This works only against an RPC that doesn't require upload auth — **ShelbyNet does**. Committing costs one wallet prompt per blob. `Account` signers (which hold a key) upload authenticated via `batchUpload`; browser wallet adapters do not. Full walkthrough in `references/react.md`.

## 2. A write location must be resolvable

Registration aborts on chain if no location can be resolved (`E_NO_LOCATION_SELECTED` → "No write location could be resolved…"). A freshly created account has no default location.

**Workaround:** Pass `options.selectedLocation` (from `client.metadata.getLocationNames()`), or set `ShelbyClientConfig.locationHint`. Use `describeLocationError(message)` to turn location failures into readable messages.

## 3. Field names in FullObjectMetadata are non-obvious

The `getAccountBlobs()` / `getFullObjectMetadata()` responses use field names that differ from what developers might expect:

| Intuitive name | Actual field |
|----------------|-------------|
| `name` | `blobNameSuffix` (the full `name` includes the `@address/` prefix) |
| `createdAt` | `creationMicros` (microseconds since epoch) |

**Workaround:** Map to a cleaner structure:
```typescript
const files = blobs.map(blob => ({
  name: blob.blobNameSuffix,
  createdAt: new Date(blob.creationMicros / 1000),
  size: blob.size,
}));
```

> Blobs no longer expire, so `FullObjectMetadata` has no `expirationMicros` field (removed in `0.8.0`).

## 4. `@aptos-labs/ts-sdk` must be installed directly

It is now declared as a peer dependency (`^5.2.1 || ^6.0.0`), so package managers will warn if it is missing, but it is not bundled — you still install it yourself and import Aptos types (`Account`, `AccountAddress`, `Network`, …) from it directly.

```bash
pnpm install @aptos-labs/ts-sdk
```

## 5. Microsecond timestamps everywhere

All timestamps are microseconds since Unix epoch (not milliseconds):
```typescript
// JS Date (ms) → Shelby (µs), e.g. a micropayment-channel expiration
const expirationMicros = Date.now() * 1000 + durationMs * 1000;
// Shelby (µs) → JS Date
const date = new Date(metadata.creationMicros / 1000);
```
Note `BlobActivity.timestamp` is a **string**, and `ChannelInfo` numeric fields are `bigint`.

## Resolved / changed since earlier releases

- **~~Inconsistent method/type names~~** — The API was renamed in the `0.x` line: `getBlobMetadata` → `getFullObjectMetadata`, `deleteBlob`/`deleteMultipleBlobs` → `deleteObject`/`deleteMultipleObjects`, `BlobMetadata` → `FullObjectMetadata`, `putBlob` → `putBlobChunksets`. Older docs/snippets pinned to `^0.0.9` are stale.
- **~~`gasStationApiKey` config field~~** — Removed. ShelbyUSD fee sponsorship is now per-operation via `WriteBlobCommitmentsOptions.usdSponsor` plus an Aptos `TRANSACTION_SUBMITTER` plugin.
- **~~Testnet network~~** — `Network.TESTNET` is no longer a valid `ShelbyNetwork`; ShelbyNet is the only working network.
- **~~React hooks incompatible with wallet adapters~~** — Resolved: Aptos wallet-adapter signers work with the on-chain hooks and, since react 4.1.0 (#1917, published in the 4.2.0 line), with `useUploadBlobs` (wallet uploads are unauthenticated — see issue 1).
- **Cross-chain DAA wallet kits deprecated** — the `@shelby-protocol/ethereum-kit` / `@shelby-protocol/solana-kit` skills were removed. For non-Aptos integrations, use the Shelby **S3 gateway** (S3-compatible, wallet-agnostic).
- **~~Blob expiration~~** — Removed in `sdk@0.8.0` / `react@4.2.0`. Uploads and registration no longer take `expirationMicros`, `FullObjectMetadata` carries no expiry, and the expiration error codes / `isBlobExpiredError` helper are gone. Blobs now use the protocol's fixed payment window. (Micropayment **channel** expiration is unaffected.)
