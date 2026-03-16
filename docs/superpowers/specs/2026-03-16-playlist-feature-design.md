# Playlist Feature Design

**Date**: 2026-03-16
**Project**: XP Official Website (xjp56-app)
**Status**: Approved

---

## Overview

Add a Playlist tab to the website (after 相册/Gallery), with global persistent audio playback. Key goals:

1. Browse all tracks with audio sources, build playlists with drag-and-drop ordering
2. Admins create permanent playlists (stored in backend); guests create temporary playlists (localStorage only)
3. Audio plays continuously across page navigation via a global floating player
4. Single-track playback (from SingleDetail) also persists across page navigation
5. Design matches site's cold silver minimalist aesthetic — restrained, typographic, no decorative elements

---

## Data Design

### Playlist Object

```js
{
  id: string,          // "pl_" + uid()
  title: string,
  cover: string,       // /uploads/... relative path (uploaded image); empty string if not set
  tracks: [
    { singleId: string, trackNo: number }
    // References existing track audio — no re-upload
  ],
  createdAt: ISO8601,
}
```

Audio URLs are **resolved at render time** from `data.singles` using `singleId` + `trackNo`. They are never duplicated in the playlist object.

**Cover is optional.** If `cover` is empty, the card renders a `bg-[#F7F7F7]` placeholder with a centered music note icon (`text-[#AAAAAA]`). The Save button in PlaylistBuilder is enabled as long as `title` is non-empty and at least one track is selected; cover is not required.

### Storage

- **Permanent playlists** (admin-created): stored in `data.playlists[]` on the backend, included in `GET/POST /data`
- **Temporary playlists** (guest-created): stored in `localStorage` under key `xjp56_playlists` as a JSON array with the same shape. **Never merged into React `data` state** — managed independently via a separate `localPlaylists` state variable initialized with a **lazy initializer** (`useState(() => { try { return JSON.parse(localStorage.getItem('xjp56_playlists') ?? '[]') } catch { return [] } })`). Any mutation syncs back to localStorage immediately.
- `normalizeAppDataShape` gains: `playlists: Array.isArray(raw?.playlists) ? raw.playlists : []`
- `sanitizeDbPayload` sanitizes `playlists[].cover` the same way as other media URLs
- `onReset` (the "reset to sample data" function in XJP56App) must explicitly include `playlists: []` in the reset shape so it does not accidentally carry over stale playlists
- `withRecomputedSelections` passes `playlists` through unchanged (it only touches `members` and `singles`)
- `onReset` must include `playlists: []` directly in the reset object (same level as `gallery: []`), passed into `withRecomputedSelections` which spreads unknown keys through unchanged

### Resolved Queue Item

When a playlist or single track begins playing, tracks are resolved into a flat queue:

```js
{
  singleId: string,
  trackNo: number,
  title: string,        // track.title
  singleTitle: string,  // single.title (e.g. "27th Single · Song Name")
  coverUrl: string,     // resolved single cover URL (for FloatingPlayer display)
  audioUrl: string,     // resolved audio URL
}
```

---

## Architecture: Global Audio Engine

### State Lifted to XJP56App Root

The `<audio>` element and playback state move from `SingleDetail` to the root `XJP56App` component, following the existing props-down architecture.

```js
// New state in XJP56App
const audioRef = useRef(null);          // points to a single <audio> element rendered unconditionally at root
const [audioQueue, setAudioQueue] = useState([]);   // resolved QueueItem[]
const [audioIndex, setAudioIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
```

The `<audio>` element is rendered **unconditionally** in the root JSX (with an empty `src` initially). This avoids remounting on queue changes.

```jsx
<audio
  ref={audioRef}
  onEnded={handleTrackEnd}
  onError={handleTrackError}
  onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
  onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
  onPlay={() => setIsPlaying(true)}
  onPause={() => setIsPlaying(false)}
/>
```

Progress tracking uses the native `timeupdate` event (fires ~4× per second), updating `currentTime` state. No polling or `requestAnimationFrame` needed.

**Division-by-zero guard**: Anywhere `currentTime / duration` is computed (SVG arc `strokeDashoffset`, progress bar width), use `duration > 0 ? currentTime / duration : 0`. When `duration` is 0 or `NaN` (audio not yet loaded), render a fully empty arc/bar.

### Key Functions (passed as props)

```js
playQueue(tracks, startIndex = 0)
// Resolves tracks → audioQueue, sets audioIndex, plays

stopAudio()
// Clears queue (setAudioQueue([])), pauses audio
// FloatingPlayer unmounts because audioQueue.length drops to 0

togglePlayPause()

seekToIndex(index)
```

`onEnded` handler auto-advances `audioIndex`. After the last track, `isPlaying` becomes `false` but **`audioQueue` is NOT cleared** — FloatingPlayer stays visible in paused state so the user can restart or navigate.

