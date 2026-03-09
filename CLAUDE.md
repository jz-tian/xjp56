# XP Official Website — Project Guide

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4 (imported via `@import "tailwindcss"` in `index.css`)
- shadcn/ui components (Dialog, DropdownMenu, Button, Input, Textarea, Badge, etc.)
- Framer Motion for page transitions and card animations
- Single-file architecture: nearly all UI lives in `src/App.jsx`

## Project Structure

```
src/
  App.jsx          # Entire frontend (components, data logic, all pages)
  index.css        # Global styles + marquee animation keyframes
public/
  xp-logo.svg      # Favicon + navbar logo (black square, white 4-pointed star)
index.html         # Title: "XP Official Website", favicon: /xp-logo.svg
```

Backend (separate repo/server) serves:
- `GET/POST /data` — full data blob (members, singles, posts)
- `POST /upload` — image upload, returns URL
- `POST /upload-audio` — audio upload, returns URL

## Design System — Cold Silver Minimalism

### Color Tokens
| Role | Value |
|---|---|
| Background | `#FFFFFF` |
| Section background | `#F7F7F7` |
| Primary text | `#1C1C1C` |
| Secondary text | `#6B6B6B` |
| Muted text | `#AAAAAA` |
| Border | `#E0E0E0` |
| Hover fill | `#F0F0F0` |
| Accent/active | `#1C1C1C` (black underline or filled button) |
| Badge background | `#F0F0F0` |

### Typography
- Font: `system-ui, -apple-system` (no custom fonts)
- Nav items: Chinese `text-sm font-medium` + English `text-[10px] tracking-[0.15em] text-gray-400`
- Section headers: `text-2xl font-light tracking-tight`
- Body: `text-sm text-[#6B6B6B] leading-relaxed`
- Section labels (inline): `text-[10px] tracking-[0.25em] font-medium uppercase`

### Section Header Pattern
Used consistently in single detail and member detail modals:
```jsx
<div className="flex items-center gap-3 mb-4">
  <div className="w-5 h-px bg-[#1C1C1C]" />
  <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Section Title</div>
</div>
```
Current section labels: TRACKLIST, INTRODUCTION, FORMATION, PROFILE, ELECTION, FAVORITES, DISCOGRAPHY

### Row List Pattern (used inside sections)
```jsx
<div className="flex items-baseline gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0">
  <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-10 shrink-0">{label}</span>
  <span className="text-[13px] text-[#1C1C1C] tracking-[0.04em]">{value}</span>
</div>
```
- No top border on first row, no bottom border on last row (`last:border-b-0`)
- No border boxes — everything uses `border-b` rows and `—— SECTION` headers
- Value text: `text-[13px]` (not `text-sm`) with `tracking-[0.04em]`

