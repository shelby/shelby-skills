# React Hooks Reference

`@shelby-protocol/react@^4.2.0` — TanStack Query hooks for Shelby, on top of `@shelby-protocol/sdk`.

> ⚠️ **Wallet uploads are unauthenticated.** `useUploadBlobs` works with both `Account` and wallet-adapter signers. For a wallet it runs register → chunkset upload → commit internally (the same steps as `useEncodeBlobs`/`useRegisterCommitments`/`useCommitBlobs`); the byte-upload is **address-only / unauthenticated** (a wallet can't sign the RPC ownership challenge), so it needs an RPC that accepts that — ShelbyNet does — and each blob costs one register prompt + one commit prompt. `Account` signers use the single `batchUpload` path. On-chain register/delete and read queries work with both signer types. See the wallet-upload notes below.

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Signer Types](#signer-types)
- [Hook Options Pattern](#hook-options-pattern)
- [Query Hooks](#query-hooks)
  - [useAccountBlobs](#useaccountblobs)
  - [useFullObjectMetadata](#usefullobjectmetadata)
- [Mutation Hooks](#mutation-hooks)
  - [useUploadBlobs](#useuploadblobs)
  - [useDeleteObjects](#usedeleteobjects)
  - [useDeleteObject (deprecated)](#usedeleteobject-deprecated)
  - [useEncodeBlobs](#useencodeblobs)
  - [useRegisterCommitments](#useregistercommitments)
  - [useCommitBlobs](#usecommitblobs)
- [Complete Example](#complete-example)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
pnpm install @shelby-protocol/react @shelby-protocol/sdk @tanstack/react-query @aptos-labs/ts-sdk
```

**Peer dependencies (from the package):**

| Package | Range |
|---------|-------|
| `@shelby-protocol/sdk` | `>=0.5.0 <1.0.0` |
| `@tanstack/react-query` | `>=5.0.0` |
| `@aptos-labs/ts-sdk` | `^5.2.1 \|\| ^6.0.0` |
| `@aptos-labs/wallet-adapter-react` | `^6.0.0 \|\| ^7.0.0` (for native Aptos wallets) |
| `react` / `react-dom` | `^18.0.0 \|\| ^19.0.0` |
| `typescript` | `>=5.0.4` |

The package also exposes a framework-agnostic `@shelby-protocol/react/core` subpath (query builders + `getUse*QueryKey` helpers) for advanced cache control.

## Setup

Wrap your app with `ShelbyClientProvider` inside a `QueryClientProvider`. The provider takes a `client` prop (a browser `ShelbyClient`):

```tsx
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Network } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();
const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: "AG-***",
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <YourApp />
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```

`useShelbyClient(client?)` resolves the client from context (or a passed override) if you need it imperatively.

## Signer Types

Mutation hooks that submit on-chain transactions accept a `Signer`:

```typescript
type Signer = AccountSigner | WalletAdapterSigner;

// AccountSigner = Account (from @aptos-labs/ts-sdk) — Node scripts or direct key access
type WalletAdapterSigner = {
  account?: AccountAddressInput | { address: AccountAddressInput } | null;
  signAndSubmitTransaction: SignAndSubmitTransactionFn;   // from useWallet()
};
```

`WalletAdapterSigner` works with `useWallet()` from `@aptos-labs/wallet-adapter-react` (any Aptos wallet adapter). The hook detects the type at runtime: if `signAndSubmitTransaction` is present it uses the wallet path, otherwise the `Account` path.

> Reminder: `useUploadBlobs` accepts both signer types; for a **wallet** the byte-upload is unauthenticated (address-only), so it needs a permissive RPC — ShelbyNet. `useCommitBlobs` is the lower-level wallet commit step (also unauthenticated).

## Hook Options Pattern

Mutation hooks follow `UseMutationOptionsWithClient`; query hooks follow `UseQueryOptionsWithClient`. Both add an optional `client` override and otherwise pass through the standard TanStack Query options (`onSuccess`, `onError`, `enabled`, `staleTime`, …). If `client` is omitted, the hook uses the `ShelbyClientProvider` context.

## Query Hooks

### useAccountBlobs

Fetches blobs for an account (`FullObjectMetadata[]`) with pagination, filtering, and ordering.

```tsx
import { useAccountBlobs } from "@shelby-protocol/react";
import { Order_By } from "@shelby-protocol/sdk/browser";

function BlobList({ address }: { address: string }) {
  const { data: blobs, isLoading, error, refetch } = useAccountBlobs({
    account: address,
    pagination: { limit: 20, offset: 0 },
    orderBy: { updated_at: Order_By.Desc },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {blobs?.map((blob) => (
        <li key={blob.name}>
          {blob.blobNameSuffix} — {blob.size} bytes
          <br />
          Created: {new Date(blob.creationMicros / 1000).toLocaleString()}
        </li>
      ))}
    </ul>
  );
}
```

**Options** (`UseAccountBlobsOptions`): the parameters of `ShelbyBlobClient.getAccountBlobs` (`account`, `pagination?`, `orderBy?`, `where?`) plus `client?` and standard query options. Returns `UseQueryResult<FullObjectMetadata[], Error>`. The query-key helper `getUseAccountBlobsQueryKey({ ...params, network })` is exported for manual invalidation.

### useFullObjectMetadata

Metadata for a single blob. Returns `FullObjectMetadata | null` (`null` if not found).

```tsx
import { useFullObjectMetadata } from "@shelby-protocol/react";

function BlobDetails({ address, name }: { address: string; name: string }) {
  const { data: metadata, isLoading } = useFullObjectMetadata({
    account: address,
    name,            // the blob name (suffix), not `blobName`
  });

  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <p>Size: {metadata?.size} bytes</p>
      <p>Written: {String(metadata?.isWritten)}</p>
      <p>Created: {metadata ? new Date(metadata.creationMicros / 1000).toLocaleString() : "—"}</p>
    </div>
  );
}
```

> Renamed from the old `useBlobMetadata`. Query-key helper: `getUseFullObjectMetadataQueryKey`.

## Mutation Hooks

### useUploadBlobs

Uploads one or more blobs (encode → register → chunkset upload → commit). Works with `Account` and wallet-adapter signers (wallet uploads are unauthenticated — needs a permissive RPC).

```tsx
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network, Account } from "@aptos-labs/ts-sdk";

const shelbyClient = new ShelbyClient({ network: Network.SHELBYNET });

function FileUploader({ signer }: { signer: Account }) {
  const { mutateAsync: uploadBlobs, isPending, error } = useUploadBlobs({
    client: shelbyClient,
    onSuccess: () => console.log("Upload complete"),
  });

  const handleUpload = async (files: FileList) => {
    const blobs = await Promise.all(
      Array.from(files).map(async (file) => ({
        blobData: new Uint8Array(await file.arrayBuffer()),
        blobName: file.name,
      })),
    );
    const [location] = await shelbyClient.metadata.getLocationNames();

    await uploadBlobs({
      signer,                                     // Account signer
      blobs,
      options: { selectedLocation: location },    // required on a fresh account
      maxConcurrentUploads: 3,                     // optional, default 3
    });
  };

  return <input type="file" multiple disabled={isPending}
    onChange={(e) => e.target.files && handleUpload(e.target.files)} />;
}
```

**Mutation variables (`UseUploadBlobsVariables`):**

```typescript
{
  signer: Signer;                 // Account or wallet-adapter signer
  blobs: { blobName: string; blobData: Uint8Array }[];
  options?: UploadOptions;         // selectedLocation / locationHint / chunksetSizeBytes / usdSponsor …
  maxConcurrentUploads?: number;   // default 3
}
```

### useDeleteObjects

Deletes one or more blobs on-chain. Optimizes gas automatically (single vs. multi). Works with `Account` and wallet-adapter signers. Multi-delete is atomic. Returns `{ hash }`.

```tsx
import { useDeleteObjects } from "@shelby-protocol/react";

const { mutateAsync: deleteObjects } = useDeleteObjects({
  client: shelbyClient,
  onSuccess: ({ hash }) => console.log("Delete tx:", hash),
});

await deleteObjects({ signer, blobNames: ["folder/file.txt"] });                 // single
await deleteObjects({ signer, blobNames: ["a.txt", "b.txt"] });                   // atomic batch
```

**Variables (`UseDeleteObjectsVariables`):** `{ signer: Signer; blobNames: string[]; options?: InputGenerateTransactionOptions }`. `blobNames` are suffixes without the `@address` prefix.

### useDeleteObject (deprecated)

Single-blob delete. **Deprecated — prefer `useDeleteObjects`.** Variables: `{ signer: Signer; blobName: string; options?: InputGenerateTransactionOptions }`, returns `{ hash }`.

### useEncodeBlobs

Erasure-codes blobs and returns `BlobCommitments[]`. No client / no on-chain work — pure client-side encoding, useful for the manual upload flow and progress UIs.

```tsx
import { useEncodeBlobs } from "@shelby-protocol/react";

const { mutateAsync: encodeBlobs } = useEncodeBlobs({
  onSuccess: (commitments) => console.log("Encoded", commitments.length, "blobs"),
});

const commitments = await encodeBlobs({
  blobs: [{ blobData: new Uint8Array([/* ... */]) }],
  onChunk: ({ blobIndex, progress }) =>
    console.log(`Blob ${blobIndex}: ${(progress * 100).toFixed(1)}%`),
});
```

**Variables (`UseEncodeBlobsVariables`):** `{ blobs: { blobData: Uint8Array }[]; provider?: ErasureCodingProvider; onChunk?: (e) => void }`. The `onChunk` event carries `{ blobIndex, chunksetIndex, chunkIndex, chunkData, progress }` (`progress` is 0→1).

### useRegisterCommitments

Registers pre-computed commitments on-chain (the register step of a manual flow). Works with both signer types. Returns `{ hash }`.

```tsx
import { useRegisterCommitments } from "@shelby-protocol/react";

const { mutateAsync: registerCommitments } = useRegisterCommitments({ client: shelbyClient });

await registerCommitments({
  signer,
  commitments: [{ blobName: "file1.txt", commitment: blobCommitments[0] }],
  options: { selectedLocation },  // UploadOptions — location resolves here
});
```

**Variables (`UseRegisterCommitmentsVariables`):** `{ signer: Signer; commitments: { blobName: string; commitment: BlobCommitments }[]; options?: UploadOptions }`.

### useCommitBlobs

Uploads **already-registered** blobs to the RPC and commits them on-chain — the wallet-adapter path for finishing an upload that was registered separately. For each blob the data is uploaded (returning SP acks) and then bound under its name with `commit_object`.

> **Wallet-adapter only, one tx prompt per blob, and the upload is unauthenticated** (a wallet cannot sign the RPC's raw challenge). Only works against an RPC that does not require upload auth.

```tsx
import { useCommitBlobs } from "@shelby-protocol/react";

const { mutateAsync: commitBlobs } = useCommitBlobs({ client: shelbyClient });

await commitBlobs({
  signer,   // WalletAdapterSigner; must be the account the blobs were registered under
  blobs: [
    {
      uid,                 // bigint, from the register tx's BlobRegisteredEvent
      blobName: "file1.txt",
      blobData: new Uint8Array([/* ... */]),
      commitments,         // the BlobCommitments the blob was registered with
    },
  ],
  overwrite: false,        // optional, default false
  maxConcurrentUploads: 3, // optional, default 3
});
```

**Variables (`UseCommitBlobsVariables`):** `{ signer: WalletAdapterSigner; blobs: { uid: bigint; blobName: string; blobData: Uint8Array; commitments: BlobCommitments }[]; overwrite?: boolean; maxConcurrentUploads?: number }`.

## Complete Example

A file manager. This example **uploads with an `Account` signer** for simplicity; a wallet-adapter signer works with `useUploadBlobs` too. Listing and deletion use the connected wallet.

```tsx
import { useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  ShelbyClientProvider,
  useAccountBlobs,
  useUploadBlobs,
  useDeleteObjects,
} from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Network, Account } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();
const shelbyClient = new ShelbyClient({ network: Network.SHELBYNET });

// This example uploads with an Account signer for simplicity; a wallet-adapter
// signer works with useUploadBlobs too.
function FileManager({ uploadAccount }: { uploadAccount: Account }) {
  const { account, connected } = useWallet();
  const [uploading, setUploading] = useState(false);

  const { data: blobs, isLoading, refetch } = useAccountBlobs({
    account: account?.address,
  });
  const { mutateAsync: uploadBlobs } = useUploadBlobs({ client: shelbyClient });
  const { mutateAsync: deleteObjects } = useDeleteObjects({ client: shelbyClient });

  const walletSigner = account
    ? { account: account.address, signAndSubmitTransaction: useWallet().signAndSubmitTransaction }
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const toUpload = await Promise.all(
        Array.from(files).map(async (file) => ({
          blobData: new Uint8Array(await file.arrayBuffer()),
          blobName: `uploads/${file.name}`,
        })),
      );
      const [location] = await shelbyClient.metadata.getLocationNames();
      await uploadBlobs({
        signer: uploadAccount,   // Account signer
        blobs: toUpload,
        options: { selectedLocation: location },
      });
      await refetch();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (blobName: string) => {
    if (!walletSigner || !confirm(`Delete ${blobName}?`)) return;
    await deleteObjects({ signer: walletSigner, blobNames: [blobName] });
    await refetch();
  };

  if (!connected) return <div>Please connect your wallet</div>;

  return (
    <div>
      <h2>My Files</h2>
      <input type="file" multiple onChange={handleFileChange} disabled={uploading} />
      {uploading && <span>Uploading...</span>}
      {isLoading ? <p>Loading files...</p> : (
        <ul>
          {blobs?.map((blob) => (
            <li key={blob.name}>
              {blob.blobNameSuffix} — {(blob.size / 1024).toFixed(2)} KB
              <button onClick={() => handleDelete(blob.blobNameSuffix)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App({ uploadAccount }: { uploadAccount: Account }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <FileManager uploadAccount={uploadAccount} />
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```

## Troubleshooting

### Wallet uploads and the lower-level hooks

**How it works.** Uploading bytes goes through the v2 **chunkset** endpoint (`putBlobChunksets`). The RPC can authenticate the writer via a challenge signed with `account.sign(...)` — a ts-sdk `Account` can do that; a browser **wallet adapter** (which only exposes `signAndSubmitTransaction`) cannot, so a wallet's byte-upload goes out **address-only / unauthenticated** (accepted only by an RPC that doesn't require upload auth — ShelbyNet does). `useUploadBlobs` handles this for you: for a wallet signer it registers, uploads chunksets by address, then submits one `commit_object` per blob; for an `Account` signer it uses `batchUpload`.

Note this is *upload-auth* specific: a wallet can still **register** and **commit** on-chain (normal transactions) — it just can't authenticate the raw byte upload, which is why that step goes out address-only. (A full ts-sdk `Account` — which holds a key — *can* authenticate the upload via the RPC challenge; a browser wallet adapter cannot.)

**Two ways to upload:**

1. **`useUploadBlobs` (recommended).** One call does encode → register → upload → commit, for `Account` or wallet-adapter signers.

2. **Lower-level hooks (custom flows).** `useEncodeBlobs` → `useRegisterCommitments` → `useCommitBlobs` run the same steps yourself — useful for progress UIs or custom batching. The wallet byte-upload via `useCommitBlobs` is unauthenticated (address-only), which **ShelbyNet accepts**. This is also how the Shelby Explorer uploads.

   ```tsx
   import { ShelbyBlobClient } from "@shelby-protocol/sdk/browser";

   // 1) Encode locally (no chain, no signer)
   const [commitment] = await encodeBlobs.mutateAsync({ blobs: [{ blobData }] });

   // 2) Register on-chain with the connected wallet
   const { hash } = await registerCommitments.mutateAsync({
     signer: walletSigner,
     commitments: [{ blobName, commitment }],
     options: { selectedLocation },
   });

   // 3) Recover the on-chain UID from the register tx's BlobRegisteredEvent
   const tx = await shelbyClient.aptos.waitForTransaction({ transactionHash: hash });
   const [{ uid }] = ShelbyBlobClient.registeredBlobUids(tx.events, shelbyClient.coordination.deployer);

   // 4) Upload bytes + commit (UNAUTHENTICATED upload — needs a permissive RPC)
   await commitBlobs.mutateAsync({
     signer: walletSigner,
     blobs: [{ uid, blobName, blobData, commitments: commitment }],
   });
   ```

`useUploadBlobs` is the one-call path for both signer types; the lower-level hooks stay available for custom upload flows.

### "No write location could be resolved…" on upload

A fresh account has no default location. Pass `options.selectedLocation` (from `shelbyClient.metadata.getLocationNames()`), or configure a `locationHint` on the `ShelbyClient`.

### Blobs not appearing after upload

Call `refetch()` after upload, or set a short `staleTime` on the query client (`new QueryClient({ defaultOptions: { queries: { staleTime: 5000 } } })`).

### "No QueryClient set" / "requires a client or ShelbyClientProvider"

Ensure the tree is wrapped in `QueryClientProvider` and `ShelbyClientProvider` — or pass `client` directly to each hook.
