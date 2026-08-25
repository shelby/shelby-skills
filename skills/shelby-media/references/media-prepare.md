# Media-Prepare Reference

Complete API for `@shelby-protocol/media-prepare@0.0.1` (the version published on npm).

> **Scope of 0.0.1.** This release builds an **HLS/CMAF** plan (fMP4 segments + `master.m3u8`) and turns it into an FFmpeg invocation you run yourself. There is **no** DASH manifest, Shaka Packager, or Widevine DRM in 0.0.1 — those are not part of the published API. Verified against the shipped type definitions.

## Table of Contents

- [Installation](#installation)
- [Entry Points](#entry-points)
- [The model](#the-model)
- [planHlsCmaf builder](#planhlscmaf-builder)
- [Video codecs](#video-codecs)
- [Audio codecs](#audio-codecs)
- [Video ladder](#video-ladder)
- [Audio tracks](#audio-tracks)
- [Segments](#segments)
- [Trickplay](#trickplay)
- [Packaging flags](#packaging-flags)
- [Rendering ffmpeg args](#rendering-ffmpeg-args)
- [FFmpeg executors](#ffmpeg-executors)
- [System check (Node)](#system-check-node)
- [Media probing](#media-probing)
- [Resolution constants & presets](#resolution-constants--presets)

## Installation

```bash
pnpm install @shelby-protocol/media-prepare
```

- **Node**: requires a system **FFmpeg** (v7+) on `PATH` (used by `execFfmpeg`). `ffprobe` is used by `NodeMediaProbe`.
- **Browser**: bring your own WASM FFmpeg — the `@ffmpeg/ffmpeg`, `@ffmpeg/util` (and `@ffmpeg/core`) peer dependencies — and adapt it to the `WasmFFmpeg` shape.

## Entry Points

| Entry Point | Import Path | Key exports |
|-------------|-------------|-------------|
| **Core** | `@shelby-protocol/media-prepare/core` | `hlsCmaf` (namespace: `planHlsCmaf`, `x264`, `aac`, `presets`, schemas/types), resolution constants, `MediaProbe`/`ProbeResult`, `computeAvgBitrateBps`, `ProcessingResult` |
| **Node** | `@shelby-protocol/media-prepare/node` | `execFfmpeg`, `mapNamesToDirs`, `SystemChecker`, `NodeMediaProbe` |
| **Browser** | `@shelby-protocol/media-prepare/browser` | `execFfmpegWasm`, `normalizeBrowserOutputs`, `BrowserMediaProbe` (plus `hlsCmaf`, resolution constants, probe types re-exported) |

> There is no bare `@shelby-protocol/media-prepare` entry — import from `/core`, `/node`, or `/browser`.

## The model

1. Build a **plan** with the fluent `hlsCmaf.planHlsCmaf()` builder.
2. Call `plan.render.ffmpegArgs()` to get `{ args, outputDir, variantNames }`.
3. Run `args` through FFmpeg: `execFfmpeg(args, { cwd })` (Node) or `execFfmpegWasm(ffmpeg, args)` (browser).

```typescript
import { hlsCmaf } from "@shelby-protocol/media-prepare/core";
import { execFfmpeg } from "@shelby-protocol/media-prepare/node";

const plan = hlsCmaf.planHlsCmaf()
  .input("./input.mp4")
  .outputDir("./output")
  .withVideoEncoder(hlsCmaf.x264())
  .withLadder([
    { width: 1280, height: 720, bitrateBps: 2_500_000 },
    { width: 1920, height: 1080, bitrateBps: 5_000_000 },
  ])
  .withAudio(hlsCmaf.aac(), { language: "eng", bitrateBps: 128_000, default: true })
  .withSegmentsFixed(4)
  .hlsCmaf();                 // finalize as HLS/CMAF packaging

const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
await execFfmpeg(args, { cwd: outputDir });
// → ./output/master.m3u8 + per-variant media playlists and fMP4 CMAF segments
```

## planHlsCmaf builder

`hlsCmaf.planHlsCmaf()` returns a fluent builder. Methods:

| Method | Purpose |
|--------|---------|
| `input(path)` | Input media file |
| `outputDir(path)` | Output directory |
| `withVideoEncoder(codec)` | Video codec (see [Video codecs](#video-codecs)) |
| `withLadder(rungs[])` | Bitrate ladder (`VideoRung[]`) |
| `withAudio(codec, ...tracks)` | Audio codec + one or more `AudioTrack`s |
| `withSegmentsFixed(seconds)` | Fixed-duration segments |
| `withSegmentsAuto(opts)` | Size-capped segments (Shelby blob alignment) |
| `withSegments(policy)` | Provide a `SegmentPolicy` object directly |
| `withTrickplay(opts)` / `withoutTrickplay()` | Enable/disable trickplay thumbnails track |
| `hooks(configure)` | Register a `beforeRender` hook `({ plan }) => void` |
| `hlsCmaf(flags?)` | Finalize packaging as HLS/CMAF (see [Packaging flags](#packaging-flags)) |
| `build()` | Validate and return the `Plan` object |
| `render.ffmpegArgs()` | Produce `{ args, outputDir, variantNames }` |

## Video codecs

Use the `hlsCmaf.x264()` factory for H.264; for other codecs pass a `VideoCodec` object (validated by `VideoCodecSchema`).

```typescript
.withVideoEncoder(hlsCmaf.x264())                                  // H.264 (defaults)
.withVideoEncoder({ kind: "x265", preset: "medium", profile: "main" })
.withVideoEncoder({ kind: "aom-av1", preset: "medium", profile: "main" })
.withVideoEncoder({ kind: "copy" })                                // passthrough
```

| `kind` | Presets | Profiles |
|--------|---------|----------|
| `x264` | ultrafast → veryslow | baseline, main, high |
| `x265` | ultrafast → veryslow | main, main10 |
| `aom-av1` | veryfast, faster, fast, medium | main |
| `copy` | — | — |

`preset`/`profile` have schema defaults, so `hlsCmaf.x264()` is valid with no arguments.

## Audio codecs

```typescript
.withAudio(hlsCmaf.aac(), track)              // AAC (sampleRate 48000, channels 2 by default)
.withAudio({ kind: "copy" }, track)           // passthrough
```

`AudioCodec`: `{ kind: "aac"; sampleRate: 44100 | 48000; channels: 1 | 2 }` or `{ kind: "copy" }`.

## Video ladder

```typescript
interface VideoRung {
  width: number;
  height: number;
  bitrateBps: number;   // bits per second
  name?: string;        // e.g. "720p"
}
```

## Audio tracks

```typescript
interface AudioTrack {
  language: string;      // e.g. "eng", "es"
  bitrateBps: number;
  default?: boolean;
  name?: string;
  inputIndex?: number;   // audio stream index in the input
}
```

## Segments

**Fixed:**
```typescript
.withSegmentsFixed(4)   // 4-second segments (segmentSeconds)
```

**Auto (size-capped — align segments to a max Shelby blob size):**
```typescript
.withSegmentsAuto({
  maxBlobBytes: 10 * 1024 * 1024,  // cap per-segment size
  safety: 0.9,                     // fraction of the cap to target
  minSeconds: 2,                   // optional (default applies otherwise)
  align: 1,                        // optional: round down to N seconds
})
```

`SegmentPolicy` is the union of `{ mode: "fixed"; segmentSeconds }` and `{ mode: "auto"; maxBlobBytes; safety; minSeconds?; align? }`; pass one directly with `.withSegments(policy)` if you prefer.

## Trickplay

```typescript
.withTrickplay({ name: "thumbs", width: 320, fps: 1, bitrateBps: 100_000 })  // all fields optional (defaults apply)
.withoutTrickplay()
```

## Packaging flags

```typescript
.hlsCmaf({
  playlistType: "vod",          // "vod" | "event"
  independentSegments: true,
  fmp4InitFilename: "init.mp4",
})
```

All flags are optional (defaults applied). Packaging kind is always `hls-cmaf` in 0.0.1.

## Rendering ffmpeg args

```typescript
const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
// args         — string[] FFmpeg CLI arguments
// outputDir    — resolved output directory
// variantNames — per-variant output names (video rungs, audio tracks, trickplay)
```

`plan.build()` returns the validated `Plan` object if you want to inspect/serialize it instead of rendering args.

## FFmpeg executors

### Node — `execFfmpeg`

```typescript
import { execFfmpeg, mapNamesToDirs } from "@shelby-protocol/media-prepare/node";

await execFfmpeg(args, { cwd: outputDir /*, precreate?: string[], silent?: boolean */ });
const dirs = mapNamesToDirs(outputDir, variantNames);  // resolve variant output dirs
```

Runs the system FFmpeg binary. `precreate` makes directories before invoking FFmpeg; `silent` suppresses output.

### Browser — `execFfmpegWasm`

```typescript
import { execFfmpegWasm, normalizeBrowserOutputs } from "@shelby-protocol/media-prepare/browser";

// `ffmpeg` implements the WasmFFmpeg interface (adapt @ffmpeg/ffmpeg's FFmpeg):
interface WasmFFmpeg {
  exec(args: string[]): Promise<undefined | number>;
  readFile(path: string): Promise<Uint8Array | string>;
  writeFile(path: string, data: Uint8Array | string): Promise<boolean>;
  createDir?(path: string): Promise<boolean>;
  listDir?(path: string): Promise<{ name: string; isDir: boolean }[]>;
}

await execFfmpegWasm(ffmpeg, args /*, { precreate?: string[] }*/);
const masterPath = await normalizeBrowserOutputs(ffmpeg, outputDir, variantNames);
```

`WasmFFmpeg` is a structural interface (not exported by name) — implement it over `@ffmpeg/ffmpeg`. `normalizeBrowserOutputs` collects the WASM FS outputs and returns the master playlist path.

## System check (Node)

```typescript
import { SystemChecker } from "@shelby-protocol/media-prepare/node";

await SystemChecker.validateSystemOrThrow();          // throws if FFmpeg/codecs missing
const reqs = await SystemChecker.checkRequirements();  // { ffmpeg, ffprobe, ffmpegVersionValid, codecs, ... }
const platform = SystemChecker.getPlatformInfo();      // { platform, arch, version }
```

All methods are **static**. `SystemRequirements.codecs` reports `{ libx264, libx265, libvpx, libaom, libfdk_aac }`.

## Media probing

```typescript
import { NodeMediaProbe } from "@shelby-protocol/media-prepare/node";
import { BrowserMediaProbe } from "@shelby-protocol/media-prepare/browser";
import { computeAvgBitrateBps, type ProbeResult } from "@shelby-protocol/media-prepare/core";

const result: ProbeResult = await new NodeMediaProbe().probe("./input.mp4");          // ffprobe-backed
const browserResult = await new BrowserMediaProbe({ parseMp4 }).probe(blobOrBuffer);  // inject an mp4 parser
```

```typescript
interface ProbeResult {
  durationSec?: number;
  containerBitrateBps?: number;
  sizeBytes?: number;
  video?: { codec?: string; bitrateBps?: number; width?: number; height?: number; frameRate?: number };
  audio?: { codec?: string; bitrateBps?: number; channels?: number; sampleRate?: number };
}
```

Feed a `ProbeResult` into `withSegmentsAuto` sizing decisions. `computeAvgBitrateBps(sizeBytes, durationSec)` is a helper for the size/duration fallback.

## Resolution constants & presets

From `@shelby-protocol/media-prepare/core` (also re-exported from `/browser`). Values are `"WxH"` strings grouped by category:

```typescript
import {
  SD_RESOLUTIONS, HD_RESOLUTIONS, FULL_HD_RESOLUTIONS, RESOLUTION_2K, RESOLUTION_4K,
  MOBILE_RESOLUTIONS, ULTRAWIDE_RESOLUTIONS, ALL_SUPPORTED_RESOLUTIONS, RESOLUTION_PRESETS,
  type SupportedResolution, hlsCmaf,
} from "@shelby-protocol/media-prepare/core";

HD_RESOLUTIONS.HD_720P_16_9;          // "1280x720"
FULL_HD_RESOLUTIONS.FHD_1080P_16_9;   // "1920x1080"
RESOLUTION_PRESETS.WEB_STREAMING;     // ["1280x720", "1920x1080", "2560x1440"]
```

| Group | Members (`"WxH"`) |
|-------|-------------------|
| `SD_RESOLUTIONS` | `SD_480P_4_3` 640x480, `SD_480P_16_9` 854x480 |
| `HD_RESOLUTIONS` | `HD_720P_16_9` 1280x720, `HD_720P_4_3` 960x720 |
| `FULL_HD_RESOLUTIONS` | `FHD_1080P_16_9` 1920x1080, `FHD_1080P_4_3` 1440x1080 |
| `RESOLUTION_2K` | `QHD_1440P_16_9` 2560x1440 |
| `RESOLUTION_4K` | `UHD_4K_16_9` 3840x2160, `DCI_4K_17_9` 4096x2160 |
| `MOBILE_RESOLUTIONS` | `MOBILE_1080P_VERTICAL` 1080x1920, `MOBILE_720P_VERTICAL` 720x1280 |
| `ULTRAWIDE_RESOLUTIONS` | `ULTRAWIDE_1080P_21_9` 2560x1080, `ULTRAWIDE_1440P_21_9` 3440x1440 |

`RESOLUTION_PRESETS` bundles: `WEB_STREAMING`, `MOBILE_STREAMING`, `PREMIUM_STREAMING`, `CINEMA_STREAMING` (each an array of resolution strings). `ALL_SUPPORTED_RESOLUTIONS` is the flat list; `SupportedResolution` is its union type.

`hlsCmaf.presets.vodHd_1080p` is a ready-made `VideoRung[]` ladder you can pass to `.withLadder(...)`.
