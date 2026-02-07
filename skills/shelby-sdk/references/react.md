# React Hooks Reference

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
- [Signer Types](#signer-types)
- [Query Hooks](#query-hooks)
  - [useAccountBlobs](#useaccountblobs)
  - [useBlobMetadata](#useblobmetadata)
- [Mutation Hooks](#mutation-hooks)
  - [useUploadBlobs](#useuploadblobs)
  - [useDeleteBlob](#usedeleteblob-deprecated)
  - [useDeleteBlobs](#usedeleteblobs)
  - [useEncodeBlobs](#useencodeblobs)
  - [useRegisterCommitments](#useregistercommitments)
  - [useCommitBlobs](#usecommitblobs)
- [Complete Example](#complete-example)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
pnpm install @shelby-protocol/react @tanstack/react-query
```

**Peer Dependencies:**
- `@tanstack/react-query` >= 5.0.0 - Required for data fetching and caching
- `@aptos-labs/ts-sdk` >= 5.0.0 - Required for Aptos types
- `@aptos-labs/wallet-adapter-react` (optional) - For native Aptos wallets

## Setup

Wrap your app with `ShelbyClientProvider` inside a `QueryClientProvider`. The provider takes a `client` prop (a `ShelbyClient` instance):

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

### ShelbyClientProvider Props

```typescript
interface ShelbyClientProviderProps {
  client: ShelbyClient;         // Required: A ShelbyClient instance
  children: React.ReactNode;
}
```

## Signer Types

All mutation hooks that perform on-chain transactions accept a `Signer` type, which supports both native Aptos accounts and cross-chain wallet adapters:

```typescript
type Signer = AccountSigner | WalletAdapterSigner;

// AccountSigner = Account (from @aptos-labs/ts-sdk)
// Used for Node.js scripts or direct key access

type WalletAdapterSigner = {
  account?: AccountAddressInput | { address: AccountAddressInput } | null;
  signAndSubmitTransaction: SignAndSubmitTransactionFn;
};
// Works with:
// - useWallet() from @aptos-labs/wallet-adapter-react
// - useStorageAccount() from @shelby-protocol/ethereum-kit/react
// - useStorageAccount() from @shelby-protocol/solana-kit/react
```

The hook detects the signer type at runtime: if `signAndSubmitTransaction` is present on the signer, it uses the wallet adapter path; otherwise, it uses the `Account` signer path.

## Hook Options Pattern

All mutation hooks follow the `UseMutationOptionsWithClient` pattern:

```typescript
type UseMutationOptionsWithClient = {
  client?: ShelbyClient | null;  // Optional: override context client
  // ... all standard @tanstack/react-query UseMutationOptions
  onSuccess?: (data) => void;
  onError?: (error) => void;
  onSettled?: () => void;
};
```

If `client` is not provided, the hook uses the client from `ShelbyClientProvider` context.

## Query Hooks

### useAccountBlobs

Fetches all blobs for an account with pagination, filtering, and ordering.

```tsx
import { useAccountBlobs } from "@shelby-protocol/react";
import { Order_By } from "@shelby-protocol/sdk/browser";

function BlobList() {
  const {
    data: blobs,
    isLoading,
    error,
    refetch,
  } = useAccountBlobs({
    account: "0x123...",
    pagination: { limit: 20, offset: 0 },
    orderBy: { updated_at: Order_By.Desc },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {blobs?.map((blob) => (
        <li key={blob.name}>
          {blob.blobNameSuffix} - {blob.size} bytes
          <br />
          Expires: {new Date(blob.expirationMicros / 1000).toLocaleString()}
        </li>
      ))}
    </ul>
  );
}
```

**Options:**
```typescript
interface UseAccountBlobsOptions extends UseQueryOptionsWithClient<BlobMetadata[]> {
  account: AccountAddressInput;   // The account to fetch blobs for
  pagination?: {
    limit?: number;   // Max blobs to return
    offset?: number;  // Number of blobs to skip
  };
  orderBy?: Blobs_Order_By;
  where?: Omit<Blobs_Bool_Exp, "owner">;
  client?: ShelbyClient | null;   // Optional: override context client
}
```

**Returns:** React Query result with `BlobMetadata[]`

### useBlobMetadata

Fetches metadata for a specific blob. Returns `null` if the blob is not found.

```tsx
import { useBlobMetadata } from "@shelby-protocol/react";

function BlobDetails({ blobName }: { blobName: string }) {
  const { data: metadata, isLoading } = useBlobMetadata({
    account: "0x123...",
    name: blobName,  // Note: uses `name`, not `blobName`
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>Size: {metadata?.size} bytes</p>
      <p>Created: {new Date(metadata?.creationMicros / 1000).toLocaleString()}</p>
      <p>Expires: {new Date(metadata?.expirationMicros / 1000).toLocaleString()}</p>
    </div>
  );
}
```

**Options:**
```typescript
interface UseBlobMetadataOptions extends UseQueryOptionsWithClient<BlobMetadata | null> {
  account: AccountAddressInput;
  name: string;                   // The blob name (not blobName)
  client?: ShelbyClient | null;
}
```

## Mutation Hooks

### useUploadBlobs

Uploads one or more blobs to Shelby storage. Handles the complete upload process: encoding, on-chain registration, and data upload.

```tsx
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network } from "@aptos-labs/ts-sdk";

function FileUploader() {
  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
  }), []);

  // Hook takes optional client
  const {
    mutateAsync: uploadBlobs,
    isPending,
    error,
  } = useUploadBlobs({
    client: shelbyClient,
    onSuccess: () => console.log("Upload complete"),
  });

  const handleUpload = async (files: FileList, signer: Signer) => {
    const blobs = await Promise.all(
      Array.from(files).map(async (file) => ({
        blobData: new Uint8Array(await file.arrayBuffer()),
        blobName: file.name,
      }))
    );

    // Mutation takes signer and blobs
    await uploadBlobs({
      signer,
      blobs,
      expirationMicros: Date.now() * 1000 + 7 * 24 * 3600 * 1_000_000, // 7 days
      maxConcurrentUploads: 3, // Optional, default: 3
    });
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => e.target.files && handleUpload(e.target.files, signer)}
      disabled={isPending}
    />
  );
}
```

**Hook Options:**
```typescript
type UseUploadBlobsOptions = UseMutationOptionsWithClient<void, Error, UseUploadBlobsVariables>;
```

**Mutation Variables:**
```typescript
interface UseUploadBlobsVariables {
  signer: Signer;                // Required: Account or WalletAdapterSigner
  blobs: Array<{
    blobData: Uint8Array;
    blobName: string;
  }>;
  expirationMicros: number;      // Required: expiration in microseconds
  options?: UploadOptions;        // Optional: chunkset size, tx options
  maxConcurrentUploads?: number;  // Optional: default 3
}
```

### useDeleteBlob (deprecated)

Deletes a single blob. **Deprecated** - use `useDeleteBlobs` instead.

```tsx
import { useDeleteBlob } from "@shelby-protocol/react";

const { mutateAsync: deleteBlob } = useDeleteBlob({
  client: shelbyClient,
  onSuccess: ({ hash }) => console.log("Deleted:", hash),
});

await deleteBlob({
  signer,
  blobName: "folder/file.txt",
});
```

### useDeleteBlobs

Deletes one or more blobs. Automatically optimizes: uses `delete_blob` for single deletion, `delete_multiple_blobs` for batch.

```tsx
import { useDeleteBlobs } from "@shelby-protocol/react";

const { mutateAsync: deleteBlobs } = useDeleteBlobs({
  client: shelbyClient,
  onSuccess: ({ hash }) => console.log("Delete tx:", hash),
});

// Delete a single blob
await deleteBlobs({
  signer,
  blobNames: ["folder/file.txt"],
});

// Delete multiple blobs in one transaction
await deleteBlobs({
  signer,
  blobNames: ["folder/file1.txt", "folder/file2.txt"],
});
```

**Mutation Variables:**
```typescript
interface UseDeleteBlobsVariables {
  signer: Signer;
  blobNames: string[];                        // Blob names without account prefix
  options?: InputGenerateTransactionOptions;   // Optional tx options
}
```

### useEncodeBlobs

Encodes blobs using erasure coding. Returns `BlobCommitments[]`. Does NOT require a client (no on-chain operations).

```tsx
import { useEncodeBlobs } from "@shelby-protocol/react";

const { mutateAsync: encodeBlobs } = useEncodeBlobs({
  onSuccess: (commitments) => console.log("Encoded", commitments.length, "blobs"),
});

const commitments = await encodeBlobs({
  blobs: [{ blobData: new Uint8Array([...]) }],
  onChunk: ({ blobIndex, progress }) => {
    console.log(`Blob ${blobIndex}: ${(progress * 100).toFixed(1)}%`);
  },
});
```

**Mutation Variables:**
```typescript
interface UseEncodeBlobsVariables {
  blobs: { blobData: Uint8Array }[];
  provider?: ErasureCodingProvider;   // Optional: custom provider
  onChunk?: (event: {
    blobIndex: number;
    chunksetIndex: number;
    chunkIndex: number;
    chunkData: Uint8Array;
    progress: number;                 // 0 to 1
  }) => void;
}
```

### useRegisterCommitments

Registers blob commitments on-chain. Used in advanced upload flows where you generate commitments separately.

```tsx
import { useRegisterCommitments } from "@shelby-protocol/react";

const { mutateAsync: registerCommitments } = useRegisterCommitments({
  client: shelbyClient,
  onSuccess: ({ hash }) => console.log("Transaction:", hash),
});

await registerCommitments({
  signer,
  commitments: [
    { blobName: "file1.txt", commitment: blobCommitments[0] },
  ],
  expirationMicros: Date.now() * 1000 + 86400_000_000,
});
```

**Mutation Variables:**
```typescript
interface UseRegisterCommitmentsVariables {
  signer: Signer;
  commitments: { blobName: string; commitment: BlobCommitments }[];
  expirationMicros: number;
  options?: UploadOptions;
}
```

### useCommitBlobs

Uploads blob data to Shelby RPC nodes (the data upload step, after on-chain registration).

```tsx
import { useCommitBlobs } from "@shelby-protocol/react";

const { mutateAsync: commitBlobs } = useCommitBlobs({
  client: shelbyClient,
  onSuccess: () => console.log("Blobs committed"),
});

await commitBlobs({
  account: "0x123...",
  blobs: [
    { blobName: "file1.txt", blobData: new Uint8Array([...]) },
    { blobName: "file2.txt", blobData: new Uint8Array([...]) },
  ],
  maxConcurrentUploads: 3, // Optional, default: 3
});
```

**Mutation Variables:**
```typescript
interface UseCommitBlobsVariables {
  account: AccountAddressInput;
  blobs: { blobName: string; blobData: Uint8Array }[];
  maxConcurrentUploads?: number;  // Default: 3
}
```

## Complete Example

A complete file manager component using React hooks:

```tsx
import { useState, useMemo } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  ShelbyClientProvider,
  useAccountBlobs,
  useUploadBlobs,
  useDeleteBlobs,
} from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Network } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();

function FileManager() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [uploading, setUploading] = useState(false);

  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
  }), []);

  const { data: blobs, isLoading, refetch } = useAccountBlobs({
    account: account?.address,
  });

  const { mutateAsync: uploadBlobs } = useUploadBlobs({
    client: shelbyClient,
  });

  const { mutateAsync: deleteBlobs } = useDeleteBlobs({
    client: shelbyClient,
  });

  const signer = account ? { account: account.address, signAndSubmitTransaction } : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !signer) return;

    setUploading(true);
    try {
      const blobsToUpload = await Promise.all(
        Array.from(files).map(async (file) => ({
          blobData: new Uint8Array(await file.arrayBuffer()),
          blobName: `uploads/${file.name}`,
        }))
      );

      await uploadBlobs({
        signer,
        blobs: blobsToUpload,
        expirationMicros: Date.now() * 1000 + 30 * 24 * 3600 * 1_000_000, // 30 days
      });

      await refetch();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (blobName: string) => {
    if (!confirm(`Delete ${blobName}?`) || !signer) return;
    await deleteBlobs({ signer, blobNames: [blobName] });
    await refetch();
  };

  if (!connected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <h2>My Files</h2>

      <input
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <span>Uploading...</span>}

      {isLoading ? (
        <p>Loading files...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {blobs?.map((blob) => (
              <tr key={blob.name}>
                <td>{blob.blobNameSuffix}</td>
                <td>{(blob.size / 1024).toFixed(2)} KB</td>
                <td>{new Date(blob.expirationMicros / 1000).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDelete(blob.blobNameSuffix)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function App() {
  const shelbyClient = useMemo(() => new ShelbyClient({
    network: Network.SHELBYNET,
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        <FileManager />
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```

## Troubleshooting

### Type Errors with signAndSubmitTransaction

**Problem:** TypeScript error when passing `signAndSubmitTransaction` to mutation variables.

**Solution:** The signer is passed in the mutation call (not the hook), as a `Signer` type:

```tsx
// Correct: signer goes in the mutation variables
const { mutateAsync: uploadBlobs } = useUploadBlobs({ client: shelbyClient });
await uploadBlobs({ signer: { account: address, signAndSubmitTransaction }, blobs, expirationMicros });

// Wrong: don't pass signer to the hook
const { mutateAsync: uploadBlobs } = useUploadBlobs({ signAndSubmitTransaction }); // ERROR
```

### Blobs Not Appearing After Upload

**Problem:** After `uploadBlobs` succeeds, `useAccountBlobs` doesn't show the new blob.

**Solution:** Call `refetch()` after upload, or configure React Query with a shorter `staleTime`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5 seconds
    },
  },
});
```

### Missing QueryClientProvider Error

**Problem:** "No QueryClient set, use QueryClientProvider to set one"

**Solution:** Ensure your app is wrapped with `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider client={shelbyClient}>
        {/* Your app */}
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```

### Missing ShelbyClientProvider Error

**Problem:** "`useShelbyClient` requires a client or `ShelbyClientProvider`"

**Solution:** Either wrap your app with `ShelbyClientProvider` or pass `client` directly to each hook:

```tsx
// Option 1: Use provider (recommended)
<ShelbyClientProvider client={shelbyClient}>
  <YourApp />
</ShelbyClientProvider>

// Option 2: Pass client to each hook
const { data } = useAccountBlobs({ client: shelbyClient, account: "0x..." });
```
