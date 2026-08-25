# Shelby skills type-check harness

Compiles the code examples documented in the Shelby skills against the **published**
`@shelby-protocol/*` packages, so a package release that breaks a documented API surface
fails loudly (`tsc` error) instead of silently rotting the docs.

## Run

```bash
npm install
npm run typecheck   # tsc --noEmit; exit 0 == all documented surfaces still compile
```

If your global npm cache is root-owned (EPERM on install), use a local cache:

```bash
npm_config_cache=./.npm-cache npm install --legacy-peer-deps
```

## What's covered

| File | Skill | Package(s) @ version |
|------|-------|----------------------|
| `src/sdk.ts` | shelby-sdk (SKILL, api-reference, advanced) | `@shelby-protocol/sdk@0.8.0` |
| `src/react.tsx` | shelby-sdk (references/react.md) | `@shelby-protocol/react@4.2.0` |
| `src/media.tsx` | shelby-media | `@shelby-protocol/player@0.2.0`, `@shelby-protocol/media-prepare@0.0.1` |

> The `shelby-ethereum-kit` / `shelby-solana-kit` skills (and their `src/ethereum-kit.tsx` /
> `src/solana-kit.tsx` mirrors) were **removed** — the cross-chain DAA kits are deprecated in
> favor of the Shelby **S3 gateway** for non-Aptos integrations.

## Design notes

- **Curated mirrors, not literal extraction.** Each file reproduces the *documented*
  API usage (method names, signatures, hook shapes, the register→commit wallet upload
  chain, etc.) with the minimal surrounding declarations needed to compile. If you change
  a documented example, update the matching file here so the harness keeps guarding it.
- **`skipLibCheck: true`** so errors are about *our* usage, not internal `.d.ts` of deep
  transitive deps. **`strict: true`** otherwise.
- **`src/globals.d.ts`** shims `*.css` so the player's documented CSS import type-checks.

## Known drift (as of 2026-08-26)

- **Blob expiration removed (`sdk@0.8.0` / `react@4.2.0`).** `expirationMicros` is gone from
  uploads, registration, the react hook variables, and `FullObjectMetadata`; the expiration
  error codes and `isBlobExpiredError` were dropped. The mirrors no longer reference any of
  it (a stray `expirationMicros` now fails `tsc`, which is the point). Micropayment **channel**
  expiration (`ShelbyMicropaymentChannelClient`) is a separate, unchanged surface and is not
  exercised here beyond the create/extend payloads. The CLI's `-e/--expiration` flag was
  removed in `@shelby-protocol/cli@0.2.0` (verified live, not via this harness).

- **Wallet `useUploadBlobs` — now shipped.** PR #1917's wallet-adapter path in `useUploadBlobs`
  is published in the `4.1.0`+ line; the harness pins `4.2.0`. `src/react.tsx` exercises the
  hook shapes for both signer types. (This remains a type-only check — the
  register→upload-by-address→commit behavior needs the live e2e tier to verify.)

- **media-prepare docs now track the published 0.0.1 API.** `skills/shelby-media` was
  rewritten (2026-08-06) from the unreleased `CmafPlanBuilder`/`CmafPlanExecutor` API to
  the shipped `0.0.1` surface: `hlsCmaf.planHlsCmaf()` → `plan.render.ffmpegArgs()` →
  `execFfmpeg` (Node) / `execFfmpegWasm` (browser), plus `SystemChecker`, `NodeMediaProbe`,
  resolution constants. `src/media.tsx` exercises player + media-prepare and compiles.
  Note: the fluent builder's methods are typed `any` in 0.0.1's `.d.ts`, so the harness
  verifies the entry points/imports but not the chain's argument shapes.

- **Single `@aptos-labs/ts-sdk` is required.** The SDK peer allows `^5.2.1 || ^6.0.0`. If
  two copies end up installed, `AccountAddress` from one and the SDK/react types from the
  other stop being assignable ("separate declarations of a private property 'buffer'"). This
  harness forces one copy (5.2.1) via `overrides` in `package.json`; real apps must dedupe
  the same way.

- **`waitForTransaction().events`** needs narrowing (`"events" in tx ? tx.events : []`) —
  the return type is a union and `events` isn't on every member. The documented examples
  and these mirror files both apply the guard.

## Bumping versions

1. Update the pins in `package.json` (and the table above).
2. `npm install && npm run typecheck`.
3. Fix any new `tsc` errors — each one is a documented example that drifted. Update both
   the skill docs and the mirror file here.

## TODO / ideas for the eventual standalone repo

- CI job (`tsc` on a matrix of package versions; alert on `latest` drift).
- Optionally auto-extract fenced ` ```ts / ```tsx ` blocks from the skill markdown and
  compile them directly (needs a preprocessing step to make partial snippets standalone).
- A live (networked) smoke test tier that actually uploads/downloads against ShelbyNet.
