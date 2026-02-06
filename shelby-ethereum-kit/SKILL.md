---
name: shelby-ethereum-kit
description: Ethereum wallet integration for Shelby decentralized storage via Derived Account Abstraction (DAA). Use when working with @shelby-protocol/ethereum-kit.
---

# Shelby Ethereum Kit

The Ethereum Kit enables Ethereum wallets to use Shelby decentralized storage through **Derived Account Abstraction (DAA)**. An Ethereum address combined with a dApp domain deterministically derives a Shelby storage account on Aptos, authenticated via Sign-In with Ethereum (SIWE).

## Package Version

Use the correct version (as of 2026):
```bash
"@shelby-protocol/ethereum-kit": "^0.1.1"
```

## Installation

```bash
# Core ethereum-kit package
pnpm install @shelby-protocol/ethereum-kit

# For Node.js usage (with ethers)
pnpm install ethers

# For React usage (with wagmi/viem)
pnpm install wagmi viem

# You also need the core SDK and React hooks for full integration
pnpm install @shelby-protocol/sdk @shelby-protocol/react @tanstack/react-query
```

## Quick Start - Node.js

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

## Quick Start - React (with wagmi)

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/ethereum-kit/react";
import { ShelbyClientProvider, useUploadBlobs } from "@shelby-protocol/react";
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

  // useUploadBlobs works with the WalletAdapterSigner from useStorageAccount
  const { mutateAsync: uploadBlobs } = useUploadBlobs({ client: shelbyClient });

  const handleUpload = async (file: File) => {
    const data = new Uint8Array(await file.arrayBuffer());
    await uploadBlobs({
      signer: { account: storageAccountAddress, signAndSubmitTransaction },
      blobs: [{ blobData: data, blobName: file.name }],
      expirationMicros: Date.now() * 1000 + 86400_000_000,
    });
  };
}
```

## Core Concepts

The Ethereum Kit adds two main APIs:

- **`createStorageAccount(wallet, domain)`** — Derives a Shelby storage account from an Ethereum wallet and dApp domain (Node.js)
- **`useStorageAccount({ client, wallet })`** — React hook that returns `storageAccountAddress` and `signAndSubmitTransaction` for use as a `WalletAdapterSigner` with the core React hooks

For core Shelby concepts (expiration, blob naming, networks, error handling, configuration), see the **shelby-sdk** skill.

## Reference Files

- `references/ethereum-kit.md` - Complete Ethereum integration guide with advanced usage
