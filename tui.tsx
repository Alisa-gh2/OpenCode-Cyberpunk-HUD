import { Plugin } from "@opencode/plugin/tui"
import { BoxRenderable, TextRenderable } from "@opentui/core"
import fs from "fs"
import path from "path"
import os from "os"

const GLYPHS = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ#$%&*+=-<>"
const MATRIX_COLS = 16
const MATRIX_ROWS = 6

const bar = (label: string, value: string, width = 20) => {
  let used = 0
  try {
    used = Number(value) || 0
  } catch {}
  const filled = Math.round((used / 100) * width)
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, width - filled))
}

const getSysInfo = (appVersion: string, appChannel: string): string[] => {
  // Pure Node implementation: no subprocesses. A failing external command
  // (e.g. fastfetch) can leak stderr into the TUI and corrupt the screen.
  const cpus = os.cpus()
  const uptime = Math.floor(os.uptime())
  const up = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
  const totalGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
  const freeGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1)
  const usedGB = (Number(totalGB) - Number(freeGB)).toFixed(1)
  const memPct = Math.round(((Number(totalGB) - Number(freeGB)) / Number(totalGB)) * 100)
  const cpuModel = cpus[0]?.model ?? "unknown cpu"
  const cpuLoad = os.loadavg()[0]
  const cpuPct = Math.round((cpuLoad / cpus.length) * 100)

  return [
    `╭─ ${os.hostname()} ── ${os.platform()} ${os.release()} ${os.arch()}`,
    `│ kernel   ${os.type()} ${os.release()}`,
    `│ uptime   ${up}`,
    `│ shell    ${process.env.SHELL ?? "sh"}`,
    `│ node     ${process.version} · opencode ${appVersion} (${appChannel})`,
    `│ memory   ${usedGB} / ${totalGB} GB`,
    `│ ${bar("mem", String(memPct))} ${memPct}%`,
    `│ cpu      ${cpuModel}`,
    `│ ${bar("cpu", String(cpuPct))} ${cpuPct}% load1`,
    `│ pid      ${process.pid} · cwd ${process.cwd()}`,
    `╰─────────────────────────────────────────`,
  ]
}

const SPARK = "▁▂▃▄▅▆▇█"
const SPARK_POINTS = 24

const spark = (values: number[], max: number) =>
  values
    .map((value) => {
      const index = Math.max(0, Math.min(SPARK.length - 1, Math.floor((value / max) * (SPARK.length - 1))))
      return SPARK[index]
    })
    .join("")

const cpuSnapshot = () => {
  let idle = 0
  let total = 0
  os.cpus().forEach((cpu) => {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.idle + t.irq
  })
  return { idle, total }
}

// Red uplink arrows: a two-row diagonal sweep, looped by the motion timer.
const UPLINK_FRAMES = [
  "▲   \n ▲  ",
  " ▲  \n  ▲ ",
  "  ▲ \n   ▲",
  "   ▲\n  ▲ ",
  "  ▲ \n ▲  ",
  " ▲  \n▲   ",
]

// Braille spinner shown next to sessions whose model is currently working.
const RUNNING_GLYPHS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

const WAVE_GLYPHS = "▁▂▃▄▅▆▇█"
const HEX_DIGITS = "0123456789ABCDEF"

// Scrolling oscilloscope trace below the cube.
const waveLine = (width: number, phase: number): string => {
  let line = ""
  for (let x = 0; x < width; x++) {
    const t = (x / Math.max(1, width)) * Math.PI * 4 + phase * 3
    const value = 0.5 + 0.34 * Math.sin(t) + 0.16 * Math.sin(t * 2.3 + phase * 2)
    const index = Math.max(0, Math.min(WAVE_GLYPHS.length - 1, Math.floor(value * WAVE_GLYPHS.length)))
    line += WAVE_GLYPHS[index]
  }
  return line
}

// Deterministic scrolling hex dump (stable per frame, shifts over time).
const hexLine = (width: number, phase: number): string => {
  let line = ""
  const shift = Math.floor(phase * 5)
  for (let i = 0; i < width; i++) {
    if (i % 3 === 2) {
      line += " "
      continue
    }
    const seed = Math.sin((i + shift) * 12.9898) * 43758.5453
    line += HEX_DIGITS[Math.floor(Math.abs(seed - Math.floor(seed)) * 16)]
  }
  return line
}

