---
name: shelby-sdk
description: Build decentralized storage applications with the Shelby Protocol SDK. Use when working with @shelby-protocol/sdk or @shelby-protocol/react.
---

# Shelby Protocol SDK

The Shelby Protocol SDK enables decentralized blob storage on the Aptos blockchain. This skill covers the core SDK (`@shelby-protocol/sdk`) and the React hooks (`@shelby-protocol/react`).

> **Which network?** ShelbyNet is currently the only working network. `Network.SHELBYNET` is the SDK default — use it. See [Networks](#networks).
>
> **Writes need a location.** As of the current release you must be able to resolve a write *location* (region) or on-chain registration aborts. A freshly created account has no default location, so pass `selectedLocation` (or set `locationHint`) on upload. See [Locations](#locations).

## Package Versions

Use these versions (verified against the published packages):

```jsonc
"@shelby-protocol/sdk": "^0.8.0",
"@shelby-protocol/react": "^4.2.0",     // only if you use the React hooks
"@aptos-labs/ts-sdk": "^5.2.1 || ^6.0.0" // required as a direct/peer dependency
```

> The SDK moved fast through `0.0.x`. If you are reading older docs or AI output pinned to `@shelby-protocol/sdk@^0.0.9` / `@shelby-protocol/react@^0.0.5`, treat them as stale — many methods and types below were renamed (`getBlobMetadata` → `getFullObjectMetadata`, `deleteBlob` → `deleteObject`, `BlobMetadata` → `FullObjectMetadata`, `putBlob` → `putBlobChunksets`).

## Wallet Support

The `@shelby-protocol/react` hooks accept a `Signer` that covers both native Aptos accounts and Aptos wallet adapters:

```typescript
type Signer = AccountSigner | WalletAdapterSigner;

// AccountSigner       = Aptos Account (Node.js / direct key usage)
// WalletAdapterSigner = { account, signAndSubmitTransaction } (any Aptos wallet adapter)
```

> **Non-Aptos wallets?** The former Ethereum/Solana DAA wallet kits are **deprecated**. For
> integrations that don't use an Aptos account, use the Shelby **S3 gateway** (an
> S3-compatible, wallet-agnostic API) rather than deriving a storage account from an
> external-chain wallet.

> ⚠️ **Wallet uploads are unauthenticated.** `useUploadBlobs` accepts both `Account` and wallet-adapter signers. For a wallet it runs register → upload → commit internally (Account signers use `batchUpload`); the byte-upload is **address-only / unauthenticated** (a wallet can't sign the RPC ownership challenge), so it needs an RPC that doesn't require upload auth — ShelbyNet does — and each blob costs one register + one commit prompt. On-chain hooks (register, delete, metadata) work with both signer types. See `references/react.md`.

## Installation

```bash
# Core SDK (plus the required Aptos SDK)
pnpm install @shelby-protocol/sdk @aptos-labs/ts-sdk

# React hooks (works with Aptos, Ethereum, and Solana wallets)
pnpm install @shelby-protocol/react @tanstack/react-query
```

## Quick Start - Core SDK (Node.js)

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Network, Account } from "@aptos-labs/ts-sdk";

// Initialize client (SHELBYNET is the default and only working network)
const client = new ShelbyNodeClient({ network: Network.SHELBYNET });
const account = Account.generate();

// Fund the account on ShelbyNet
await client.fundAccountWithAPT({ address: account.accountAddress, amount: 1_000_000 });
await client.fundAccountWithShelbyUSD({ address: account.accountAddress, amount: 1_000_000 });

// Discover a write location, then upload a blob
const [location] = await client.metadata.getLocationNames();
await client.upload({
  blobData: Buffer.from("Hello, Shelby!"),
  signer: account,
  blobName: "hello.txt",
  options: { selectedLocation: location },              // required on a fresh account
});

// Download a blob
const blob = await client.download({
  account: account.accountAddress,
  blobName: "hello.txt",
});

// Read the stream
const reader = blob.readable.getReader();
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}
```

## Quick Start - React Hooks

The React hooks perform on-chain operations with any `Signer`. `useUploadBlobs` uploads with both `Account` and wallet-adapter signers (wallet uploads are unauthenticated — see the caveat above).

```tsx
import { ShelbyClientProvider, useAccountBlobs, useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Network, Account } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();
const shelbyClient = new ShelbyClient({ network: Network.SHELBYNET });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <StorageComponent />
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}

