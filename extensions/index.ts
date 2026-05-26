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
import { join, basename, dirname } from "node:path"
import { homedir } from "node:os"
import { CustomEditor, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent"
import { type Component, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui"

// ============================================================================
// Constants
// ============================================================================

const PROMPT = "» "
const PROMPT_WIDTH = visibleWidth(PROMPT)

// ============================================================================
// Minimal Editor with REPL prompt
// ============================================================================

class MinimalEditor extends CustomEditor {
  constructor(
    tui: any,
    theme: any,
    kb: any,
    options?: any,
  ) {
    super(tui, theme, kb, options)

    // Suppress verbose startup resource listing in chatContainer
    try {
      // TUI children: [headerContainer, chatContainer, pendingMessagesContainer, ...]
      // We look for the Container child that holds chat messages
      const chatContainer = tui.children.find(
        (c: any) => c.constructor.name === "Container" && c !== tui
      )
      if (chatContainer) {
        const originalAddChild = chatContainer.addChild
        let allowAdd = false

        chatContainer.addChild = function (child: any) {
          if (allowAdd) {
            originalAddChild.call(this, child)
          }
        }

        // Enable additions after the startup phase is complete (100ms is perfect)
        setTimeout(() => {
          allowAdd = true
        }, 100)
      }
    } catch {
      // Fallback: ignore errors if TUI internal layout changes
    }
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
      let styled = line
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
      // Colors: title=bold cyan, labels=bold, values=dim
      const t = (s: string) => `\x1b[1;36m${s}\x1b[0m`  // bold cyan
      const l = (s: string) => `\x1b[1m${s}\x1b[0m`      // bold
      const v = (s: string) => `\x1b[2m${s}\x1b[0m`      // dim

      const lines: string[] = [
        t("pi-repl"),
        `  ${l("Session:")} ${v(session)}`,
        `  ${l("Model:")}   ${v(modelId)}`,
        `  ${l("Context:")} ${v(formattedCwd + " on " + branch)}`,
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

  // 1. Install theme if not present
  if (!existsSync(targetPath)) {
    const extensionDir = dirname(new URL(import.meta.url).pathname)
    const sourcePath = join(extensionDir, "..", "themes", "minimal.json")
    if (existsSync(sourcePath)) {
      try {
        mkdirSync(themesDir, { recursive: true })
        copyFileSync(sourcePath, targetPath)
      } catch {
        // Ignore copy errors
      }
    }
  }

  // 2. Configure quietStartup in settings.json to hide verbose list
  const settingsPath = join(agentDir, "settings.json")
  try {
    let settings: Record<string, any> = {}
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

  pi.on("session_start", (_event, ctx) => {
    // Set custom header with REPL welcome info
    try {
      ctx.ui.setHeader(() => createStartupHeader(ctx))
    } catch {}

    // Hide footer
    try {
      ctx.ui.setFooter(() => ({
        render: () => [],
        invalidate: () => {},
      }))
    } catch {}

    // Replace editor with minimal REPL-style editor
    try {
      ctx.ui.setEditorComponent((tui, theme, kb) => new MinimalEditor(tui, theme, kb))
    } catch {}

    // Apply minimal theme
    try {
      ctx.ui.setTheme("minimal")
    } catch {}
  })
}
