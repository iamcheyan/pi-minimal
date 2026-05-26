# pi-minimal

Minimalist REPL-style extension for [pi](https://github.com/earendil-works/pi-mono) coding agent.

Clean, pure CLI experience with a styled prompt, colored startup header, and zero decorations.

## Features

- **REPL-style prompt** - `»` prompt prefix at the input line
- **Colored startup header** - Shows session, model, context, and help in a clean format
- **Block cursor** - Accent-colored block cursor (blue background) instead of default reverse-video
- **No borders** - Top and bottom `─` lines removed from the editor
- **No header/footer** - Clean interface without logo, hints, or status bars
- **Minimal theme** - All backgrounds, borders, and color decorations stripped out
- **Auto-setup** - Theme and settings are configured automatically on first run

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
pi --extension /path/to/pi-minimal/extensions/index.ts
```

## How It Works

The extension on startup:

1. **Installs theme** - Copies `minimal.json` to `~/.pi/agent/themes/` if not present
2. **Sets quietStartup** - Writes `quietStartup: true` to `~/.pi/agent/settings.json` to suppress the verbose resource listing
3. **Replaces header** - Shows a colored `pi-repl` welcome block with session info
4. **Hides footer** - Removes the status bar
5. **Replaces editor** - Adds `»` prompt prefix, removes border lines, styles cursor

## Startup Output

```
pi-repl
  Session: ses_019e6491-7201-7b74-928d-
  Model:   gpt-5.4-mini
  Context: ~/Development/pi on main
  Type /help for commands, Ctrl+C to interrupt, /exit to quit

» _
```

## Theme

The `minimal.json` theme sets all background and border colors to empty strings, stripping away every visual decoration. The extension automatically installs it to `~/.pi/agent/themes/` on first run.

## Files

- `extensions/index.ts` - Main extension code (editor, header, cursor styling)
- `themes/minimal.json` - Minimal theme definition

## Compatibility

- Requires pi v0.75.0 or later
- Uses `CustomEditor` from `@earendil-works/pi-coding-agent`

## License

MIT
