# React Hooks Reference

## Critical Warning

**`@shelby-protocol/react` is designed ONLY for native Aptos wallets.**

If you are using Ethereum or Solana wallets, you **CANNOT** use these hooks. Instead:
- For Ethereum: See `ethereum-kit.md` for manual upload implementation
- For Solana: See `solana-kit.md` for manual upload implementation

The hooks expect `signAndSubmitTransaction` from `@aptos-labs/wallet-adapter-react`, which has a different signature than the cross-chain kits.

## Installation

```bash
pnpm install @shelby-protocol/react @tanstack/react-query @aptos-labs/wallet-adapter-react
```

**Peer Dependencies:**
- `@tanstack/react-query` - Required for data fetching and caching
- `@aptos-labs/wallet-adapter-react` - Required for Aptos wallet integration

## Setup

Wrap your app with `ShelbyClientProvider` inside a `QueryClientProvider`:

```tsx
import { ShelbyClientProvider } from "@shelby-protocol/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider>
        <ShelbyClientProvider network={Network.SHELBYNET} apiKey="AG-***">
          <YourApp />
        </ShelbyClientProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  );
}
```

### ShelbyClientProvider Props

```typescript
interface ShelbyClientProviderProps {
  network: Network;           // Required: Network.SHELBYNET or Network.LOCAL
  apiKey?: string;            // Optional: API key for higher rate limits
  children: React.ReactNode;
}
```

## Query Hooks

### useAccountBlobs

Fetches all blobs for an account with pagination.

```tsx
import { useAccountBlobs } from "@shelby-protocol/react";

function BlobList() {
  const { account } = useWallet();

  const {
    data: blobs,
    isLoading,
    error,
    refetch,
  } = useAccountBlobs({
    account: account?.address,
    pagination: { limit: 20, offset: 0 },
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

**Parameters:**
```typescript
interface UseAccountBlobsParams {
  account?: AccountAddressInput;  // The account to fetch blobs for
  pagination?: {
    limit?: number;   // Max blobs to return (default: 100)
    offset?: number;  // Number of blobs to skip (default: 0)
  };
}
```

**Returns:** React Query result with `BlobData[]`

### useBlobMetadata

Fetches metadata for a specific blob.

```tsx
import { useBlobMetadata } from "@shelby-protocol/react";

