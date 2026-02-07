# Media-Prepare Reference

Complete API for `@shelby-protocol/media-prepare`.

## Table of Contents

- [Installation](#installation)
- [Entry Points](#entry-points)
- [CmafPlanBuilder](#cmafplanbuilder)
- [CmafPlanExecutor](#cmafplanexecutor)
- [Video Codecs](#video-codecs)
- [Audio Codecs](#audio-codecs)
- [Video Ladder](#video-ladder)
- [Audio Tracks](#audio-tracks)
- [Segment Duration](#segment-duration)
- [Packaging Options](#packaging-options)
- [DRM / Widevine](#drm--widevine)
- [FFmpeg Executors](#ffmpeg-executors)
- [Shaka Packager](#shaka-packager)
- [Preset Ladders](#preset-ladders)
- [Resolution Constants](#resolution-constants)

## Installation

```bash
pnpm install @shelby-protocol/media-prepare
```

Optional peer dependencies: FFmpeg (system install or WASM), Shaka Packager (for CMAF packaging).

## Entry Points

| Entry Point | Import Path | Exports |
|-------------|-------------|---------|
| **Node.js** | `@shelby-protocol/media-prepare/node` | `SystemFFmpegExecutor`, `ShakaPackager`, CMAF utils |
| **Browser** | `@shelby-protocol/media-prepare/browser` | `WasmFFmpegExecutor`, WASM filesystem API |
| **Core** | `@shelby-protocol/media-prepare` | `CmafPlanBuilder`, `CmafPlanExecutor`, `FfmpegTranscoder`, schemas, constants |

## CmafPlanBuilder

Fluent API for building a CMAF transcoding + packaging plan.

```typescript
import { CmafPlanBuilder } from "@shelby-protocol/media-prepare";

const plan = new CmafPlanBuilder()
  .withInput("./input.mp4")
  .withOutputDir("./output")
  .force()                                           // Overwrite output dir
  .withFrameRateHint(30)                             // Optional; auto-probed if omitted
  .withVideoCodec("x264", { preset: "veryfast" })
  .withVideoLadder([
    { width: 1280, height: 720, bitrateBps: 2_500_000 },
    { width: 1920, height: 1080, bitrateBps: 5_000_000 },
  ])
  .withAudioCodec("aac", { sampleRate: 48000 })
  .addAudioTrack({ language: "eng", bitrateBps: 128_000, default: true })
  .addAudioTrack({ language: "es", bitrateBps: 128_000 })
  .withSegmentDuration(4)
  .withHlsOutput({ masterPlaylistName: "master.m3u8" })
  .withDashOutput({ manifestName: "manifest.mpd" })
  .build();
```

### All Methods

**General:**
- `withInput(path: string)` — Input media file
- `withOutputDir(path: string)` — Output directory
- `force()` — Overwrite output directory if it exists
- `withFrameRateHint(fps?: number)` — Frame rate hint (auto-probed from input if omitted)

**Video:**
- `withVideoCodec(codec)` or `withVideoCodec(name, params?)` — Set video codec
- `withVideoLadder(rungs[])` — Set all video rungs (min 1)
- `addVideoRung(rung)` — Add a single video rung

**Audio:**
- `withAudioCodec(codec)` or `withAudioCodec(name, params?)` — Set audio codec
- `withAudioTracks(tracks[])` — Set all audio tracks
- `addAudioTrack(track)` — Add a single audio track

**Packaging:**
- `withSegmentDuration(seconds)` — Fixed segment duration
- `withComputedSegmentDuration(params)` — Compute from blob size constraints
- `withPackagingOptions(options)` — Full packaging options
- `withHlsOutput(options?)` — Enable HLS output
- `skipHls()` — Disable HLS output
- `withDashOutput(options?)` — Enable DASH output
- `skipDash()` — Disable DASH output
- `withWidevineEncryption(options)` — Enable Widevine DRM

**Build:**
- `build()` — Validate and return `CmafPlan`

## CmafPlanExecutor

Executes a `CmafPlan` by orchestrating transcoding and packaging.

```typescript
import { CmafPlanExecutor, FfmpegTranscoder } from "@shelby-protocol/media-prepare";
import { SystemFFmpegExecutor, ShakaPackager } from "@shelby-protocol/media-prepare/node";
import * as fs from "node:fs/promises";

const executor = new CmafPlanExecutor({
  fs,                                            // Filesystem API
  transcoder: new FfmpegTranscoder(new SystemFFmpegExecutor()),
  packager: new ShakaPackager(),
  prober: undefined,                             // Optional media prober
});

await executor.execute(plan);
```

**Execution flow:**
1. Probe frame rate from input (if not provided via `withFrameRateHint`)
2. Compute GOP size: `Math.floor(frameRate * segmentDurationSeconds)`
3. Create output directory (clean if `force: true`)
4. Transcode all video rungs in parallel
5. Transcode all audio tracks in parallel
6. Package into CMAF segments (HLS/DASH manifests)
7. Clean up temporary transcoded files

## Video Codecs

```typescript
withVideoCodec("x264")                     // Default
withVideoCodec("x264", { preset: "veryfast", profile: "high" })
withVideoCodec("x265", { preset: "medium", profile: "main" })
withVideoCodec("aom-av1", { preset: "medium", profile: "main" })
withVideoCodec("copy")                     // Passthrough, no re-encoding
```

| Codec | Presets | Profiles | Default Preset | Default Profile |
|-------|---------|----------|----------------|-----------------|
| x264 | ultrafast → veryslow | baseline, baseline10, main, main10, high, high10 | veryfast | high |
| x265 | ultrafast → veryslow | main, main10 | medium | main |
| aom-av1 | veryfast, faster, fast, medium | main | medium | main |
| copy | — | — | — | — |

**Transcoding details:**
- Bitrate target: `bitrateBps / 1000`k
- Max rate: 110% of target (`bitrateBps * 1.1 / 1000`k)
- Buffer size: 200% of target (`bitrateBps * 2 / 1000`k)
- x264/x265 keyframe: When gopSize provided, `rc_lookahead=gopSize:keyint=gopSize*2:min-keyint=gopSize`
- aom-av1 cpu-used mapping: veryfast=8, faster=7, fast=6, medium=5

## Audio Codecs

```typescript
withAudioCodec("aac")                      // Default
withAudioCodec("aac", { sampleRate: 48000, channels: 2 })
withAudioCodec("copy")                     // Passthrough
```

| Codec | Options | Defaults |
|-------|---------|----------|
| aac | sampleRate: 44100 \| 48000, channels: 1 \| 2 | 48000, 2 |
| copy | — | — |

## Video Ladder

Each rung defines a resolution and bitrate for adaptive streaming.

```typescript
interface VideoRung {
  width: number;         // Positive integer
  height: number;        // Positive integer
  bitrateBps: number;    // Bits per second
  name?: string;         // Default: "<height>p" (e.g., "720p")
}
```

Name pattern: `[A-Za-z0-9_\-.]{1,32}`.

## Audio Tracks

```typescript
interface AudioTrack {
  language: string;      // BCP-47 code: "eng", "es", "zh-CN"
  bitrateBps: number;    // Bits per second
  default?: boolean;     // Default: false
  name?: string;         // Default: "<lang>_<kbps>k" (e.g., "eng_128k")
  inputIndex?: number;   // Audio stream index in input file
}
```

## Segment Duration

**Fixed:**
```typescript
withSegmentDuration(4)   // 4-second segments
```

**Computed from blob size constraints:**
```typescript
withComputedSegmentDuration({
  maxBlobBytes: 10 * 1024 * 1024,   // 10 MiB max blob size
  safety: 0.9,                       // 90% safety margin (default: 1)
  minSeconds: 2,                     // Minimum 2s segments (default: 1)
  align: 1,                          // Align to N seconds (default: 1)
})
```

**Computation:**
```
maxBits = floor(maxBlobBytes * safety) * 8
maxDuration = maxBits / maxBitrateBps
aligned = floor(maxDuration / align) * align
final = max(aligned, minSeconds)
```

## Packaging Options

```typescript
interface CmafPackagingOptions {
  initSegmentName?: string;         // Default: "init.mp4"
  segmentNameTemplate?: string;     // Default: "segment_$Number$.m4s"
  hls?: HlsPackagingOptions | boolean;  // Default: true
  dash?: DashPackagingOptions | boolean; // Default: true
}

interface HlsPackagingOptions {
  masterPlaylistName?: string;      // Default: "master.m3u8"
  playlistName?: string;            // Default: "index.m3u8"
}

interface DashPackagingOptions {
  manifestName?: string;            // Default: "manifest.mpd"
}
```

At least one of `hls` or `dash` must be enabled.

## DRM / Widevine

```typescript
.withWidevineEncryption({
  keyServerUrl: "https://license.example.com/cenc/getcontentkey",
  contentId: "my-content-id",
  // Additional Widevine-specific options
})
```

## FFmpeg Executors

Both implement:
```typescript
interface FfmpegExecutor {
  execute(args: string[]): Promise<unknown>;
}
```

### SystemFFmpegExecutor (Node.js)

Uses system-installed FFmpeg binary.

```typescript
import { SystemFFmpegExecutor } from "@shelby-protocol/media-prepare/node";
const ffmpeg = new SystemFFmpegExecutor();
```

Requires FFmpeg installed and available in PATH.

### WasmFFmpegExecutor (Browser)

Uses FFmpeg compiled to WebAssembly.

```typescript
import { WasmFFmpegExecutor } from "@shelby-protocol/media-prepare/browser";
const ffmpeg = new WasmFFmpegExecutor();
```

## Shaka Packager

Node.js only. Produces CMAF segments with HLS/DASH manifests.

```typescript
import { ShakaPackager } from "@shelby-protocol/media-prepare/node";

const packager = new ShakaPackager();
```

Implements `CmafPackager` interface:
```typescript
interface CmafPackager {
  package(args: PackageCmafArgs): Promise<unknown>;
}
```

## Preset Ladders

Pre-defined resolution ladders for common use cases:

```typescript
import { WEB_STREAMING, MOBILE_STREAMING, PREMIUM_STREAMING } from "@shelby-protocol/media-prepare";
```

| Preset | Resolutions |
|--------|-------------|
| `WEB_STREAMING` | 720p, 1080p, 1440p |
| `MOBILE_STREAMING` | 480p, 720p, 1080p |
| `PREMIUM_STREAMING` | 1080p, 1440p, 4K |
| `CINEMA_STREAMING` | 1080p ultrawide, 1440p ultrawide, DCI 4K |

## Resolution Constants

Standard resolutions available as constants:

| Constant | Resolution | Aspect |
|----------|-----------|--------|
| `SD_480P_16_9` | 854x480 | 16:9 |
| `HD_720P_16_9` | 1280x720 | 16:9 |
| `FHD_1080P_16_9` | 1920x1080 | 16:9 |
| `QHD_1440P_16_9` | 2560x1440 | 16:9 |
| `UHD_4K_16_9` | 3840x2160 | 16:9 |
| `DCI_4K_17_9` | 4096x2160 | ~17:9 |
| `MOBILE_1080P_VERTICAL` | 1080x1920 | 9:16 |
| `MOBILE_720P_VERTICAL` | 720x1280 | 9:16 |
| `ULTRAWIDE_1080P_21_9` | 2560x1080 | 21:9 |
| `ULTRAWIDE_1440P_21_9` | 3440x1440 | 21:9 |

Also available in 4:3: `SD_480P_4_3` (640x480), `HD_720P_4_3` (960x720), `FHD_1080P_4_3` (1440x1080).
