/**
 * pi-minimal - Minimalist REPL-style extension for pi
 *
 * Features:
 * - REPL-style interface with » prompt
 * - Block cursor with accent color
 * - Startup header formatted exactly like pi-repl
 * - Suppressed verbose listing of resources for a clean welcome screen
 * - No borders, no decorations
 */

import { existsSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"
import { CustomEditor, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent"
import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui"

// ============================================================================
// Constants
// ============================================================================

const PROMPT = `[1;36m»[0m `
const PROMPT_WIDTH = visibleWidth(PROMPT)
const OSC133_ZONE_START = "\x1b]133;A\x07"
const OSC133_ZONE_END = "\x1b]133;B\x07"
const OSC133_ZONE_FINAL = "\x1b]133;C\x07"

type Renderable = Component & {
  render: (width: number) => string[]
}

function isRenderable(value: unknown): value is Renderable {
  return typeof value === "object" && value !== null && "render" in value
}

function isMessageStartLine(line: string | undefined): boolean {
  return line?.includes(OSC133_ZONE_START) === true
}

function isMessageEndLine(line: string | undefined): boolean {
  return line?.includes(OSC133_ZONE_END) === true || line?.includes(OSC133_ZONE_FINAL) === true
}

function isVisualBlankLine(line: string): boolean {
  return line
    .replace(/\x1b\][^\x07]*\x07/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b_pi:c\x07/g, "")
    .trim().length === 0
}

function compactMessageSpacing(lines: string[]): string[] {
  const compacted: string[] = []
  let consecutiveBlanks = 0

  for (const line of lines) {
    if (isVisualBlankLine(line)) {
      consecutiveBlanks++
      // Keep only the first blank line in any sequence
      if (consecutiveBlanks <= 1) {
        compacted.push(line)
      }
    } else {
      consecutiveBlanks = 0
      compacted.push(line)
    }
  }

  return compacted
}

function installChatSpacingPatch(tui: unknown): void {
  if (!isRenderable(tui)) return

  const target = tui as Renderable & { __piMinimalSpacingPatched?: boolean }
  if (target.__piMinimalSpacingPatched) return

  const originalRender = target.render.bind(target)
  target.render = (width: number): string[] => compactMessageSpacing(originalRender(width))
  target.__piMinimalSpacingPatched = true
}

// ============================================================================
// Minimal Editor with REPL prompt
// ============================================================================

class MinimalEditor extends CustomEditor {
  constructor(
    tui: ConstructorParameters<typeof CustomEditor>[0],
    theme: ConstructorParameters<typeof CustomEditor>[1],
    kb: ConstructorParameters<typeof CustomEditor>[2],
    options?: ConstructorParameters<typeof CustomEditor>[3],
  ) {
    super(tui, theme, kb, options)
  }

  render(width: number): string[] {
    const lines = super.render(width)

    // Remove top and bottom border lines
    let content: string[]
    if (lines.length >= 3) {
      content = lines.slice(1, lines.length - 1)
    } else {
      content = lines
    }

    // Style cursor and add prompt
    const available = width - PROMPT_WIDTH
    return content.map((line, i) => {
      // Style cursor: reverse video → accent-colored block
      const styled = line
        .replace(/\x1b\[7m \x1b\[0m/g, "\x1b[48;2;80;160;240m \x1b[0m")
        .replace(/\x1b\[7m([^\x1b])\x1b\[0m/g, "\x1b[48;2;80;160;240;97m$1\x1b[0m")

      if (i === 0) {
        return PROMPT + truncateToWidth(styled, available)
      }
      return "  " + truncateToWidth(styled, available)
    })
  }
}

// ============================================================================
// Helper Utilities for Startup Header
// ============================================================================

function getGitBranch(cwd: string): string {
  try {
    const headPath = join(cwd, ".git", "HEAD")
    if (existsSync(headPath)) {
      const head = readFileSync(headPath, "utf-8").trim()
      if (head.startsWith("ref: ")) {
        return head.slice(5).split("/").pop() || "main"
      }
    }
  } catch {
    // Ignore errors
  }
  return "main"
}

function formatCwd(cwd: string): string {
  const home = homedir()
  if (cwd.startsWith(home)) {
    return "~" + cwd.slice(home.length)
  }
  return cwd
}

function createStartupHeader(ctx: ExtensionContext): Component {
  const session = `ses_${ctx.sessionManager.getSessionId().slice(0, 24)}`
  const modelId = ctx.model?.id || "mimo-v2.5"
  const formattedCwd = formatCwd(ctx.cwd)
  const branch = getGitBranch(ctx.cwd)

  return {
    render(width: number): string[] {
      // Colors: title=bold cyan, labels=bold white, values=dim, branch=cyan
      const t = (s: string) => `\x1b[1;36m${s}\x1b[0m`  // bold cyan
      const l = (s: string) => `\x1b[1m${s}\x1b[0m`      // bold
      const v = (s: string) => `\x1b[2m${s}\x1b[0m`      // dim
      const c = (s: string) => `\x1b[36m${s}\x1b[0m`    // cyan

      const lines: string[] = [
        `  ${l("Session:")} ${v(session)}`,
        `  ${l("Model:")}   ${c(modelId)}`,
        `  ${l("Context:")} ${v(formattedCwd)} ${v("on")} ${c(branch)}`,
        `  ${v("Type /help for commands, Ctrl+C to interrupt, /exit to quit")}`,
        ""
      ]

      return lines.map((line) => truncateToWidth(line, width))
    },
    invalidate() {},
  }
}

// ============================================================================
// Theme and settings auto-install
// ============================================================================

function ensureInstalled(): void {
  const agentDir = join(homedir(), ".pi", "agent")
  const themesDir = join(agentDir, "themes")
  const targetPath = join(themesDir, "minimal.json")

  // 1. Install or refresh the bundled theme
  const extensionDir = dirname(new URL(import.meta.url).pathname)
  const sourcePath = join(extensionDir, "..", "themes", "minimal.json")
  if (existsSync(sourcePath)) {
    try {
      mkdirSync(themesDir, { recursive: true })
      const source = readFileSync(sourcePath, "utf-8")
      const target = existsSync(targetPath) ? readFileSync(targetPath, "utf-8") : ""
      if (source !== target) {
        copyFileSync(sourcePath, targetPath)
      }
    } catch {
      // Ignore copy errors
    }
  }

  // 2. Configure quietStartup in settings.json to hide verbose list
  const settingsPath = join(agentDir, "settings.json")
  try {
    let settings: Record<string, unknown> = {}
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"))
    }
    if (settings.quietStartup !== true) {
      settings.quietStartup = true
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8")
    }
  } catch {
    // Ignore settings file errors
  }
}

// ============================================================================
// Extension entry point
// ============================================================================

export default function (pi: ExtensionAPI) {
  ensureInstalled()

  const minimalEditorFactory = (tui: ConstructorParameters<typeof MinimalEditor>[0], theme: ConstructorParameters<typeof MinimalEditor>[1], kb: ConstructorParameters<typeof MinimalEditor>[2]) =>
    new MinimalEditor(tui, theme, kb)

  pi.on("session_start", (_event, ctx) => {
    // Intercept setEditorComponent to automatically enforce MinimalEditor when a reset (undefined) is requested.
    // This cleanly handles resets from other extensions (like pi-ralph) during session startup and at turn ends.
    const originalSetEditorComponent = ctx.ui.setEditorComponent.bind(ctx.ui)
    ctx.ui.setEditorComponent = (factory) => {
      if (factory === undefined) {
        originalSetEditorComponent(minimalEditorFactory)
      } else {
        originalSetEditorComponent(factory)
      }
    }

    // Set custom header with REPL welcome info
    try {
      ctx.ui.setHeader((tui) => {
        installChatSpacingPatch(tui)
        return createStartupHeader(ctx)
      })
    } catch {}

    // Hide footer
    try {
      ctx.ui.setFooter(() => ({
        render: () => [],
        invalidate: () => {},
      }))
    } catch {}

    // Initially apply the minimal editor
    ctx.ui.setEditorComponent(minimalEditorFactory)

    // Apply minimal theme
    try {
      ctx.ui.setTheme("minimal")
    } catch {}
  })
}