function StorageComponent({ account }: { account: Account }) {
  // List blobs for an account
  const { data: blobs, isLoading } = useAccountBlobs({ account: account.accountAddress });

  // Upload blobs — hook takes optional client, mutation takes the signer
  const { mutateAsync: uploadBlobs } = useUploadBlobs({ client: shelbyClient });

  const handleUpload = async (file: File) => {
    const data = new Uint8Array(await file.arrayBuffer());
    const [location] = await shelbyClient.metadata.getLocationNames();
    await uploadBlobs({
      signer: account,                          // Account signer (wallets upload via the register+commit chain)
      blobs: [{ blobData: data, blobName: file.name }],
      options: { selectedLocation: location },
    });
  };

  return <div>{isLoading ? "Loading..." : `${blobs?.length ?? 0} blobs`}</div>;
}
```

See `references/react.md` for full React hooks documentation.

## Key Concepts

### No blob expiration

Blobs no longer take an expiration. As of `@shelby-protocol/sdk@0.8.0` blob registration was moved to the protocol's **fixed payment window** (a fixed registration fee), so uploads take no `expirationMicros` / duration parameter and blob metadata carries no expiry. There is nothing to configure — the window is set by the protocol. (This is distinct from **micropayment channel** expiration, which is unchanged; see `references/advanced.md`.)

### Blob Naming

Blob names can include paths using forward slashes:

```typescript
await client.upload({
  blobName: "images/photos/vacation.jpg",  // Valid path
  // ...
});
```

The full blob key is `@{account_address}/{blob_name}`.

### Locations

A **location** is a region a blob's data is written to. Writes resolve a location on-chain at registration; if none can be resolved the transaction **aborts** (`E_NO_LOCATION_SELECTED` → "No write location could be resolved…"). A freshly created account has no default location, so you must supply one.

Resolution order for a write:
1. `options.selectedLocation` — **authoritative**. The write lands there or aborts (e.g. it conflicts with the account's locked location preference).
2. `options.locationHint` / `ShelbyClientConfig.locationHint` — best-effort; honored only when the account is in the default `FollowHint` preference mode.
3. The account's on-chain default location preference, if set.

```typescript
// List the activated locations (regions) for the network
const locations = await client.metadata.getLocationNames();
// ShelbyNet currently exposes a single location.

await client.upload({
  blobData,
  signer: account,
  blobName: "file.txt",
  options: { selectedLocation: locations[0] },
});

// Or set a client-wide default hint (used when no per-write selectedLocation)
const client = new ShelbyClient({ network: Network.SHELBYNET, locationHint: locations[0] });

// The SDK also exports each network's default hint as a convenience — the SDK does
// not apply it automatically, so pass it explicitly (the CLI applies it for you):
import { NetworkToDefaultLocationHint } from "@shelby-protocol/sdk";
// NetworkToDefaultLocationHint[Network.SHELBYNET] === "shelbynet-1"
```

### Networks

```typescript
import { Network } from "@aptos-labs/ts-sdk";
import { shelbyNetworks, isShelbyNetwork } from "@shelby-protocol/sdk";

// ShelbyNetwork = Network.LOCAL | Network.SHELBYNET | Network.CUSTOM
Network.SHELBYNET  // The Shelby development network (default) — use this
Network.LOCAL      // Local development
Network.CUSTOM     // Self-configured deployment (see below); not offered by pickers

