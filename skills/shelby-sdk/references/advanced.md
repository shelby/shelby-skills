# Advanced Topics

Advanced Shelby Protocol features: micropayments, erasure coding, streaming, and low-level operations. For `@shelby-protocol/sdk@^0.8.0`.

## Table of Contents

- [Extra Entry Points](#extra-entry-points)
- [Micropayment Channels](#micropayment-channels)
- [Downloads with Micropayments](#downloads-with-micropayments)
- [Erasure Coding](#erasure-coding)
- [Commitment Schema](#commitment-schema)
- [Streaming](#streaming)
- [Low-Level Operations](#low-level-operations)
- [Blob Naming and Keys](#blob-naming-and-keys)

## Extra Entry Points

Beyond `@shelby-protocol/sdk/node` and `/browser`, two specialized entry points ship:

```typescript
// Parallel commitment generation across Node worker threads (CPU-bound encoding).
import {
  generateCommitmentsParallel,
  createDefaultCommitmentWorkerPool,
  CommitmentWorkerPool,
} from "@shelby-protocol/sdk/node/parallel";

const commitments = await generateCommitmentsParallel(provider, dataOrStream, { concurrency: 8 });

// Low-level storage-provider write client (chunk proofs + direct SP writes).
import { SpWriteClient, buildChunkProof, generateChunksetInclusionProof } from "@shelby-protocol/sdk/sp";
```

Most apps never need these — `client.upload()` (Node) already parallelizes chunkset uploads. Reach for `/node/parallel` when commitment generation dominates, and `/sp` only for protocol-level tooling.

## Micropayment Channels

Micropayment channels enable pay-per-use storage access without on-chain transactions for every request.

### Concepts

- **Sender**: Creates and funds the channel
- **Receiver**: Receives payments (typically a storage provider)
- **Channel**: Funded balance between sender and receiver
- **Micropayment**: Off-chain signed payment within a channel

### ShelbyMicropaymentChannelClient

```typescript
import { ShelbyMicropaymentChannelClient } from "@shelby-protocol/sdk";

const mpClient = new ShelbyMicropaymentChannelClient({
  network: Network.SHELBYNET,
  apiKey: "AG-***",
});
```

### Initialize Payment Channels

One-time setup for a sender account:

```typescript
const { transaction } = await mpClient.initializePaymentChannels({
  sender: senderAccount,
});

await mpClient.aptos.waitForTransaction({ transactionHash: transaction.hash });
```

### Create a Channel

```typescript
const { transaction } = await mpClient.createChannel({
  sender: senderAccount,
  receiver: receiverAddress,
  expirationMicros: Date.now() * 1000 + 86400_000_000, // 24 hours
  depositAmount: 1_000_000, // Amount to lock in channel
  fungibleAssetAddress: shelbyUsdAddress,
});

await mpClient.aptos.waitForTransaction({ transactionHash: transaction.hash });
```

### Get Channel Info

```typescript
// Get all channels from sender
const channels = await mpClient.getChannelInfo({
  sender: senderAddress,
});

// Get channels to specific receiver
const channels = await mpClient.getChannelInfo({
  sender: senderAddress,
  receiver: receiverAddress,
});
```

**ChannelInfo type** (numeric fields are `bigint`):

```typescript
interface ChannelInfo {
  sender: AccountAddress;
  receiver?: AccountAddress;
  fungibleAssetAddress: AccountAddress;
  balance: bigint;
  creationMicros: bigint;
  expirationMicros: bigint;
  nextWithdrawnSequenceNumber: bigint;
  paymentChannelId: bigint;
  receiverWithdrawnAmount: bigint;
  publicKey: Uint8Array;
}
```

### Create a Micropayment

`createMicropayment()` signs the approval locally and returns a `SenderBuiltMicropayment` **synchronously** (no `await`):

```typescript
const micropayment = mpClient.createMicropayment({
  sender: senderAccount,
  receiver: receiverAddress,
  amount: 100, // cumulative amount authorized (not incremental)
  paymentChannelId: channel.paymentChannelId,
  sequenceNumber: localSequenceNumber++, // must be >= channel's next_withdrawn_sequence_number
  fungibleAssetAddress: shelbyUsdAddress,
});
```

### Receiver Withdraws Micropayment

The receiver signs and submits the micropayment to claim funds:

```typescript
const { transaction } = await mpClient.receiverWithdraw({
  receiver: receiverAccount,
  micropayment: senderBuiltMicropayment,
});
```

### Extend Channel Expiration

```typescript
const { transaction } = await mpClient.extendExpirationTime({
  sender: senderAccount,
  receiver: receiverAddress,
  fungibleAssetAddress: shelbyUsdAddress,
  newExpirationMicros: Date.now() * 1000 + 172800_000_000, // 2 days from now
});
```

### Increase Channel Deposit

```typescript
const { transaction } = await mpClient.increaseDepositAmount({
  sender: senderAccount,
  receiver: receiverAddress,
  fungibleAssetAddress: shelbyUsdAddress,
  additionalAmount: 500_000,
});
```

### Sender Withdrawal

Withdraw remaining funds after channel expires:

```typescript
const { transaction } = await mpClient.senderWithdraw({
  sender: senderAccount,
  receiver: receiverAddress,
  fungibleAssetAddress: shelbyUsdAddress,
});
```

---

## Downloads with Micropayments

Attach micropayments to blob download requests for pay-per-download access.

### Basic Usage

```typescript
const blob = await rpcClient.getBlob({
  account: ownerAddress,
  blobName: "premium-content.mp4",
  micropayment: senderBuiltMicropayment,
});
```

### Handling Stale Channel State

If your local channel state is behind the server's, you'll get a `StaleChannelStateError`:

```typescript
import { StaleChannelStateError } from "@shelby-protocol/sdk";

try {
  const blob = await rpcClient.getBlob({
    account: ownerAddress,
    blobName: "content.mp4",
    micropayment: micropayment,
  });
} catch (error) {
  if (error instanceof StaleChannelStateError) {
    // Server has a newer micropayment state
    const serverMicropayment = error.storedMicropayment;

    // Reset local state to match server
    localSequenceNumber = extractSequenceNumber(serverMicropayment) + 1;

    // Retry with corrected sequence number
    const newMicropayment = mpClient.createMicropayment({
      sender: senderAccount,
      receiver: receiverAddress,
      amount: 100,
      paymentChannelId: channelId,
      sequenceNumber: localSequenceNumber++,
      fungibleAssetAddress: shelbyUsdAddress,
    });

    const blob = await rpcClient.getBlob({
      account: ownerAddress,
      blobName: "content.mp4",
      micropayment: newMicropayment,
    });
  }
}
```

### SenderBuiltMicropayment Serialization

```typescript
// Serialize to bytes
const bytes = micropayment.bcsToBytes();

// Serialize to hex
const hex = micropayment.bcsToHex();
const hexString = micropayment.toString(); // With 0x prefix
const hexStringNoPrefix = micropayment.toStringWithoutPrefix();

// Deserialize
const restored = SenderBuiltMicropayment.deserialize(bytes);
const restoredFromHex = SenderBuiltMicropayment.deserialize("0x...");
```

---

## Erasure Coding

Shelby uses Clay codes for erasure coding, providing fault tolerance and efficient storage.

### Creating a provider

Use the no-arg factory (default Clay config, async WASM init):

```typescript
import { createDefaultErasureCodingProvider } from "@shelby-protocol/sdk";

const provider = await createDefaultErasureCodingProvider();
```

For a custom scheme, build a `ClayConfig` and pass it to the class factory:

```typescript
import { ClayErasureCodingProvider, defaultErasureCodingConfig } from "@shelby-protocol/sdk";

const provider = await ClayErasureCodingProvider.create(defaultErasureCodingConfig());
// or erasureCodingConfig16Total10Data13Helper() / erasureCodingConfig4Total2Data3Helper()
```

### Shared Provider Pattern

For efficiency, share a single provider across multiple clients:

```typescript
const provider = await createDefaultErasureCodingProvider();

// Share across multiple clients (e.g. an API-keyed client and an anonymous one)
const client = new ShelbyClient({ network: Network.SHELBYNET, apiKey: "AG-***" }, provider);
const anonClient = new ShelbyClient({ network: Network.SHELBYNET }, provider);
```

This avoids re-initializing the WASM module for each client.

### Generate Commitments

For low-level blob registration:

```typescript
import { generateCommitments, createDefaultErasureCodingProvider } from "@shelby-protocol/sdk";

const provider = await createDefaultErasureCodingProvider();
const commitments = await generateCommitments(provider, blobData);

// commitments.blob_merkle_root - Use for registration
```

### Clay Encoding Parameters

```typescript
interface ClayEncoding {
  variant: "clay";
  numTotalChunks: number;    // Total chunks (e.g., 16)
  numDataChunks: number;     // Data chunks (e.g., 10)
  numHelperChunks: number;   // Helper chunks (e.g., 13)
  chunkSize: number;         // Chunk size in bytes
  chunksetSize: number;      // Chunkset size in bytes
}
```

Default encoding: `ClayCode_16Total_10Data_13Helper`
- 16 total chunks per chunkset
- 10 data chunks (required to reconstruct)
- 6 parity chunks (N - K)
- 13 helper chunks for efficient decoding

---

## Commitment Schema

Blob commitments use schema version 1.3. They are generated by `generateCommitments()` and used for blob registration.

### BlobCommitments Structure

```typescript
import { BlobCommitmentsSchema, COMMITMENT_SCHEMA_VERSION } from "@shelby-protocol/sdk";

// COMMITMENT_SCHEMA_VERSION = "1.3"

interface BlobCommitments {
  schema_version: string;            // "1.3"
  raw_data_size: number;             // Original data size in bytes
  blob_merkle_root: string;          // Hex string, root of binary merkle tree
  chunkset_commitments: Array<{
    chunkset_root: string;           // Hex string, merkle root of this chunkset
    chunk_commitments: string[];     // Array of K+M hex strings (16 per chunkset)
  }>;
}
```

### Merkle Tree

The `blob_merkle_root` is computed using a binary SHA-256 merkle tree over the chunkset roots:

```
blob_merkle_root = SHA256(chunkset_root_0 || chunkset_root_1)
```

- Leaf nodes are chunkset roots
- Internal nodes are `SHA256(left || right)`
- Missing right children are zero-padded (`0x00...00`, 32 bytes)
- Single chunkset: `blob_merkle_root = chunkset_root`

### ChunkKey Type

```typescript
import { createBlobKey } from "@shelby-protocol/sdk";

// ChunkKey identifies a specific chunk within a blob
type ChunkKey = {
  account: AccountAddressInput;
  blobName: string;
  chunksetIdx: number;
  chunkIdx: number;
};
```

---

## Streaming

### Download Streams

`getBlob()` returns a `ReadableStream` for efficient memory usage:

```typescript
const blob = await client.download({
  account: ownerAddress,
  blobName: "large-file.bin",
});

// Option 1: Collect all chunks
const reader = blob.readable.getReader();
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}

// Option 2: Process chunks as they arrive
const reader = blob.readable.getReader();
let processedBytes = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  await processChunk(value);
  processedBytes += value.length;
  console.log(`Progress: ${processedBytes}/${blob.contentLength}`);
}
```

### Range Requests

Download partial content:

```typescript
// Download first 1MB
const firstMB = await client.download({
  account: ownerAddress,
  blobName: "video.mp4",
  range: { start: 0, end: 1024 * 1024 - 1 },
});

// Download from offset to end
const rest = await client.download({
  account: ownerAddress,
  blobName: "video.mp4",
  range: { start: 1024 * 1024 },
});
```

### Upload Progress

`putBlobChunksets()` reports progress per chunkset. It needs the on-chain `uid` and the pre-computed `commitments` (see [Low-Level Operations](#low-level-operations)):

```typescript
const result = await rpcClient.putBlobChunksets({
  account: signer,               // or accountAddress for an unauthenticated write
  uid,                           // bigint, from the register tx's BlobRegisteredEvent
  blobData: largeData,           // Uint8Array or ReadableStream
  commitments,                   // from generateCommitments()
  totalBytes: largeData.length,  // required when blobData is a stream
  chunksetConcurrency: 8,        // default 4
  onProgress: (p) => {
    const percent = (p.uploadedBytes / p.totalBytes) * 100;
    console.log(`Upload: ${percent.toFixed(1)}% (chunkset ${p.chunksetIdx + 1}/${p.totalChunksets})`);
  },
});
// result.spAcks — pass these to coordination.commitObject()
```

**PutBlobChunksetsProgress type:**

```typescript
type PutBlobChunksetsProgress = {
  phase: "uploading";
  chunksetIdx: number;     // Current chunkset index (0-based)
  totalChunksets: number;
  chunksetBytes: number;   // Size of current chunkset
  uploadedBytes: number;   // Total bytes uploaded so far
  totalBytes: number;      // Total blob size
  acksReceived?: number;
  spAcks?: StorageProviderAck[];
};
```

---

## Low-Level Operations

### Manual register → upload → commit

`client.upload()` does this for you. Do it by hand for streaming, custom batching, or to attach your own transaction options. The blob is addressed by its on-chain **UID** until the final commit binds it under its name.

```typescript
import { generateCommitments, createDefaultErasureCodingProvider, ShelbyBlobClient } from "@shelby-protocol/sdk";

// 1. Generate commitments
const provider = await createDefaultErasureCodingProvider();
const commitments = await generateCommitments(provider, blobData);

// 2. Register on chain (creates a PENDING blob). Location resolves via options.
const { transaction } = await client.coordination.registerBlob({
  account: signer,
  blobName: "my-blob.txt",
  blobMerkleRoot: commitments.blob_merkle_root,
  size: blobData.length,
  options: { selectedLocation },
});

const registered = await client.aptos.waitForTransaction({ transactionHash: transaction.hash });

// 3. Read the UID assigned at registration from the tx's BlobRegisteredEvent.
//    waitForTransaction returns a union; narrow to the shape that carries events.
const events = "events" in registered ? registered.events : [];
const [{ uid }] = ShelbyBlobClient.registeredBlobUids(events, client.coordination.deployer);

// 4. Upload the bytes; the RPC returns storage-provider acks
const { spAcks } = await client.rpc.putBlobChunksets({
  account: signer,
  uid,
  blobData,
  commitments,
});

// 5. Commit — binds the written blob under its name (acks applied atomically)
const { transaction: commitTx } = await client.coordination.commitObject({
  account: signer,
  uid,
  blobName: "my-blob.txt",
  overwrite: false,
  storageProviderAcks: spAcks,
});
await client.aptos.waitForTransaction({ transactionHash: commitTx.hash });
```

> A commit can be *rejected* while the transaction still succeeds. Check with
> `ShelbyBlobClient.findObjectCommitRejection(commitEvents, deployer, uid)` (returns a
> `CommitRejectionReason` or `undefined`), or catch `ObjectCommitRejectedError`.

### Create Transaction Payloads

For custom transaction handling or batching:

```typescript
// Create register blob payload (encoding is required; selectedLocation optional)
const registerPayload = ShelbyBlobClient.createRegisterBlobPayload({
  account: accountAddress,
  blobName: "blob.txt",
  blobSize: 1000,
  blobMerkleRoot: merkleRoot,
  numChunksets: 1,
  encoding: 0,
  selectedLocation,
});

// Create delete object payload
const deletePayload = ShelbyBlobClient.createDeleteObjectPayload({
  blobName: "blob.txt",
});

// Create micropayment channel payload
const channelPayload = ShelbyMicropaymentChannelClient.makeCreateMicropaymentChannelPayload({
  receiver: receiverAddress,
  expirationMicros: expiration,
  depositAmount: 1000,
  fungibleAssetAddress: tokenAddress,
});
```

### Indexer-backed queries

Prefer the typed `coordination` methods, which wrap the GraphQL indexer and return `FullObjectMetadata[]`:

```typescript
const blobs = await client.coordination.getBlobs({
  where: { owner: { _eq: ownerAddress.toString() } },
  pagination: { limit: 100, offset: 0 },
  orderBy: { created_at: "desc" },
});

const count = await client.coordination.getBlobsCount({
  where: { owner: { _eq: ownerAddress.toString() } },
});

const totalBytes = await client.coordination.getTotalBlobsSize({
  where: { owner: { _eq: ownerAddress.toString() } },
});
```

The raw generated GraphQL SDK is still reachable at `client.coordination.indexer` if you need queries these methods don't cover.

### Blob Activities

Query blob lifecycle events:

```typescript
const activities = await client.coordination.getBlobActivities({
  where: {
    blob_name: { _eq: "@address/my-blob.txt" },
  },
  orderBy: { timestamp: "desc" },
  pagination: { limit: 50 },
});

// Activity types: "register_blob" | "delete_blob" | "write_blob"
//               | "commit_object" | "delete_object" | "reject_object_commit" | "unknown"
for (const activity of activities) {
  console.log(`${activity.type} at ${activity.timestamp}`); // timestamp is a string
  console.log(`  Transaction: ${activity.transactionHash}`);
}
```

### Storage-provider acknowledgements

Storage-provider acks (`StorageProviderAck[]`) are produced by `rpc.putBlobChunksets()` and applied to the blob when you call `coordination.commitObject()` — see [Manual register → upload → commit](#manual-register--upload--commit). There is no separate "add acknowledgements" call; the commit binds the written blob and applies its acks atomically.

---

## Blob Naming and Keys

### Create Blob Keys

```typescript
import { createBlobKey } from "@shelby-protocol/sdk";

const key = createBlobKey({
  account: "0x123...",
  blobName: "folder/file.txt",
});
// Result: "@000...123/folder/file.txt"
```

### Blob Name Schema

Blob names are validated against a schema:

```typescript
import { BlobNameSchema } from "@shelby-protocol/sdk";

BlobNameSchema.parse("valid/name.txt");     // OK
BlobNameSchema.parse("../invalid");          // Throws
BlobNameSchema.parse("path//double-slash");  // Throws
```

Valid blob names:
- Can contain alphanumeric characters, `-`, `_`, `.`, `/`
- Cannot start with `/` or contain `..`
- Cannot have consecutive slashes `//`
