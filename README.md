# pi-minimal

Minimalist CLI theme and vim-mode extension for [pi](https://github.com/earendil-works/pi-mono) coding agent.

Strips away all decorations for a clean, pure CLI experience with vim-like navigation.

## Features

- **Minimal theme** - No backgrounds, borders, or color decorations. Pure text.
- **Hidden header/footer** - Clean interface without logo, hints, or status bars.
- **Vim modal editor** - Escape for normal mode, i for insert mode.
- **j/k scrolling** - Navigate conversation history with j (down) and k (up) in normal mode.
- **Standard vim keys** - h/l for left/right, 0/$ for line start/end, x for delete, w/b for word navigation.

## Installation

### Quick: Copy to extensions directory

```bash
# Global (all projects)
cp -r extensions/ ~/.pi/agent/extensions/pi-minimal/
cp themes/minimal.json ~/.pi/agent/themes/

# Project-local
mkdir -p .pi/extensions .pi/themes
cp -r extensions/ .pi/extensions/pi-minimal/
cp themes/minimal.json .pi/themes/
```

### Via settings.json

Add to `~/.pi/agent/settings.json` or `.pi/settings.json`:

```json
{
  "extensions": ["/path/to/pi-minimal/extensions/index.ts"],
  "themes": ["/path/to/pi-minimal/themes/minimal.json"]
}
```

### One-off: CLI flag

```bash
pi --extension /path/to/pi-minimal/extensions/index.ts --theme /path/to/pi-minimal/themes/minimal.json
```

## Usage

### Vim Modes

| Mode | Keys | Action |
|------|------|--------|
| **INSERT** (default) | Any key | Type normally |
| **INSERT** | Escape | Switch to NORMAL mode |
| **NORMAL** | i | Switch to INSERT mode |
| **NORMAL** | a | Switch to INSERT mode (after cursor) |
| **NORMAL** | j | Scroll down through conversation |
| **NORMAL** | k | Scroll up through conversation |
| **NORMAL** | h/l | Move cursor left/right |
| **NORMAL** | 0/$ | Jump to line start/end |
| **NORMAL** | x | Delete character |
| **NORMAL** | w/b | Jump word forward/backward |
| **NORMAL** | Escape | Pass through to pi (abort, etc.) |

### Status Indicator

The editor border shows the current mode:
- `INSERT` - Normal typing mode
- `NORMAL` - Vim navigation mode

## How It Works

The extension:
1. Applies the `minimal` theme which sets all background and border colors to empty
2. Hides the header and footer components
3. Replaces the default editor with a vim-modal editor
4. Handles j/k input in normal mode to scroll the terminal viewport

## Customization

### Changing scroll amount

Edit the `scrollDown()` and `scrollUp()` methods in `extensions/index.ts` to use different ANSI sequences:

```typescript
// Scroll by 3 lines instead of 1
private scrollDown(): void {
  process.stdout.write("\x1b[3;5T") // Scroll down 3 lines
}

private scrollUp(): void {
  process.stdout.write("\x1b[3;5S") // Scroll up 3 lines
}
```

### Adding more vim keys

Add key mappings to the `NORMAL_KEYS` object in `extensions/index.ts`:

```typescript
const NORMAL_KEYS: Record<string, string | null> = {
  // ... existing keys
  gg: "\x1b[H", // go to top (Home)
  G: "\x1b[F", // go to bottom (End)
}
```

## Compatibility

- Requires pi v0.75.0 or later
- Uses `CustomEditor` from `@earendil-works/pi-coding-agent`
- Terminal must support ANSI escape sequences for scrolling

## License

MIT
