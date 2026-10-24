# spaceInvadersJS

A Space Invaders clone in vanilla JavaScript, rendered on a `<canvas>`.

## Running it

The game is served as ES modules, so it needs an HTTP server — opening
`index.html` from the filesystem will not work.

```
npm start
```

Then open http://localhost:8080. There are no dependencies and no build step.

## Layout

```
index.html      markup for the canvas, the menus and the HUD
style.css       menus, HUD and overlays (the playfield is drawn, not styled)
src/config.js   every tunable number: sizes, speeds, ammo bonuses, win score
src/game.js     the simulation: state, movement, collisions, win/lose
src/render.js   canvas drawing
src/input.js    keyboard and mouse state
src/ui.js       screen state machine, menus, login
src/hud.js      score / ammo / health readout
src/audio.js    pooled sound effects and music
src/storage.js  localStorage access
src/texts.js    all user-facing strings
src/main.js     bootstrap and the requestAnimationFrame loop
```

`src/game.js` has no DOM dependency, so the rules can be exercised outside a
browser.

## Controls

Picked under *Options*, remembered in `localStorage`.

- **Mouse** — the ship follows the pointer, left button fires.
- **Keyboard + Mouse** — arrow keys move the ship, left button fires.

`Esc` pauses and unpauses.