### Cards / Grids
- Member grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8`, no card border
- Singles grid: same column pattern, covers are `aspect-square object-cover` with `group-hover:scale-[1.04]`
- No rounded corners (`rounded-none` or no radius)
- No shadows on cards — only `shadow-lg` on dialogs

### Buttons
- Primary: `bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5`
- Secondary: `border border-[#1C1C1C] text-[#1C1C1C] text-xs tracking-widest px-6 py-2.5`
- Filter active: `bg-[#1C1C1C] text-white border-[#1C1C1C]`
- Filter inactive: `border border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]`
- Inline circle play: `w-6 h-6 rounded-full border border-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white`

### Tags / Badges
- Default: `text-[10px] tracking-wider border border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B] px-2 py-0.5`
- A面选拔: `border-emerald-200 bg-emerald-50 text-emerald-800`
- B面: `border-sky-200 bg-sky-50 text-sky-800`
- 落选: `border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B]`
- 纪念单曲 (singleKind): `border-amber-200 bg-amber-50 text-amber-800`
- CENTER: `border-amber-300 bg-amber-100 text-amber-900`
- 福神: `border-rose-200 bg-rose-50 text-rose-700`
- 加入前: `border-violet-200 bg-violet-50 text-violet-800`
- 护法: `border-indigo-200 bg-indigo-50 text-indigo-700` (distinct from 落选 gray)
- 投票单曲: `border-sky-200 bg-sky-50 text-sky-800`
- 总选单曲: `border-orange-200 bg-orange-50 text-orange-800`
- 猜拳单曲: `border-violet-200 bg-violet-50 text-violet-800`
- 企划单曲: `border-teal-200 bg-teal-50 text-teal-700`

### Generation Badge Colors
| Generation | Background | Text |
|---|---|---|
| 3期 | `#EEF2FF` | `#4338CA` |
| 5期 | `#F0FDFA` | `#0F766E` |
| 6期 | `#FAF5FF` | `#7C3AED` |
| 7期 | `#FFF7ED` | `#C2410C` |
| others | `#F0F0F0` | `#1C1C1C` |
All badges: `padding: '2px 8px', fontWeight: 500, fontSize: '10px', letterSpacing: '0.04em'`

### Dialog / Modal
`ScrollDialogContent` wrapper:
```jsx
"left-1/2 top-[3vh] -translate-x-1/2 translate-y-0
 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[94vh] overflow-hidden p-0
 rounded-none border border-[#E0E0E0] bg-white text-[#1C1C1C] shadow-lg"
```
Inner div: `overflow-y-auto overflow-x-hidden h-full max-h-[94vh] p-4 sm:p-6 w-full box-border`

**IMPORTANT**: Always set `left-1/2 -translate-x-1/2` explicitly — iOS Safari may not apply shadcn's default
`translate-x-[-50%]` correctly when combined with `translate-y-0`, causing the dialog to shift right
and clip content at the right edge.

Single detail modal: `max-w-5xl`
Member detail modal: `max-w-4xl`

### Page Layout
- All content pages (Members, Singles, Blog) use: `px-4 py-8 mx-auto max-w-7xl`
- Hero is full-bleed (no container)
- Navbar: `sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E0E0E0]`
  - Inner: `mx-auto max-w-7xl px-4 h-16`

## Key Components

### Navigation
- Dual-line nav items: Chinese name (sm font-medium) + English (10px tracking)
- Active state: `border-b-2 border-black pb-0.5`
- Mobile: hamburger → Sheet drawer

### Singles Page
- Nogizaka46-style discography grid (large covers)
- Clicking cover → `ScrollDialogContent` modal with `SingleDetail noFrame`
- `SingleDetail` sections: centered cover → badges → TRACKLIST → INTRODUCTION → FORMATION

### Members Page
- Filter row: status (全部/在籍/毕业) + generation pills
- Grid of portrait cards (3:4 aspect ratio, `object-top`)
- Clicking → `ScrollDialogContent` modal with sections: name/romaji header → centered portrait → PROFILE → ELECTION → FAVORITES → DISCOGRAPHY

### Blog Page
- Left list + right detail layout (desktop), stacked (mobile)

### Election Page (`key: "election"`, tab label: 总选举 / ELECTION)
- Between 单曲 and 部落格 in nav
- Edition picker pills → animated list of ranked members
- 圈外 threshold: editions 1–3 hide rank ≥ 20, edition 4+ hide rank ≥ 22
- Clicking a row opens `MemberDetailContent` in a `ScrollDialogContent`
- `ELECTION_SUBTITLES` constant maps edition → subtitle string
- `ElectionPage` component uses `AnimatePresence mode="wait"` for edition switch + staggered `motion.div` rows

### MemberDetailContent (reusable component)
- Extracted from MembersPage, used by both MembersPage and ElectionPage
- Props: `{ member, data }`
- Contains: name/romaji header, portrait, PROFILE rows, ELECTION, FAVORITES, DISCOGRAPHY
- DISCOGRAPHY stats summary: 选拔 count (always shown, even if 0), 福神, 护法, Center (fractional + solo raw count in parens), centered with `justify-center`, Center has `bg-amber-50` highlight
- Graduated members: no grayscale filter, no 卒 badge in ElectionPage context

### Hero Carousel
- 5 slides: latest single first + 4 random others (chosen once per mount)
- Background: 3-layer effect — heavily blurred base fill + left/right accent copies with `mix-blend-mode: screen` + radial vignette
- Foreground: crisp cover at native aspect ratio (`h-full w-auto object-contain`)
- Arrow navigation + dot indicators

## Important Helper Functions (do not modify logic)

- `splitSingleTitle(title)` — splits `"3rd Single · Robot Girlfriend"` → `{ prefix, name }`
- `getElectionBadge(rank, edition)` — returns badge `{ text, className }`. From 4th edition onwards, rank 22+ = 圈外 (was 20+)
- `parseRankNum(raw)` — converts rank string to sortable number (圈外=9999, 加入前=Infinity)
- `parseEditionNum(edition)` — converts edition string ("第4届") to number for sorting
- `computeMemberLineupHistory(memberId, singles)` — selection history per member
- `buildRowMeta(rows)` — computes row/slot metadata for formation display
- `generationBadgeClass(gen)` / `generationBadgeStyle(gen)` — generation badge styling
- `resolveMediaUrl(url)` — resolves relative media paths
- `isoDate(str)` — normalizes date strings

## Data Shape (do not change structure)

```js
data = {
  members: [{
    id, name, romaji, origin, generation, avatar, isActive,
    graduationDate, graduationSongTitle,
    electionRanks: [{ edition, rank }],
    profile: { height, birthday, blood, hobby, skill, catchphrase },
    selectionHistory: { [singleId]: { label, value } },
    admireSenior: [memberId],
    favoriteSong: string,
  }],
  singles: [{
    id, title, release, cover, tags, notes,
    tracks: [{ no, title, isAside, audio }],
    asideLineup: { selectionCount, rows, slots, slotRoles },
  }],
  posts: [{ id, title, content, cover, createdAt }],
}
```

## Mobile / Responsive Rules

**Every change must work on iPhone 15 Pro (393×852pt) and iPhone 15 Pro Max (430×932pt).**

### Checklist for any UI change
- [ ] Modal dialogs: always use `ScrollDialogContent` (never plain `DialogContent`). Keep `left-1/2 -translate-x-1/2` explicit.
- [ ] Flex rows inside modals: label must have `shrink-0`, value container must have `min-w-0 flex-1` so it can shrink
- [ ] Badge areas: `shrink-0 flex-wrap` so multiple badges stack rather than overflow
- [ ] Long text (song titles, single names): use `break-words` so Chinese/English long strings wrap
- [ ] Padding in modals: `p-4 sm:p-6` — narrower on mobile to preserve content width
- [ ] Fixed-width elements (label columns): use `w-10` max inside modals on mobile (discography prefix is `w-10` to ensure consistent wrapping of "Xth Single")
- [ ] Page containers: always `px-4` minimum horizontal padding, never flush to screen edge

### iOS Safari quirks
- `overflow-x: hidden` on a child of `position: fixed` does not reliably clip on iOS — constrain widths instead
- `transform` CSS property: when overriding `translate-y`, also re-declare `translate-x` or they may conflict
- `-webkit-overflow-scrolling` is implied by `overflow-y: auto` on modern iOS; no extra class needed

## Admin Visibility
- Settings button (and admin mode) only visible on localhost/127.0.0.1
- `isLocalhost` is computed inside `TopBar` component (NOT in parent `XJP56App`) — must be in scope where it's used

## singleKind Field
Singles now have a `singleKind` string field (default `"常规单曲"`).
Options: `SINGLE_KIND_OPTIONS = ["常规单曲", "投票单曲", "总选单曲", "猜拳单曲", "企划单曲", "纪念单曲"]`
Helper: `singleKindBadge(kind)` returns `{ text, className }` or `null` for 常规单曲
纪念单曲 is a **manual** singleKind choice — the old auto-computation from saveSingle has been removed

## DISCOGRAPHY Section Rules
- Active tags: 落选, 护法, 福神, CENTER, A面选拔, 加入前 only. B面 and 毕业单 are NOT shown as tags.
- A面选拔 tag is suppressed when 福神 / CENTER / 护法 is already shown for that row
- When `pickType === "加入前"`, show ONLY that tag — suppress all others (kind, role, etc.)
- singleKind is shown as **plain text**, not a tag, between prefix and title

### DISCOGRAPHY Row Layout (responsive)
- Mobile (< md): two-line — line 1: `prefix · kind` (small gray/muted), line 2: `title` + tags
- Desktop (md+): four-column single row — `w-20` prefix, `w-16` kind, `flex-1` title, tags right
- Rule: 4-column flex rows on narrow mobile always get cramped — use 2-line responsive structure instead

## Singles Page Filter + Animation
- Kind filter pills only render when ≥ 2 distinct singleKind values exist in data
- Filter pills order follows `SINGLE_KIND_OPTIONS` array, only showing kinds present in data
- Grid uses `<AnimatePresence mode="popLayout">` with each card as `<motion.div layout>`
  - Enter: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`, stagger `delay: idx * 0.035`
  - Exit: `exit={{ opacity: 0, scale: 0.92 }}`

## Git Remote

`https://github.com/jz-tian/xp.git`

## CSS Animations

Defined in `src/index.css` (not in JSX):
```css
@keyframes xp-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.xp-marquee-track { animation: xp-marquee 40s linear infinite; }
.xp-marquee-track:hover { animation-play-state: paused; }
```
