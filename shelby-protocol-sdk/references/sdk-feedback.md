# Shelby Protocol SDK - Feedback and Improvement Recommendations

This document captures issues discovered during real-world development and recommendations for improving the SDK developer experience.

## Critical Issues

### 1. `@shelby-protocol/react` Incompatibility with Cross-Chain Kits

**Problem:** The `@shelby-protocol/react` package (including `useUploadBlobs`) only works with native Aptos wallets (`@aptos-labs/wallet-adapter-react`). It does NOT work with Solana Kit or Ethereum Kit despite these being official cross-chain solutions.

**Impact:** Developers using Solana or Ethereum wallets encounter cryptic "Failed to fetch" errors when attempting to use `useUploadBlobs`. The type signature mismatch is not caught at compile time because of loose typing.

**Root Cause:** The `signer` parameter in `useUploadBlobs` expects:
```typescript
// Expected by @shelby-protocol/react
signAndSubmitTransaction: (payload: { data: InputEntryFunctionData }) => Promise<{ hash: string }>
```

But Solana Kit's `signAndSubmitTransaction` has a different internal implementation that doesn't work with the hooks.

**Recommendations:**
1. **Rename the package** to `@shelby-protocol/aptos-react` to make it clear it's Aptos-only
2. **Add runtime validation** that throws a clear error: "This hook requires an Aptos wallet. For Solana/Ethereum wallets, use the manual upload API."
3. **Create cross-chain compatible React hooks** (e.g., `@shelby-protocol/react-universal`) that work with all wallet types
4. **Document this limitation prominently** in the README and API docs

---

### 2. Inconsistent Field Names in API Responses

**Problem:** The `getAccountBlobs()` response uses inconsistent field names that don't match what developers expect or what's documented.

| Expected/Intuitive | Actual |
|-------------------|--------|
| `name` | `blobNameSuffix` |
| `created_at` or `createdAt` | `creationMicros` |
| `expiration` or `expiresAt` | `expirationMicros` |

**Impact:** Developers write code using intuitive property names, get runtime errors, and have to debug by inspecting actual API responses.

**Recommendations:**
1. **Add TypeScript types** that are exported and documented
2. **Consider adding aliased properties** for common access patterns:
   ```typescript
   interface BlobData {
     // Primary fields
     blobNameSuffix: string;
     creationMicros: number;
     expirationMicros: number;

     // Convenience aliases (computed getters in a class, or just duplicated)
     get name(): string { return this.blobNameSuffix; }
     get createdAt(): Date { return new Date(this.creationMicros / 1000); }
     get expiresAt(): Date { return new Date(this.expirationMicros / 1000); }
   }
   ```
3. **Document the exact response structure** in the API reference

---

### 3. Missing/Undocumented Low-Level APIs

**Problem:** When `useUploadBlobs` fails for cross-chain wallets, developers must implement manual upload. But the required APIs (`ClayErasureCodingProvider`, `generateCommitments`, `ShelbyBlobClient.createRegisterBlobPayload`, `client.rpc.putBlob`) are not well-documented.

**Impact:** Developers have to reverse-engineer the upload flow by reading SDK source code.

**Recommendations:**
1. **Document the 4-step manual upload process** prominently:
   - Generate commitments with `ClayErasureCodingProvider` + `generateCommitments`
   - Create registration payload with `ShelbyBlobClient.createRegisterBlobPayload`
   - Sign and submit the transaction
   - Upload blob data with `client.rpc.putBlob`
2. **Export and document** these types:
   - `ClayErasureCodingProvider`
   - `generateCommitments`
   - `ShelbyBlobClient.createRegisterBlobPayload` parameters
3. **Provide a complete working example** for cross-chain uploads

---

### 4. Package Version Confusion

**Problem:** Documentation may reference versions that don't exist on npm (e.g., `@shelby-protocol/sdk@^0.1.0` when only `^0.0.9` exists).

**Recommendations:**
1. **Keep documentation in sync** with published versions
2. **Add a version compatibility matrix** to the docs
3. **Use exact versions** in documentation examples

---

### 5. Missing Direct Dependency Requirements

**Problem:** `@aptos-labs/ts-sdk` is required as a direct dependency for using types like `AccountAddress`, but this isn't documented.

**Impact:** Developers get cryptic errors about missing types.

**Recommendations:**
1. **List peer dependencies** clearly in documentation
2. **Add to package.json peerDependencies** with helpful error messages

---

## Feature Requests

### 1. Unified Upload API for Cross-Chain Wallets

Create a single, consistent upload API that works across all wallet types:

```typescript
// Ideal API
import { useUpload } from "@shelby-protocol/sdk/react";

const { upload, isUploading, progress } = useUpload({
  client: shelbyClient,
  signer: signAndSubmitTransaction, // Works with ANY signer type
});

await upload({
  file: File | Uint8Array,
  blobName: string,
  expirationMicros: number,
  onProgress?: (progress: number) => void,
});
```

### 2. Automatic Progress Tracking

The manual upload process doesn't provide progress callbacks. Add built-in progress tracking:

```typescript
await client.upload({
  // ...
  onProgress: (progress) => {
    console.log(`${progress.step}: ${progress.percent}%`);
    // { step: 'generating_commitments', percent: 25 }
    // { step: 'registering_blob', percent: 50 }
    // { step: 'uploading_data', percent: 75 }
    // { step: 'complete', percent: 100 }
  },
});
```

### 3. Better Error Messages

Current errors like "Failed to fetch" don't help diagnose issues. Add contextual error messages:

```typescript
class ShelbyUploadError extends Error {
  step: 'commitment' | 'registration' | 'upload';
  cause: Error;

  // Example: "Upload failed during blob registration: Account not funded"
}
```

---

## Summary

The Shelby Protocol SDK has solid core functionality but the cross-chain developer experience needs improvement. The main issues are:

1. **Misleading package compatibility** - `@shelby-protocol/react` should clearly indicate it's Aptos-only
2. **Missing documentation** for manual upload with cross-chain wallets
3. **Inconsistent naming** in API responses

Addressing these issues would significantly reduce developer friction and support tickets.
