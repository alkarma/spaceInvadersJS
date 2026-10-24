// Every tunable number lives here. The original version had these scattered
// across script.js as magic values inside setInterval callbacks.
export const VERSION = '0.3.0.1';

// --- Scale ----------------------------------------------------------------
// Every size and speed below is given in design units, for a screen about this
// big. Smaller screens scale the whole playfield down, so the ship takes the
// same share of the width and there is the same room to dodge in: at 100px wide
// the ship swallowed a quarter of a phone screen.
export const REFERENCE = { width: 900, height: 650, minScale: 0.5 };

export function computeScale(width, height) {
	const fit = Math.min(width / REFERENCE.width, height / REFERENCE.height);
	return Math.max(REFERENCE.minScale, Math.min(1, fit));
}

// --- Geometry -------------------------------------------------------------
// Taken from the original style.css so the game looks identical: the ship was
// three CSS rectangles (#spaceship plus its ::before / ::after pseudo-elements).
export const SHIP = {
	width: 100,
	height: 50,
	color: '#4B4E31',
	// Deliberately smaller than the drawn ship: it covers the hull and the
	// turret base but not the thin barrel, so near misses over the tip do not
	// count as hits.
	hitbox: { dx: -50, dy: -35, w: 100, h: 35 },
	// offsets relative to the ship's centre x and the bottom of the screen
	parts: [
		{ dx: -50, dy: -20, w: 100, h: 20 }, // hull
		{ dx: -30, dy: -35, w: 60, h: 15 },  // turret base
		{ dx: -5, dy: -50, w: 10, h: 15 },   // barrel
	],
};

export const ROCKET = { width: 4, height: 10, color: '#ffff00', glow: 'rgba(255, 0, 51, 0.51)' };

// What the aliens drop back. Red and falling, so it never reads as your own
// shot travelling up the screen.
export const BOMB = { width: 6, height: 14, color: '#ff4040', glow: 'rgba(255, 64, 64, 0.7)' };

export const ALIEN = { width: 60, height: 43 };

// Three enemies, all from sprites already in pics/. The green one has a
// two-frame walk cycle (move1/move2); the purple one only ever got a single
// frame (static1). As in the arcade original, what sits further from the player
// is worth more. The boss reuses spin1/spin2, which are the same green art at
// 1100x790 and so stay sharp when drawn big.
//
// `hp` above 1 is what makes something a boss: everything else about the
// formation - marching, stepping down, breaching - works unchanged.
export const ENEMY_TYPES = {
	grunt: { frames: ['pics/move1.png', 'pics/move2.png'], score: 1, hp: 1, speedFactor: 1 },
	elite: { frames: ['pics/static1.png'], score: 3, hp: 1, speedFactor: 1 },
	boss: {
		frames: ['pics/spin1.png', 'pics/spin2.png'],
		score: 15,
		hp: 12,
		speedFactor: 2.4,
		width: 240,
		height: 172, // keeps the source sprite's 1100x790 proportions
	},
};

// The whole formation flips frames in lockstep, like the arcade original.
export const ALIEN_FRAME_TIME = 0.45;

export const CROSS = { size: 50, color: 'red' };

export const EXPLOSION = { duration: 1.0, from: 20, to: 60 };

// --- Speeds ---------------------------------------------------------------
// The original used setInterval(fn, 1) and moved things by a fixed number of
// pixels per tick, so the real speed depended on the browser's timer clamping
// and on how fast the machine could reflow the DOM. There is no exact number to
// port, so these are px/second values tuned to feel like the original.
export const ROCKET_SPEED = 420;
export const SHIP_KEY_SPEED = 600; // the original jumped 30px per keydown event
export const SHOOT_COOLDOWN = 0.12; // seconds; the original had none at all

// --- Waves ----------------------------------------------------------------
// A wave is a grid that marches sideways and steps down every time it touches
// an edge, as in the arcade original, instead of the single randomly drifting
// alien the old version spawned one at a time.
export const FORMATION = {
	gapX: 24,
	gapY: 18,
	// Clears the HUD: the nickname sits at the top and the hearts at 50px.
	marginTop: 110,
	stepDown: 24,
	// Horizontal speed at the start of a wave, in px/second.
	baseSpeed: 34,
	speedPerWave: 7,
	// The formation accelerates as it is thinned out: at the last alien it moves
	// this many times faster than at full strength.
	clearSpeedUp: 3.2,
};

// Every n-th wave is a single boss instead of a grid.
export const BOSS_EVERY = 5;

export function isBossWave(wave) {
	return wave % BOSS_EVERY === 0;
}

// Each boss is tougher than the last.
export function bossHp(wave) {
	return ENEMY_TYPES.boss.hp + 6 * (Math.floor(wave / BOSS_EVERY) - 1);
}

// How a wave is built. Capped so the grid keeps fitting on screen.
export function waveLayout(wave) {
	return {
		cols: Math.min(8, 3 + Math.floor(wave / 2)),
		rows: Math.min(4, 1 + Math.floor(wave / 3)),
		// Number of top rows made up of the higher-scoring enemy.
		eliteRows: wave < 3 ? 0 : Math.min(2, Math.floor(wave / 3)),
	};
}

// --- Rules ----------------------------------------------------------------
export const START_AMMO = 100;
// The original gave a single life, which was survivable when exactly one alien
// existed at a time. A whole formation needs more room for error.
export const START_HEALTH = 3;
export const SCORE_TO_WIN = 100;
export const WAVE_CLEAR_AMMO = 15;

// --- Return fire ----------------------------------------------------------
export const BOMB_SPEED = 230;
// Seconds between drops. The formation fires faster every wave, down to a floor.
export const BOMB_INTERVAL = {
	base: 2.2,
	perWave: 0.14,
	min: 0.55,
};
// A boss is a single target, so it has to fire much more often to be a threat.
export const BOSS_FIRE_RATE = 3.5;
// Grace period after being hit, during which the ship blinks and cannot be hit
// again - otherwise a cluster of bombs would take every life at once.
export const INVULN_TIME = 1.6;
export const WAVE_BANNER_TIME = 1.6; // seconds the "WAVE N" banner stays up

// Ammo bonuses, previously a chain of `if (gameScore == N)` branches.
export const AMMO_BONUSES = { 10: 30, 20: 25, 30: 20, 40: 20, 50: 10, 60: 45 };

export const BACKGROUND = 'pics/space3.jpg';
