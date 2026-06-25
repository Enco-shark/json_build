# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

json-build is a Node.js tool for packing project directories into single JSON files and rebuilding them. It has two interfaces:
- **CLI** (`bin/cli.js`) - command-line tool
- **GUI** (`electron/` + `src/renderer/`) - Electron + Vue 3 desktop app

## Commands

```bash
# Install dependencies
npm install

# CLI operations
npm run pack <dir>          # Pack directory to JSON
npm run rebuild <json>      # Rebuild from JSON
npm test                    # Run test suite (test/test.js)

# GUI development
npm run electron:dev        # Start Electron + Vite dev servers
npm run electron:build      # Build distributable app

# Frontend only
npm run dev                 # Vite dev server only
npm run build               # Build frontend
```

## Architecture

### Core Modules (src/)

- **packer.js** - Recursively scans directories, reads files (text as UTF-8, binary as Base64), outputs JSON with file metadata (paths, sizes, timestamps, permissions)
- **rebuilder.js** - Reads JSON structure, recreates directory tree, optionally restores file timestamps
- **ignore.js** - Implements `.gitignore`-style pattern matching with glob-to-regex conversion; loads `.gitignore` from project root and merges with default ignore list
- **utils.js** - File type detection (text vs binary by extension), stream-based file I/O, size/time formatting
- **progress.js** - Terminal progress bar and spinner for CLI feedback

### IPC Flow (GUI)

Electron main process (`electron/main.js`) exposes these IPC handlers to the renderer:
- `select-directory`, `select-file`, `select-save-path` - native dialogs
- `pack`, `rebuild` - delegates to core modules
- `read-json-info` - parses JSON file for preview
- `scan-directory` - lists files respecting ignore rules

Preload script (`electron/preload.js`) bridges via `contextBridge.exposeInMainWorld('electronAPI', ...)`.

### JSON Structure Format

Output JSON contains: `version`, `createdAt`, `source` (dir name), `files[]` with each file having `path`, `content`, `encoding` (utf-8|base64), `size`, `timestamps`, `mode`.

## Key Design Decisions

- Binary detection is extension-based (see `TEXT_EXTENSIONS` set in utils.js); files without extensions default to text
- Default max file size: 50MB (configurable)
- Paths in JSON use forward slashes regardless of OS
- Ignore rules cascade: default list → `.gitignore` → user custom rules, with negation (`!pattern`) support
