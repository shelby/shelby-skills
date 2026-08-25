---
name: shelby-media
description: Build video streaming and media applications with Shelby Protocol media packages. Use when working with @shelby-protocol/player for video playback (React video player component, Shaka Player integration, playback controls) or @shelby-protocol/media-prepare for transcoding video/audio with FFmpeg and packaging HLS/CMAF (fMP4) adaptive streaming.
---

# Shelby Media

Two packages for building video streaming applications on Shelby Protocol.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@shelby-protocol/player` | 0.2.0 | React video player with Shaka Player, adaptive streaming, controls |
| `@shelby-protocol/media-prepare` | 0.0.1 | Transcode + package video as HLS/CMAF (fMP4) via FFmpeg |

## Player Quick Start

```bash
pnpm install @shelby-protocol/player
# Peer deps: react, react-dom, and tailwindcss (^3 || ^4). shaka-player is bundled.
```

```tsx
import { VideoPlayer } from "@shelby-protocol/player";
import "@shelby-protocol/player/styles/shadcn.css"; // or styles/neutral.css (needs Tailwind in your app)

function App() {
  // ShelbyNet is the only working network (testnet is currently unavailable)
  return (
    <VideoPlayer
      src="https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x.../master.m3u8"
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

Build an HLS/CMAF **plan**, render it to FFmpeg args, then run those args (system FFmpeg on Node, WASM FFmpeg in the browser).

### Node.js

```typescript
import { hlsCmaf } from "@shelby-protocol/media-prepare/core";
import { execFfmpeg } from "@shelby-protocol/media-prepare/node";

// 1. Build an HLS/CMAF plan
const plan = hlsCmaf.planHlsCmaf()
  .input("./input.mp4")
  .outputDir("./output")
  .withVideoEncoder(hlsCmaf.x264())               // H.264; x265 / aom-av1 / copy via a codec object
  .withLadder([
    { width: 1280, height: 720, bitrateBps: 2_500_000 },
    { width: 1920, height: 1080, bitrateBps: 5_000_000 },
  ])
  .withAudio(hlsCmaf.aac(), { language: "eng", bitrateBps: 128_000, default: true })
  .withSegmentsFixed(4)                            // or .withSegmentsAuto({ maxBlobBytes, safety })
  .hlsCmaf();                                      // finalize as HLS/CMAF

// 2. Render FFmpeg args and run them
const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
await execFfmpeg(args, { cwd: outputDir });
// Output: ./output/master.m3u8 + per-variant media playlists and fMP4 CMAF segments
```

### Browser (WASM FFmpeg)

```typescript
import { hlsCmaf } from "@shelby-protocol/media-prepare/browser"; // hlsCmaf is re-exported here
import { execFfmpegWasm, normalizeBrowserOutputs } from "@shelby-protocol/media-prepare/browser";

// Build the plan exactly as above, then run its args through a WASM FFmpeg:
const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
await execFfmpegWasm(ffmpeg, args);                        // ffmpeg: a WasmFFmpeg adapter over @ffmpeg/ffmpeg
const masterPath = await normalizeBrowserOutputs(ffmpeg, outputDir, variantNames);
```

## Key Concepts

**HLS/CMAF:** `@shelby-protocol/media-prepare@0.0.1` produces **fMP4 (CMAF) segments packaged for HLS** (`master.m3u8`). It builds an FFmpeg invocation you run yourself — there is no bundled executor, and **no DASH/Shaka Packager or Widevine DRM in this release**.

**Video codecs:** `hlsCmaf.x264()` (default H.264); `x265`, `aom-av1`, and `copy` via a codec object (`{ kind: "x265", preset, profile }`). Presets (ultrafast → veryslow) and profiles have schema defaults.

**Segments:** `.withSegmentsFixed(seconds)`, or `.withSegmentsAuto({ maxBlobBytes, safety, ... })` to size segments against a max Shelby blob size. Probe inputs with `NodeMediaProbe` / `BrowserMediaProbe` to inform sizing.

**System check (Node):** `SystemChecker.validateSystemOrThrow()` verifies FFmpeg (v7+) and codecs before you run.

## References

- [Player Components](references/player.md) — All player components, props, providers, and custom layout guide
- [Media-Prepare API](references/media-prepare.md) — `planHlsCmaf` builder, codecs/schemas, FFmpeg executors, probing, resolution constants
