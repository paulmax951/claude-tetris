# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris. No build step, no package manager, no dependencies — just `index.html`, `style.css`, and `game.js`.

## Running the game

There is no build/test/lint tooling in this repo. To run it, just serve or open the static files:

```bash
# open directly
start index.html          # Windows
open index.html           # macOS

# or serve locally (avoids any file:// canvas/module quirks)
python3 -m http.server 8000
npx serve .
```

Then verify changes by playing the game in a browser — there are no automated tests.

## Architecture

Everything lives in `game.js` (~300 lines, no modules/classes). It's a single `requestAnimationFrame` loop driving global mutable state:

- **State**: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval` are module-level `let` bindings reassigned by `init()` — not encapsulated in a class or closure.
- **Board model**: `board` is a `ROWS × COLS` matrix (`createBoard()`); each cell is `0` (empty) or a 1–7 color index matching a piece type.
- **Pieces**: `PIECES` holds each tetromino as a square matrix of color indices. Rotation (`rotateCW`) is a transpose + row reversal — there is no piece-specific rotation table (SRS), just this one generic algorithm plus wall kicks.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` against `collide()` and picks the first that fits, discarding the rotation if none work.
- **Collision** (`collide(shape, ox, oy)`): checks board bounds and existing filled cells; used for movement, rotation, ghost-piece projection, and lock detection.
- **Game loop** (`loop(ts)`): accumulates `dt` since last frame; when it exceeds `dropInterval`, advances the piece one row or calls `lockPiece()` if blocked. Always calls `draw()` then reschedules itself via `requestAnimationFrame`.
- **Locking a piece** (`lockPiece` → `merge()` + `clearLines()` + `spawn()`): merges the current piece into `board`, clears completed rows (shifting from the bottom up, re-checking the same row index after a splice), then spawns the next piece. `spawn()` immediately triggers `endGame()` if the new piece collides on entry.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 points per row dropped, soft drop adds 1 point per row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms, recalculated in `clearLines()`.
- **Rendering**: two canvases — `#board` (main play field) and `#next-canvas` (next-piece preview) — both redrawn from scratch every frame via `draw()` / `drawNext()`. The ghost piece is drawn by projecting `current` down via `ghostY()` and rendering at `globalAlpha = 0.2`.
- **Input**: a single `keydown` listener switches on `e.code`; `P` toggles pause independent of the `paused`/`gameOver` guard that blocks all other keys.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell size in px), `COLORS`, `LINE_SCORES`, and the initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

## Notes for changes

- There's no module system — new functions/state just become additional globals in `game.js`. Keep that pattern rather than introducing bundler-dependent syntax (import/export) since there's no build step to support it.
- `README.md` documents the mechanics and file layout in detail (Spanish) — keep it in sync with any behavioral changes to `game.js`.
