# Contributing

Thanks for taking a look. This is a small, single-file TUI plugin, so the workflow is lightweight.

## Development setup

```bash
git clone https://github.com/your-name/opencode-cyberpunk-hud.git
cd opencode-cyberpunk-hud
npm install
npm run typecheck
```

To try changes in a live OpenCode instance, symlink the checkout into the plugin directory:

```bash
ln -s "$PWD" ~/.config/opencode/plugins/cyberpunk-hud
```

OpenCode reloads local plugins when `tui.tsx` changes (a `touch tui.tsx` is enough). Check the log
for load errors:

```bash
tail -f ~/.local/share/opencode/log/opencode.log | grep -i plugin
```

## Guidelines

- Keep the plugin **JSX-free**. Use `BoxRenderable` / `TextRenderable` from `@opentui/core`.
- **Do not spawn subprocesses** from the TUI. A failing external tool can leak stderr into the
  renderer and corrupt the screen. Use Node APIs or read files instead.
- Rebuild the deck renderable tree on each render; do not cache renderables across route visits.
- Read colors from theme tokens (`theme.markdown.heading`, `theme.syntax.function`, …) rather than
  hardcoding hex values, so both themes keep working.
- Guard every new animation timer with `state.open` and `state.paused`, and add it to the `timers`
  array so it is cleaned up on reload.
- Keep the layout resilient: clamp widths, truncate long text, and hide optional panels when there
  is not enough space.
- Run `npm run typecheck` before opening a pull request.

## Pull requests

- Describe the user-visible change and include a short before/after description.
- Mention the terminal size you tested at, and whether you checked a narrow window.
- Update `README.md`, `README.ru.md`, and `CHANGELOG.md` when behavior or controls change.
- Keep changes focused; separate unrelated refactors from feature work.

## Reporting issues

Please include:

- OpenCode version (`opencode --version`), `@opencode/plugin` version, OS, and terminal.
- Terminal size and theme name.
- Relevant lines from `~/.local/share/opencode/log/opencode.log`.
- What you expected, what happened, and how to reproduce it.
