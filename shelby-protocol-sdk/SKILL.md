---
name: shelby-protocol-sdk
description: Build decentralized storage applications using the Shelby Protocol TypeScript SDK. Use when creating apps that upload, download, or manage blob storage on the Shelby network, when working with Shelby clients (ShelbyClient, ShelbyBlobClient, ShelbyRPCClient), or when integrating Shelby with Ethereum/Solana wallets via cross-chain kits.
---

# Shelby Protocol SDK

The Shelby Protocol SDK enables decentralized blob storage on the Aptos blockchain. This skill covers the core SDK and cross-chain integrations (Ethereum Kit, Solana Kit).

## Critical Warnings

### `@shelby-protocol/react` is NOT Compatible with Cross-Chain Kits

**The `@shelby-protocol/react` package (including `useUploadBlobs`) is designed ONLY for native Aptos wallets.** It expects `signAndSubmitTransaction` from `@aptos-labs/wallet-adapter-react`, which has a different signature than the cross-chain kits.

If you are using **Solana Kit** or **Ethereum Kit**, you **CANNOT** use:
- `useUploadBlobs` from `@shelby-protocol/react`
- Any hooks from `@shelby-protocol/react`

Instead, you must implement manual upload using lower-level SDK APIs. See the "Manual Upload for Cross-Chain Wallets" section in `references/solana-kit.md` or `references/ethereum-kit.md`.

### Package Versions

Use the correct versions (as of 2025):
```bash
"@shelby-protocol/sdk": "^0.0.9"
"@shelby-protocol/solana-kit": "^0.2.0"
"@aptos-labs/ts-sdk": "^5.1.0"  # Required as direct dependency
```

### API Response Field Names

When listing blobs with `getAccountBlobs()`, the response uses:
- `blobNameSuffix` (not `name` or `blobName`)
- `creationMicros` (not `created_at`)
- `expirationMicros` (not `expiration`)

```typescript
interface BlobData {
  name: string;           // Full blob name with account prefix
  blobNameSuffix: string; // The blob name without account prefix (use this)
  size: number;
  creationMicros: number; // Microseconds since epoch
  expirationMicros: number;
}
```

## Installation

```bash
# Core SDK
pnpm install @shelby-protocol/sdk

# For Ethereum integration
pnpm install @shelby-protocol/ethereum-kit

# For Solana integration
pnpm install @shelby-protocol/solana-kit
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

## Quick Start - Ethereum Kit

### Node.js

```typescript
import { Shelby, Network } from "@shelby-protocol/ethereum-kit/node";
import { Wallet } from "ethers";

const shelby = new Shelby({ network: Network.SHELBYNET, apiKey: "AG-***" });
const wallet = new Wallet("0x...private_key...");
const storageAccount = shelby.createStorageAccount(wallet, "my-dapp.com");

// Fund and upload
await shelby.fundAccountWithShelbyUSD({ address: storageAccount.accountAddress, amount: 1_000_000 });
await shelby.fundAccountWithAPT({ address: storageAccount.accountAddress, amount: 1_000_000 });

await shelby.upload({
  blobData: new TextEncoder().encode("Hello from Ethereum!"),
  signer: storageAccount,
  blobName: "hello.txt",
  expirationMicros: Date.now() * 1000 + 86400_000_000,
});
```

### React (with wagmi)

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/ethereum-kit/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWalletClient } from "wagmi";
import { useMemo } from "react";

function StorageComponent() {
  const { data: wallet } = useWalletClient();
  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet,
  });

  // Storage account is automatically derived from ETH wallet + domain
}
```

See `references/ethereum-kit.md` for complete documentation.

## Quick Start - Solana Kit

### Node.js

```typescript
import { Shelby, Network } from "@shelby-protocol/solana-kit/node";
import { Connection, Keypair } from "@solana/web3.js";

const shelby = new Shelby({
  network: Network.SHELBYNET,
  connection: new Connection("https://api.devnet.solana.com"),
  apiKey: "AG-***",
});
const keypair = Keypair.generate();
const storageAccount = shelby.createStorageAccount(keypair, "my-dapp.com");

await shelby.upload({
  blobData: new TextEncoder().encode("Hello from Solana!"),
  signer: storageAccount,
  blobName: "hello.txt",
  expirationMicros: Date.now() * 1000 + 86400_000_000,
});
```

### React

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWalletConnection } from "@solana/react-hooks";

function StorageComponent() {
  const { wallet } = useWalletConnection();
  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet,
  });
}
```

See `references/solana-kit.md` for complete documentation.

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
  // Required: The Shelby network
  network: ShelbyNetwork;

  // Optional: API key for authentication
  apiKey?: string;

  // Optional: Custom Aptos blockchain settings
  aptos?: AptosSettings;

  // Optional: Custom RPC node configuration
  rpc?: {
    baseUrl?: string;
    apiKey?: string;
  };

  // Optional: Custom indexer configuration
  indexer?: {
    baseUrl?: string;
    apiKey?: string;
  };
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
try {
  await client.upload({ ... });
} catch (error) {
  if (error.message?.includes("EBLOB_NOT_FOUND")) {
    // Blob doesn't exist
  }
  if (error.message?.includes("sub_status: Some(404)")) {
    // Resource not found
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
- `references/ethereum-kit.md` - Complete Ethereum integration guide (Node.js + React)
- `references/solana-kit.md` - Complete Solana integration guide (Node.js + React)
- `references/advanced.md` - Micropayments, erasure coding, streaming, low-level operations
- `references/sdk-feedback.md` - Known issues and improvement recommendations for the SDK
