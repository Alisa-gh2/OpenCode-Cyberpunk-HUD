# Cyberpunk HUD for OpenCode

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![OpenCode](https://img.shields.io/badge/OpenCode-2.2.x-ff8a00)

A neon theme pack, animated status badges, and an interactive `/deck` mission-control screen for
the [OpenCode](https://opencode.ai) TUI.

`/deck` shows your sessions, their live state, what needs your attention, project folders, system
telemetry, and spend — all rendered inside the terminal, with a braille wireframe cube and a radar
running in the free space.

> **Status:** early-stage and experimental. Tested with OpenCode 2.2.1 and `@opencode/plugin` 2.2.5.
> The TUI plugin API is young; pin your OpenCode version if you need long-term stability.

[Русская версия](README.ru.md)

## Features

- **Two themes** — `cyberpunk` (orange) and `cyberpunk-violet`.
- **HUD badges** — animated home footer and prompt footer status lines.
- **Sessions dashboard** — root sessions newest-first, live running spinner, blinking attention
  marker for permission/inbox requests, last user/assistant preview, id and cost.
- **Attention workflow** — `a` jumps to the next session waiting for you; the header and telemetry
  show how many requests are pending.
- **Project tree** — folders only, collapsible, with a sweeping braille radar in the leftover rows.
- **System panel** — host, kernel, uptime, shell, Node/OpenCode versions, memory/CPU sparklines,
  rotating wireframe cube with orbiting particles, oscilloscope and hex stream.
- **Machine telemetry** — clock, load average, IPv4 address, disk free/used, battery state,
  running/total sessions, pending requests, total spend.
- **Motion toggle** — `/cyberhud` or `m` freezes every animation.
- **No subprocesses** — nothing is shelled out, so tool stderr can never corrupt the TUI.

## Preview

```
╔ CYBERDECK ════════════════════════════════════════╗
║ ┌ SESSIONS ─────────────────────────────────────┐ ║
║ │  ⠹ 12:31  refactor auth middleware            │ ║
║ │ ▸ ! ⠋ 12:29  needs your approval              │ ║
║ │  ·  11:58  challenge notes                    │ ║
║ │  ... 7 rows ...                               │ ║
║ │ ▸ YOU  last user message                      │ ║
║ │ ◂ BOT [model]  last assistant reply           │ ║
║ │ ID ses_xxx · $0.0000 · 1 NEED YOU             │ ║
║ └───────────────────────────────────────────────┘ ║
║ ┌ PROJECT ─────────┐  ┌ SYSTEM ────────────────┐  ║
║ │ ▸ challenges     │  │ host / os / kernel      │  ║
║ │ ▸ projects       │  │ uptime / memory / cpu   │  ║
║ │ ▸ scripts        │  │ mem  ▁▂▃▅▃▂ 42% 3.3/7.8 │  ║
║ │                  │  │ cpu  ▁▃▅▇▅▃ 17% 12 cores│  ║
║ │      radar       │  │ ⣠⣦ cube ⢀⡔ ◐ CLOCK 13:57  │  ║
║ │                  │  │ ⠐⠐⠁    ◢ NET eth0 10.0.2 │  ║
║ └──────────────────┘  └────────────────────────┘  ║
║ ▰▱▱▱▱▱ LINK STABLE… ▲ ● REC                       ║
║ ▰▱▱▱▱▱                                          ║
║ 3 SESSIONS │ ↑↓/jk · enter · a attention · tab · … ║
╚═══════════════════════════════════════════════════╝
```

## Requirements

- **OpenCode 2.2.x** with the TUI plugin API (tested on 2.2.1).
- **npm or Bun** to install the plugin dependencies.
- A terminal with **truecolor** and **Unicode braille** support (Kitty, WezTerm, Ghostty,
  Alacritty, iTerm2, Windows Terminal, …). No Nerd Font is required.
- Around **100×32** is comfortable. At narrower widths the telemetry column and the radar hide
  themselves instead of breaking the layout.

Linux is the primary target. macOS works for the main UI; Windows is untested (battery and disk
readouts may be missing, everything else degrades gracefully).

## Installation

### 1. Clone the plugin

```bash
git clone https://github.com/Alisa-gh2/opencode-cyberpunk-hud.git \
  ~/.config/opencode/plugins/cyberpunk-hud

cd ~/.config/opencode/plugins/cyberpunk-hud
npm install --omit=dev
```

`node_modules/` must stay in place: the plugin resolves `@opencode/plugin/tui`,
`@opentui/core`, and `solid-js` from its own folder at runtime.

For development you can keep a checkout elsewhere and symlink it:

```bash
git clone https://github.com/Alisa-gh2/opencode-cyberpunk-hud.git ~/src/opencode-cyberpunk-hud
cd ~/src/opencode-cyberpunk-hud && npm install
ln -s ~/src/opencode-cyberpunk-hud ~/.config/opencode/plugins/cyberpunk-hud
```

### 2. Install the themes (optional)

```bash
mkdir -p ~/.config/opencode/themes
cp themes/cyberpunk.json themes/cyberpunk-violet.json ~/.config/opencode/themes/
```

The plugin follows the active theme's semantic color tokens, so it works with other themes too.
These two are the intended look.

### 3. Register the plugin

Add the plugin (and, optionally, the theme) to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "theme": {
    "mode": "dark",
    "name": "cyberpunk"
  },
  "plugins": ["./plugins/cyberpunk-hud"]
}
```

See [`examples/cli.json`](examples/cli.json) for a minimal file.

### 4. Restart OpenCode

Open the command palette and run **Open cyberdeck**, or type `/deck`.

## Usage

| Command | Action |
| --- | --- |
| `/deck` | Open the CYBERDECK dashboard |
| `/cyberhud` | Toggle all motion on/off |

Both commands are also available in the command palette (**Open cyberdeck**, **Toggle cyberpunk
motion**).

### Deck controls

| Key | Action |
| --- | --- |
| `up` / `k` | Previous session (or tree row when PROJECT is focused) |
| `down` / `j` | Next session (or tree row when PROJECT is focused) |
| `return` | Open the selected session (or expand/collapse the selected folder) |
| `tab` | Move focus between the session list and the project tree |
| `a` | Jump to the next session waiting for your attention |
| `n` | Create a new session and open it |
| `r` | Refresh the session list |
| `m` | Toggle motion |
| `escape` / `q` | Back to home (OpenCode keeps running) |

### Session list

- Root sessions only: subagent children and archived sessions are hidden.
- `⠋⠙⠹…` — the model is working in that session right now.
- Blinking red `!` — a permission prompt or inbox item is waiting for you; the row turns red.
- The block title becomes `SESSIONS · N NEED YOU` when anything is pending.
- Two preview lines show the last user message and the last assistant reply of the selected
  session, followed by its id, cost, and pending count.
- Pending state is refreshed every 5 seconds for the visible rows.

### Project tree

- Folders only, two levels deep; hidden folders and build directories are skipped
  (`node_modules`, `.git`, `dist`, `build`, `target`, `.next`, `.opencode`).
- `▸` collapsed, `▾` expanded, `·` leaf.
- A braille radar sweeps in the free rows below the tree. It disappears when the tree fills the
  panel, so nothing gets clipped.

### System panel

- Built from Node's `os` module: host, kernel, uptime, shell, Node/OpenCode versions, memory, CPU,
  pid/cwd, plus 24-point memory/CPU sparklines refreshed every second.
- A rotating braille wireframe cube with three orbiting particle trails.
- Under the cube: a `SIG` oscilloscope trace and a scrolling `HEX` stream.
- Beside the cube (when the panel is wide enough): clock with a blinking colon, load averages,
  IPv4 interface/address, disk free/used, battery, running/total sessions, pending requests, and
  total spend across root sessions.

### Themes

| Theme | Accent |
| --- | --- |
| `cyberpunk` | orange `#ff8a00` |
| `cyberpunk-violet` | violet `#c77dff` |

Both themes are built on semantic OpenCode tokens, so diffs, markdown, syntax highlighting, and
feedback colors stay consistent.

## Design notes

- **No JSX.** OpenCode 2.2.x resolves `solid-js` from the plugin's own `node_modules` when a JSX
  runtime is requested, but nested packages are rejected, which surfaces as
  `Cannot find package 'solid-js'`. The plugin builds `BoxRenderable` and `TextRenderable` from
  `@opentui/core` directly.
- **Fresh renderable tree on every render.** OpenTUI frees native Yoga nodes when a route is left;
  returning a stale tree crashes on the second visit to `/deck`.
- **Braille rendering.** The cube and radar use a 2×4 subpixel grid per character (8× the
  resolution of plain cells), generated by pure functions and written into a single `TextRenderable`.
- **State outside the component.** Open flag, selection, scroll offset, and motion live in
  `storage.memory("cyberdeck", …)`, so they survive plugin hot reloads.
- **Paused means paused.** `m` gates every animation timer, including the cube, radar, scanners,
  spinners, and status marquee.
- **No shell-outs.** Everything comes from Node APIs, file reads under `/sys`, and the OpenCode
  plugin context. A failing external tool such as `fastfetch` can leak stderr into the TUI and
  corrupt the screen.

### Data sources

| Data | Source |
| --- | --- |
| Sessions, previews, cost | `context.data.session.*` |
| Pending requests | `context.data.session.permission.list` / `pending.list` |
| Project folders | `fs.readdirSync` on the current location |
| Memory / CPU / load / network | Node `os` |
| Disk | `fs.statfsSync` |
| Battery | `/sys/class/power_supply/*` |

Nothing is sent over the network, and nothing leaves your machine.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Plugin does not load | Check `~/.local/share/opencode/log/opencode.log` for `plugin operation failed`, and make sure `node_modules/` exists in the plugin folder (`npm install --omit=dev`). |
| `Cannot find package 'solid-js'` | Do not add JSX to the plugin; use `@opentui/core` renderables as this repo does. |
| Theme is missing | Copy the JSON files into `~/.config/opencode/themes/` and restart OpenCode. |
| No telemetry column | Widen the terminal; it appears when the SYSTEM panel is at least 40 characters wide. |
| No radar | Collapse some folders or make the terminal taller; the radar needs 5 free rows. |
| Battery line missing | Desktops and some VMs have no `/sys/class/power_supply` battery; the line is simply omitted. |
| Animations are distracting | Press `m` in `/deck`, or run `/cyberhud`. |

## Development

```bash
npm install          # includes TypeScript and Node types
npm run typecheck    # tsc --noEmit, also used by CI
```

There is no automated runtime test suite yet (the TUI needs an interactive terminal). Manual
checklist before a release:

1. `/deck` opens; `escape` returns home without exiting OpenCode.
2. Open `/deck` a second time — it must not crash.
3. Sessions list updates; `enter` opens the selected session.
4. `tab` focuses the tree; `enter` expands/collapses folders; radar hides when space runs out.
5. `n` creates a session; `a` finds a session with a pending request.
6. `m` freezes every animation.
7. Resize to a narrow window — no layout corruption or clipped borders.

The whole plugin is one file, [`tui.tsx`](tui.tsx), organized as: braille/ASCII renderers →
plugin setup → state → session data → deck layout → keymap → timers.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CHANGELOG.md](CHANGELOG.md) for history.
Release steps are in [PUBLISHING.md](PUBLISHING.md).

## License

[MIT](LICENSE) © 2026 Alisa Likorisova's Team
