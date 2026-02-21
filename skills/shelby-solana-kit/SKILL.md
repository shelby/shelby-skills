---
name: shelby-solana-kit
description: Solana wallet integration for Shelby decentralized storage via Derived Account Abstraction (DAA). Use when working with @shelby-protocol/solana-kit.
---

# Shelby Solana Kit

The Solana Kit enables Solana wallets to use Shelby decentralized storage through **Derived Account Abstraction (DAA)**. A Solana public key combined with a dApp domain deterministically derives a Shelby storage account on Aptos, authenticated via Sign-In with Solana (SIWS).

## Package Version

Use the correct version (as of 2026):
```bash
"@shelby-protocol/solana-kit": "^0.2.0"
```

## Installation

```bash
# Core solana-kit package
pnpm install @shelby-protocol/solana-kit

# For Node.js usage
pnpm install @solana/web3.js

# For React usage (with wallet-adapter)
pnpm install @solana/wallet-adapter-react @solana/wallet-adapter-base

# You also need the core SDK and React hooks for full integration
pnpm install @shelby-protocol/sdk @shelby-protocol/react @tanstack/react-query
```

## Quick Start - Node.js

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

## Quick Start - React

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { ShelbyClientProvider, useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

function StorageComponent() {
  const { publicKey, signMessage, signIn } = useWallet();
  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  const adaptedWallet = publicKey ? {
    account: { address: publicKey },
    signMessage,
    signIn,
  } : null;

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet: adaptedWallet,
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

The Solana Kit adds two main APIs:

- **`createStorageAccount(keypair, domain)`** — Derives a Shelby storage account from a Solana keypair and dApp domain (Node.js)
- **`useStorageAccount({ client, wallet })`** — React hook that returns `storageAccountAddress` and `signAndSubmitTransaction` for use as a `WalletAdapterSigner` with the core React hooks

For core Shelby concepts (expiration, blob naming, networks, error handling, configuration), see the **shelby-sdk** skill.

## Wallet Library Comparison

The Solana Kit works with two React wallet libraries:

| Feature | `@solana/react-hooks` (new) | `@solana/wallet-adapter-react` (legacy) |
|---------|---------------------------|----------------------------------------|
| Package | `@solana/kit` | `@solana/wallet-adapter-react` |
| Hook | `useWalletConnection()` | `useWallet()` |
| Wallet shape | Direct `wallet` object | Requires adapter: `{ account: { address: publicKey }, signMessage, signIn }` |
| Recommended for | New projects | Existing projects using wallet-adapter |

Both approaches produce a compatible `SolanaWallet` object for `useStorageAccount`. See the Quick Start sections above for usage with each library.

## Multi-File Upload Example

Upload multiple files in a single batch:

```tsx
import { useStorageAccount, Network } from "@shelby-protocol/solana-kit/react";
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState } from "react";

function MultiFileUploader() {
  const { publicKey, signMessage, signIn } = useWallet();
  const [results, setResults] = useState<string[]>([]);

  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
    apiKey: "AG-***",
  }), []);

  const adaptedWallet = useMemo(() => {
    if (!publicKey) return null;
    return { account: { address: publicKey }, signMessage, signIn };
  }, [publicKey, signMessage, signIn]);

  const { storageAccountAddress, signAndSubmitTransaction } = useStorageAccount({
    client: shelbyClient,
    wallet: adaptedWallet,
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
        disabled={!publicKey || isPending}
      />
      {isPending && <p>Uploading files...</p>}
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
- **shelby-ethereum-kit** — Alternative cross-chain integration for Ethereum wallets
- **shelby-media** — Video transcoding and playback on Shelby storage

## Reference Files

- `references/solana-kit.md` - Complete Solana integration guide with advanced usage
