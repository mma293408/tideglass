# Tideglass

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Tideglass rank](https://make.fun/badge/best-game-01/mma293408/tideglass/rank.svg)](https://make.fun/bounty/best-game-01)
[![Tideglass reward](https://make.fun/badge/best-game-01/mma293408/tideglass/reward.svg)](https://make.fun/bounty/best-game-01)

**One helm. Two reflections.**

Ferry two boats across the Mirror Sound. The blue ferry follows your orders. The rose ferry shares north and south but mirrors east and west. Reefs and closed locks can stop one boat while the other keeps going. A ferry stops taking orders once it moors.

## Play

Open **game/index.html** directly in desktop Chrome. The game also runs from an ordinary static server and has no installation or runtime network requirements.

- Use the arrow keys, WASD or the on-screen helm.
- On lock charts, each order advances the tide after movement. Gold locks admit entry at flood, violet at ebb. Space and the center helm button advance the tide without moving either ferry.
- **Z** undoes an order. **R** restarts the chart. **M** toggles the original synthesized sound. **H** scouts a single possible next order based on your current position.
- Moor both ferries to clear a chart. Earn another star for retrieving both signal lights and one for finishing at or below par. The Voyage log tracks personal bests when browser storage is available.

## Build the hand-in

Use Node.js 22.18 or newer. Run `node main.ts` to generate `out/`, or set `MAKEFUN_OUTPUT_DIR` to an empty output directory. Use a fresh directory for each hand-in. The entrypoint copies the playable files and the four browser captures, then writes the official dossier using the unmodified kit library.

- `game/src/charts.js` holds the six chart layouts.
- `game/src/steering.js` implements the shared helm, tides and scoring.
- `game/src/drawing.js` renders the nautical charts and cover.
- `game/src/dispatch.js` manages the campaign, controls and player interface.
- `game/src/sound.js` synthesizes the ferry's cues locally.

MIT license for the original entry files. The upstream library retains its original notice.
