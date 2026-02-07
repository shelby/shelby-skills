# Solana Kit Reference

Complete guide for integrating Shelby Protocol with Solana wallets.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Entry Points](#entry-points)
- [Node.js Usage](#nodejs-usage)
- [React Usage](#react-usage)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Exports](#exports)

## Overview

The Solana Kit enables Solana wallets to own and manage data on the Shelby network through **Derived Account Abstraction (DAA)**. It provides both Node.js and React entry points.

### Key Concepts

**Storage Account Derivation:**
- Solana public key + dApp domain = deterministic Shelby storage account
- Same wallet gets different storage accounts on different dApps (isolation)
- Uses SIWS (Sign-In with Solana) for cross-chain authentication

**Ownership Hierarchy:**
```
Solana Keypair/Wallet
    └── controls → Shelby Storage Account
                       └── owns → Blobs on Shelby
```

## Installation

```bash
pnpm install @shelby-protocol/solana-kit
```

For Node.js:
```bash
pnpm install @solana/web3.js
```

For React (with @solana/react-hooks):
```bash
pnpm install @solana/react-hooks @solana/kit
```

Or with wallet-adapter:
```bash
pnpm install @solana/wallet-adapter-react @solana/wallet-adapter-wallets
```

## Entry Points

| Entry Point | Import Path | Use Case |
|-------------|-------------|----------|
| **Node.js** | `@shelby-protocol/solana-kit/node` | Server-side, scripts, CLIs |
| **React** | `@shelby-protocol/solana-kit/react` | Browser apps |

---

## Node.js Usage

### Import

```typescript
import { Shelby, Network } from "@shelby-protocol/solana-kit/node";
```

### Initialize Client

```typescript
import { Shelby, Network } from "@shelby-protocol/solana-kit/node";
import { Connection } from "@solana/web3.js";

const shelbyClient = new Shelby({
  network: Network.SHELBYNET,
  connection: new Connection("https://api.devnet.solana.com"),
  apiKey: "AG-***",
});
```

### Create Storage Account

```typescript
import { Keypair } from "@solana/web3.js";

// Generate new keypair
const solanaKeypair = Keypair.generate();

// Or from secret key
const solanaKeypair = Keypair.fromSecretKey(Uint8Array.from([...]));

// Create storage account
const storageAccount = shelbyClient.createStorageAccount(
  solanaKeypair,
  "my-dapp.com"  // Domain for account derivation
);

console.log("Storage Address:", storageAccount.accountAddress.toString());
```

### Fund Account

Before uploading, fund the storage account:

```typescript
// ShelbyUSD for storage fees
await shelbyClient.fundAccountWithShelbyUSD({
  address: storageAccount.accountAddress,
  amount: 1_000_000,
});

// APT for transaction gas
await shelbyClient.fundAccountWithAPT({
  address: storageAccount.accountAddress,
  amount: 1_000_000,
});
```

### Upload Blobs

```typescript
const blobName = `document-${Date.now()}.txt`;

await shelbyClient.upload({
  blobData: new TextEncoder().encode("Hello from Solana!"),
  signer: storageAccount,
  blobName,
  expirationMicros: Date.now() * 1000 + 86400_000_000, // 24 hours
});

console.log(`URL: https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccount.accountAddress}/${blobName}`);
```

### Download Blobs

```typescript
const blob = await shelbyClient.download({
  account: storageAccount.accountAddress,
  blobName: "document.txt",
});

// Read the stream
const reader = blob.readable.getReader();
const chunks: Uint8Array[] = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}
const content = new TextDecoder().decode(
  new Uint8Array(chunks.flatMap(c => [...c]))
);
```

### Complete Example

```typescript
import { Shelby, Network } from "@shelby-protocol/solana-kit/node";
import { Connection, Keypair } from "@solana/web3.js";

async function main() {
  // Initialize
  const shelbyClient = new Shelby({
    network: Network.SHELBYNET,
    connection: new Connection("https://api.devnet.solana.com"),
    apiKey: "AG-***",
  });

  // Create storage account
  const keypair = Keypair.generate();
  const storageAccount = shelbyClient.createStorageAccount(keypair, "my-dapp.com");

  // Fund (testnet only)
  await shelbyClient.fundAccountWithShelbyUSD({
    address: storageAccount.accountAddress,
    amount: 1_000_000,
  });
  await shelbyClient.fundAccountWithAPT({
    address: storageAccount.accountAddress,
    amount: 1_000_000,
  });

  // Upload
  await shelbyClient.upload({
    blobData: new TextEncoder().encode("Hello, Shelby!"),
    signer: storageAccount,
    blobName: "hello.txt",
    expirationMicros: Date.now() * 1000 + 86400_000_000,
  });

  console.log("Done!");
}

main().catch(console.error);
```

---

## React Usage

### Import

```typescript
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
```

### Basic Usage with @solana/react-hooks

```tsx
"use client";

import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWalletConnection } from "@solana/react-hooks";
import { useMemo } from "react";

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

  if (!wallet) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>Solana Address: {wallet.account.address.toString()}</p>
      <p>Storage Account: {storageAccountAddress?.toString()}</p>
    </div>
  );
}
```

### Using with @solana/wallet-adapter-react

If using the older wallet-adapter library, adapt the wallet shape:

```tsx
import { useWallet } from "@solana/wallet-adapter-react";
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useMemo } from "react";

function StorageComponent() {
  const { publicKey, signMessage, signIn } = useWallet();

  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  // Adapt wallet-adapter to expected shape
  const adaptedWallet = publicKey ? {
    account: { address: publicKey },
    signMessage,
    signIn,
  } : null;

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet: adaptedWallet,
  });

  if (!publicKey) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>Solana Address: {publicKey.toBase58()}</p>
      <p>Storage Account: {storageAccountAddress?.toString()}</p>
    </div>
  );
}
```

### Upload with React Hooks

The `useUploadBlobs` hook from `@shelby-protocol/react` works directly with the `WalletAdapterSigner` returned by `useStorageAccount`. No manual upload implementation is needed.

```tsx
"use client";

import { useState, useMemo } from "react";
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { ShelbyClientProvider, useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWallet } from "@solana/wallet-adapter-react";

function FileUploader() {
  const { publicKey, signMessage, signIn } = useWallet();
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: process.env.NEXT_PUBLIC_SHELBY_API_KEY,
  }), []);

  // Adapt wallet-adapter to expected shape
  const adaptedWallet = useMemo(() => {
    if (!publicKey) return null;
    return {
      account: { address: publicKey },
      signMessage,
      signIn,
    };
  }, [publicKey, signMessage, signIn]);

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet: adaptedWallet,
  });

  // Hook takes optional client; mutation takes signer
  const { mutateAsync: uploadBlobs, isPending } = useUploadBlobs({
    client: shelbyClient,
  });

  const handleUpload = async (file: File) => {
    if (!storageAccountAddress || !signAndSubmitTransaction) return;

    const buffer = await file.arrayBuffer();
    await uploadBlobs({
      signer: { account: storageAccountAddress, signAndSubmitTransaction },
      blobs: [{ blobName: file.name, blobData: new Uint8Array(buffer) }],
      expirationMicros: Date.now() * 1000 + 7 * 24 * 3600 * 1_000_000, // 7 days
    });

    setUploadedUrl(
      `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccountAddress}/${file.name}`
    );
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={!publicKey || isPending}
      />
      {isPending && <p>Uploading...</p>}
      {uploadedUrl && <a href={uploadedUrl}>View uploaded file</a>}
    </div>
  );
}
```

### Delete Blob

For deleting blobs, use `ShelbyBlobClient.createDeleteBlobPayload`:

```typescript
import { ShelbyBlobClient } from "@shelby-protocol/sdk/browser";

const deleteBlob = async (blobNameSuffix: string) => {
  const payload = ShelbyBlobClient.createDeleteBlobPayload({
    deployer: client.config.deployer,
    blobNameSuffix,
  });

  await signAndSubmitTransaction({
    data: payload as any,
  });
};
```

---

## API Reference

### Shelby Class (Node.js)

Extends `ShelbyClient` with Solana-specific functionality.

**Constructor:**

```typescript
new Shelby({
  network: ShelbyNetwork,           // Required
  connection: Connection,           // Required: Solana RPC connection
  apiKey: string,                   // Required
})
```

**Methods:**

```typescript
// Create storage account from Solana Keypair
createStorageAccount(
  keypair: Keypair,
  domain: string,
  scheme?: string  // Default: "https"
): ShelbyStorageAccount
```

### useStorageAccount Hook (React)

**Parameters:**

```typescript
interface UseStorageAccountParams {
  client: ShelbyClient;
  wallet: SolanaWallet | null | undefined;
}

interface SolanaWallet {
  account: { address: { toString(): string } };
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  signIn?: (input?: SolanaSignInInput) => Promise<SolanaSignInOutput>;
}
```

**Returns:**

```typescript
interface UseStorageAccountResult {
  storageAccountAddress: AccountAddress | null;

  signTransaction: (params: SignTransactionInput) => Promise<{
    authenticator: AccountAuthenticatorAbstraction;
    rawTransaction: AnyRawTransaction;
  }>;

  submitTransaction: (params: SubmitTransactionInput) => Promise<{ hash: string }>;

  signAndSubmitTransaction: (params: SignAndSubmitTransactionInput) => Promise<{ hash: string }>;
}
```

### Transaction Input Types

```typescript
// For signTransaction
type SignTransactionInput = {
  data: InputEntryFunctionData;
};

// For submitTransaction
type SubmitTransactionInput = {
  transaction: AnyRawTransaction;
  senderAuthenticator: AccountAuthenticatorAbstraction;
} & InputTransactionPluginData;

// For signAndSubmitTransaction
type SignAndSubmitTransactionInput = {
  data: InputEntryFunctionData;
} & InputTransactionPluginData;
```

---

## How It Works

### 1. Address Derivation

The storage account address is deterministically derived:

```
StorageAddress = Derive(SolanaPublicKey, Domain)
```

This provides:
- **Determinism**: Same keypair + domain = same storage account
- **Isolation**: Different dApps get different storage accounts
- **Security**: Only the Solana keypair owner can sign for the storage account

### 2. SIWS Signing

When signing transactions:

1. Transaction payload is prepared
2. SIWS message is constructed with the payload
3. User signs with their Solana wallet
4. Signature is verified on Aptos via DAA

### 3. Transaction Flow

```
User Action → SIWS Signature → Aptos Transaction → Shelby Storage
```

---

## Error Handling

```typescript
try {
  await shelbyClient.upload({ ... });
} catch (error) {
  if (error.message?.includes("User rejected")) {
    // User rejected the signature request
    console.log("User cancelled");
  } else if (error.message?.includes("insufficient funds")) {
    // Account needs funding
    console.log("Please fund your account");
  }
}
```

---

## Best Practices

1. **Memoize the client** in React to avoid re-creation:
   ```tsx
   const client = useMemo(() => new ShelbyClient({ ... }), []);
   ```

2. **Check wallet connection** before operations:
   ```tsx
   if (!wallet) return <ConnectWalletButton />;
   ```

3. **Use consistent domains** - changing domains creates new storage accounts

4. **Handle loading states** for better UX:
   ```tsx
   if (isPending) return <Spinner />;
   ```

5. **Secure keypair storage** for Node.js:
   ```typescript
   // Load from environment
   const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_SECRET_KEY!));
   const keypair = Keypair.fromSecretKey(secretKey);
   ```

---

## Exports

```typescript
// Hook
export { useStorageAccount } from "./useStorageAccount";

// Types
export type {
  SolanaWallet,
  UseStorageAccountParams,
  UseStorageAccountResult,
  SignTransactionInput,
  SubmitTransactionInput,
  SignAndSubmitTransactionInput,
} from "./useStorageAccount";

// Constants
export { Network } from "../common";
```