// Sweeping radar with blips, drawn below the project tree.
const radarFrame = (cols: number, rows: number, phase: number): string[] => {
  const width = Math.max(10, cols)
  const height = Math.max(5, rows)
  const dots = new Uint8Array(width * height)
  const subW = width * 2
  const subH = height * 4
  const cx = subW / 2
  const cy = subH / 2
  const radius = Math.min(subW, subH) / 2 - 2

  const plot = (x: number, y: number) => {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || xi >= subW || yi < 0 || yi >= subH) return
    dots[(yi >> 2) * width + (xi >> 1)] |= BRAILLE_BITS[xi & 1][yi & 3]
  }

  const circleSteps = Math.max(32, Math.floor(radius * 8))
  for (let i = 0; i < circleSteps; i++) {
    const angle = (i / circleSteps) * Math.PI * 2
    plot(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
  }
  for (let x = 0; x < subW; x += 3) plot(x, cy)
  for (let y = 0; y < subH; y += 3) plot(cx, y)

  const sweep = phase * 1.4
  const lengths = [1, 0.8, 0.6]
  const offsets = [0, 0.16, 0.32]
  for (let k = 0; k < 3; k++) {
    const angle = sweep - offsets[k]
    const length = radius * lengths[k]
    const steps = Math.max(4, Math.floor(length * 2))
    for (let i = 0; i <= steps; i++) {
      const r = (i / steps) * length
      plot(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    }
  }

  const blips = [
    [0.55, 0.4],
    [0.72, 2.4],
    [0.45, 4.2],
    [0.8, 5.4],
  ]
  blips.forEach(([rf, ang]) => {
    let diff = (((sweep - ang) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    if (diff < 0.5) {
      const r = radius * rf
      plot(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r)
    }
  })

  const lines: string[] = []
  for (let r = 0; r < height; r++) {
    let line = ""
    for (let c = 0; c < width; c++) {
      const bits = dots[r * width + c]
      line += bits ? String.fromCharCode(0x2800 + bits) : " "
    }
    lines.push(line.replace(/\s+$/, ""))
  }
  return lines
}

const CUBE_VERTICES: number[][] = [  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
]

const CUBE_EDGES: number[][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

// Braille dot bits: [x & 1][y & 3] -> bit inside the 2x4 cell.
const BRAILLE_BITS: number[][] = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
]

// Wireframe cube at braille subpixel resolution (2x4 dots per character).
const cubeFrame = (cols: number, rows: number, phase: number): string[] => {
  const width = Math.max(12, cols)
  const height = Math.max(6, rows)
  const dots = new Uint8Array(width * height)

  const cosY = Math.cos(phase)
  const sinY = Math.sin(phase)
  const cosX = Math.cos(phase * 0.55)
  const sinX = Math.sin(phase * 0.55)

  const raw = CUBE_VERTICES.map((v) => {
    const x1 = v[0] * cosY + v[2] * sinY
    const z1 = -v[0] * sinY + v[2] * cosY
    const y1 = v[1] * cosX - z1 * sinX
    const z2 = v[1] * sinX + z1 * cosX
    const f = 2.6 / (2.6 + z2)
    return { x: x1 * f, y: y1 * f }
  })

  const xs = raw.map((p) => p.x)
  const ys = raw.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(0.001, maxX - minX)
  const spanY = Math.max(0.001, maxY - minY)

  // Braille dots are roughly square, so a single scale fits both axes.
  const subW = width * 2
  const subH = height * 4
  const scale = Math.min((subW - 4) / spanX, (subH - 4) / spanY)
  const offsetX = (subW - spanX * scale) / 2 - minX * scale
  const offsetY = (subH - spanY * scale) / 2 - minY * scale

  const points = raw.map((p) => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale,
  }))

  const plot = (x: number, y: number) => {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || xi >= subW || yi < 0 || yi >= subH) return
    dots[(yi >> 2) * width + (xi >> 1)] |= BRAILLE_BITS[xi & 1][yi & 3]
  }

  CUBE_EDGES.forEach(([a, b]) => {
    const x0 = points[a].x
    const y0 = points[a].y
    const x1 = points[b].x
    const y1 = points[b].y
    const dx = x1 - x0
    const dy = y1 - y0
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      plot(x0 + dx * t, y0 + dy * t)
    }
  })

  // Small diamonds mark the corners so the silhouette reads as a solid body.
  points.forEach((p) => {
    plot(p.x, p.y)
    plot(p.x - 1, p.y)
    plot(p.x + 1, p.y)
    plot(p.x, p.y - 1)
    plot(p.x, p.y + 1)
  })

  // Orbiting particles with short trails around the cube.
  const centerX = subW / 2
  const centerY = subH / 2
  const orbitX = subW * 0.44
  const orbitY = subH * 0.44
  for (let k = 0; k < 3; k++) {
    const angle = phase * 1.5 + (k * Math.PI * 2) / 3
    for (let t = 0; t < 4; t++) {
      const a = angle - t * 0.06
      plot(centerX + Math.cos(a) * orbitX, centerY + Math.sin(a) * orbitY)
    }
  }

  const lines: string[] = []
  for (let r = 0; r < height; r++) {
    let line = ""
    for (let c = 0; c < width; c++) {
      const bits = dots[r * width + c]
      line += bits ? String.fromCharCode(0x2800 + bits) : " "
    }
    lines.push(line.replace(/\s+$/, ""))
  }
  return lines
}

const TREE_MAX_DEPTH = 2
const TREE_EXCLUDE = ["node_modules", ".git", ".next", "dist", "build", "target", ".opencode"]

