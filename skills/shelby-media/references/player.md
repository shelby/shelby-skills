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
pnpm install @shelby-protocol/player
```

Peer dependencies: React 18 or 19, `react-dom`, and `tailwindcss` (^3 or ^4). `shaka-player` ships as a bundled dependency, so you don't install it separately.

Import styles — pick one theme (each theme `@import`s `base.css`, and pulls in `tw-animate-css`, so a Tailwind-enabled app is required):
```tsx
import "@shelby-protocol/player/styles/shadcn.css"; // or styles/neutral.css; styles/base.css is the unthemed core
```

## VideoPlayer

All-in-one component with default controls.

```tsx
import { VideoPlayer } from "@shelby-protocol/player";

<VideoPlayer
  src="https://example.com/master.m3u8"
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
