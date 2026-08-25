// Mirrors the documented @shelby-protocol/player + media-prepare surface
// (skills/shelby-media) against installed player 0.2.0 / media-prepare 0.0.1.
import { VideoPlayer } from "@shelby-protocol/player";
import "@shelby-protocol/player/styles/shadcn.css";
import { hlsCmaf, type ProbeResult } from "@shelby-protocol/media-prepare/core";
import { execFfmpeg, mapNamesToDirs, NodeMediaProbe, SystemChecker } from "@shelby-protocol/media-prepare/node";
import {
  execFfmpegWasm,
  normalizeBrowserOutputs,
  BrowserMediaProbe,
} from "@shelby-protocol/media-prepare/browser";

// WasmFFmpeg isn't re-exported from the browser entry; recover it from execFfmpegWasm.
type WasmFFmpeg = Parameters<typeof execFfmpegWasm>[0];

// --- Player (verified against @shelby-protocol/player@0.2.0) ---
export function Player() {
  return (
    <VideoPlayer
      src="https://api.shelbynet.shelby.xyz/shelby/v1/blobs/0x.../manifest.mpd"
      title="My Video"
      onStateChange={(state) => console.log(state)}
    />
  );
}

// --- Media-prepare: build an HLS/CMAF plan, then render ffmpeg args ---
function buildPlan() {
  return hlsCmaf
    .planHlsCmaf()
    .input("./input.mp4")
    .outputDir("./output")
    .withVideoEncoder(hlsCmaf.x264())
    .withLadder([
      { width: 1280, height: 720, bitrateBps: 2_500_000 },
      { width: 1920, height: 1080, bitrateBps: 5_000_000 },
    ])
    .withAudio(hlsCmaf.aac(), { language: "eng", bitrateBps: 128_000, default: true })
    .withSegmentsFixed(4)
    .hlsCmaf();
}

// --- Node: run the args through the system ffmpeg ---
export async function prepareNode() {
  // Optional preflight: verify ffmpeg + codecs are available (throws if not).
  await SystemChecker.validateSystemOrThrow();

  const plan = buildPlan();
  const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
  await execFfmpeg(args, { cwd: outputDir });
  return mapNamesToDirs(outputDir, variantNames);
}

// --- Node: probe input media ---
export async function probeNode(): Promise<ProbeResult> {
  return new NodeMediaProbe().probe("./input.mp4");
}

// --- Browser: run the same args through @ffmpeg/ffmpeg (WasmFFmpeg-shaped) ---
export async function prepareBrowser(ffmpeg: WasmFFmpeg) {
  const plan = buildPlan();
  const { args, outputDir, variantNames } = plan.render.ffmpegArgs();
  await execFfmpegWasm(ffmpeg, args);
  const master = await normalizeBrowserOutputs(ffmpeg, outputDir, variantNames);
  void new BrowserMediaProbe();
  return master;
}
