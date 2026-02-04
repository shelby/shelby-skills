# Ethereum Kit Reference

Complete guide for integrating Shelby Protocol with Ethereum wallets.

## Overview

The Ethereum Kit enables Ethereum wallets to own and manage data on the Shelby network through **Derivable Account Abstraction (DAA)**. It provides both Node.js and React entry points.

### Key Concepts

**Storage Account Derivation:**
- Ethereum address + dApp domain = deterministic Shelby storage account
- Same wallet gets different storage accounts on different dApps (isolation)
- Uses SIWE (Sign-In with Ethereum) for cross-chain authentication

**Ownership Hierarchy:**
```
Ethereum Wallet
    └── controls → Shelby Storage Account
                       └── owns → Blobs on Shelby
```

## Installation

```bash
pnpm install @shelby-protocol/ethereum-kit
```

For React, also install:
```bash
pnpm install wagmi viem @tanstack/react-query
```

## Entry Points

| Entry Point | Import Path | Use Case |
|-------------|-------------|----------|
| **Node.js** | `@shelby-protocol/ethereum-kit/node` | Server-side, scripts, CLIs |
| **React** | `@shelby-protocol/ethereum-kit/react` | Browser apps with wagmi |

---

## Node.js Usage

### Import

```typescript
import { Shelby, Network } from "@shelby-protocol/ethereum-kit/node";
```

### Initialize Client

```typescript
import { Shelby, Network } from "@shelby-protocol/ethereum-kit/node";

const shelbyClient = new Shelby({
  network: Network.SHELBYNET,
  apiKey: "AG-***",
  gasStationApiKey: "...", // Optional: for sponsored transactions
});
```

### Create Storage Account

```typescript
import { Wallet } from "ethers";

// From private key
const ethereumWallet = new Wallet("0x...private_key...");

// Or from mnemonic
const ethereumWallet = Wallet.fromPhrase("word1 word2 ...");

// Create storage account
const storageAccount = shelbyClient.createStorageAccount(
  ethereumWallet,
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
  blobData: new TextEncoder().encode("Hello from Ethereum!"),
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
import { Shelby, Network } from "@shelby-protocol/ethereum-kit/node";
import { Wallet } from "ethers";

async function main() {
  // Initialize
  const shelbyClient = new Shelby({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  });

  // Create storage account
  const wallet = new Wallet("0x...private_key...");
  const storageAccount = shelbyClient.createStorageAccount(wallet, "my-dapp.com");

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
import { useStorageAccount, Network } from "@shelby-protocol/ethereum-kit/react";
```

### Basic Usage with wagmi

```tsx
"use client";

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

  if (!wallet) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>ETH Address: {wallet.account.address}</p>
      <p>Storage Account: {storageAccountAddress?.toString()}</p>
    </div>
  );
}
```

### File Upload Component

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/ethereum-kit/react";
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWalletClient } from "wagmi";
import { useMemo, useState } from "react";

function FileUploader() {
  const { data: wallet } = useWalletClient();
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet,
  });

  const { mutateAsync: uploadBlobs, isPending } = useUploadBlobs({
    client: shelbyClient,
    signer: signAndSubmitTransaction,
  });

  const handleUpload = async (file: File) => {
    if (!storageAccountAddress) return;

    const buffer = await file.arrayBuffer();
    await uploadBlobs([{
      blobName: file.name,
      data: new Uint8Array(buffer),
      expirationMicros: Date.now() * 1000 + 86400_000_000,
    }]);

    setUploadedUrl(
      `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccountAddress}/${file.name}`
    );
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={!wallet || isPending}
      />
      {isPending && <p>Uploading...</p>}
      {uploadedUrl && <a href={uploadedUrl}>View uploaded file</a>}
    </div>
  );
}
```

### Works with Popular Wallet Libraries

The hook works with any wagmi-compatible provider:

- **RainbowKit**
- **Web3Modal**
- **ConnectKit**
- **Dynamic**

All use wagmi under the hood, so `useWalletClient()` works directly.

---

## API Reference

### Shelby Class (Node.js)

Extends `ShelbyClient` with Ethereum-specific functionality.

**Constructor:**

```typescript
new Shelby({
  network: ShelbyNetwork,     // Required
  apiKey: string,             // Required
  gasStationApiKey?: string,  // Optional: for sponsored transactions
})
```

**Methods:**

```typescript
// Create storage account from ethers Wallet
createStorageAccount(
  ethereumWallet: Wallet,
  domain: string,
  scheme?: string  // Default: "https"
): ShelbyStorageAccount
```

### ShelbyStorageAccount (Node.js)

Extends `EIP1193DerivedAccount` from `@aptos-labs/derived-wallet-ethereum`.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `accountAddress` | `AccountAddress` | Derived Aptos address |
| `ethereumWallet` | `Wallet` | Underlying ethers Wallet |
| `domain` | `string` | Domain used for derivation |
| `scheme` | `string` | URI scheme (default: "https") |
| `derivedPublicKey` | `EIP1193DerivedPublicKey` | Derived public key |
| `authenticationFunction` | `string` | Auth function string |

### useStorageAccount Hook (React)

**Parameters:**

```typescript
interface UseStorageAccountParams {
  client: ShelbyClient;
  wallet: EthereumWallet | null | undefined;
}

interface EthereumWallet {
  account: { address: `0x${string}` };
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
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

---

## How It Works

### 1. Address Derivation

The storage account address is deterministically derived:

```
StorageAddress = Derive(EthereumAddress, Domain)
```

This provides:
- **Determinism**: Same wallet + domain = same storage account
- **Isolation**: Different dApps get different storage accounts
- **Security**: Only the ETH wallet owner can sign for the storage account

### 2. SIWE Signing

When signing transactions:

1. Transaction payload is prepared
2. SIWE message is constructed with the payload
3. User signs with their Ethereum wallet
4. Signature is verified on Aptos via DAA

### 3. Transaction Flow

```
User Action → SIWE Signature → Aptos Transaction → Shelby Storage
```

---

## Error Handling

```typescript
try {
  await shelbyClient.upload({ ... });
} catch (error) {
  if (error.code === 4001) {
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
