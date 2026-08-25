# Shelby Protocol SDK - API Reference

Complete API documentation for the core Shelby Protocol TypeScript SDK (`@shelby-protocol/sdk@^0.8.0`).

## Entry Points

```typescript
import { ShelbyClient } from "@shelby-protocol/sdk/browser";     // browser
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";    // Node.js (recommended server-side)
// Parallel commitment helpers (Node worker threads):
import { generateCommitmentsParallel } from "@shelby-protocol/sdk/node/parallel";
// Low-level storage-provider write client:
import { SpWriteClient } from "@shelby-protocol/sdk/sp";
```

Most named exports (clients, types, constants, error helpers) are re-exported from all three of `.../node`, `.../browser`, and the shared core, so `import { ShelbyBlobClient, FullObjectMetadata } from "@shelby-protocol/sdk/node"` works.

## Table of Contents

- [ShelbyClient](#shelbyclient)
- [ShelbyNodeClient](#shelbynodeclient)
- [ShelbyBlobClient (coordination)](#shelbyblobclient-coordination)
- [ShelbyRPCClient (rpc)](#shelbyrpcclient-rpc)
- [ShelbyMetadataClient (metadata)](#shelbymetadataclient-metadata)
- [ShelbyPlacementGroupClient](#shelbyplacementgroupclient)
- [ShelbyMicropaymentChannelClient](#shelbymicropaymentchannelclient)
- [Types](#types)
- [Error Handling](#error-handling)
- [Constants](#constants)
- [Static Payload Methods](#static-payload-methods)

## ShelbyClient

The main client. It composes blockchain operations (`coordination`), protocol metadata (`metadata`), and storage operations (`rpc`).

### Constructor

```typescript
const client = new ShelbyClient(config: ShelbyClientConfig, provider?: ErasureCodingProvider);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `ShelbyClientConfig` | Yes | Client configuration |
| `provider` | `ErasureCodingProvider` | No | Shared erasure coding provider (lazily created if omitted) |

**Properties:**

- `coordination: ShelbyBlobClient` — blockchain operations (register, delete, commit, blob queries)
- `metadata: ShelbyMetadataClient` — protocol-level metadata (locations, storage providers, slices)
- `rpc: ShelbyRPCClient` — storage operations (upload/download against RPC nodes)
- `config: ShelbyClientConfig`
- `aptos: Aptos` — the underlying Aptos client
- `baseUrl: string` — the Shelby RPC base URL

### upload()

Uploads a blob. Handles commitment generation, on-chain registration, the chunkset upload, and the on-chain commit. Returns `Promise<void>`.

```typescript
await client.upload({
  blobData: Uint8Array,
  signer: Account,
  blobName: string,
  options?: UploadOptions,   // = WriteBlobCommitmentsOptions
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `blobData` | `Uint8Array` | Yes | Raw data (buffered fully in memory) |
| `signer` | `Account` | Yes | Account that signs and pays |
| `blobName` | `BlobName` | Yes | Name/path of the blob |
| `options.selectedLocation` | `string` | No | Authoritative write location (see [Locations](../SKILL.md#locations)) |
| `options.locationHint` | `string` | No | Best-effort location hint |
| `options.chunksetSizeBytes` | `number` | No | Custom chunkset size |
| `options.usdSponsor` | `UsdSponsorOptions` | No | ShelbyUSD fee sponsorship (requires a transaction submitter) |
| `options.build` | `BuildOptions` | No | Aptos transaction build options (`options`, `withFeePayer`) |
| `options.submit` | `InputTransactionPluginData` | No | Aptos transaction submitter plugin data |

> For streaming / very large blobs (e.g. > 2 GiB), orchestrate the steps manually with `generateCommitments()`, `coordination.registerBlob()`, `rpc.putBlobChunksets()` (accepts a `ReadableStream`), and `coordination.commitObject()`. See `advanced.md`.

### batchUpload()

Registers multiple blobs in one transaction, then uploads and commits each. Returns `Promise<void>`.

```typescript
await client.batchUpload({
  blobs: Array<{ blobData: Uint8Array; blobName: BlobName }>,
  signer: Account,
  options?: UploadOptions,
});
```

### download()

```typescript
const blob: ShelbyBlob = await client.download({
  account: AccountAddressInput,
  blobName: string,
  range?: { start: number; end?: number },
});
```

**Returns:** `ShelbyBlob`

```typescript
interface ShelbyBlob {
  account: AccountAddress;   // The blob owner
  name: string;              // The blob name
  readable: ReadableStream;  // Stream of blob data
  contentLength: number;     // Size in bytes
}
```

### fundAccountWithShelbyUSD() / fundAccountWithAPT()

```typescript
const hash: string = await client.fundAccountWithShelbyUSD({ address: AccountAddressInput, amount: number });
const hash: string = await client.fundAccountWithAPT({ address: AccountAddressInput, amount: number });
```

Fund an account with ShelbyUSD (storage payments) or APT (gas). Both work on ShelbyNet.

---

## ShelbyNodeClient

Node.js entry point. `ShelbyNodeClient extends ShelbyClient` — same API surface, imported from `@shelby-protocol/sdk/node`. Use it server-side; use `ShelbyClient` from `@shelby-protocol/sdk/browser` in the browser. For CPU-bound commitment generation in Node, also see `@shelby-protocol/sdk/node/parallel`.

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
const client = new ShelbyNodeClient(config: ShelbyClientConfig, provider?: ErasureCodingProvider);
```

---

## ShelbyBlobClient (coordination)

Blockchain operations: registering blobs, committing writes, querying metadata, and managing the blob lifecycle. Reached via `client.coordination`.

```typescript
import { ShelbyBlobClient } from "@shelby-protocol/sdk";
const blobClient = new ShelbyBlobClient(config: ShelbyClientConfig, defaultOptions?: WriteBlobCommitmentsOptions);
```

### Blob lifecycle model

Registration creates a **pending** blob addressed by an on-chain **UID** (not yet bound to its object name). The full flow is:

1. `registerBlob()` / `batchRegisterBlobs()` → publishes a `BlobRegisteredEvent` carrying the UID.
2. Read the UID from the register transaction's events with `ShelbyBlobClient.registeredBlobUids(events, deployer)`.
3. Upload bytes with `rpc.putBlobChunksets({ uid, ... })`, which returns storage-provider acks.
4. `commitObject()` binds the written blob under its object name (may include the SP acks atomically).

A commit can be *rejected* while the transaction still succeeds — inspect events with `ShelbyBlobClient.findObjectCommitRejection(events, deployer, uid)` (or catch `ObjectCommitRejectedError`). `client.upload()` performs all of this for you.

### getFullObjectMetadata()

Metadata for a committed blob by name. Returns `undefined` if not found.

```typescript
const metadata: FullObjectMetadata | undefined = await blobClient.getFullObjectMetadata({
  account: AccountAddressInput,
  name: BlobName,
});
```

### getFullObjectMetadataByUid()

Metadata by on-chain UID, including **pending** (registered-but-not-committed) blobs that name lookups cannot resolve. `name`/`blobNameSuffix` are empty for UID-only lookups.

```typescript
const metadata: FullObjectMetadata | undefined = await blobClient.getFullObjectMetadataByUid(uid: bigint);
```

### getAccountBlobs()

All (committed, non-deleted) blobs for an account.

```typescript
const blobs: FullObjectMetadata[] = await blobClient.getAccountBlobs({
  account: AccountAddressInput,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blobs_Order_By,
  where?: Omit<Blobs_Bool_Exp, "owner">,
});
```

### getBlobs()

Blobs matching a filter (defaults to committed, non-deleted; override any key via `where`).

```typescript
const blobs: FullObjectMetadata[] = await blobClient.getBlobs({
  where?: Blobs_Bool_Exp,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blobs_Order_By,
});
```

**Where / order-by examples:**

```typescript
{ owner: { _eq: "0x123..." } }
{ blob_name: { _like: "%images%" } }
{ created_at: "desc" }
```

### getBlobsCount() / getTotalBlobsSize()

```typescript
const count: number = await blobClient.getBlobsCount({ where?: Blobs_Bool_Exp });
const bytes: number = await blobClient.getTotalBlobsSize({ where?: Blobs_Bool_Exp });
```

### getBlobActivities() / getBlobActivitiesCount()

```typescript
const activities: BlobActivity[] = await blobClient.getBlobActivities({
  where?: Blob_Activities_Bool_Exp,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blob_Activities_Order_By,
});
const count: number = await blobClient.getBlobActivitiesCount({ where?: Blob_Activities_Bool_Exp });
```

### registerBlob()

Registers a blob commitment on chain (creates a pending blob). Usually called internally by `upload()`.

```typescript
const { transaction } = await blobClient.registerBlob({
  account: Account,
  blobName: BlobName,
  blobMerkleRoot: string,   // hex string
  size: number,
  encryption?: BlobEncryption,
  config?: ErasureCodingConfig,
  options?: WriteBlobCommitmentsOptions,   // selectedLocation / locationHint live here
});
```

### batchRegisterBlobs()

```typescript
const { transaction } = await blobClient.batchRegisterBlobs({
  account: Account,
  blobs: Array<{ blobName: BlobName; blobSize: number; blobMerkleRoot: string }>,
  encryption?: BlobEncryption,
  config?: ErasureCodingConfig,
  options?: WriteBlobCommitmentsOptions,
});
```

### commitObject()

Binds a written pending blob under its object name, finalizing the upload. SP acks may be applied atomically here.

```typescript
const { transaction } = await blobClient.commitObject({
  account: Account,
  uid: bigint,
  blobName: BlobName,
  overwrite: boolean,
  storageProviderAcks: StorageProviderAck[],
  options?: AckTransactionOptions,
});
```

### deleteObject()

```typescript
const { transaction } = await blobClient.deleteObject({
  account: Account,
  blobName: BlobName,
  options?: InputGenerateTransactionOptions,
});
```

### deleteMultipleObjects()

Atomic multi-delete (all or nothing).

```typescript
const { transaction } = await blobClient.deleteMultipleObjects({
  account: Account,
  blobNames: BlobName[],   // suffixes, without the @address prefix
  options?: InputGenerateTransactionOptions,
});
```

### Static event helpers

```typescript
// One { objectName, uid } entry per registered blob, parsed from BlobRegisteredEvent.
ShelbyBlobClient.registeredBlobUids(events, deployer): { objectName: string; uid: bigint }[];

// The CommitRejectionReason ("AlreadyExists" | "NoPriorVersion" | "EtagMismatch"),
// or undefined if the commit was applied.
ShelbyBlobClient.findObjectCommitRejection(events, deployer, uid): CommitRejectionReason | undefined;
```

### Errors thrown

- `MissingTransactionSubmitterError` — `usdSponsor` was set without an Aptos `TRANSACTION_SUBMITTER` plugin configured.
- `ObjectCommitRejectedError` — a `commit_object` was rejected (transaction succeeded, write did not apply). Has `blobName`, `uid`, `reason`.

---

## ShelbyRPCClient (rpc)

Direct interaction with Shelby RPC nodes for blob storage/retrieval. Reached via `client.rpc`.

```typescript
import { ShelbyRPCClient } from "@shelby-protocol/sdk";
const rpcClient = new ShelbyRPCClient(config: ShelbyClientConfig, options?: {
  signChallengeHandler?: (account: Account, challenge: string) => BlobOwnerAuth;   // custom challenge signing (e.g. derivable/DAA auth)
});
```

### getChallenge() / signChallenge()

```typescript
const { challenge, expiresAt } = await rpcClient.getChallenge(account.accountAddress);
const auth: BlobOwnerAuth = rpcClient.signChallenge(account, challenge);
```

### putBlobChunksets()

Uploads blob data using the v2 chunkset API. Requires the on-chain `uid` (from registration) and pre-computed `commitments`. Returns the aggregated storage-provider acks to hand to `commitObject()`.

```typescript
const result: PutBlobChunksetsResult = await rpcClient.putBlobChunksets({
  // BlobOwnerCredentials — provide ONE of:
  account?: Account,                 // can sign the ownership challenge (authenticated write)
  accountAddress?: AccountAddressInput, // address only → unauthenticated write

  uid: bigint,                       // from BlobRegisteredEvent (registeredBlobUids)
  blobData: Uint8Array | ReadableStream<Uint8Array>,
  commitments: BlobCommitments,      // from generateCommitments()
  totalBytes?: number,               // required for streams
  chunksetConcurrency?: number,      // default 4
  onProgress?: (p: PutBlobChunksetsProgress) => void,
  signal?: AbortSignal,
});
// result.spAcks: StorageProviderAck[]
```

> A signer that holds no private key (a browser wallet) can only pass `accountAddress`; the write then goes out **unauthenticated** and is accepted only if the RPC is not configured to require upload auth.

### getBlob()

```typescript
const blob: ShelbyBlob = await rpcClient.getBlob({
  account: AccountAddressInput,
  blobName: string,
  range?: { start: number; end?: number },
  micropayment?: SenderBuiltMicropayment,
});
```

**Throws:** `StaleChannelStateError` on a stale micropayment (HTTP 409); `Error` for other failures.

---

## ShelbyMetadataClient (metadata)

Protocol-level metadata: locations, storage providers, placement groups, and slices. Reached via `client.metadata`.

```typescript
import { ShelbyMetadataClient } from "@shelby-protocol/sdk";
const metadataClient = new ShelbyMetadataClient(config: ShelbyClientConfig);
```

| Method | Returns | Description |
|--------|---------|-------------|
| `getLocationNames()` | `Promise<string[]>` | Names of every **activated** location (region). Pass one as `selectedLocation` on writes. |
| `getStorageProviders()` | `Promise<StorageProviderInfo[]>` | All storage providers. |
| `getPlacementGroupAddresses(locationName)` | `Promise<AccountAddress[]>` | Placement groups in a location. |
| `getSliceAddresses(locationName)` | `Promise<AccountAddress[]>` | Slices in a location. |
| `getDesignatedStorageProvidersForSlice({ account })` | `Promise<(AccountAddress \| null)[]>` | Designated SP per slot (index-aligned). |
| `getActiveStorageProvidersForSlice({ account })` | `Promise<(AccountAddress \| null)[]>` | Active SP per slot. |
| `getServingStorageProvidersForSlice({ account })` | `Promise<AccountAddress[][]>` | Serving SPs per slot. |

---

## ShelbyPlacementGroupClient

Queries placement-group slots from the indexer.

```typescript
import { ShelbyPlacementGroupClient } from "@shelby-protocol/sdk";
const pgClient = new ShelbyPlacementGroupClient(config: ShelbyClientConfig);

const slots: PlacementGroupSlot[] = await pgClient.getPlacementGroupSlots({
  where?: Placement_Group_Slots_Bool_Exp,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Placement_Group_Slots_Order_By,
});
const count: number = await pgClient.getPlacementGroupSlotsCount({ where?: Placement_Group_Slots_Bool_Exp });
```

---

## ShelbyMicropaymentChannelClient

Full micropayment-channel lifecycle (create, fund, extend, withdraw). Documented with examples in `advanced.md`.

```typescript
import { ShelbyMicropaymentChannelClient } from "@shelby-protocol/sdk";
const mpClient = new ShelbyMicropaymentChannelClient(config: ShelbyClientConfig);
```

Methods: `initializePaymentChannels`, `createChannel`, `getChannelInfo`, `createMicropayment`, `receiverWithdraw`, `senderWithdraw`, `extendExpirationTime`, `increaseDepositAmount`. Micropayment approvals are `SenderBuiltMicropayment` instances (BCS-serializable).

---

## Types

### ShelbyClientConfig

```typescript
interface ShelbyClientConfig {
  network: ShelbyNetwork;                              // Network.SHELBYNET | Network.LOCAL | Network.CUSTOM
  apiKey?: string;
  aptos?: AptosSettings;
  deployer?: AccountAddress;                           // Shelby contract; no default on Network.CUSTOM
  micropaymentsDeployer?: AccountAddress;              // micropayments contract, addressed separately
  rpc?: ShelbyRPCConfig;                               // { baseUrl?, apiKey? }
  indexer?: ShelbyIndexerConfig;                       // { baseUrl?, apiKey? }
  faucet?: { baseUrl?: string; authToken?: string };   // now an object
  orderless?: boolean;                                 // orderless (random-nonce) transactions
  locationHint?: string;                               // best-effort write location hint
}
```

> `gasStationApiKey` was removed. Use `WriteBlobCommitmentsOptions.usdSponsor` for ShelbyUSD fee sponsorship.
>
> `micropaymentsDeployer` (added in `0.8.0`) lets the micropayments contract be addressed separately from the Shelby contract. On `Network.CUSTOM` neither deployer falls back to its built-in default — supply both, along with `aptos.fullnode`, `indexer.baseUrl`, `rpc.baseUrl`, and `locationHint`. Construction throws if the fullnode is missing.

### WriteBlobCommitmentsOptions (= UploadOptions)

```typescript
interface WriteBlobCommitmentsOptions {
  build?: { options?: InputGenerateTransactionOptions; withFeePayer?: boolean };
  submit?: InputTransactionPluginData;
  usdSponsor?: UsdSponsorOptions;      // { feePayerAddress: AccountAddress }
  chunksetSizeBytes?: number;
  selectedLocation?: string;           // authoritative write location
  locationHint?: string;               // best-effort; defaults to config.locationHint
}
```

`usdSponsor` selects the `*_with_sponsor` Move entry functions (Shelby fees paid in ShelbyUSD by a gas station). It requires an Aptos `TRANSACTION_SUBMITTER` plugin (`aptos.pluginSettings.TRANSACTION_SUBMITTER`) that co-signs; otherwise `MissingTransactionSubmitterError` is thrown.

### FullObjectMetadata

```typescript
interface FullObjectMetadata {
  uid?: bigint;                  // on-chain UID the name resolves to
  owner: AccountAddress;
  name: BlobName;                // full name: @<owner>/<suffix>
  blobNameSuffix: string;        // just the path (use this)
  blobMerkleRoot: Uint8Array;
  size: number;                  // bytes
  encoding: BlobEncoding;        // ClayEncoding
  encryption?: BlobEncryption;   // "Unencrypted" | "AES_GCM_V1" (view + indexer paths)
  creationMicros: number;
  sliceAddress: AccountAddress;
  isWritten: boolean;
  isDeleted?: boolean;
}
```

> This replaces the old `BlobMetadata` type. `getFullObjectMetadata()`, `getAccountBlobs()`, and `getBlobs()` all return `FullObjectMetadata`.

### ClayEncoding / BlobEncoding

```typescript
type BlobEncoding = ClayEncoding;
type ClayEncoding = {
  variant: "clay";
  numTotalChunks: number;   // e.g. 16
  numDataChunks: number;    // e.g. 10
  numHelperChunks: number;  // e.g. 13
  chunkSize: number;
  chunksetSize: number;
};
```

### BlobEncryption

```typescript
type BlobEncryption = "Unencrypted" | "AES_GCM_V1";
// Helpers: blobEncryptionToMoveEnumIndex(), blobEncryptionFromMoveVariant()
```

### BlobActivity

```typescript
type BlobActivityType =
  | "register_blob" | "delete_blob" | "write_blob"
  | "commit_object" | "delete_object" | "reject_object_commit" | "unknown";

interface BlobActivity {
  blobName: BlobName;
  accountAddress: AccountAddress;
  type: BlobActivityType;
  eventType: string;
  eventIndex: number;
  transactionHash: string;
  transactionVersion: number;
  timestamp: string;   // string, not number
}
```

### StorageProviderAck

```typescript
interface StorageProviderAck {
  slot: number;
  signature: Uint8Array;
}
```

### RPC auth types

```typescript
type AuthScheme = "ed25519" | "derivable";
type BlobOwnerAuth = Ed25519BlobOwnerAuth | DerivableBlobOwnerAuth;
// Ed25519: { challenge, signature, publicKey, authScheme?: "ed25519" }
// Derivable (Solana/Ethereum DAA): + { authScheme: "derivable", identity, domain, authFunction }
type BlobOwnerCredentials = { account: Account } | { accountAddress: AccountAddressInput };
type BlobDataSource = Uint8Array | ReadableStream<Uint8Array>;
```

### ShelbyNetwork

```typescript
import { shelbyNetworks, isShelbyNetwork } from "@shelby-protocol/sdk";
// shelbyNetworks === [Network.LOCAL, Network.SHELBYNET]  — CUSTOM excluded from pickers
type ShelbyNetwork = Network.LOCAL | Network.SHELBYNET | Network.CUSTOM;   // testnet removed
// isShelbyNetwork("custom") === true
```

---

## Error Handling

### Error code helpers

```typescript
import {
  ShelbyErrorCodes,
  ShelbyLocationErrorCodes,
  describeLocationError,
  isBlobAlreadyExistsError,
  isAccessDeniedError,
  isBlobNotFoundError,
} from "@shelby-protocol/sdk";
```

**`ShelbyErrorCodes`** (contract error codes):

`E_BLOB_NOT_FOUND`, `E_TEST_ENCODING_NOT_ALLOWED`, `E_INVALID_CHUNKSET_COUNT`, `E_NOT_BLOB_OWNER`, `E_NOT_ADMIN`, `E_BLOB_NAME_TOO_LONG`, `E_NO_SLICES_AVAILABLE`, `EALREADY_EXISTS`.

> The expiration/payment-epoch error codes (`E_INVALID_EXPIRATION_TIME`, `E_BLOB_NOT_EXPIRED`, `E_BLOB_EXPIRED`, `E_INVALID_PAYMENT_EPOCHS`) and the `isBlobExpiredError()` helper were removed in `0.8.0` when blob expiration was retired.

**`ShelbyLocationErrorCodes`** (write-location resolution — new):

| Code | Meaning |
|------|---------|
| `E_NO_LOCATION_SELECTED` | No location resolved: none selected, and the account has no default/hint. Pass `selectedLocation`. |
| `E_LOCATION_NOT_FOUND` | The requested location does not exist. |
| `E_SELECTED_LOCATION_CONFLICTS_WITH_LOCK` | Selection conflicts with the account's locked location preference. |
| `E_LOCATION_WRITES_FROZEN` | The resolved location is frozen and not accepting writes. |
| `E_LOCATION_NOT_ACTIVATED` | The resolved location is not activated yet. |

**Helper functions** (all take an error message string, return boolean):

```typescript
isBlobAlreadyExistsError(msg); isAccessDeniedError(msg); isBlobNotFoundError(msg);
```

**`describeLocationError(msg)`** returns a human-readable explanation for a location failure, or `undefined` if the error is unrelated to locations:

```typescript
try {
  await client.upload({ /* ... */ });
} catch (error) {
  const message = String(error?.message ?? error);
  const locationProblem = describeLocationError(message);
  if (locationProblem) throw new Error(locationProblem); // e.g. missing selectedLocation
}
```

### StaleChannelStateError

Thrown when a micropayment has stale channel state (HTTP 409):

```typescript
import { StaleChannelStateError } from "@shelby-protocol/sdk";

try {
  await rpcClient.getBlob({ /* ... */ });
} catch (error) {
  if (error instanceof StaleChannelStateError) {
    const serverState = error.storedMicropayment; // SenderBuiltMicropayment
    // Also: error.toBase64() / StaleChannelStateError.fromBase64(...)
  }
}
```

---

## Constants

```typescript
import {
  SHELBY_DEPLOYER,
  MICROPAYMENTS_DEPLOYER,
  TOKEN_DEPLOYER,
  TOKEN_OBJECT_ADDRESS,
  SHELBYUSD_TOKEN_ADDRESS,
  SHELBYUSD_TOKEN_MODULE,        // "shelby_usd"
  SHELBYUSD_TOKEN_NAME,          // "ShelbyUSD"
  SHELBYUSD_FA_METADATA_ADDRESS,
  NetworkToShelbyRPCBaseUrl,
  NetworkToShelbyBlobIndexerBaseUrl,
  NetworkToGasStationBaseUrl,
  DEFAULT_CHUNK_SIZE_BYTES,      // 1 MiB
  DEFAULT_CHUNKSET_SIZE_BYTES,   // 10 MiB
} from "@shelby-protocol/sdk";
```

Key addresses:

```
SHELBY_DEPLOYER          = 0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a
MICROPAYMENTS_DEPLOYER   = 0x1ae7275148bf6ef742b658fd9cbcc2e094201606f4a7bc707bab0201da8043ee
SHELBYUSD_TOKEN_ADDRESS  = 0x249f5c642a63885ff88a5113b3ba0079840af5a1357706f8c7f3bfc5dd12511f
```

Network → URL maps (ShelbyNet values; other networks are `undefined`):

```
NetworkToShelbyRPCBaseUrl.shelbynet         = https://shelby.shelbynet.shelby.xyz/shelby
NetworkToShelbyBlobIndexerBaseUrl.shelbynet = https://api.shelbynet.aptoslabs.com/v1/graphql
NetworkToGasStationBaseUrl.shelbynet        = https://api.shelbynet.shelby.xyz/gs/v1
```

### Default erasure coding parameters (Clay code)

| Parameter | Value | Description |
|-----------|-------|-------------|
| N (total chunks) | 16 | Total chunks per chunkset |
| K (data chunks) | 10 | Data chunks needed to reconstruct |
| D (helper nodes) | 13 | Helper nodes for efficient decoding |
| M (parity chunks) | 6 | Parity chunks (N − K) |
| Chunk size | 1 MiB | `DEFAULT_CHUNK_SIZE_BYTES` |
| Chunkset size | 10 MiB | `DEFAULT_CHUNKSET_SIZE_BYTES` (K × chunk size) |

Helpers: `createDefaultErasureCodingProvider()`, `defaultErasureCodingConfig`, `ClayErasureCodingProvider`, `ReedSolomonErasureCodingProvider`, `findErasureSchemeByErasureN()`, `requiredAckCount()`.

### BlobCommitments (schema v1.3)

```typescript
import { BlobCommitmentsSchema, COMMITMENT_SCHEMA_VERSION, generateCommitments } from "@shelby-protocol/sdk";
// COMMITMENT_SCHEMA_VERSION = "1.3"

interface BlobCommitments {
  schema_version: string;
  raw_data_size: number;
  blob_merkle_root: string;          // hex
  chunkset_commitments: Array<{
    chunkset_root: string;           // hex
    chunk_commitments: string[];     // K+M hex strings
  }>;
}
```

The blob merkle root is a binary SHA-256 merkle tree over the chunkset roots; missing right children are zero-padded.

---

## Static Payload Methods

Build transaction payloads without signing (custom submission / batching):

```typescript
// Register a blob
ShelbyBlobClient.createRegisterBlobPayload({
  deployer?: AccountAddress,
  account: AccountAddress,
  blobName: BlobName,
  blobSize: number,
  blobMerkleRoot: string,
  numChunksets: number,
  encoding: number,
  selectedLocation?: string,
  locationHint?: string,
  useSponsoredUsdVariant?: boolean,
  encryption?: BlobEncryption,
});

// Register multiple blobs
ShelbyBlobClient.createBatchRegisterBlobsPayload({
  deployer?: AccountAddress,
  account: AccountAddress,
  blobs: Array<{ blobName: BlobName; blobSize: number; blobMerkleRoot: string; numChunksets: number }>,
  encoding: number,
  selectedLocation?: string,
  locationHint?: string,
  useSponsoredUsdVariant?: boolean,
  encryption?: BlobEncryption,
});

// Commit a written pending blob under its name
ShelbyBlobClient.createCommitObjectPayload({
  deployer?: AccountAddress,
  uid: bigint,
  blobName: BlobName,
  overwrite: boolean,
  storageProviderAcks: StorageProviderAck[],
});

// Delete
ShelbyBlobClient.createDeleteObjectPayload({ deployer?: AccountAddress, blobName: string });
ShelbyBlobClient.createDeleteMultipleObjectsPayload({ deployer?: AccountAddress, blobNames: string[] });
```

> Payload method names changed from the old API: `createDeleteBlobPayload` → `createDeleteObjectPayload`, `createDeleteMultipleBlobsPayload` → `createDeleteMultipleObjectsPayload`, and `createCommitObjectPayload` is new.