function BlobDetails({ blobName }: { blobName: string }) {
  const { account } = useWallet();

  const { data: metadata, isLoading } = useBlobMetadata({
    account: account?.address,
    blobName,
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

## Mutation Hooks

### useUploadBlobs

Uploads one or more blobs to Shelby storage.

```tsx
import { useUploadBlobs } from "@shelby-protocol/react";

function FileUploader() {
  const { signAndSubmitTransaction } = useWallet();

  const {
    mutateAsync: uploadBlobs,
    isPending,
    error,
  } = useUploadBlobs({
    signAndSubmitTransaction,
  });

  const handleUpload = async (files: FileList) => {
    const blobs = await Promise.all(
      Array.from(files).map(async (file) => ({
        blobData: new Uint8Array(await file.arrayBuffer()),
        blobName: file.name,
      }))
    );

    await uploadBlobs({
      blobs,
      expirationMicros: Date.now() * 1000 + 7 * 24 * 3600 * 1_000_000, // 7 days
    });
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => e.target.files && handleUpload(e.target.files)}
      disabled={isPending}
    />
  );
}
```

**Parameters:**
```typescript
interface UseUploadBlobsParams {
  signAndSubmitTransaction: SignAndSubmitTransactionFunction;  // From useWallet()
}

interface UploadBlobsInput {
  blobs: Array<{
    blobData: Uint8Array;
    blobName: string;
  }>;
  expirationMicros: number;  // Required: expiration in microseconds
}
```

### useCommitBlobs

Commits blob registrations on-chain (used in advanced upload flows).

```tsx
import { useCommitBlobs } from "@shelby-protocol/react";

const { mutateAsync: commitBlobs } = useCommitBlobs({
  signAndSubmitTransaction,
});

await commitBlobs({
  commitments: [
    {
      blobName: "file.txt",
      commitment: commitmentData,
      expirationMicros: Date.now() * 1000 + 86400_000_000,
    },
  ],
});
```

### useDeleteBlob / useDeleteBlobs

Deletes one or multiple blobs.

```tsx
import { useDeleteBlob, useDeleteBlobs } from "@shelby-protocol/react";

function BlobManager() {
  const { signAndSubmitTransaction } = useWallet();

  // Delete single blob
  const { mutateAsync: deleteBlob } = useDeleteBlob({
    signAndSubmitTransaction,
  });

  // Delete multiple blobs
  const { mutateAsync: deleteBlobs } = useDeleteBlobs({
    signAndSubmitTransaction,
  });

  const handleDelete = async (blobName: string) => {
    await deleteBlob({ blobName });
  };

  const handleBulkDelete = async (blobNames: string[]) => {
    await deleteBlobs({ blobNames });
  };
}
```

### useEncodeBlobs

Encodes blobs using erasure coding (for advanced use cases).

```tsx
import { useEncodeBlobs } from "@shelby-protocol/react";

const { mutateAsync: encodeBlobs } = useEncodeBlobs();

const encoded = await encodeBlobs({
  blobs: [{ blobData: data, blobName: "file.txt" }],
});
// Returns encoded blob data with commitments
```

### useRegisterCommitments

Registers blob commitments on-chain (step in advanced upload flow).

```tsx
import { useRegisterCommitments } from "@shelby-protocol/react";

const { mutateAsync: registerCommitments } = useRegisterCommitments({
  signAndSubmitTransaction,
});

await registerCommitments({
  commitments: [...],
  expirationMicros: Date.now() * 1000 + 86400_000_000,
});
```

## Complete Example

A complete file manager component using React hooks:

```tsx
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  ShelbyClientProvider,
  useAccountBlobs,
  useUploadBlobs,
  useDeleteBlob,
} from "@shelby-protocol/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Network } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();

function FileManager() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [uploading, setUploading] = useState(false);

  const { data: blobs, isLoading, refetch } = useAccountBlobs({
    account: account?.address,
  });

  const { mutateAsync: uploadBlobs } = useUploadBlobs({
    signAndSubmitTransaction,
  });

  const { mutateAsync: deleteBlob } = useDeleteBlob({
    signAndSubmitTransaction,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const blobsToUpload = await Promise.all(
        Array.from(files).map(async (file) => ({
          blobData: new Uint8Array(await file.arrayBuffer()),
          blobName: `uploads/${file.name}`,
        }))
      );

      await uploadBlobs({
        blobs: blobsToUpload,
        expirationMicros: Date.now() * 1000 + 30 * 24 * 3600 * 1_000_000, // 30 days
      });

      await refetch();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (blobName: string) => {
    if (!confirm(`Delete ${blobName}?`)) return;
    await deleteBlob({ blobName });
    await refetch();
  };

  if (!connected) {
    return <div>Please connect your Aptos wallet</div>;
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
  return (
    <QueryClientProvider client={queryClient}>
      <ShelbyClientProvider network={Network.SHELBYNET}>
        <FileManager />
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```

## Troubleshooting

### "Failed to fetch" Error with Cross-Chain Wallets

**Problem:** Using `useUploadBlobs` with Ethereum Kit or Solana Kit throws "Failed to fetch".

**Cause:** `@shelby-protocol/react` hooks are designed only for native Aptos wallets. The `signAndSubmitTransaction` from cross-chain kits has a different signature.

**Solution:** Do NOT use `@shelby-protocol/react` hooks with cross-chain wallets. Instead, implement manual upload:
- For Ethereum: See `ethereum-kit.md`
- For Solana: See `solana-kit.md`

### Type Errors with signAndSubmitTransaction

**Problem:** TypeScript error when passing `signAndSubmitTransaction` to hooks.

**Cause:** You might be importing from the wrong package or using a cross-chain kit.

**Solution:** Ensure you're using `@aptos-labs/wallet-adapter-react`:

```tsx
// Correct
import { useWallet } from "@aptos-labs/wallet-adapter-react";

// Wrong - cross-chain kit, won't work with React hooks
import { useStorageAccount } from "@shelby-protocol/ethereum-kit/react";
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
      <ShelbyClientProvider network={Network.SHELBYNET}>
        {/* Your app */}
      </ShelbyClientProvider>
    </QueryClientProvider>
  );
}
```
