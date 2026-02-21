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

## Full React App Setup (wagmi + RainbowKit)

A complete app setup with wallet connection and Shelby storage:

```tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "My Shelby App",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [mainnet],
});

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {/* Your StorageComponent here */}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

## Multi-File Upload Example

Upload multiple files in a single batch:

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/ethereum-kit/react";
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWalletClient } from "wagmi";
import { useMemo, useState } from "react";

function MultiFileUploader() {
  const { data: wallet } = useWalletClient();
  const [results, setResults] = useState<string[]>([]);

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
  });

  const handleUpload = async (files: FileList) => {
    if (!storageAccountAddress || !signAndSubmitTransaction) return;

    const blobs = await Promise.all(
      Array.from(files).map(async (file) => ({
        blobName: `uploads/${file.name}`,
        blobData: new Uint8Array(await file.arrayBuffer()),
      }))
    );

    await uploadBlobs({
      signer: { account: storageAccountAddress, signAndSubmitTransaction },
      blobs,
      expirationMicros: Date.now() * 1000 + 7 * 24 * 3600 * 1_000_000, // 7 days
    });

    setResults(blobs.map((b) =>
      `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${storageAccountAddress}/${b.blobName}`
    ));
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
        disabled={!wallet || isPending}
      />
      {isPending && <p>Uploading {results.length > 0 ? "more " : ""}files...</p>}
      {results.map((url) => (
        <p key={url}><a href={url}>{url.split("/").pop()}</a></p>
      ))}
    </div>
  );
}
```

## Listing and Managing Blobs

Display and manage stored blobs:

```tsx
import { useAccountBlobs } from "@shelby-protocol/react";

function BlobList({ accountAddress }: { accountAddress: string }) {
  const { data: blobs, isLoading } = useAccountBlobs({
    account: accountAddress,
  });

  if (isLoading) return <p>Loading blobs...</p>;

  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Size</th><th>Expires</th></tr>
      </thead>
      <tbody>
        {blobs?.map((blob) => (
          <tr key={blob.blobNameSuffix}>
            <td>{blob.blobNameSuffix}</td>
            <td>{(blob.size / 1024).toFixed(1)} KB</td>
            <td>{new Date(blob.expirationMicros / 1000).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## See Also

- **shelby-sdk** — Core storage operations (upload, download, delete, list blobs)
- **shelby-solana-kit** — Alternative cross-chain integration for Solana wallets
- **shelby-media** — Video transcoding and playback on Shelby storage

## Reference Files

- `references/ethereum-kit.md` - Complete Ethereum integration guide with advanced usage