// shelbyNetworks === [Network.LOCAL, Network.SHELBYNET]  — CUSTOM is deliberately excluded
// isShelbyNetwork("custom") === true
```

| Network | Status | Notes |
|---------|--------|-------|
| `Network.SHELBYNET` | ✅ Available | The working network and the SDK default. |
| `Network.LOCAL` | ⚙️ Dev only | Requires a locally running Shelby stack. |
| `Network.CUSTOM` | 🔧 Self-configured | For a deployment the SDK ships no defaults for (e.g. a private network). You must supply every endpoint and contract address yourself (see [Custom networks](#custom-networks)). Excluded from `shelbyNetworks`, so network pickers/schemas don't offer it. |
| Testnet | ⛔ Removed | `Network.TESTNET` is **no longer a valid `ShelbyNetwork`**; testnet has been taken down. |

#### Custom networks

`Network.CUSTOM` (added in `@shelby-protocol/sdk@0.8.0`) ships no defaults, so the config must supply its own endpoints and contract addresses via `ShelbyClientConfig`: `aptos.fullnode`, `indexer.baseUrl`, `rpc.baseUrl`, `deployer`, `micropaymentsDeployer` (for a micropayment client), and `locationHint`. Construction is rejected up front if the fullnode is missing, rather than failing on the first request. On a custom network the deployers **do not** fall back to `SHELBY_DEPLOYER` / `MICROPAYMENTS_DEPLOYER` (that would silently address the shelbynet contracts), so set them explicitly.

### API Keys

API keys authenticate your app and manage rate limits. Without one, requests run in "anonymous" mode with lower limits. Pass it as `apiKey` in `ShelbyClientConfig`.

Instructions on obtaining an API key: https://docs.shelby.xyz/sdks/typescript/acquire-api-keys

## Configuration

```typescript
interface ShelbyClientConfig {
  // Required: the Shelby network (Network.SHELBYNET | Network.LOCAL)
  network: ShelbyNetwork;

  // Optional: API key for authentication
  apiKey?: string;

  // Optional: custom Aptos blockchain settings (AptosSettings)
  aptos?: AptosSettings;

  // Optional: custom Shelby-contract deployer address (defaults to SHELBY_DEPLOYER;
  // no default on Network.CUSTOM)
  deployer?: AccountAddress;

  // Optional: custom micropayments-contract deployer, addressed separately from the
  // Shelby contract (defaults to MICROPAYMENTS_DEPLOYER; no default on Network.CUSTOM)
  micropaymentsDeployer?: AccountAddress;

  // Optional: custom Shelby RPC node configuration
  rpc?: { baseUrl?: string; apiKey?: string };

  // Optional: custom indexer (GraphQL) configuration
  indexer?: { baseUrl?: string; apiKey?: string };

  // Optional: custom faucet configuration (now an object, not a string)
  faucet?: { baseUrl?: string; authToken?: string };

  // Optional: use Aptos orderless transactions (random-nonce replay protection)
  // so a single account can submit concurrently without sequence-number collisions.
  orderless?: boolean;

  // Optional: best-effort location hint applied to every write from this client.
  locationHint?: string;
}
```

> **Note:** There is no longer a `gasStationApiKey` field. Shelby-fee (ShelbyUSD) sponsorship is now configured per-operation via `options.usdSponsor` together with an Aptos `TRANSACTION_SUBMITTER` plugin. See `references/api-reference.md` (WriteBlobCommitmentsOptions / UsdSponsorOptions).

## Core Operations

### Upload

```typescript
await client.upload({
  blobData: Uint8Array,      // Required: the data to upload
  signer: Account,           // Required: account that signs/pays
  blobName: string,          // Required: name/path of the blob
  options?: {                // WriteBlobCommitmentsOptions
    selectedLocation?: string,   // Authoritative write location (see Locations)
    locationHint?: string,       // Best-effort hint
    chunksetSizeBytes?: number,  // Custom chunkset size
    usdSponsor?: { feePayerAddress: AccountAddress }, // ShelbyUSD fee sponsorship
    build?: { options?: InputGenerateTransactionOptions; withFeePayer?: boolean },
    submit?: InputTransactionPluginData,
  },
});
```

`upload()` buffers the whole blob in memory (accepts `Uint8Array`). For very large / streaming uploads, orchestrate the steps manually (`generateCommitments()` → `coordination.registerBlob()` → `rpc.putBlobChunksets()` → `coordination.commitObject()`); see `references/advanced.md`.

### Batch Upload

```typescript
await client.batchUpload({
  blobs: [
    { blobData: Buffer.from("File 1"), blobName: "file1.txt" },
    { blobData: Buffer.from("File 2"), blobName: "file2.txt" },
  ],
  signer: account,
  options: { selectedLocation },
});
```

### Download

```typescript
const blob = await client.download({
  account: AccountAddressInput,             // The blob owner's address
  blobName: string,                          // The blob name
  range?: { start: number; end?: number },   // Optional: partial download
});