`stopAudio()` (triggered by FloatingPlayer's "停止" button) does clear the queue, causing FloatingPlayer to unmount entirely.

### Prop Propagation

`playQueue` must be threaded down through the component tree:

- `XJP56App` → `SinglesPage` (as prop) → `SingleDetail` (as prop)
- `XJP56App` → `PlaylistPage` (as prop)
- `XJP56App` → `FloatingPlayer` (receives full audio state + controls)

`SinglesPage` receives `playQueue` and passes it into `SingleDetail` when opening the modal.

### SingleDetail Change

`SingleDetail` no longer owns an `<audio>` element. The following must be removed from `SingleDetail`:
- The `currentTrack` state variable
- The `audioRef` ref
- The inline player block (`<div className="mb-4 bg-[#F7F7F7] px-4 py-3">` containing `<audio controls>`)

`SingleDetail` receives two new props: `playQueue` (function) and `audioQueue`/`audioIndex` (to know which track is currently playing globally).

**In-modal playback UX**: There is **no inline audio player inside the modal**. Clicking a track's play button calls `playQueue([resolvedTrack], 0)` and the FloatingPlayer appears/updates. The play button in the tracklist uses Lucide icons: `Play` icon when the track is not currently playing, `Pause` icon when it is the active track and `isPlaying === true`. "Active" means `audioQueue[audioIndex]?.singleId === single.id && audioQueue[audioIndex]?.trackNo === track.no`.

**Call sites**: `SingleDetail` has one call site (inside `SinglesPage`). Add `playQueue`, `audioQueue`, and `audioIndex` to that call site's props.

---

## Components

### 1. Navigation

Add to `tabs` array in `TopBar`:
```js
{ key: "playlist", cn: "歌单", en: "PLAYLIST" }
```
Positioned after `{ key: "gallery", ... }`.

---

### 2. PlaylistPage

**Layout**: `px-4 py-8 mx-auto max-w-7xl` (matches all other pages)

**Header row**:
- Left: section title in standard style (`text-2xl font-light`)
- Right: "新建歌单" button (primary style: `bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5`)
  - Available to all users; admin saves to backend (`setData`), guest saves to localStorage

**Playlist grid**: same column pattern as Singles (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8`)

**Playlist card**:
- Square cover image (`aspect-square object-cover`, no border-radius, `group-hover:scale-[1.04]`), or gray placeholder if no cover
- Title (`text-sm font-medium mt-2`)
- Track count (`text-[10px] text-[#AAAAAA] tracking-[0.08em]`)
- Hover: play button overlay (circle, `w-8 h-8`, bottom-right of cover)
- Admin: edit (pencil) + delete (trash) icon buttons visible on hover on permanent playlists
- Guest: edit + delete available on their own local playlists

**Sections**:
- Permanent playlists shown first (no separator label if no temporary ones exist)
- If temporary playlists exist, they appear below a thin `border-t border-[#E0E0E0]` separator with label: `text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4` → "本地歌单"

**Empty state**: centered `text-sm text-[#AAAAAA]` — "暂无歌单"

---

### 3. PlaylistBuilder (ScrollDialogContent modal)

**Trigger**: "新建歌单" button (create mode), or clicking edit on an existing playlist (edit mode)

**Create mode**: Builder opens with empty `title`, no `cover`, empty `selectedTracks`.

**Edit mode**: Builder pre-populates from the existing playlist: `title`, `cover`, and `selectedTracks` (resolved from the stored `{ singleId, trackNo }` refs). The Save button calls update-in-place: replaces the matching entry in `data.playlists` (permanent) or `localPlaylists` (temporary) by id.

**Modal**: `max-w-3xl`, same `ScrollDialogContent` wrapper pattern

**Layout — two sections stacked (mobile) / side-by-side (desktop `md:flex gap-8`)**:

**Left panel (meta)** — `md:w-48 shrink-0`:
- Cover upload: square `w-full aspect-square` click-to-upload zone, shows preview when set; dashed border `border border-dashed border-[#E0E0E0]` before upload; clicking triggers hidden `<input type="file">`
- Title input: standard `Input` component below cover, `placeholder="歌单名称"`

**Right panel (track selection)** — `flex-1 min-w-0`:

Header: `— TRACKS` section header pattern

Track list (all tracks with non-empty `audio` field across all singles):
- Sorted by single release date descending, then by track number
- Each row: `flex items-center gap-3 py-2.5 border-b border-[#E0E0E0]`
  - Left: checkbox
  - Middle: `text-[10px] text-[#AAAAAA] shrink-0` single prefix + `text-[13px] text-[#1C1C1C]` track title
  - Right: singleKind tag (if not 常规单曲)
- Checked rows highlighted: `bg-[#F7F7F7]`
- **Checking** a track appends it to the bottom of the Selected Tracks list
- **Unchecking** a track removes it from the Selected Tracks list regardless of its current position in the order
- **Duplicate tracks are not allowed** — checking a track that is already in the selected list is a no-op (checkbox reflects selection state)

**Selected Tracks section** (below track list, always visible):

Header: `— 已选曲目 (N)` section header pattern
Drag-and-drop list:
- Each row: drag handle + index number + title + remove (×) button
- Removing a track (×) also unchecks it in the track list above

**Drag-and-drop implementation**: Uses **pointer events** (`onPointerDown/Move/Up`) — not HTML5 drag-and-drop API (which does not work on iOS Safari). `touch-action: none` set on the draggable rows.

State variables for DnD:
- `dragIndex: number | null` — index of the item being dragged
- `dropIndex: number | null` — current insertion target index

Behavior:
- `onPointerDown` on a drag handle: set `dragIndex`, call `e.currentTarget.setPointerCapture(e.pointerId)`
- `onPointerMove`: compute `dropIndex` by comparing `e.clientY` against the midpoint of each row's bounding rect
- `onPointerUp`: reorder `selectedTracks` by moving `dragIndex` to `dropIndex`; clear both
- Visual during drag: dragged row renders at `opacity-40`; a thin `h-0.5 bg-[#1C1C1C]` insertion line appears above the `dropIndex` row

**Footer**: Cancel + Save buttons (`w-full sm:w-auto`)
- Save is disabled if `title` is empty or `selectedTracks.length === 0`

---

### 4. FloatingPlayer

**Position**: `fixed bottom-6 right-4 z-50`

**Mount condition**: Only mounts when `audioQueue.length > 0` (i.e., after first `playQueue()` call; unmounts after `stopAudio()` clears the queue)

**Collapsed state** (default when playing):
- `w-12 h-12` circle
- Background: `bg-white border border-[#E0E0E0]` — clean white with thin border
- Inside: square cover thumbnail `w-8 h-8 object-cover` centered (or music note icon if no cover)
- Outer ring: SVG `<circle>` progress arc, `stroke="#1C1C1C"`, `strokeDashoffset` computed from `currentTime / duration`; updates via `currentTime` state which is driven by `timeupdate` event
- On hover: subtle `shadow-md` lift
- Click → expand

**Expanded state**:
- `w-72` (mobile: `w-[calc(100vw-2rem)]`) card
- `bg-white border border-[#E0E0E0] shadow-lg` — no rounded corners
- **Top row**: cover thumbnail `w-10 h-10 object-cover` + track info (title `text-[13px] font-medium`, single title `text-[10px] text-[#6B6B6B] tracking-[0.08em]`) + collapse button (chevron-down icon, `text-[#AAAAAA]`, top-right)
- **Progress bar**: thin `h-[2px] bg-[#E0E0E0]` track, `bg-[#1C1C1C]` fill div with `width: (currentTime/duration)*100%`; no interactive scrubbing (display only)
- **Controls row** (centered, `gap-6`): prev `⏮` + play/pause `▶/⏸` + next `⏭` — `w-5 h-5` SVG icons in `text-[#1C1C1C]`; prev/next disabled (`opacity-40`) when at queue boundaries
- **Bottom row**: `text-[10px] tracking-[0.15em] text-[#AAAAAA]` track counter "1 / 5" (left) + "停止" plain text button (right, calls `stopAudio()`)

**Animation** (Framer Motion):
- Expand/collapse: `initial={{ opacity: 0, scale: 0.9, y: 8 }}` → `animate={{ opacity: 1, scale: 1, y: 0 }}`
- `transition={{ type: "spring", stiffness: 300, damping: 25 }}`

---

## Behavior & Edge Cases

| Scenario | Behavior |
|---|---|
| Click play on single track | `playQueue([track], 0)` — replaces current queue; FloatingPlayer appears |
| Click play on playlist | `playQueue(allTracks, 0)` — replaces current queue |
| Last track ends | `isPlaying` → false; FloatingPlayer stays visible (queue not cleared); user can restart via play button |
| Track audio URL missing/broken | `onError` → `seekToIndex(index+1)`; skip silently |
| Guest edits temporary playlist | Saves to localStorage; `localPlaylists` state updates; never touches `data` |
| Admin deletes permanent playlist | Removes from `data.playlists`; triggers auto-save |
| Guest deletes temporary playlist | Removes from localStorage; `localPlaylists` state updates |
| localStorage parse error | Silent catch; `localPlaylists` initializes to `[]` |
| Empty playlist | Play button on card is disabled |
| Playlist currently playing is deleted | Queue was resolved at play time (full copies of audioUrl); playback continues unaffected until user stops |
| `stopAudio()` called | Queue cleared; FloatingPlayer unmounts |

---

## Mobile Responsiveness

- PlaylistBuilder: left panel (meta) stacks above right panel (tracks) on mobile
- Selected tracks drag-and-drop: pointer events work on touch; `touch-action: none` on draggable rows
- FloatingPlayer expanded: `w-[calc(100vw-2rem)]` on mobile
- All touch targets ≥ 44px height
- Playlist grid: `grid-cols-2` on mobile (same as Singles/Members)

---

## Files Modified

Only `src/App.jsx` and `src/index.css` (if new keyframe needed for progress arc).

No new files, no new dependencies. DnD and pointer events use browser-native APIs.
