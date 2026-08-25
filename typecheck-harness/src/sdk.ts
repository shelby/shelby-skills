// Mirrors the documented @shelby-protocol/sdk surface (skills/shelby-sdk: SKILL.md,
// references/api-reference.md, references/advanced.md) against installed 0.8.0.
import { Network, Account, AccountAddress } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import {
  ShelbyClient,
  ShelbyBlobClient,
  ShelbyRPCClient,
  ShelbyMetadataClient,
  ShelbyMicropaymentChannelClient,
  ShelbyPlacementGroupClient,
  generateCommitments,
  createDefaultErasureCodingProvider,
  StaleChannelStateError,
  ShelbyErrorCodes,
  ShelbyLocationErrorCodes,
  describeLocationError,
  isBlobNotFoundError,
  isBlobAlreadyExistsError,
  isAccessDeniedError,
  SHELBY_DEPLOYER,
  MICROPAYMENTS_DEPLOYER,
  SHELBYUSD_TOKEN_ADDRESS,
  NetworkToShelbyRPCBaseUrl,
  NetworkToDefaultLocationHint,
  NetworkToShelbyBlobIndexerBaseUrl,
  NetworkToGasStationBaseUrl,
  DEFAULT_CHUNK_SIZE_BYTES,
  DEFAULT_CHUNKSET_SIZE_BYTES,
  shelbyNetworks,
  isShelbyNetwork,
  createBlobKey,
  type ShelbyNetwork,
  type ShelbyClientConfig,
  type FullObjectMetadata,
  type BlobEncryption,
  type UploadOptions,
  type StorageProviderAck,
  type BlobCommitments,
  type PutBlobChunksetsResult,
} from "@shelby-protocol/sdk/node";
import { generateCommitmentsParallel } from "@shelby-protocol/sdk/node/parallel";
import { SpWriteClient } from "@shelby-protocol/sdk/sp";

