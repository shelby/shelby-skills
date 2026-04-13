---
name: shelby-sdk
description: "Upload, download, delete, and list files on Shelby decentralized storage. Provides React hooks for storage UIs and batch operations. Use when building with @shelby-protocol/sdk or @shelby-protocol/react, implementing on-chain file storage, or managing blobs on Aptos."
---

# Shelby Protocol SDK

The Shelby Protocol SDK enables decentralized blob storage on the Aptos blockchain. This skill covers the core SDK and React hooks.

## Cross-Chain Wallet Support

The `@shelby-protocol/react` hooks support **all wallet types** through the `Signer` type:

```typescript
type Signer = AccountSigner | WalletAdapterSigner;

// AccountSigner = Aptos Account (for Node.js / direct key usage)
// WalletAdapterSigner = { account, signAndSubmitTransaction } (for any wallet adapter)
```

For Ethereum wallet integration (DAA with SIWE), see the **shelby-ethereum-kit** skill. For Solana wallet integration (DAA with SIWS), see the **shelby-solana-kit** skill.

### Package Versions

```bash
"@shelby-protocol/sdk": "^0.0.9"
"@shelby-protocol/react": "^0.0.5"
"@aptos-labs/ts-sdk": "^5.1.0"  # Required as direct dependency
```

### API Response Field Names

When listing blobs with `getAccountBlobs()`, the response uses:
- `blobNameSuffix` (not `name` or `blobName`) — the blob name without account prefix
- `creationMicros` (not `created_at`) — microseconds since epoch
- `expirationMicros` (not `expiration`) — microseconds since epoch

## Installation

```bash
# Core SDK
pnpm install @shelby-protocol/sdk

# For React hooks (works with Aptos, Ethereum, and Solana wallets)
pnpm install @shelby-protocol/react @tanstack/react-query
```

## Quick Start - Core SDK (Node.js)

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Network, Account } from "@aptos-labs/ts-sdk";

// Initialize client
const client = new ShelbyNodeClient({ network: Network.SHELBYNET });
const account = Account.generate();

// Fund the account (testnet only)
await client.fundAccountWithShelbyUSD({ address: account.accountAddress, amount: 1_000_000 });
await client.fundAccountWithAPT({ address: account.accountAddress, amount: 1_000_000 });

