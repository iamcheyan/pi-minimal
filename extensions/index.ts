/**
 * pi-minimal - Minimalist CLI theme and vim-mode extension for pi
 *
 * Features:
 * - Stripped-down theme with no backgrounds, borders, or decorations
 * - Vim-like modal editor (Escape for normal mode, i for insert)
 * - j/k scrolling through conversation history in normal mode
 * - Hidden header and footer for clean CLI feel
 */

import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"
import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui"
import type { KeybindingsManager } from "@earendil-works/pi-coding-agent"

// Normal mode key mappings
const NORMAL_KEYS: Record<string, string | null> = {
  h: "\x1b[D", // left
  j: null, // handled separately for scrolling
  k: null, // handled separately for scrolling
  l: "\x1b[C", // right
  "0": "\x01", // line start
  $: "\x05", // line end
  x: "\x1b[3~", // delete char
  i: null, // insert mode
  a: null, // append (insert + right)
  w: "\x1b[1;5C", // word right (ctrl+right)
  b: "\x1b[1;5D", // word left (ctrl+left)
}

class MinimalEditor extends CustomEditor {
  private mode: "normal" | "insert" = "insert"

  constructor(
    tui: any,
    theme: any,
    keybindings: KeybindingsManager,
    options?: any,
  ) {
    super(tui, theme, keybindings, options)
  }

  handleInput(data: string): void {
    // Escape toggles to normal mode
    if (matchesKey(data, "escape")) {
      if (this.mode === "insert") {
        this.mode = "normal"
      } else {
        // In normal mode, escape passes through for app handling (abort, etc.)
        super.handleInput(data)
      }
      return
    }

    // Insert mode: pass everything through
    if (this.mode === "insert") {
      super.handleInput(data)
      return
    }

    // Normal mode: handle j/k for scrolling
    if (data === "j") {
      this.scrollDown()
      return
    }
    if (data === "k") {
      this.scrollUp()
      return
    }

    // Normal mode: check mapped keys
    if (data in NORMAL_KEYS) {
      const seq = NORMAL_KEYS[data]
      if (data === "i") {
        this.mode = "insert"
      } else if (data === "a") {
        this.mode = "insert"
        super.handleInput("\x1b[C") // move right first
      } else if (seq) {
        super.handleInput(seq)
      }
      return
    }

    // Pass control sequences (ctrl+c, etc.) to super, ignore printable chars
    if (data.length === 1 && data.charCodeAt(0) >= 32) return
    super.handleInput(data)
  }

  private scrollDown(): void {
    process.stdout.write("\x1b[6~")
  }

  private scrollUp(): void {
    process.stdout.write("\x1b[5~")
  }

  render(width: number): string[] {
    const lines = super.render(width)
    if (lines.length === 0) return lines

    // Add mode indicator to bottom border
    const label = this.mode === "normal" ? " NORMAL " : " INSERT "
    const last = lines.length - 1
    if (visibleWidth(lines[last]!) >= label.length) {
      lines[last] = truncateToWidth(lines[last]!, width - label.length, "") + label
    }
    return lines
  }
}

function ensureThemeInstalled(): void {
  const themesDir = join(homedir(), ".pi", "agent", "themes")
  const targetPath = join(themesDir, "minimal.json")
  if (existsSync(targetPath)) return

  // Find the theme file relative to this extension
  const extensionDir = dirname(new URL(import.meta.url).pathname)
  const sourcePath = join(extensionDir, "..", "themes", "minimal.json")

  if (!existsSync(sourcePath)) return

  try {
    mkdirSync(themesDir, { recursive: true })
    copyFileSync(sourcePath, targetPath)
  } catch {
    // Ignore copy errors - theme might be installed manually
  }
}

export default function (pi: ExtensionAPI) {
  ensureThemeInstalled()

  pi.on("session_start", (_event, ctx) => {
    // Hide header
    try {
      ctx.ui.setHeader(() => ({
        render: () => [],
        invalidate: () => {},
      }))
    } catch {}

    // Hide footer
    try {
      ctx.ui.setFooter(() => ({
        render: () => [],
        invalidate: () => {},
      }))
    } catch {}

    // Replace editor with minimal vim-mode editor
    try {
      ctx.ui.setEditorComponent((tui, theme, kb) => new MinimalEditor(tui, theme, kb))
    } catch {}

    // Apply minimal theme (do last - may fail if not installed)
    try {
      ctx.ui.setTheme("minimal")
    } catch {}
  })
}
