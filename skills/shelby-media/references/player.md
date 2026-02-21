# Player Reference

Complete API for `@shelby-protocol/player`.

## Table of Contents

- [Installation](#installation)
- [VideoPlayer](#videoplayer)
- [Custom Layouts](#custom-layouts)
- [Control Components](#control-components)
- [Menu Components](#menu-components)
- [Providers and Context](#providers-and-context)
- [Styling](#styling)

## Installation

```bash
pnpm install @shelby-protocol/player shaka-player
```

Peer dependencies: React 18 or 19, shaka-player.

Import styles:
```tsx
import "@shelby-protocol/player/styles.css";
```

## VideoPlayer

All-in-one component with default controls.

```tsx
import { VideoPlayer } from "@shelby-protocol/player";

<VideoPlayer
  src="https://example.com/manifest.mpd"
  title="My Video"
  config={{ streaming: { bufferingGoal: 30 } }}
  onStateChange={(state) => console.log(state)}
  className="rounded-lg"
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | Media URL (DASH .mpd, HLS .m3u8, or direct) |
| `title` | `string` | Displayed in controls |
| `config` | `ShakaPlayerConfig` | Shaka Player config (DeepPartial of `shaka.extern.PlayerConfiguration`) |
| `onStateChange` | `(state: Partial<MediaState>) => void` | Callback on media state changes |
| `className` | `string` | CSS classes |

Internally wraps: `MediaProvider` → `PlayerProvider` → `PlayerContainer` → `ShakaVideo` + `DefaultControls` + `MediaStoreListener`.

## Custom Layouts

For custom control layouts, compose individual components:

```tsx
import {
  PlayerProvider,
  PlayerContainer,
  ShakaVideo,
  Controls,
  ControlsGroup,
  PlayButton,
  Seekbar,
  FullscreenButton,
} from "@shelby-protocol/player";
import { MediaProvider } from "media-chrome/react/media-store";

function CustomPlayer({ src }: { src: string }) {
  return (
    <MediaProvider>
      <PlayerProvider>
        <PlayerContainer>
          <ShakaVideo src={src} />
          <Controls>
            <ControlsGroup>
              <Seekbar />
            </ControlsGroup>
            <ControlsGroup className="flex items-center gap-2 px-2 pb-2">
              <PlayButton />
              <div className="flex-1" />
              <FullscreenButton />
            </ControlsGroup>
          </Controls>
        </PlayerContainer>
      </PlayerProvider>
    </MediaProvider>
  );
}
```

## Control Components

All control components accept `className?: string`.

### PlayButton

Toggles play/pause. Icons: play/pause.

### MuteButton

Toggles mute/unmute. Icons: mute/volume.

### VolumeSlider

Radix UI slider, range 0–1, step 0.01. Default volume: 0.5.

### Seekbar

Radix UI slider showing playback progress. Disable seeking during non-jumpable ads.

### FullscreenButton

Toggles fullscreen mode. Icons: fullscreen/minimize.

### PipButton

Toggles Picture-in-Picture. Icons: PiP enter/exit.

### CurrentTimeDisplay

Renders `"MM:SS / MM:SS"` (current / duration).

### MediaTitle

Displays `title` prop or "Ad" during interstitials.

### PlayGestureRegion

Click region that toggles play/pause.

## Menu Components

### SettingsMenuTriggerButton

Settings gear icon. Use as trigger for a DropdownMenu containing submenus.

### PlaybackRateSubMenuButton

```tsx
<PlaybackRateSubMenuButton rates={[0.5, 1, 1.5, 2]} />
```

| Prop | Type | Default |
|------|------|---------|
| `rates` | `number[]` | `[0.5, 1, 1.5, 2]` |

### RenditionsSubMenuButton

Quality selector showing available resolutions. Groups by language. "Auto" for ABR mode or specific resolution (e.g., "1080p") when manually selected.

### DropdownMenu

Full Radix UI dropdown menu suite exported: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuSeparator`, `DropdownMenuLabel`, `DropdownMenuCheckboxItem`.

## Providers and Context

### PlayerProvider

Provides refs for video element and fullscreen container.

**Hooks:**

| Hook | Returns | Description |
|------|---------|-------------|
| `useVideoRef()` | `(el: HTMLVideoElement \| null) => void` | Set video element ref |
| `useVideo()` | `RefObject<HTMLVideoElement \| null>` | Get video element ref |
| `useFullscreenContainerRef()` | `(el: HTMLDivElement \| null) => void` | Set fullscreen container ref |
| `useFullscreenContainer()` | `RefObject<HTMLDivElement \| null>` | Get fullscreen container ref |
| `useShaka()` | `shaka.Player \| null` | Get Shaka Player instance |

### InterstitialsProvider

Provides ad/interstitial state.

**Hook:** `useInterstitials()`

```typescript
interface InterstitialState {
  isInterstitialPlaying: boolean;    // default: false
  isInterstitialSkippable: boolean;  // default: true
  isInterstitialJumpable: boolean;   // default: true
}
```

### MediaStoreListener

Non-rendering component that subscribes to media state changes.

```tsx
<MediaStoreListener onStateChange={(state) => console.log(state)} />
```

## Styling

The player uses Tailwind CSS classes with custom color tokens:

- `text-sp-foreground` — Text/icon color
- `border-sp-border` — Border color
- `outline-sp-ring` — Focus ring

`PlayerContainer` default: `dark relative w-full aspect-video overflow-hidden`.

`ControlsContainer` auto-hides after 2 seconds when playing, always visible when paused.

## Error Handling

### Shaka Player Error Codes

The player uses Shaka Player internally. Common error categories:

| Category | Code Range | Description |
|----------|-----------|-------------|
| NETWORK | 1000–1999 | HTTP errors, timeouts, failed requests |
| TEXT | 2000–2999 | Subtitle/caption parsing errors |
| MEDIA | 3000–3999 | MediaSource or codec errors |
| MANIFEST | 4000–4999 | DASH/HLS manifest parsing errors |
| STREAMING | 5000–5999 | Segment fetching or buffering errors |
| DRM | 6000–6999 | License request or decryption errors |
| STORAGE | 9000–9999 | Offline storage errors |

### Handling Errors with onStateChange

Use the `onStateChange` callback to detect and respond to errors:

```tsx
<VideoPlayer
  src="https://example.com/manifest.mpd"
  onStateChange={(state) => {
    if (state.error) {
      console.error("Playback error:", state.error);
      // Show user-friendly error message
    }
  }}
/>
```

### Using the Shaka Player Instance Directly

For more granular error handling, access the Shaka Player instance:

```tsx
import { useShaka } from "@shelby-protocol/player";

function ErrorHandler() {
  const shaka = useShaka();

  useEffect(() => {
    if (!shaka) return;

    const onError = (event: shaka.PlayerEvents.ErrorEvent) => {
      const error = event.detail;
      console.error("Error code:", error.code, "Category:", error.category);

      switch (error.category) {
        case shaka.util.Error.Category.NETWORK:
          // Handle network errors (offline, timeout)
          break;
        case shaka.util.Error.Category.MEDIA:
          // Handle unsupported format or codec errors
          break;
        case shaka.util.Error.Category.DRM:
          // Handle DRM license errors
          break;
      }
    };

    shaka.addEventListener("error", onError);
    return () => shaka.removeEventListener("error", onError);
  }, [shaka]);

  return null;
}
```

### Common Error Scenarios

| Scenario | Likely Cause | Suggested Response |
|----------|-------------|-------------------|
| Network error on load | Bad URL or CORS issue | Verify `src` URL and server CORS headers |
| Network error during playback | Unstable connection | Shaka retries automatically; show buffering indicator |
| Unsupported format | Browser lacks codec support | Check browser compatibility for the media format |
| Manifest parse error | Invalid or unreachable manifest | Validate the manifest URL and format |
| DRM license error | Missing or expired license server | Verify DRM configuration in `config` prop |

## Performance

### Buffer Configuration

Adjust buffering behavior through the `config` prop:

```tsx
<VideoPlayer
  src="https://example.com/manifest.mpd"
  config={{
    streaming: {
      bufferingGoal: 30,        // Seconds of content to buffer ahead (default: 10)
      rebufferingGoal: 2,       // Seconds to buffer before resuming after a stall (default: 2)
      bufferBehind: 30,         // Seconds of content to keep behind playhead (default: 30)
      retryParameters: {
        maxAttempts: 5,         // Max retry attempts for failed requests
        baseDelay: 1000,        // Base delay between retries in ms
      },
    },
  }}
/>
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `bufferingGoal` | 10 | Seconds of content to buffer ahead of playhead |
| `rebufferingGoal` | 2 | Seconds to buffer before resuming after a stall |
| `bufferBehind` | 30 | Seconds of content to keep behind playhead |

### Memory Management for Large Videos

For long-form or high-resolution content, reduce memory usage by limiting buffer sizes:

```tsx
<VideoPlayer
  src="https://example.com/long-video.mpd"
  config={{
    streaming: {
      bufferingGoal: 15,      // Don't buffer too far ahead
      bufferBehind: 15,       // Reduce buffer behind playhead
    },
  }}
/>
```

### Adaptive Bitrate (ABR) Configuration

Control how the player selects quality levels:

```tsx
<VideoPlayer
  src="https://example.com/manifest.mpd"
  config={{
    abr: {
      enabled: true,                    // Enable ABR (default: true)
      defaultBandwidthEstimate: 1_000_000, // Initial bandwidth estimate in bits/sec
      restrictions: {
        maxHeight: 1080,                // Cap resolution
        maxBandwidth: 5_000_000,        // Cap bandwidth in bits/sec
      },
    },
  }}
/>
```

### Lazy Loading and Preload Strategies

Defer player initialization until the video is in the viewport:

```tsx
import { useRef, useState, useEffect } from "react";
import { VideoPlayer } from "@shelby-protocol/player";

function LazyVideoPlayer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="aspect-video">
      {isVisible ? (
        <VideoPlayer src={src} />
      ) : (
        <div className="w-full h-full bg-black" />
      )}
    </div>
  );
}
```

## Accessibility

### Keyboard Navigation

The player controls support keyboard interaction:

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Toggle play/pause (when PlayButton or PlayGestureRegion is focused) |
| `Tab` | Navigate between controls |
| `Arrow Left/Right` | Seek backward/forward (when Seekbar is focused) |
| `Arrow Up/Down` | Adjust volume (when VolumeSlider is focused) |
| `Escape` | Exit fullscreen |
| `F` | Toggle fullscreen (when FullscreenButton is focused) |
| `M` | Toggle mute (when MuteButton is focused) |

### ARIA Attributes

When building custom layouts, add appropriate ARIA attributes for screen reader support:

```tsx
<PlayerContainer role="region" aria-label="Video Player">
  <ShakaVideo src={src} />
  <Controls aria-label="Video Controls">
    <ControlsGroup>
      <PlayButton aria-label="Play" />
      <MuteButton aria-label="Mute" />
      <VolumeSlider aria-label="Volume" />
      <Seekbar aria-label="Seek" />
      <CurrentTimeDisplay aria-label="Current time" />
      <FullscreenButton aria-label="Toggle fullscreen" />
    </ControlsGroup>
  </Controls>
</PlayerContainer>
```

### Captions and Subtitles

Shaka Player supports TTML, WebVTT, and other text track formats. Configure text display through the `config` prop:

```tsx
<VideoPlayer
  src="https://example.com/manifest.mpd"
  config={{
    textDisplayFactory: () => new shaka.text.SimpleTextDisplayer(videoElement),
  }}
/>
```

To select or toggle text tracks programmatically:

```tsx
import { useShaka } from "@shelby-protocol/player";

function CaptionToggle() {
  const shaka = useShaka();

  const toggleCaptions = () => {
    if (!shaka) return;
    const tracks = shaka.getTextTracks();
    if (tracks.length > 0) {
      shaka.setTextTrackVisibility(!shaka.isTextTrackVisible());
    }
  };

  return <button onClick={toggleCaptions}>Toggle Captions</button>;
}
```

### Screen Reader Compatibility

- Use semantic HTML elements within custom layouts
- Provide `aria-label` on all interactive controls
- Use `aria-live="polite"` for dynamic status updates (e.g., buffering state)
- Ensure focus management when entering/exiting fullscreen
