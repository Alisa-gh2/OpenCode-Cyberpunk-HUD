# Publishing

Checklist for turning this folder into a public GitHub repository.

## 1. Set your identity

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## 2. Replace the placeholder owner

The install snippets in `README.md` and `README.ru.md` use `your-name`. Replace it with your GitHub
username (or organization):

```bash
sed -i 's/your-name/YOUR_GITHUB_USER/g' README.md README.ru.md
```

Optionally add repository metadata to `package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_GITHUB_USER/opencode-cyberpunk-hud.git"
},
"homepage": "https://github.com/YOUR_GITHUB_USER/opencode-cyberpunk-hud#readme",
"bugs": {
  "url": "https://github.com/YOUR_GITHUB_USER/opencode-cyberpunk-hud/issues"
}
```

## 3. Verify locally

```bash
npm ci
npm run typecheck
```

`node_modules/` is ignored and must not be committed.

## 4. Create the repository and push

Without GitHub CLI:

```bash
git init -b main
git add -A
git commit -m "Initial release: cyberpunk HUD for OpenCode"
git remote add origin git@github.com:YOUR_GITHUB_USER/opencode-cyberpunk-hud.git
git push -u origin main
```

With GitHub CLI (`gh`):

```bash
git init -b main
git add -A
git commit -m "Initial release: cyberpunk HUD for OpenCode"
gh repo create opencode-cyberpunk-hud --public --source=. --push
```

## 5. Tag the release

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

Then create a GitHub Release from the tag and paste the matching `CHANGELOG.md` section.

## 6. After publishing

- Enable GitHub Actions (the `CI` workflow runs `npm ci` + `npm run typecheck`).
- Add repository topics: `opencode`, `opencode-plugin`, `tui`, `cyberpunk`, `terminal`, `dashboard`.
- Optional: add a real screenshot or GIF at the top of the README. Terminal recordings can be made
  with `asciinema`, `vhs`, or a screen recorder; keep the file under `docs/` and reference it from
  both READMEs.

## npm (optional)

The plugin is designed to be cloned into `~/.config/opencode/plugins/`, not installed from npm.
If you still want to publish it, add the missing metadata (`repository`, `author`), then:

```bash
npm publish --access public
```

Keep in mind that consumers would still need to register the package path in `cli.json` and that
`@opentui/core` declares a Bun/Node engine requirement newer than some environments provide.