// blob.readable      — a ReadableStream of the blob data
// blob.contentLength  — size in bytes
```

### Delete

```typescript
// Single
const { transaction } = await client.coordination.deleteObject({
  account: signer,
  blobName: "file-to-delete.txt",
});

// Multiple (atomic)
const { transaction } = await client.coordination.deleteMultipleObjects({
  account: signer,
  blobNames: ["a.txt", "b.txt"],   // suffixes, without the @address prefix
});
```

### List Blobs

```typescript
const blobs = await client.coordination.getAccountBlobs({
  account: accountAddress,
  pagination: { limit: 10, offset: 0 },
});

// Returns FullObjectMetadata[]:
//   name            — full name with @address prefix
//   blobNameSuffix  — just the blob name (use this)
//   size, encoding, creationMicros, sliceAddress, isWritten
//   uid?, encryption?, isDeleted?

const files = blobs.map(blob => ({
  name: blob.blobNameSuffix,
  size: blob.size,
  createdAt: new Date(blob.creationMicros / 1000),
}));
```

## Error Handling

```typescript
import {
  isBlobAlreadyExistsError,
  isAccessDeniedError,
  isBlobNotFoundError,
  describeLocationError,     // human-readable message for location failures
  StaleChannelStateError,
} from "@shelby-protocol/sdk";

try {
  await client.upload({ /* ... */ });
} catch (error) {
  const message = String(error?.message ?? error);

  // Location resolution failures (write region) — new in this release
  const locationProblem = describeLocationError(message);
  if (locationProblem) {
    // e.g. "No write location could be resolved…" → pass options.selectedLocation
  }

  if (isBlobNotFoundError(message))      { /* blob doesn't exist */ }
  if (isBlobAlreadyExistsError(message)) { /* name already registered */ }
  if (isAccessDeniedError(message))      { /* permission denied */ }

  if (error instanceof StaleChannelStateError) {
    const serverState = error.storedMicropayment; // sync local state and retry
  }
}
```

See `references/api-reference.md` for the full `ShelbyErrorCodes` / `ShelbyLocationErrorCodes` enums.

## HTTP Access

Download files directly via HTTP against the ShelbyNet RPC node:

```bash
curl https://api.shelbynet.shelby.xyz/shelby/v1/blobs/{account_address}/{blob_name}
```

`new ShelbyClient({ network: Network.SHELBYNET })` connects to ShelbyNet with **no endpoint configuration needed** — its built-in defaults are live. The client's own default RPC host is `shelby.shelbynet.shelby.xyz`; the `api.shelbynet.shelby.xyz` host used above (and by the CLI) is an equally valid gateway to the same deployment. Note both host and path carry a `/v1`: `api.shelbynet.shelby.xyz/v1` is the **Aptos fullnode**, while blobs are served by the **Shelby RPC** under `/shelby` (hence `/shelby/v1/blobs/…`).

The SDK also exports the network→URL maps if you need them programmatically:

```typescript
import { NetworkToShelbyRPCBaseUrl } from "@shelby-protocol/sdk";
// NetworkToShelbyRPCBaseUrl.shelbynet is the RPC base the client uses by default.
```

Override `rpc.baseUrl` / `indexer.baseUrl` in `ShelbyClientConfig` only if you need to point at a non-default deployment.

## Reference Files

- `references/api-reference.md` — Full API for `ShelbyClient`, `ShelbyBlobClient`, `ShelbyRPCClient`, `ShelbyMetadataClient`, `ShelbyMicropaymentChannelClient`, `ShelbyPlacementGroupClient`
- `references/react.md` — React hooks (includes the browser-upload caveat and Account-signer flow)
- `references/advanced.md` — Micropayments, erasure coding, the register→upload→commit flow, parallel commitments, low-level SP writes
- `references/sdk-feedback.md` — Known issues and rough edges in the current SDK

## Related Skills

- **shelby-cli** — Command-line uploads/downloads/account management (mirrors the location + shelbynet defaults)
- **shelby-media** — Video transcoding, adaptive streaming, and DRM on top of the SDK

> Non-Aptos wallet integrations (formerly the Ethereum/Solana DAA kits) are **deprecated** —
> use the Shelby **S3 gateway** instead.
