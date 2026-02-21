---
name: shelby-media
description: Build video streaming and media applications with Shelby Protocol media packages. Use when working with @shelby-protocol/player for video playback (React video player component, Shaka Player integration, playback controls) or @shelby-protocol/media-prepare for transcoding video/audio with FFmpeg, CMAF packaging for DASH/HLS adaptive streaming, or Widevine DRM encryption.
---

# Shelby Media

Two packages for building video streaming applications on Shelby Protocol.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@shelby-protocol/player` | 0.1.1 | React video player with Shaka Player, adaptive streaming, controls |
| `@shelby-protocol/media-prepare` | 0.0.1 | Transcode and package video for CMAF (DASH/HLS) |

## Player Quick Start

```bash
pnpm install @shelby-protocol/player shaka-player
```

```tsx
import { VideoPlayer } from "@shelby-protocol/player";
import "@shelby-protocol/player/styles.css";

function App() {
  return (
    <VideoPlayer
      src="https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x.../manifest.mpd"
      title="My Video"
      onStateChange={(state) => console.log(state)}
    />
  );
}
```

`VideoPlayer` wraps Shaka Player with a full control UI: play/pause, seekbar, volume, fullscreen, PiP, playback rate, and quality selection.

For custom player layouts, compose individual control components. See [references/player.md](references/player.md).

## Media-Prepare Quick Start

```bash
pnpm install @shelby-protocol/media-prepare
```

### Node.js

```typescript
import {
  CmafPlanBuilder,
  SystemFFmpegExecutor,
  ShakaPackager,
  FfmpegTranscoder,
  CmafPlanExecutor,
} from "@shelby-protocol/media-prepare/node";
import * as fs from "node:fs/promises";

// 1. Build a CMAF plan
const plan = new CmafPlanBuilder()
  .withInput("./input.mp4")
  .withOutputDir("./output")
  .withVideoCodec("x264", { preset: "veryfast", profile: "high" })
  .withVideoLadder([
    { width: 1280, height: 720, bitrateBps: 2_500_000 },
    { width: 1920, height: 1080, bitrateBps: 5_000_000 },
  ])
  .withAudioCodec("aac")
  .addAudioTrack({ language: "eng", bitrateBps: 128_000, default: true })
  .withSegmentDuration(4)
  .withHlsOutput()
  .withDashOutput()
  .build();

// 2. Execute the plan
const ffmpeg = new SystemFFmpegExecutor();
const executor = new CmafPlanExecutor({
  fs: fs,
  transcoder: new FfmpegTranscoder(ffmpeg),
  packager: new ShakaPackager(),
});

await executor.execute(plan);
// Output: ./output/{720p,1080p,eng_128k}/ directories with CMAF segments
// + master.m3u8 (HLS) and manifest.mpd (DASH)
```

### Browser (WASM FFmpeg)

```typescript
import { WasmFFmpegExecutor } from "@shelby-protocol/media-prepare/browser";
```

Replace `SystemFFmpegExecutor` with `WasmFFmpegExecutor` for browser environments.

## Key Concepts

**CMAF (Common Media Application Format):** Container format producing segments playable by both DASH and HLS players. The `CmafPlanBuilder` defines the encoding ladder, then `CmafPlanExecutor` runs FFmpeg transcoding and Shaka Packager to produce the final output.

**Video Codecs:** x264 (default), x265, aom-av1, copy. Each has presets (ultrafast → veryslow) and profiles.

**Segment Duration:** Fixed seconds or computed from `maxBlobBytes` for optimal Shelby storage alignment.

## End-to-End Workflow: Transcode → Upload → Play

A complete pipeline from raw video to adaptive streaming playback on Shelby:

### Step 1: Transcode with media-prepare

```typescript
import { CmafPlanBuilder, CmafPlanExecutor, FfmpegTranscoder } from "@shelby-protocol/media-prepare";
import { SystemFFmpegExecutor, ShakaPackager } from "@shelby-protocol/media-prepare/node";
import * as fs from "node:fs/promises";