// Upload a blob
await client.upload({
  blobData: Buffer.from("Hello, Shelby!"),
  signer: account,
  blobName: "hello.txt",
  expirationMicros: Date.now() * 1000 + 86400_000_000, // 24 hours
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
const data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
```

## Quick Start - React Hooks

The React hooks work with **any wallet type** through the `Signer` interface.

```tsx
import { ShelbyClientProvider, useAccountBlobs, useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

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

function StorageComponent() {
  const { account, signAndSubmitTransaction } = useWallet();

  // List blobs for current account
  const { data: blobs, isLoading } = useAccountBlobs({
    account: account?.address,
  });

  // Upload blobs - hook takes optional client, mutation takes signer
  const { mutateAsync: uploadBlobs } = useUploadBlobs({
    client: shelbyClient,
  });

  const handleUpload = async (file: File) => {
    const data = new Uint8Array(await file.arrayBuffer());
    await uploadBlobs({
      signer: { account: account?.address, signAndSubmitTransaction },
      blobs: [{ blobData: data, blobName: file.name }],
      expirationMicros: Date.now() * 1000 + 86400_000_000,
    });
  };

  return (
    <div>
      {isLoading ? "Loading..." : `${blobs?.length ?? 0} blobs`}
    </div>
  );
}
```

See `references/react.md` for full React hooks documentation.

## Key Concepts

### Expiration Time

All blobs have an expiration time in **microseconds** since Unix epoch:

```typescript
// 24 hours from now
const expirationMicros = Date.now() * 1000 + 86400_000_000;

// 7 days from now
const expirationMicros = Date.now() * 1000 + 7 * 24 * 3600 * 1_000_000;
```

### Blob Naming

Blob names can include paths using forward slashes:

```typescript
await client.upload({
  blobName: "images/photos/vacation.jpg",  // Valid path
  // ...
});
```

The full blob key is: `@{account_address}/{blob_name}`

### Networks

```typescript
import { Network } from "@aptos-labs/ts-sdk";

// Available networks
Network.SHELBYNET  // Main testnet
Network.LOCAL      // Local development
```

### API Keys

API keys authenticate your app and manage rate limits. Without one, requests run in "anonymous" mode with lower limits.

Instructions on obtaining an API key: https://docs.shelby.xyz/sdks/typescript/acquire-api-keys

## Configuration

```typescript
interface ShelbyClientConfig {
  network: ShelbyNetwork;        // Required: The Shelby network
  apiKey?: string;               // Optional: API key for authentication
  gasStationApiKey?: string;     // Optional: Gas station key (cross-chain kits)
  // Advanced: deployer, aptos, rpc, indexer, faucet — see references/api-reference.md
}
```

## Core Operations

### Upload

```typescript
await client.upload({
  blobData: Uint8Array,           // Required: The data to upload
  signer: Account,                 // Required: Account that signs/pays
  blobName: string,                // Required: Name/path of the blob
  expirationMicros: number,        // Required: Expiration in microseconds
  options?: {
    chunksetSizeBytes?: number,    // Optional: Custom chunkset size
    build?: { options?: InputGenerateTransactionOptions },
  },
});
```

### Batch Upload

```typescript
await client.batchUpload({
  blobs: [
    { blobData: Buffer.from("File 1"), blobName: "file1.txt" },
    { blobData: Buffer.from("File 2"), blobName: "file2.txt" },
  ],
  expirationMicros: Date.now() * 1000 + 86400_000_000,
  signer: account,
});

// Verify batch upload
const uploaded = await client.coordination.getAccountBlobs({ account: account.accountAddress });
console.log(`Uploaded ${uploaded.length} blob(s)`);
```

### Download

```typescript
const blob = await client.download({
  account: AccountAddressInput,  // The blob owner's address
  blobName: string,               // The blob name
  range?: { start: number; end?: number },  // Optional: partial download
});

// blob.readable is a ReadableStream
// blob.contentLength is the size in bytes
```

### Delete

```typescript
const { transaction } = await client.coordination.deleteBlob({
  account: signer,
  blobName: "file-to-delete.txt",
});
```

### List Blobs

```typescript
const blobs = await client.coordination.getAccountBlobs({
  account: accountAddress,
  pagination: { limit: 10, offset: 0 },
});

// Response structure:
// blobs: Array<{
//   name: string;           // Full name with account prefix
//   blobNameSuffix: string; // Just the blob name (use this)
//   size: number;
//   creationMicros: number;
//   expirationMicros: number;
// }>

// Example: Map to a cleaner structure
const files = blobs.map(blob => ({
  name: blob.blobNameSuffix,
  size: blob.size,
  createdAt: new Date(blob.creationMicros / 1000),
  expiresAt: new Date(blob.expirationMicros / 1000),
}));
```

## Error Handling

Common errors and how to handle them:

```typescript
import {
  isBlobAlreadyExistsError,
  isAccessDeniedError,
  isBlobNotFoundError,
  isBlobExpiredError,
  StaleChannelStateError,
} from "@shelby-protocol/sdk";

try {
  await client.upload({ ... });
} catch (error) {
  if (isBlobNotFoundError(error.message)) {
    // Blob doesn't exist
  }
  if (isBlobAlreadyExistsError(error.message)) {
    // Blob already registered
  }
  if (isAccessDeniedError(error.message)) {
    // Permission denied
  }
  if (isBlobExpiredError(error.message)) {
    // Blob has expired
  }
  if (error instanceof StaleChannelStateError) {
    // Micropayment channel state is stale
    const serverState = error.storedMicropayment;
  }
}
```

## HTTP Access

Download files directly via HTTP:

```bash
curl https://api.shelbynet.shelby.xyz/shelby/v1/blobs/{account_address}/{blob_name}
```

## Reference Files

For detailed API documentation, see:

- `references/api-reference.md` - Full API documentation for ShelbyClient, ShelbyBlobClient, ShelbyRPCClient
- `references/react.md` - React hooks documentation (works with all wallet types)
- `references/advanced.md` - Micropayments, erasure coding, streaming, low-level operations
- `references/sdk-feedback.md` - Known issues and improvement recommendations for the SDK

## Related Skills

- **shelby-ethereum-kit** - Ethereum wallet integration via Derived Account Abstraction (DAA)
- **shelby-solana-kit** - Solana wallet integration via Derived Account Abstraction (DAA)
