// Mirrors the documented @shelby-protocol/react surface (skills/shelby-sdk/references/react.md)
// against installed 4.2.0.
import { Account, Network } from "@aptos-labs/ts-sdk";
import { ShelbyClient, Order_By, type BlobCommitments } from "@shelby-protocol/sdk/browser";
import {
  ShelbyClientProvider,
  useShelbyClient,
  useAccountBlobs,
  useFullObjectMetadata,
  useUploadBlobs,
  useDeleteObjects,
  useDeleteObject,
  useEncodeBlobs,
  useRegisterCommitments,
  useCommitBlobs,
  getUseAccountBlobsQueryKey,
  getUseFullObjectMetadataQueryKey,
  type Signer,
  type AccountSigner,
  type WalletAdapterSigner,
} from "@shelby-protocol/react";

const client = new ShelbyClient({ network: Network.SHELBYNET });

declare const walletSigner: WalletAdapterSigner;
declare const commitments: BlobCommitments;

export function Demo({ account }: { account: Account }) {
  useShelbyClient(client);
  const accountSigner: AccountSigner = account;
  const signer: Signer = accountSigner;

  // Query hooks
  const blobs = useAccountBlobs({
    client,
    account: account.accountAddress,
    pagination: { limit: 10, offset: 0 },
    orderBy: { updated_at: Order_By.Desc },
  });
  blobs.data?.[0]?.blobNameSuffix;

  const meta = useFullObjectMetadata({ client, account: account.accountAddress, name: "a.txt" });
  meta.data?.isWritten;

  getUseAccountBlobsQueryKey({ account: account.accountAddress, network: Network.SHELBYNET });
  getUseFullObjectMetadataQueryKey({ account: account.accountAddress, name: "a.txt", network: Network.SHELBYNET });

  // Upload (Account signer only)
  const upload = useUploadBlobs({ client });
  void (() => upload.mutateAsync({
    signer,
    blobs: [{ blobName: "a.txt", blobData: new Uint8Array([1]) }],
    options: { selectedLocation: "loc" },
    maxConcurrentUploads: 3,
  }));

  // Delete
  const del = useDeleteObjects({ client });
  void (() => del.mutateAsync({ signer, blobNames: ["a.txt", "b.txt"] }));
  const delOne = useDeleteObject({ client });
  void (() => delOne.mutateAsync({ signer, blobName: "a.txt" }));

  // Encode
  const encode = useEncodeBlobs({});
  void (() => encode.mutateAsync({
    blobs: [{ blobData: new Uint8Array([1]) }],
    onChunk: ({ blobIndex, progress }) => void [blobIndex, progress],
  }));

  // Register
  const register = useRegisterCommitments({ client });
  void (() => register.mutateAsync({
    signer,
    commitments: [{ blobName: "a.txt", commitment: commitments }],
    options: { selectedLocation: "loc" },
  }));

  // Commit (wallet-adapter signer, needs uid + commitments)
  const commit = useCommitBlobs({ client });
  void (() => commit.mutateAsync({
    signer: walletSigner,
    blobs: [{ uid: 1n, blobName: "a.txt", blobData: new Uint8Array([1]), commitments }],
    overwrite: false,
    maxConcurrentUploads: 3,
  }));

  return (
    <ShelbyClientProvider client={client}>
      <span>{blobs.isLoading ? "..." : blobs.data?.length}</span>
    </ShelbyClientProvider>
  );
}