const plan = new CmafPlanBuilder()
  .withInput("./raw-video.mp4")
  .withOutputDir("./output")
  .force()
  .withVideoCodec("x264", { preset: "veryfast", profile: "high" })
  .withVideoLadder([
    { width: 854, height: 480, bitrateBps: 1_000_000 },
    { width: 1280, height: 720, bitrateBps: 2_500_000 },
    { width: 1920, height: 1080, bitrateBps: 5_000_000 },
  ])
  .withAudioCodec("aac")
  .addAudioTrack({ language: "eng", bitrateBps: 128_000, default: true })
  .withSegmentDuration(4)
  .withDashOutput()
  .withHlsOutput()
  .build();

const executor = new CmafPlanExecutor({
  fs,
  transcoder: new FfmpegTranscoder(new SystemFFmpegExecutor()),
  packager: new ShakaPackager(),
});

await executor.execute(plan);
// Output: ./output/ with CMAF segments, manifest.mpd, and master.m3u8
```

### Step 2: Upload to Shelby

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Network } from "@aptos-labs/ts-sdk";
import * as path from "node:path";

const client = new ShelbyNodeClient({ network: Network.SHELBYNET });

// Upload all output files recursively
const outputDir = "./output";
const files = await fs.readdir(outputDir, { recursive: true });

for (const file of files) {
  const filePath = path.join(outputDir, file.toString());
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) continue;

  const data = await fs.readFile(filePath);
  await client.upload({
    blobData: new Uint8Array(data),
    signer: account,
    blobName: `videos/my-video/${file}`,
    expirationMicros: Date.now() * 1000 + 30 * 24 * 3600 * 1_000_000, // 30 days
  });
}
```

### Step 3: Play with the Player component

```tsx
import { VideoPlayer } from "@shelby-protocol/player";
import "@shelby-protocol/player/styles.css";

function VideoPage() {
  const manifestUrl = `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${accountAddress}/videos/my-video/manifest.mpd`;

  return (
    <VideoPlayer
      src={manifestUrl}
      title="My Transcoded Video"
      config={{ streaming: { bufferingGoal: 15 } }}
    />
  );
}
```

## Choosing a Video Codec

| Codec | Quality | Speed | Browser Support | Best For |
|-------|---------|-------|-----------------|----------|
| **x264** (H.264) | Good | Fast | Universal | General use, maximum compatibility |
| **x265** (H.265/HEVC) | Better | Slow | Safari, Edge, Chrome (partial) | Smaller files when compatibility allows |
| **aom-av1** (AV1) | Best | Very slow | Chrome, Firefox, Edge | Best compression, future-proof |
| **copy** | Same as source | Instant | Depends on source | Re-packaging without re-encoding |

**Recommendation:** Use `x264` with `preset: "veryfast"` for development and `preset: "medium"` for production. Switch to `aom-av1` when targeting modern browsers and when encoding time is not a concern.

## Browser vs Node.js

| Feature | Node.js | Browser |
|---------|---------|---------|
| FFmpeg executor | `SystemFFmpegExecutor` (system binary) | `WasmFFmpegExecutor` (WASM) |
| Shaka Packager | `ShakaPackager` (system binary) | Not available |
| Performance | Full speed, no size limits | Limited by browser memory |
| Use case | Server-side transcoding pipelines | Client-side lightweight transcoding |

For production workflows, use Node.js for transcoding and the browser `VideoPlayer` for playback.

## See Also

- **shelby-sdk** — Core upload/download operations used to store transcoded output
- **shelby-ethereum-kit** / **shelby-solana-kit** — Cross-chain wallet integration for authenticated uploads
- **shelby-cli** — Upload transcoded output from the command line: `shelby upload ./output/ videos/my-video/ -e "in 30 days" -r`

## References

- [Player Components](references/player.md) — All player components, props, providers, and custom layout guide
- [Media-Prepare API](references/media-prepare.md) — CmafPlanBuilder fluent API, codec schemas, FFmpeg executors, packaging options