export default Plugin.define({
  id: "cyberpunk.hud",
  setup(context) {
    // The server preloads plugin parts to discover features; TUI APIs exist only in the CLI process.
    if (!context.ui || !context.theme) return

    const theme = context.theme
    const accent = () => theme.markdown.heading
    const cyan = () => theme.syntax.function
    const green = () => theme.syntax.string
    const red = () => theme.text.feedback.error.base
    const dim = () => theme.text.muted
    const base = () => theme.text.base
    const renderer = context.renderer

    // Shared, hot-reload-safe UI state. Solid store reads make the keymap layer reactive.
    const [state, update] = context.storage.memory("cyberdeck", {
      initial: { open: false, selected: 0, offset: 0, paused: false },
    })

    const timers: ReturnType<typeof setInterval>[] = []
    const disposers: Array<() => void> = []
    let deck: any = undefined

    // Renderables owned by the deck screen (assigned in buildDeck).
    const listRows: any[] = []
    let listBox: any = undefined
    let sessionsBox: any = undefined
    let detail: any = undefined
    let previewUser: any = undefined
    let previewAssistant: any = undefined
    let previewFor: string = ""
    let countLabel: any = undefined
    let modelValue: any = undefined
    let matrixLines: any[] = []
    let scanner: any = undefined
    let rec: any = undefined
    let deckRoot: any = undefined
    let statusText: any = undefined
    let uplink: any = undefined
    let runningPhase = 0

    // Live system graphs (SYSTEM panel).
    const cpuHistory: number[] = []
    const memHistory: number[] = []
    let lastCpu = cpuSnapshot()
    let sysStatic: string[] = []
    let sysRaw: string[] = []
    let sysValue: any = undefined
    let cubePhase = 0

    const sysPaneWidth = () => Math.max(28, Math.floor((Number(renderer.width) || 100) / 2) - 6)
    // Rows available inside the SYSTEM panel (terminal minus root chrome and other blocks).
    const sysBudget = () => Math.max(4, (Number(renderer.height) || 40) - 24)

    // Sessions list height adapts to the actual terminal. The old build assumed
    // a fixed 7 rows tuned to one VM's screen; small windows overflowed and
    // large ones wasted space. clamp(4..9, terminal - 20) keeps the whole deck
    // (sessions + project/system + footer + hints) inside the viewport.
    const sessRows = () => {
      const h = Number(renderer && renderer.height) || 40
      return Math.max(4, Math.min(9, h - 20))
    }

    const rebuildSysStatic = () => {
      const paneWidth = sysPaneWidth()
      sysStatic = sysRaw
        .slice(0, Math.max(3, sysBudget() - 10))
        .map((line) => (line.length > paneWidth ? `${line.slice(0, paneWidth - 1)}…` : line))
    }

    // Interactive folder tree (PROJECT panel).
    let treeBox: any = undefined
    let treeValue: any = undefined
    let treeRoot = ""
    let treeBase = ""
    let treeSelected = 0
    let treeOffset = 0
    let treeFocus = false
    const treeExpanded = new Set<string>()

    const hasSubdirs = (dir: string) => {
      try {
        return fs.readdirSync(dir, { withFileTypes: true }).some(
          (entry) => entry.isDirectory() && !TREE_EXCLUDE.includes(entry.name) && !entry.name.startsWith("."),
        )
      } catch {
        return false
      }
    }

    const buildTreeRows = (dir: string, depth: number = 0): any[] => {
      const rows: any[] = []
      if (depth > TREE_MAX_DEPTH) return rows
      let entries: fs.Dirent[] = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch {
        return rows
      }
      entries = entries
        .filter((entry) => entry.isDirectory() && !TREE_EXCLUDE.includes(entry.name) && !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
      entries.forEach((entry) => {
        const full = path.join(dir, entry.name)
        const open = treeExpanded.has(full)
        rows.push({ path: full, name: entry.name, depth, open, kids: hasSubdirs(full) })
        if (open && depth < TREE_MAX_DEPTH) rows.push(...buildTreeRows(full, depth + 1))
      })
      return rows
    }

    const treeViewRows = () => {
      const height = Number(renderer && renderer.height ? renderer.height : 40)
      return Math.max(4, Math.min(12, height - sessRows() - 17))
    }

    const renderTree = () => {
      const rows = buildTreeRows(treeRoot)
      if (!rows.length) return "(no folders)"
      if (treeSelected > rows.length - 1) treeSelected = rows.length - 1
      if (treeSelected < 0) treeSelected = 0
      const view = treeViewRows()
      if (treeSelected < treeOffset) treeOffset = treeSelected
      if (treeSelected >= treeOffset + view) treeOffset = treeSelected - view + 1
      if (treeOffset < 0) treeOffset = 0

      const lines: string[] = []
      if (treeOffset > 0) lines.push("  ↑ more")
      const visible = rows.slice(treeOffset, treeOffset + view)
      visible.forEach((row, index) => {
        const isSelected = treeOffset + index === treeSelected
        const cursor = isSelected ? (treeFocus ? "❯" : "▸") : " "
        const bullet = row.kids ? (row.open ? "▾" : "▸") : "·"
        lines.push(`${cursor} ${"  ".repeat(row.depth)}${bullet} ${row.name}`)
      })
      if (treeOffset + view < rows.length) lines.push("  ↓ more")
      return lines.join("\n")
    }

    // Radar sits in the free rows below the tree; the tree text itself is cached
    // so the animation only re-renders the small radar block.
    const paintTree = () => {
      if (!treeValue) return
      try {
        const used = treeBase ? treeBase.split("\n").length : 0
        const free = sysBudget() - used - 1
        if (free >= 5) {
          const width = Math.min(sysPaneWidth(), 34)
          const frame = radarFrame(width, Math.min(7, free), cubePhase)
          treeValue.content = `${treeBase}\n${frame.join("\n")}`
        } else {
          treeValue.content = treeBase
        }
      } catch {}
    }

    const syncTree = () => {
      if (!treeValue) return
      try {
        treeBase = renderTree()
        paintTree()
        treeValue.fg = treeFocus ? accent() : cyan()
        if (treeBox) treeBox.title = treeFocus ? " PROJECT · FOCUS " : " PROJECT "
      } catch {}
    }

    const moveTree = (delta: number) => {
      const rows = buildTreeRows(treeRoot)
      if (!rows.length) return false
      treeSelected = (treeSelected + delta + rows.length) % rows.length
      syncTree()
      return true
    }

    const toggleTree = () => {
      const rows = buildTreeRows(treeRoot)
      const row = rows[treeSelected]
      if (!row || !row.kids) return false
      if (treeExpanded.has(row.path)) treeExpanded.delete(row.path)
      else treeExpanded.add(row.path)
      syncTree()
      return true
    }

    let telemetryCache = ""
    let telemetryAt = 0

    // Live telemetry shown to the right of the cube (no subprocesses).
    const telemetryLines = (height: number): string[] => {
      const now = Date.now()
      if (!telemetryCache || now - telemetryAt > 900) {
        const date = new Date(now)
        const hh = String(date.getHours()).padStart(2, "0")
        const mm = String(date.getMinutes()).padStart(2, "0")
        const ss = String(date.getSeconds()).padStart(2, "0")
        const sep = Math.floor(now / 1000) % 2 === 0 ? ":" : " "
        const spin = ["◐", "◓", "◑", "◒"][Math.floor(now / 250) % 4]
        const lines: string[] = []
        lines.push(`${spin} CLOCK ${hh}${sep}${mm}${sep}${ss}`)
        lines.push(`◢ LOAD  ${os.loadavg().map((v) => v.toFixed(2)).join(" ")}`)

        let net = "offline"
        try {
          const ifaces = os.networkInterfaces()
          const names = Object.keys(ifaces)
          for (let i = 0; i < names.length; i++) {
            const list = ifaces[names[i]] || []
            for (let j = 0; j < list.length; j++) {
              const item = list[j]
              if (item && !item.internal && item.family === "IPv4") {
                net = `${names[i]} ${item.address}`
                break
              }
            }
            if (net !== "offline") break
          }
        } catch {}
        lines.push(`◢ NET   ${net}`)

        try {
          const stat = fs.statfsSync(treeRoot || process.cwd())
          const total = Number(stat.blocks) * Number(stat.bsize)
          const free = Number(stat.bavail) * Number(stat.bsize)
          const used = total > 0 ? Math.round(((total - Number(stat.bfree) * Number(stat.bsize)) / total) * 100) : 0
          lines.push(`◢ DISK  ${(free / 1024 / 1024 / 1024).toFixed(0)}G free ${used}%`)
        } catch {
          lines.push("◢ DISK  n/a")
        }

        try {
          const bases = ["BAT0", "BAT1", "BATT"]
          let power = ""
          for (let i = 0; i < bases.length; i++) {
            try {
              const capacity = fs.readFileSync(`/sys/class/power_supply/${bases[i]}/capacity`, "utf8").trim()
              const state = fs.readFileSync(`/sys/class/power_supply/${bases[i]}/status`, "utf8").trim()
              power = `${capacity}% ${state}`
              break
            } catch {}
          }
          if (power) lines.push(`◢ PWR   ${power}`)
        } catch {}

        try {
          const sessions = rootSessions()
          let active = 0
          sessions.forEach((s) => {
            if (running(s.id)) active++
          })
          lines.push(`◢ SESS  ${active} run / ${sessions.length} total`)
          const sum = totals(sessions)
          if (sum.needs > 0) lines.push(`◢ NEEDS ${sum.needs} awaiting you`)
          lines.push(`◢ SPEND $${sum.spend.toFixed(4)}`)
        } catch {}

        telemetryCache = lines.join("\n")
        telemetryAt = now
      }
      return telemetryCache.split("\n").slice(0, Math.max(1, height))
    }

    const renderSys = () => {
      const total = os.totalmem()
      const usedGB = (total - os.freemem()) / 1024 / 1024 / 1024
      const totalGB = total / 1024 / 1024 / 1024
      const memPct = total > 0 ? Math.round(100 * (1 - os.freemem() / total)) : 0
      const cpuPct = cpuHistory.length ? cpuHistory[cpuHistory.length - 1] : 0
      const lines = sysStatic.slice()
      lines.push(`│ mem  ${spark(memHistory, 100)} ${String(memPct).padStart(3)}%  ${usedGB.toFixed(1)}/${totalGB.toFixed(1)} GB`)
      lines.push(`│ cpu  ${spark(cpuHistory, 100)} ${String(cpuPct).padStart(3)}%  ${os.cpus().length} cores`)
      const free = sysBudget() - lines.length
      if (free >= 5) {
        const width = sysPaneWidth()
        const waveRows = free >= 8 ? 2 : 0
        const rows = Math.min(10, free - waveRows)
        const sideWidth = 26
        if (width >= 40) {
          const cubeWidth = width - sideWidth - 1
          const cube = cubeFrame(cubeWidth, rows, cubePhase)
          const side = telemetryLines(rows)
          for (let i = 0; i < rows; i++) {
            const left = (cube[i] || "").padEnd(cubeWidth, " ")
            const right = (side[i] || "").slice(0, sideWidth)
            lines.push(`${left} ${right}`.replace(/\s+$/, ""))
          }
        } else {
          lines.push(...cubeFrame(width, rows, cubePhase))
        }
        if (waveRows && rows >= 5) {
          const waveWidth = Math.max(8, width - 8)
          lines.push(`◢ SIG   ${waveLine(waveWidth, cubePhase)}`)
          lines.push(`◢ HEX   ${hexLine(waveWidth, cubePhase)}`)
        }
      }
      return lines.join("\n")
    }

    const text = (content: string, fg: string, extra: Record<string, unknown> = {}) => {
      try {
        return new TextRenderable(renderer, { content, fg, wrapMode: "none", truncate: true, ...extra })
      } catch {
        return null
      }
    }

    const box = (options: Record<string, unknown>) => {
      try {
        return new BoxRenderable(renderer, options as any)
      } catch {
        return null
      }
    }

    const put = (parent: any, child: any) => {
      try {
        if (parent && child) parent.add(child)
      } catch {}
      return parent
    }

    /* ---------------------------- animated badges ---------------------------- */

    const home = text("▚ CYBERDECK // ONLINE", accent())
    if (home) {
      home.visible = !state.paused
      let phase = 0
      timers.push(
        setInterval(() => {
          if (state.paused) return
          phase = (phase + 1) % 2
          try {
            home.content = `${phase ? "▞" : "▚"} CYBERDECK // ONLINE`
            home.fg = phase ? cyan() : accent()
          } catch {}
        }, 700),
      )
      disposers.push(
        context.ui.slot({
          append: "home.footer.status",
          render: () => home,
        }),
      )
    }

    const link = text("◢ LINK", cyan())
    if (link) {
      link.visible = !state.paused
      let dots = 0
      timers.push(
        setInterval(() => {
          if (state.paused) return
          dots = (dots + 1) % 4
          try {
            link.content = `◢ LINK${".".repeat(dots)}`
            link.fg = dots === 0 ? accent() : cyan()
          } catch {}
        }, 650),
      )
      disposers.push(
        context.ui.slot({
          append: "prompt.footer.status",
          render: () => link,
        }),
      )
    }

    // Sample CPU/RAM once a second so the SYSTEM sparklines stay live.
    timers.push(
      setInterval(() => {
        const now = cpuSnapshot()
        const totalDelta = now.total - lastCpu.total
        const idleDelta = now.idle - lastCpu.idle
        lastCpu = now
        const cpuPct = totalDelta > 0 ? Math.round(100 * (1 - idleDelta / totalDelta)) : 0
        const total = os.totalmem()
        const memPct = total > 0 ? Math.round(100 * (1 - os.freemem() / total)) : 0
        cpuHistory.push(Math.max(0, Math.min(100, cpuPct)))
        memHistory.push(Math.max(0, Math.min(100, memPct)))
        if (cpuHistory.length > SPARK_POINTS) cpuHistory.shift()
        if (memHistory.length > SPARK_POINTS) memHistory.shift()
        if (!sysValue || !state.open) return
        try {
          rebuildSysStatic()
          sysValue.content = renderSys()
        } catch {}
      }, 1000),
    )

    // Rotating wireframe cube in the free space of the SYSTEM panel.
    timers.push(
      setInterval(() => {
        if (!sysValue || !state.open || state.paused) return
        cubePhase = (cubePhase + 0.16) % (Math.PI * 2)
        try {
          sysValue.content = renderSys()
        } catch {}
        try {
          paintTree()
        } catch {}
      }, 110),
    )

    // Spinner on running sessions: shows whether the model is working right now.
    timers.push(
      setInterval(() => {
        if (!state.open || state.paused) return
        runningPhase = (runningPhase + 1) % RUNNING_GLYPHS.length
        if (treeBox && !treeFocus) treeBox.title = ` PROJECT ${"·".repeat(1 + (runningPhase % 3))} `
        syncList()
      }, 180),
    )

    /* ------------------------------ session data ----------------------------- */

    const rootSessions = () => {
      let list: any[] = []
      try {
        list = context.data.session.list() ?? []
      } catch {
        return []
      }
      return list
        .filter((s) => !s.parentID && !s.time?.archived)
        .sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))
    }

    const clock = (ts?: number) => {
      if (!ts) return "--:--"
      const d = new Date(ts)
      const now = new Date()
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      if (d.toDateString() === now.toDateString()) return `${hh}:${mm}`
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
    }

    const clampTitle = (title?: string) => {
      const clean = (title ?? "(untitled)").replace(/\s+/g, " ").trim() || "(untitled)"
      return clean.length > 38 ? `${clean.slice(0, 37)}…` : clean
    }

    const oneline = (value: string, max: number) => {
      const clean = String(value ?? "").replace(/\s+/g, " ").trim()
      if (!clean) return ""
      return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
    }

    // Last user + last assistant text of a session, for the preview lines.
    const sessionPreview = (id: string) => {
      let messages: any[] = []
      try {
        messages = context.data.session.message.list(id) ?? []
      } catch {
        return { user: "", assistant: "", model: "" }
      }
      let user = ""
      let assistant = ""
      let model = ""
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]
        if (!message) continue
        if (!user && message.type === "user" && message.text) user = String(message.text)
        if (!assistant && message.type === "assistant") {
          const parts = Array.isArray(message.content) ? message.content : []
          for (let p = parts.length - 1; p >= 0; p--) {
            const part = parts[p]
            if (part && part.type === "text" && part.text) {
              assistant = String(part.text)
              break
            }
          }
          if (assistant && message.model) {
            model = String(message.model.modelID ?? message.model.id ?? "")
          }
        }
        if (user && assistant) break
      }
      return { user, assistant, model }
    }

    const running = (id: string) => {
      try {
        return context.data.session.status(id) === "running"
      } catch {
        return false
      }
    }

    // How many things are waiting on the user in this session: permission
    // prompts plus inbox items (questions, compactions, moves).
    const attention = (id: string) => {
      let count = 0
      try {
        const permissions = context.data.session.permission.list(id)
        if (Array.isArray(permissions)) count += permissions.length
      } catch {}
      try {
        const inbox = context.data.session.pending.list(id)
        if (Array.isArray(inbox)) count += inbox.length
      } catch {}
      return count
    }

    // Aggregate over root sessions: pending attention and total spend.
    const totals = (list: any[]) => {
      let needs = 0
      let spend = 0
      for (let i = 0; i < list.length; i++) {
        const session = list[i]
        if (!session) continue
        needs += attention(session.id)
        try {
          spend += Number(context.data.session.cost(session.id) ?? 0)
        } catch {}
      }
      return { needs, spend }
    }

    const selectedSession = () => rootSessions()[state.selected]

    const syncList = () => {
      const list = rootSessions()

      let selected = state.selected ?? 0
      if (selected > list.length - 1) selected = Math.max(0, list.length - 1)
      if (selected !== state.selected) update((draft) => void (draft.selected = selected))

      const ROWS = sessRows()
      let offset = state.offset ?? 0
      if (selected < offset) offset = selected
      if (selected >= offset + ROWS) offset = selected - ROWS + 1
      offset = Math.max(0, Math.min(offset, Math.max(0, list.length - ROWS)))
      if (offset !== state.offset) update((draft) => void (draft.offset = offset))

      const visible = list.slice(offset, offset + ROWS)
      for (let i = 0; i < ROWS; i++) {
        const row = listRows[i]
        if (!row) continue
        const item = visible[i]
        if (!item) {
          row.content = ""
          row.visible = false
          continue
        }
        const isSelected = offset + i === selected
        const isRunning = running(item.id)
        const needs = attention(item.id)
        const blink = Math.floor(runningPhase / 2) % 2 === 0 ? "!" : " "
        row.visible = true
        row.content = `${isSelected ? "▸" : " "} ${isRunning ? RUNNING_GLYPHS[runningPhase % RUNNING_GLYPHS.length] : " "}${needs ? blink : " "} ${clock(item.time?.updated)}  ${clampTitle(item.title)}`
        row.fg = needs ? red() : isSelected ? accent() : isRunning ? green() : dim()
      }

      const current = list[selected]
      if (detail) {
        if (current) {
          const cost = Number(current.cost ?? 0)
          const needs = attention(current.id)
          detail.content = `ID ${current.id} · $${cost.toFixed(4)}${needs ? ` · ${needs} NEED YOU` : ""}`
          detail.fg = needs ? red() : dim()
        } else {
          detail.content = "NO SESSIONS — press esc and start one"
          detail.fg = dim()
        }
      }

      if (previewUser) previewUser.content = ""
      if (previewAssistant) previewAssistant.content = ""
      if (current) {
        if (previewFor !== current.id) {
          previewFor = current.id
          try {
            void context.data.session.message
              .sync(current.id)
              .then(() => {
                try {
                  syncList()
                } catch {}
              })
              .catch(() => {})
          } catch {}
        }
        const preview = sessionPreview(current.id)
        if (previewUser) {
          previewUser.content = preview.user ? `▸ YOU  ${oneline(preview.user, 96)}` : "▸ YOU  (no message yet)"
          previewUser.fg = accent()
        }
        if (previewAssistant) {
          const tag = preview.model ? ` [${preview.model}]` : ""
          previewAssistant.content = preview.assistant
            ? `◂ BOT${tag}  ${oneline(preview.assistant, 90)}`
            : `◂ BOT${tag}  (no reply yet)`
          previewAssistant.fg = dim()
        }
      } else {
        previewFor = ""
      }
      if (countLabel) countLabel.content = `${list.length} SESSION${list.length === 1 ? "" : "S"}`

      // Surface pending attention even when the telemetry column is hidden.
      if (sessionsBox) {
        let needs = 0
        for (let i = 0; i < list.length; i++) {
          const session = list[i]
          if (session) needs += attention(session.id)
        }
        sessionsBox.title = needs > 0 ? ` SESSIONS · ${needs} NEED YOU ` : " SESSIONS "
      }

      // Keep the info panel's model readout fresh too.
      if (modelValue) {
        try {
          const model = context.ui.model.current()
          modelValue.content = model ? `${model.providerID}/${model.modelID}` : "no-model"
        } catch {}
      }
    }

    /* ------------------------------- deck page ------------------------------- */

    const buildDeck = () => {
      const root = box({
        flexDirection: "column",
        border: true,
        borderStyle: "double",
        borderColor: accent(),
        title: " CYBERDECK ",
        titleColor: accent(),
        titleAlignment: "left",
        bottomTitle: " NETRUNNER OS ",
        bottomTitleColor: dim(),
        padding: 1,
        gap: 1,
        width: "100%",
        height: "100%",
      })
      if (!root) return text("CYBERDECK UNAVAILABLE", red())
      deckRoot = root

      /* ---------------- sessions block (top) ---------------- */

      sessionsBox = box({
        flexDirection: "column",
        border: true,
        borderStyle: "single",
        borderColor: accent(),
        title: " SESSIONS ",
        titleColor: accent(),
        paddingX: 1,
        gap: 0,
        height: sessRows() + 5,
        width: "100%",
        flexShrink: 0,
        minWidth: 0,
      })
      listRows.length = 0
      for (let i = 0; i < sessRows(); i++) {
        const row = text("", base())
        listRows[i] = row
        put(sessionsBox, row)
      }
      previewUser = text("", accent())
      put(sessionsBox, previewUser)
      previewAssistant = text("", dim())
      put(sessionsBox, previewAssistant)
      detail = text("", dim())
      put(sessionsBox, detail)
      put(root, sessionsBox)

      /* ---------------- bottom row: project | system ---------------- */

      const bottom = box({ flexDirection: "row", gap: 2, flexGrow: 1, minWidth: 0 })

      treeRoot = (context.location && context.location.directory) ? context.location.directory : process.cwd()
      treeSelected = 0
      treeOffset = 0
      treeBox = box({
        flexDirection: "column",
        border: true,
        borderStyle: "single",
        borderColor: cyan(),
        title: " PROJECT ",
        titleColor: cyan(),
        paddingX: 1,
        gap: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
      })
      treeValue = text(renderTree(), cyan())
      put(treeBox, treeValue)
      put(bottom, treeBox)

      const sysInfo = getSysInfo(context.app.version, context.app.channel)
      sysRaw = sysInfo.filter((line) => !/[█░]/.test(line))
      rebuildSysStatic()
      const sysBox = box({
        flexDirection: "column",
        border: true,
        borderStyle: "single",
        borderColor: green(),
        title: " SYSTEM ",
        titleColor: green(),
        paddingX: 1,
        gap: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
      })
      sysValue = text(renderSys(), cyan())
      put(sysBox, sysValue)
      put(bottom, sysBox)

      put(root, bottom)

      /* ---------------- footer row: scanner + status + rec ---------------- */

      const footer = box({ flexDirection: "row", gap: 2 })
      scanner = text("", cyan())
      uplink = text(UPLINK_FRAMES[0], red())
      statusText = text("LINK STABLE", green())
      rec = text("● REC", red())
      put(footer, scanner)
      put(footer, uplink)
      put(footer, statusText)
      put(footer, rec)
      put(root, footer)

      /* ---------------- hints ---------------- */

      const hints = box({ flexDirection: "row", gap: 1 })
      countLabel = text("0 SESSIONS", dim())
      put(hints, countLabel)
      put(hints, text("│", dim()))
      put(hints, text("↑↓/jk · enter · a attention · tab tree · n new · r refresh · m motion · esc/q exit", dim()))
      put(root, hints)

      return root
    }

    /* ------------------------------ interactions ----------------------------- */

    const isDeck = () => {
      try {
        const route = context.ui.router.current()
        if (!route) return false
        return route.type === "plugin" && route.name === "cyberpunk.deck"
      } catch {
        return false
      }
    }

    const leave = () => {
      try {
        context.ui.router.navigate({ type: "home" })
        update((draft) => void (draft.open = false))
      } catch (error) {
        context.ui.toast.show({ message: `Exit failed: ${String(error)}`, variant: "error" })
      }
    }

    // Returns false (fall through to other layers) when the deck is not the active screen.
    const guard = () => {
      if (isDeck()) return true
      if (state.open) update((draft) => void (draft.open = false))
      return false
    }

    const move = (delta: number) => {
      if (!guard()) return false
      if (treeFocus) return moveTree(delta)
      const total = rootSessions().length
      if (!total) return false
      update((draft) => void (draft.selected = (state.selected + delta + total) % total))
      syncList()
      return true
    }

    // Jump to the next session that has a permission prompt or inbox item.
    const jumpAttention = () => {
      if (!guard()) return false
      const list = rootSessions()
      if (!list.length) return false
      const start = state.selected ?? 0
      for (let step = 1; step <= list.length; step++) {
        const index = (start + step) % list.length
        const session = list[index]
        if (!session) continue
        const count = attention(session.id)
        if (count > 0) {
          update((draft) => void (draft.selected = index))
          syncList()
          context.ui.toast.show({
            message: `Needs attention: ${count} pending request${count === 1 ? "" : "s"}`,
            variant: "warning",
          })
          return
        }
      }
      context.ui.toast.show({ message: "Nothing waiting for you", variant: "info" })
      return
    }

    const openSelected = () => {
      if (!guard()) return false
      if (treeFocus) {
        toggleTree()
        return
      }
      const session = selectedSession()
      if (!session) {
        context.ui.toast.show({ message: "No session to open", variant: "info" })
        return false
      }
      try {
        context.ui.router.navigate({ type: "session", sessionID: session.id })
        update((draft) => void (draft.open = false))
        return
      } catch (error) {
        context.ui.toast.show({ message: `Open failed: ${String(error)}`, variant: "error" })
        return false
      }
    }

    const createSession = async () => {
      if (!guard()) return false
      try {
        const created = await context.client.session.create({
          location: context.location ? { directory: context.location.directory } : undefined,
        })
        context.ui.router.navigate({ type: "session", sessionID: created.id })
        update((draft) => void (draft.open = false))
        context.ui.toast.show({ message: "New session online", variant: "success" })
        return true
      } catch (error) {
        context.ui.toast.show({ message: `New session failed: ${String(error)}`, variant: "error" })
        return false
      }
    }

    const toggleMotion = () => {
      update((draft) => void (draft.paused = !draft.paused))
      const paused = state.paused
      try {
        if (home) home.visible = !paused
        if (link) link.visible = !paused
      } catch {}
      context.ui.toast.show({
        message: paused ? "Motion offline" : "Motion online",
        variant: paused ? "info" : "success",
      })
    }

    /* -------------------------------- commands ------------------------------- */

    context.keymap.layer(() => {
      // Read the store inside the factory so the layer re-registers when `open` flips.
      // The function form additionally re-checks the live value on every dispatch.
      state.open
      return {
        mode: "global",
        priority: 50,
        enabled: () => state.open === true,
        commands: [
          {
            id: "cyberdeck.exit",
            title: "Cyberdeck: exit",
            bind: "escape,q",
            run: () => {
              if (!guard()) return false
              leave()
            },
          },
          {
            id: "cyberdeck.up",
            title: "Cyberdeck: select previous session",
            bind: "up,k",
            run: () => {
              if (!guard()) return false
              if (move(-1) === false) return false
            },
          },
          {
            id: "cyberdeck.down",
            title: "Cyberdeck: select next session",
            bind: "down,j",
            run: () => {
              if (!guard()) return false
              if (move(1) === false) return false
            },
          },
          {
            id: "cyberdeck.attention",
            title: "Cyberdeck: jump to session needing attention",
            bind: "a",
            run: () => {
              if (!guard()) return false
              if (jumpAttention() === false) return false
            },
          },
          {
            id: "cyberdeck.open",
            title: "Cyberdeck: open selected session",
            bind: "return",
            run: () => {
              if (!guard()) return false
              openSelected()
            },
          },
          {
            id: "cyberdeck.new",
            title: "Cyberdeck: new session",
            bind: "n",
            run: () => {
              if (!guard()) return false
              void createSession()
            },
          },
          {
            id: "cyberdeck.refresh",
            title: "Cyberdeck: refresh session list",
            bind: "r",
            run: () => {
              if (!guard()) return false
              syncList()
              context.ui.toast.show({ message: "Deck refreshed", variant: "info" })
            },
          },
          {
            id: "cyberdeck.motion",
            title: "Cyberdeck: toggle motion",
            bind: "m",
            run: () => {
              if (!guard()) return false
              toggleMotion()
            },
          },
          {
            id: "cyberdeck.focus",
            title: "Cyberdeck: focus project tree",
            bind: "tab",
            run: () => {
              if (!guard()) return false
              treeFocus = !treeFocus
              syncTree()
              return
            },
          },
        ],
      }
    })

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "cyberpunk.deck.open",
          title: "Open cyberdeck",
          group: "Cyberpunk",
          palette: true,
          slash: { name: "deck" },
          run: () => {
            update((draft) => void (draft.open = true))
            treeFocus = false
            try {
              context.ui.dialog.clear()
              context.ui.router.navigate({ type: "plugin", name: "cyberpunk.deck" })
            } catch (error) {
              context.ui.toast.show({ message: `Deck failed: ${String(error)}`, variant: "error" })
            }
          },
        },
        {
          id: "cyberpunk.hud.toggle",
          title: "Toggle cyberpunk motion",
          group: "Cyberpunk",
          palette: true,
          slash: { name: "cyberhud" },
          run: () => toggleMotion(),
        },
      ],
    }))

    disposers.push(
      context.ui.router.register({
        name: "cyberpunk.deck",
        render: () => {
          // Never reuse a previous renderable tree: OpenTUI frees native Yoga
          // nodes when the route is left, so returning a stale `deck` crashes
          // on the second visit. Build fresh every time the route renders.
          deck = buildDeck()
          syncList()
          syncTree()
          return deck
        },
      }),
    )

    /* --------------------------------- motion -------------------------------- */

    const rand = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    let cursor = 0
    const cells = 14

    timers.push(
      setInterval(() => {
        if (state.paused || !state.open) return
        for (let r = 0; r < MATRIX_ROWS; r++) {
          let line = ""
          for (let c = 0; c < MATRIX_COLS; c++) line += Math.random() < 0.3 ? rand() : " "
          const row = matrixLines[r]
          if (row) {
            try {
              row.content = line
            } catch {}
          }
        }
        cursor = (cursor + 1) % cells
        let bar = ""
        for (let i = 0; i < cells; i++) bar += i === cursor ? "▰" : "▱"
        try {
          if (scanner) scanner.content = `${bar}\n${bar}`
          if (uplink) uplink.content = UPLINK_FRAMES[cursor % UPLINK_FRAMES.length]
          if (rec) rec.visible = Math.floor(cursor / 3) % 2 === 0
        } catch {}
      }, 140),
    )

    // Title glitch, scrolling status line and pulsing frame.
    const statusLine = "LINK STABLE // NEURAL BUS NOMINAL // ICE ARMED // "
    let pulse = 0
    let statusShift = 0
    timers.push(
      setInterval(() => {
        if (state.paused || !state.open) return
        pulse = (pulse + 1) % 12
        statusShift = (statusShift + 1) % statusLine.length
        try {
          if (deckRoot) {
            deckRoot.borderColor = pulse % 6 === 0 ? cyan() : accent()
            if (pulse === 5) {
              deckRoot.title = " CYBERDECK "
                .split("")
                .map((ch) => (ch !== " " && Math.random() < 0.3 ? rand() : ch))
                .join("")
            } else if (pulse === 6) {
              deckRoot.title = " CYBERDECK "
            }
          }
          if (statusText) {
            statusText.content = (statusLine + statusLine).slice(statusShift, statusShift + 30)
          }
        } catch {}
      }, 260),
    )

    // Session list stays live while the deck is open.
    timers.push(
      setInterval(() => {
        if (!state.open) return
        syncList()
        syncTree()
      }, 2500),
    )

    // Pull permission/inbox state for the visible sessions so the red attention
    // markers reflect real pending requests without querying on every frame.
    timers.push(
      setInterval(() => {
        if (!state.open || state.paused) return
        const list = rootSessions()
        const start = state.offset ?? 0
        const visible = list.slice(start, start + sessRows())
        for (let i = 0; i < visible.length; i++) {
          const session = visible[i]
          if (!session) continue
          try {
            void context.data.session.permission.sync(session.id).catch(() => {})
          } catch {}
          try {
            void context.data.session.pending.sync(session.id).catch(() => {})
          } catch {}
        }
        syncList()
      }, 5000),
    )

    timers.push(
      setInterval(() => {
        if (!modelValue || !state.open) return
        try {
          const model = context.ui.model.current()
          modelValue.content = model ? `${model.providerID}/${model.modelID}` : "no-model"
        } catch {}
      }, 2000),
    )

    return () => {
      for (const timer of timers) clearInterval(timer)
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {}
      }
    }
  },
})
