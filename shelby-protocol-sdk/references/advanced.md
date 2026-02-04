# Advanced Topics

Advanced Shelby Protocol features: micropayments, erasure coding, streaming, and low-level operations.

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

**ChannelInfo type:**

```typescript
interface ChannelInfo {
  sender: AccountAddress;
  receiver?: AccountAddress;
  fungibleAssetAddress: AccountAddress;
  balance: number;
  creationMicros: number;
  expirationMicros: number;
  nextWithdrawnSequenceNumber: number;
  paymentChannelId: number;
  receiverWithdrawnAmount: number;
}
```

### Create a Micropayment

```typescript
const micropayment = await mpClient.createMicropayment({
  sender: senderAccount,
  receiver: receiverAddress,
  amount: 100, // Payment amount
  paymentChannelId: channel.paymentChannelId,
  sequenceNumber: localSequenceNumber++, // Must be increasing
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
    const newMicropayment = await mpClient.createMicropayment({
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

### ClayErasureCodingProvider

```typescript
import { ClayErasureCodingProvider } from "@shelby-protocol/sdk";

// Create a provider (async initialization for WASM)
const provider = await ClayErasureCodingProvider.create();
```

### Shared Provider Pattern

For efficiency, share a single provider across multiple clients:

```typescript
const provider = await ClayErasureCodingProvider.create();

// Share across multiple clients
const mainnetClient = new ShelbyClient(mainnetConfig, provider);
const testnetClient = new ShelbyClient(testnetConfig, provider);
```

This avoids re-initializing the WASM module for each client.

### Generate Commitments

For low-level blob registration:

```typescript
import { generateCommitments } from "@shelby-protocol/sdk";

const provider = await ClayErasureCodingProvider.create();
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
- 13 helper chunks for efficient decoding

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

Track upload progress with the callback:

```typescript
await rpcClient.putBlob({
  account: accountAddress,
  blobName: "large-file.bin",
  blobData: largeData,
  onProgress: (progress) => {
    const percent = (progress.uploadedBytes / progress.totalBytes) * 100;
    console.log(`Upload: ${percent.toFixed(1)}% (${progress.partIdx + 1}/${progress.totalParts})`);
  },
});
```

**PutBlobProgress type:**

```typescript
interface PutBlobProgress {
  partIdx: number;        // Current part index (0-based)
  totalParts: number;     // Total number of parts
  partBytes: number;      // Size of current part
  uploadedBytes: number;  // Total bytes uploaded so far
  totalBytes: number;     // Total blob size
}
```

---

## Low-Level Operations

### Manual Commitment Generation and Registration

For advanced control over the upload process:

```typescript
import { generateCommitments, ClayErasureCodingProvider } from "@shelby-protocol/sdk";

// 1. Generate commitments
const provider = await ClayErasureCodingProvider.create();
const commitments = await generateCommitments(provider, blobData);

// 2. Register on blockchain
const { transaction } = await client.coordination.registerBlob({
  account: signer,
  blobName: "my-blob.txt",
  blobMerkleRoot: commitments.blob_merkle_root,
  size: blobData.length,
  expirationMicros: Date.now() * 1000 + 86400_000_000,
});

await client.coordination.aptos.waitForTransaction({
  transactionHash: transaction.hash,
});

// 3. Upload to RPC
await client.rpc.putBlob({
  account: signer.accountAddress,
  blobName: "my-blob.txt",
  blobData: blobData,
});
```

### Create Transaction Payloads

For custom transaction handling or batching:

```typescript
// Create register blob payload
const registerPayload = ShelbyBlobClient.createRegisterBlobPayload({
  account: accountAddress,
  blobName: "blob.txt",
  blobSize: 1000,
  blobMerkleRoot: merkleRoot,
  expirationMicros: expiration,
  numChunksets: 1,
});

// Create delete blob payload
const deletePayload = ShelbyBlobClient.createDeleteBlobPayload({
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

### Direct Indexer Queries

Access the GraphQL indexer directly:

```typescript
const { blobs } = await client.coordination.indexer.getBlobs({
  where: {
    owner: { _eq: ownerAddress.toString() },
    expires_at: { _gte: Date.now() * 1000 },
  },
  limit: 100,
  offset: 0,
  orderBy: { created_at: "desc" },
});

const { blobs_aggregate } = await client.coordination.indexer.getBlobsCount({
  where: { owner: { _eq: ownerAddress.toString() } },
});
```

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

// Activity types: "register_blob", "delete_blob", "extend_blob_expiration", "write_blob"
for (const activity of activities) {
  console.log(`${activity.type} at ${new Date(activity.timestamp)}`);
  console.log(`  Transaction: ${activity.transactionHash}`);
}
```

### Chunkset Acknowledgements

For storage providers to acknowledge blob storage:

```typescript
const { transaction } = await client.coordination.addChunksetAcknowledgements({
  account: storageProviderAccount,
  blobOwner: ownerAddress,
  blobName: "blob.txt",
  creationMicros: metadata.creationMicros,
  chunksetIdx: 0,
  storageProviderAcks: [
    { slot: 0, signature: signature0 },
    { slot: 1, signature: signature1 },
  ],
});
```

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
