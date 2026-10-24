# spaceInvadersJS

A Space Invaders clone in vanilla JavaScript, rendered on a `<canvas>`.

## Running it

The game is served as ES modules, so it needs an HTTP server — opening
`index.html` from the filesystem will not work.

```
npm start
```

Then open http://localhost:8080. There are no dependencies and no build step;
`tools/serve.js` is a static file server on Node's own http module.

```
npm test
```

runs the rule tests on Node's built-in test runner — also no dependencies.

## Layout

```
index.html      markup for the canvas, the menus and the HUD
style.css       menus, HUD and overlays (the playfield is drawn, not styled)
src/config.js   every tunable number: sizes, speeds, waves, ammo bonuses
src/game.js     the simulation: state, waves, movement, collisions, win/lose
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
browser; `test/game.test.js` does exactly that.

## Waves

The game is endless. There is no winning score — a run lasts until the last life
is gone, and the waves keep getting harder with no upper bound.

Each wave is a grid that marches sideways and steps down whenever it touches an
edge. Thinning it out makes the survivors move faster. Clearing one starts the
next. Letting the formation reach the ship's line costs one life and pushes the
survivors back to the top.

Difficulty arrives in layers, so that something is always still growing once the
layer before it has maxed out:

| | |
|---|---|
| waves 1–12 | the grid grows to 8×5 |
| waves 3+ | rows of the higher-scoring enemy spread forward until the grid is all of them |
| waves 12+ | every alien gains another hit point every 6 waves, forever |
| waves 16+ | the formation drops a bigger volley each time |
| waves 20+ | boss waves send more than one boss |
| throughout | the march, the fire rate and boss hit points keep climbing |

Reaching 100 points — `SCORE_MILESTONE` — no longer ends anything. It only
decides whether the game over screen congratulates you or insults you.

Every fifth wave is a single boss instead of a grid. A boss is simply an alien
with more than one hit point, so it marches, steps down and breaches through
exactly the same code; it just moves faster, carries a health bar and each one
is tougher than the last.

## Ammo

Clearing a wave pays back `WAVE_AMMO_REFUND` times what that wave would have
cost to clear with no misses, which puts the break-even point near 55% accuracy.
A flat bonus cannot work in an endless game: a late wave needs an order of
magnitude more shots than an early one, so a fixed payout starves you however
well you shoot. Running to empty with aliens still on screen trickles a round
back every so often, so an empty magazine is a handicap rather than a dead end —
the aliens should be what finish a run.

## Return fire

The formation shoots back. Only an alien with nothing of its own below it can
drop a bomb, so fire comes from the front edge of the grid; the rate climbs with
each wave and a boss fires several times faster still. A bomb that reaches the
ship costs a life and starts a short grace period, during which the ship blinks
and cannot be hit again — otherwise one cluster would take every life at once.

Three enemies, all from sprites already in `pics/`: the green one walks through
two frames and scores 1, the purple one fills the back rows and scores 3, and
the boss reuses `spin1`/`spin2` — the same green art at 1100x790, which is why
it stays sharp drawn large.

## Profiles and scores

Logging in picks a profile. There are no passwords — it is a name, not an
account. Each profile keeps its ten best runs; the game over screen shows
whether the run was a personal best and ranks the profiles against each other.

Everything is stored under an `si:` prefix. Earlier versions wrote the nickname
itself as a top-level key next to `controls` and `activeGamer`, so logging in as
"controls" corrupted the control setting. Old data is migrated on first load.

## Controls

Picked under *Options*, remembered in `localStorage`.

- **Mouse** — the ship follows the pointer, left button fires.
- **Keyboard + Mouse** — arrow keys move the ship, left button fires.

`Esc` pauses and unpauses. Input goes through pointer events, so a finger works
the same as a mouse: drag to aim, and the contact itself fires.

## Small screens

Every size and speed in `src/config.js` is a design unit for a screen about
900x650. Anything smaller scales the whole playfield down together, so the ship
keeps taking roughly the same share of the width — at a fixed 100px it ate a
quarter of a phone screen and left nowhere to dodge. Waves also drop columns
when the grid would not fit, rather than spawning aliens out of reach.

The menus and HUD scale separately through CSS, with `clamp()` on the type and
flexbox in place of the fixed 300px buttons and absolute offsets the first
version laid them out with.
