# Shelby Protocol SDK - API Reference

Complete API documentation for the core Shelby Protocol TypeScript SDK.

## Table of Contents

- [ShelbyClient](#shelbyclient)
- [ShelbyNodeClient](#shelbynodeclient)
- [ShelbyBlobClient](#shelbyblobclient)
- [ShelbyRPCClient](#shelbyrpcclient)
- [Types](#types)
- [Error Handling](#error-handling)
- [Constants](#constants)
- [Static Payload Methods](#static-payload-methods)

## ShelbyClient

The main client that combines blockchain operations (coordination) and storage operations (RPC).

### Constructor

```typescript
import { ShelbyClient } from "@shelby-protocol/sdk/node"; // or /browser

const client = new ShelbyClient(config: ShelbyClientConfig, provider?: ErasureCodingProvider);
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `ShelbyClientConfig` | Yes | Client configuration |
| `provider` | `ErasureCodingProvider` | No | Shared erasure coding provider |

**Properties:**

- `coordination: ShelbyBlobClient` - Client for blockchain operations
- `rpc: ShelbyRPCClient` - Client for storage operations
- `config: ShelbyClientConfig` - The configuration object
- `aptos: Aptos` - The underlying Aptos client
- `baseUrl: string` - The Shelby RPC base URL

### upload()

Uploads a blob to the Shelby network. Handles commitment generation, blockchain registration, and storage upload.

```typescript
await client.upload({
  blobData: Uint8Array,
  signer: Account,
  blobName: string,
  expirationMicros: number,
  options?: UploadOptions,
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `blobData` | `Uint8Array` | Yes | Raw data to upload |
| `signer` | `Account` | Yes | Account that signs and pays |
| `blobName` | `string` | Yes | Name/path of the blob |
| `expirationMicros` | `number` | Yes | Expiration time in microseconds since Unix epoch |
| `options.chunksetSizeBytes` | `number` | No | Custom chunkset size |
| `options.build.options` | `InputGenerateTransactionOptions` | No | Aptos transaction options |

### batchUpload()

Uploads multiple blobs in a single transaction for registration, then uploads each in parallel.

```typescript
await client.batchUpload({
  blobs: Array<{ blobData: Uint8Array; blobName: string }>,
  expirationMicros: number,
  signer: Account,
  options?: UploadOptions,
});
```

### download()

Downloads a blob from the Shelby RPC node.

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
  account: AccountAddress;       // The blob owner
  name: string;                   // The blob name
  readable: ReadableStream;       // Stream of blob data
  contentLength: number;          // Size in bytes
}
```

### fundAccountWithShelbyUSD()

Funds an account with ShelbyUSD tokens (testnet faucet).

```typescript
const hash: string = await client.fundAccountWithShelbyUSD({
  address: AccountAddressInput,
  amount: number,
});
```

### fundAccountWithAPT()

Funds an account with APT tokens for gas fees.

```typescript
const hash: string = await client.fundAccountWithAPT({
  address: AccountAddressInput,
  amount: number,
});
```

---

## ShelbyNodeClient

Node.js-specific subclass of `ShelbyClient` with additional server-side functionality.

### Import

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
```

### Constructor

```typescript
const client = new ShelbyNodeClient(config: ShelbyClientConfig, provider?: ErasureCodingProvider);
```

`ShelbyNodeClient` extends `ShelbyClient` and is the recommended entry point for Node.js/server environments. For browser environments, use `ShelbyClient` from `@shelby-protocol/sdk/browser`.

---

## ShelbyBlobClient

Client for blockchain operations: registering blobs, querying metadata, and managing blob lifecycle.

### Constructor

```typescript
import { ShelbyBlobClient } from "@shelby-protocol/sdk";

const blobClient = new ShelbyBlobClient(config: ShelbyClientConfig);
```

### getBlobMetadata()

Retrieves metadata for a specific blob.

```typescript
const metadata: BlobMetadata | undefined = await blobClient.getBlobMetadata({
  account: AccountAddressInput,
  name: string,
});
```

**Returns:** `BlobMetadata | undefined`

```typescript
interface BlobMetadata {
  owner: AccountAddress;           // Blob owner
  name: string;                    // Full blob name (@address/path)
  blobNameSuffix: string;          // Just the path portion
  blobMerkleRoot: Uint8Array;      // Merkle root commitment
  size: number;                    // Size in bytes
  encoding: ClayEncoding;          // Erasure coding parameters
  expirationMicros: number;        // Expiration timestamp
  creationMicros: number;          // Creation timestamp
  sliceAddress: AccountAddress;    // Storage slice address
  isWritten: boolean;              // Whether blob is fully written
}
```

### getAccountBlobs()

Retrieves all blobs for an account.

```typescript
const blobs: BlobMetadata[] = await blobClient.getAccountBlobs({
  account: AccountAddressInput,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blobs_Order_By,
  where?: Omit<Blobs_Bool_Exp, "owner">,
});
```

### getBlobs()

Retrieves blobs matching filter criteria.

```typescript
const blobs: BlobMetadata[] = await blobClient.getBlobs({
  where?: Blobs_Bool_Exp,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blobs_Order_By,
});
```

**Where clause examples:**

```typescript
// Get blobs by owner
{ owner: { _eq: "0x123..." } }

// Get blobs expiring after a certain time
{ expires_at: { _gte: Date.now() * 1000 } }

// Get blobs by name pattern
{ blob_name: { _like: "%images%" } }

// Combine conditions
{ owner: { _eq: "0x..." }, size: { _gte: 1000 } }
```

**Order by examples:**

```typescript
{ created_at: "desc" }
{ size: "asc" }
{ expires_at: "desc" }
```

### getBlobsCount()

Returns total number of blobs matching criteria.

```typescript
const count: number = await blobClient.getBlobsCount({
  where?: Blobs_Bool_Exp,
});
```

### getBlobActivities()

Retrieves blob activity events (register, delete, extend, write).

```typescript
const activities: BlobActivity[] = await blobClient.getBlobActivities({
  where?: Blob_Activities_Bool_Exp,
  pagination?: { limit?: number; offset?: number },
  orderBy?: Blob_Activities_Order_By,
});
```

**Returns:** `BlobActivity[]`

```typescript
interface BlobActivity {
  blobName: string;
  accountAddress: AccountAddress;
  type: "register_blob" | "delete_blob" | "extend_blob_expiration" | "write_blob" | "unknown";
  eventType: string;
  eventIndex: number;
  transactionHash: string;
  transactionVersion: number;
  timestamp: number;
}
```

### registerBlob()

Registers a blob commitment on the blockchain. Usually called internally by `upload()`.

```typescript
const { transaction } = await blobClient.registerBlob({
  account: Account,
  blobName: string,
  blobMerkleRoot: string,  // Hex string
  size: number,
  expirationMicros: number,
  options?: WriteBlobCommitmentsOptions,
});
```

### batchRegisterBlobs()

Registers multiple blobs in a single transaction.

```typescript
const { transaction } = await blobClient.batchRegisterBlobs({
  account: Account,
  expirationMicros: number,
  blobs: Array<{
    blobName: string;
    blobSize: number;
    blobMerkleRoot: string;
  }>,
  options?: WriteBlobCommitmentsOptions,
});
```

### deleteBlob()

Deletes a blob from the blockchain.

```typescript
const { transaction } = await blobClient.deleteBlob({
  account: Account,
  blobName: string,
  options?: InputGenerateTransactionOptions,
});
```

### deleteMultipleBlobs()

Deletes multiple blobs atomically.

```typescript
const { transaction } = await blobClient.deleteMultipleBlobs({
  account: Account,
  blobNames: string[],  // Array of blob name suffixes (without account prefix)
  options?: InputGenerateTransactionOptions,
});
```

---

## ShelbyRPCClient

Client for direct interaction with Shelby RPC nodes for blob storage and retrieval.

### Constructor

```typescript
import { ShelbyRPCClient } from "@shelby-protocol/sdk";

const rpcClient = new ShelbyRPCClient(config: ShelbyClientConfig);
```

### putBlob()

Uploads blob data to the RPC node. Usually called internally by `upload()`.

```typescript
await rpcClient.putBlob({
  account: AccountAddressInput,
  blobName: string,
  blobData: Uint8Array,
  onProgress?: (progress: PutBlobProgress) => void,
});
```

**Progress callback:**

```typescript
interface PutBlobProgress {
  partIdx: number;        // Current part index
  totalParts: number;     // Total number of parts
  partBytes: number;      // Bytes in current part
  uploadedBytes: number;  // Total bytes uploaded so far
  totalBytes: number;     // Total blob size
}
```

### getBlob()

Downloads a blob from the RPC node.

```typescript
const blob: ShelbyBlob = await rpcClient.getBlob({
  account: AccountAddressInput,
  blobName: string,
  range?: { start: number; end?: number },
  micropayment?: SenderBuiltMicropayment,
});
```

**Range requests:**

```typescript
// Download bytes 0-999
const partial = await rpcClient.getBlob({
  account: "0x...",
  blobName: "large-file.bin",
  range: { start: 0, end: 999 },
});

// Download from byte 1000 to end
const rest = await rpcClient.getBlob({
  account: "0x...",
  blobName: "large-file.bin",
  range: { start: 1000 },
});
```

**Throws:**
- `StaleChannelStateError` if micropayment has stale channel state (409 response)
- `Error` for other failures

---

## Types

### ShelbyClientConfig

```typescript
interface ShelbyClientConfig {
  network: ShelbyNetwork;
  apiKey?: string;
  deployer?: AccountAddress;
  aptos?: AptosSettings;
  rpc?: ShelbyRPCConfig;
  indexer?: ShelbyIndexerConfig;
  faucet?: string;
  gasStationApiKey?: string;
}

interface ShelbyRPCConfig {
  baseUrl?: string;
  apiKey?: string;
}

interface ShelbyIndexerConfig {
  baseUrl?: string;
  apiKey?: string;
}
```

### ClayEncoding

Erasure coding parameters for blobs.

```typescript
interface ClayEncoding {
  variant: "clay";
  numTotalChunks: number;     // Total chunks per chunkset (e.g., 16)
  numDataChunks: number;      // Data chunks (e.g., 10)
  numHelperChunks: number;    // Helper chunks (e.g., 13)
  chunkSize: number;          // Size of each chunk
  chunksetSize: number;       // Size of each chunkset
}
```

### ShelbyNetwork

```typescript
type ShelbyNetwork = "local" | "shelbynet";
```

---

## Error Handling

### Error Code Helpers

The SDK provides helper functions to identify common errors from transaction error messages:

```typescript
import {
  ShelbyErrorCodes,
  isBlobAlreadyExistsError,
  isAccessDeniedError,
  isBlobNotFoundError,
  isBlobExpiredError,
} from "@shelby-protocol/sdk";
```

**`ShelbyErrorCodes` enum:**

| Code | Description |
|------|-------------|
| `E_BLOB_ALREADY_EXISTS` | Blob with this name already registered |
| `E_ACCESS_DENIED` | Permission denied for this operation |
| `E_BLOB_NOT_FOUND` | Blob does not exist |
| `E_BLOB_EXPIRED` | Blob has expired |

**Helper functions:**

```typescript
// All take an error message string and return boolean
isBlobAlreadyExistsError(errorMessage: string): boolean
isAccessDeniedError(errorMessage: string): boolean
isBlobNotFoundError(errorMessage: string): boolean
isBlobExpiredError(errorMessage: string): boolean
```

**Usage:**

```typescript
try {
  await client.upload({ ... });
} catch (error) {
  if (isBlobAlreadyExistsError(error.message)) {
    // Blob already registered - skip or overwrite
  }
  if (isBlobNotFoundError(error.message)) {
    // Blob doesn't exist
  }
}
```

### StaleChannelStateError

Thrown when a micropayment has stale channel state (HTTP 409):

```typescript
import { StaleChannelStateError } from "@shelby-protocol/sdk";

try {
  await rpcClient.getBlob({ ... });
} catch (error) {
  if (error instanceof StaleChannelStateError) {
    const serverState = error.storedMicropayment;
    // Sync local state and retry
  }
}
```

---

## Constants

### Key Addresses

```typescript
import {
  SHELBY_DEPLOYER,
  SHELBYUSD_TOKEN_ADDRESS,
} from "@shelby-protocol/sdk";

// SHELBY_DEPLOYER: "0xc63d6a5efb0080a6029403131715bd4971e1149f7cc099aac69bb0069b3ddbf5"
// SHELBYUSD_TOKEN_ADDRESS: "0x249f5c642a63885ff88a5113b3ba0079840af5a1357706f8c7f3bfc5dd12511f"
```

### Chunk and Erasure Coding Defaults

```typescript
import {
  DEFAULT_CHUNK_SIZE_BYTES,      // 1 MiB (1 * 1024 * 1024)
  DEFAULT_CHUNKSET_SIZE_BYTES,   // 10 MiB (10 * 1024 * 1024)
} from "@shelby-protocol/sdk";
```

**Default erasure coding parameters (Clay code):**

| Parameter | Value | Description |
|-----------|-------|-------------|
| N (total chunks) | 16 | Total chunks per chunkset |
| K (data chunks) | 10 | Data chunks needed to reconstruct |
| D (helper nodes) | 13 | Helper nodes for efficient decoding |
| M (parity chunks) | 6 | Parity chunks (N - K) |
| Chunk size | 1 MiB | Size of each chunk |
| Chunkset size | 10 MiB | Size of each chunkset (K * chunk size) |

### ErasureCodingProvider Interface

```typescript
interface ErasureCodingProvider {
  readonly config: ErasureCodingConfig;
  encode(data: Uint8Array): ChunkCollection;
  decode(available: Uint8Array[], config: DecodeConfig): ChunkCollection;
  getChunkMerkleRoots(): Uint8Array[];
}

interface ErasureCodingConfig {
  erasure_n: number;        // Total chunks
  erasure_k: number;        // Data chunks
  chunkSizeBytes: number;   // Chunk size in bytes
}
```

### BlobCommitmentsSchema (v1.3)

```typescript
import { BlobCommitmentsSchema, COMMITMENT_SCHEMA_VERSION } from "@shelby-protocol/sdk";

// COMMITMENT_SCHEMA_VERSION = "1.3"

interface BlobCommitments {
  schema_version: string;
  raw_data_size: number;
  blob_merkle_root: string;          // Hex string
  chunkset_commitments: Array<{
    chunkset_root: string;           // Hex string
    chunk_commitments: string[];     // Array of K+M hex strings
  }>;
}
```

The blob merkle root is computed using a binary SHA-256 merkle tree over the chunkset roots. Missing right children are zero-padded.

---

## Static Payload Methods

For advanced use cases, create transaction payloads without signing:

```typescript
// Create register blob payload
const payload = ShelbyBlobClient.createRegisterBlobPayload({
  deployer?: AccountAddress,
  account: AccountAddress,
  blobName: string,
  blobSize: number,
  blobMerkleRoot: string,
  expirationMicros: number,
  numChunksets: number,
});

// Create delete blob payload
const payload = ShelbyBlobClient.createDeleteBlobPayload({
  deployer?: AccountAddress,
  blobName: string,
});

// Create batch register payload
const payload = ShelbyBlobClient.createBatchRegisterBlobsPayload({
  deployer?: AccountAddress,
  account: AccountAddress,
  expirationMicros: number,
  blobs: Array<{
    blobName: string;
    blobSize: number;
    blobMerkleRoot: string;
    numChunksets: number;
  }>,
});
```