export async function sdkSurface() {
  // Config shape (object faucet, orderless, locationHint; no gasStationApiKey)
  const config: ShelbyClientConfig = {
    network: Network.SHELBYNET,
    apiKey: "AG-x",
    faucet: { baseUrl: "https://faucet", authToken: "t" },
    orderless: true,
    locationHint: "loc",
    deployer: AccountAddress.from(SHELBY_DEPLOYER),
    micropaymentsDeployer: AccountAddress.from(MICROPAYMENTS_DEPLOYER),
    rpc: { baseUrl: "u", apiKey: "k" },
    indexer: { baseUrl: "u", apiKey: "k" },
  };

  // Network.CUSTOM ships no defaults — the config must supply its own endpoints/addresses.
  const _customConfig: ShelbyClientConfig = {
    network: Network.CUSTOM,
    deployer: AccountAddress.from(SHELBY_DEPLOYER),
    micropaymentsDeployer: AccountAddress.from(MICROPAYMENTS_DEPLOYER),
    rpc: { baseUrl: "https://custom/shelby" },
    indexer: { baseUrl: "https://custom/graphql" },
    locationHint: "custom-1",
  };
  void _customConfig;

  const client = new ShelbyNodeClient(config);
  const _browser: ShelbyClient = new ShelbyClient(config);
  const account = Account.generate();

  client.coordination; client.metadata; client.rpc; client.aptos; client.config; client.baseUrl;

  const _h1: string = await client.fundAccountWithAPT({ address: account.accountAddress, amount: 1 });
  const _h2: string = await client.fundAccountWithShelbyUSD({ address: account.accountAddress, amount: 1 });

  // Locations
  const locations: string[] = await client.metadata.getLocationNames();

  // Upload with selectedLocation
  const opts: UploadOptions = { selectedLocation: locations[0], locationHint: "l", chunksetSizeBytes: 1 };
  await client.upload({
    blobData: new Uint8Array([1, 2, 3]),
    signer: account,
    blobName: "hello.txt",
    options: opts,
  });
  await client.batchUpload({
    blobs: [{ blobData: new Uint8Array([1]), blobName: "a.txt" }],
    signer: account,
    options: { selectedLocation: locations[0] },
  });

  // Download + stream
  const blob = await client.download({ account: account.accountAddress, blobName: "hello.txt", range: { start: 0, end: 9 } });
  const reader = blob.readable.getReader();
  await reader.read();
  const _len: number = blob.contentLength;

  // Coordination queries + lifecycle
  const _meta: FullObjectMetadata | undefined = await client.coordination.getFullObjectMetadata({ account: account.accountAddress, name: "hello.txt" });
  const _metaByUid = await client.coordination.getFullObjectMetadataByUid(1n);
  const blobs: FullObjectMetadata[] = await client.coordination.getAccountBlobs({ account: account.accountAddress, pagination: { limit: 10, offset: 0 } });
  const _mapped = blobs.map((b) => ({ name: b.blobNameSuffix, size: b.size, uid: b.uid, enc: b.encryption, createdAt: new Date(b.creationMicros / 1000) }));
  await client.coordination.getBlobs({ where: { owner: { _eq: "0x1" } } });
  const _c: number = await client.coordination.getBlobsCount({});
  const _sz: number = await client.coordination.getTotalBlobsSize({});
  await client.coordination.getBlobActivities({ pagination: { limit: 1 } });
  const _ac: number = await client.coordination.getBlobActivitiesCount({});

  await client.coordination.deleteObject({ account, blobName: "hello.txt" });
  await client.coordination.deleteMultipleObjects({ account, blobNames: ["a.txt", "b.txt"] });

  // Manual register -> upload -> commit
  const provider = await createDefaultErasureCodingProvider();
  const commitments: BlobCommitments = await generateCommitments(provider, new Uint8Array([1]));
  const reg = await client.coordination.registerBlob({
    account, blobName: "m.txt", blobMerkleRoot: commitments.blob_merkle_root, size: 1,
    options: { selectedLocation: locations[0] },
  });
  const uids = ShelbyBlobClient.registeredBlobUids([], client.coordination.deployer);
  const uid: bigint = uids[0]?.uid ?? 0n;
  const put: PutBlobChunksetsResult = await client.rpc.putBlobChunksets({ account, uid, blobData: new Uint8Array([1]), commitments });
  const acks: StorageProviderAck[] = put.spAcks;
  await client.coordination.commitObject({ account, uid, blobName: "m.txt", overwrite: false, storageProviderAcks: acks });
  const _rej = ShelbyBlobClient.findObjectCommitRejection([], client.coordination.deployer, uid);
  void reg;

  // RPC auth
  const challenge = await client.rpc.getChallenge(account.accountAddress);
  const _auth = client.rpc.signChallenge(account, challenge.challenge);
  await client.rpc.getBlob({ account: account.accountAddress, blobName: "hello.txt" });

  // Metadata client
  await client.metadata.getStorageProviders();
  const pgs: AccountAddress[] = await client.metadata.getPlacementGroupAddresses(locations[0]);
  const slices: AccountAddress[] = await client.metadata.getSliceAddresses(locations[0]);
  await client.metadata.getActiveStorageProvidersForSlice({ account: slices[0] });
  void pgs;

  // Placement group + micropayment clients
  const pgClient = new ShelbyPlacementGroupClient(config);
  await pgClient.getPlacementGroupSlots({});
  const mp = new ShelbyMicropaymentChannelClient(config);
  const _sync = mp.createMicropayment({
    sender: account, receiver: account.accountAddress, fungibleAssetAddress: account.accountAddress,
    amount: 1, paymentChannelId: 1, sequenceNumber: 1,
  }); // synchronous
  void _sync;

  // Static payloads
  ShelbyBlobClient.createRegisterBlobPayload({ account: account.accountAddress, blobName: "b", blobSize: 1, blobMerkleRoot: "0x", numChunksets: 1, encoding: 0, selectedLocation: locations[0] });
  ShelbyBlobClient.createDeleteObjectPayload({ blobName: "b" });
  ShelbyBlobClient.createDeleteMultipleObjectsPayload({ blobNames: ["a", "b"] });
  ShelbyBlobClient.createCommitObjectPayload({ uid, blobName: "b", overwrite: false, storageProviderAcks: acks });

  // Errors + constants + networks
  const desc: string | undefined = describeLocationError("E_NO_LOCATION_SELECTED");
  void [desc, isBlobNotFoundError(""), isBlobAlreadyExistsError(""), isAccessDeniedError("")];
  void [ShelbyErrorCodes.E_BLOB_NOT_FOUND, ShelbyLocationErrorCodes.E_NO_LOCATION_SELECTED];
  void [SHELBY_DEPLOYER, MICROPAYMENTS_DEPLOYER, SHELBYUSD_TOKEN_ADDRESS, DEFAULT_CHUNK_SIZE_BYTES, DEFAULT_CHUNKSET_SIZE_BYTES];
  void [NetworkToShelbyRPCBaseUrl.shelbynet, NetworkToShelbyBlobIndexerBaseUrl.shelbynet, NetworkToGasStationBaseUrl.shelbynet];
  void NetworkToDefaultLocationHint[Network.SHELBYNET];
  const nets: ShelbyNetwork[] = [...shelbyNetworks];
  void [nets, isShelbyNetwork("shelbynet"), createBlobKey({ account: account.accountAddress, blobName: "x" })];

  const _enc: BlobEncryption = "AES_GCM_V1";
  void _enc;
  void new ShelbyRPCClient(config);
  void new ShelbyMetadataClient(config);
  void new ShelbyBlobClient(config);
  void generateCommitmentsParallel;
  void SpWriteClient;
  void StaleChannelStateError;
  void _browser;
}
