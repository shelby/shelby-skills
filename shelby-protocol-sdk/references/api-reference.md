# Shelby Protocol SDK - API Reference

Complete API documentation for the core Shelby Protocol TypeScript SDK.

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
  aptos?: AptosSettings;
  deployer?: AccountAddress;
  rpc?: ShelbyRPCConfig;
  indexer?: ShelbyIndexerConfig;
  faucet?: string;
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
