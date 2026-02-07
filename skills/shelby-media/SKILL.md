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

## References

- [Player Components](references/player.md) — All player components, props, providers, and custom layout guide
- [Media-Prepare API](references/media-prepare.md) — CmafPlanBuilder fluent API, codec schemas, FFmpeg executors, packaging options
