# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-04

First public release.

### Added

- `cyberpunk` (orange) and `cyberpunk-violet` themes.
- `/deck` dashboard with a fresh renderable tree on every visit.
- Session list for root sessions: newest-first ordering, straightforward scrolling, and
  last user/assistant previews with model, id, and cost.
- Live running spinner (`⠋⠙⠹…`) on sessions where the model is working.
- Attention indicators: blinking red `!`, red row highlight, `SESSIONS · N NEED YOU` header,
  pending count in the detail line, and `a` to jump to the next waiting session.
- Project tree (folders only, two levels) with keyboard expand/collapse and a scrolling window.
- SYSTEM panel built from Node `os`: host, kernel, uptime, shell, versions, memory/CPU sparklines,
  pid/cwd.
- Rotating braille wireframe cube with three orbiting particle trails.
- Telemetry column beside the cube: clock, load average, IPv4 interface/address, disk, battery,
  running/total sessions, pending requests, total spend.
- `SIG` oscilloscope trace and scrolling `HEX` stream below the cube.
- Braille radar with a sweeping beam, fading trail, and blips below the project tree.
- Dual scanner bars, red `▲` uplink arrows, blinking `REC`, scrolling status line, glitching title,
  and pulsing frame.
- Motion toggle via `/cyberhud`, the command palette, or `m`; freezes every animation.
- HUD badges in the home and prompt footers.
- Hot-reload-safe deck state in `storage.memory`.

### Notes

- No subprocesses are spawned; all data comes from Node APIs, `/sys` reads, and the OpenCode plugin
  context.
- JSX is intentionally avoided: on OpenCode 2.2.x a JSX plugin fails to resolve `solid-js` from
  nested packages.
