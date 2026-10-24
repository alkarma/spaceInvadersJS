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

// Every n-th wave is a boss wave instead of a grid.
export const BOSS_EVERY = 5;

export function isBossWave(wave) {
	return wave % BOSS_EVERY === 0;
}

// Each boss is tougher than the last, without limit.
export function bossHp(wave) {
	return ENEMY_TYPES.boss.hp + 6 * (Math.floor(wave / BOSS_EVERY) - 1);
}

// Late boss waves send more than one.
export function bossCount(wave) {
	return 1 + Math.floor(wave / (BOSS_EVERY * 4));
}

// The grid cannot grow forever - the screen runs out. These are the sizes at
// which it stops growing, and the wave where that happens.
const MAX_COLS = 8;
const MAX_ROWS = 5;
const GRID_MAXED_AT = 3 * (MAX_ROWS - 1); // the wave where the grid stops growing
// Once the grid is full, difficulty keeps climbing through armour instead.
const ARMOUR_EVERY = 6;

// How a wave is built. There is no last wave: when the grid stops growing the
// aliens start taking more than one hit, and that has no ceiling.
export function waveLayout(wave) {
	const cols = Math.min(MAX_COLS, 3 + Math.floor(wave / 2));
	const rows = Math.min(MAX_ROWS, 1 + Math.floor(wave / 3));
	return {
		cols,
		rows,
		// Rows of the higher-scoring enemy, counted from the back. Eventually the
		// whole grid is made of them.
		eliteRows: Math.min(rows, Math.max(0, Math.floor((wave - 2) / 3))),
		// Extra hit points on every alien in the wave.
		armour: Math.max(0, Math.floor((wave - GRID_MAXED_AT) / ARMOUR_EVERY) + 1),
	};
}

// --- Rules ----------------------------------------------------------------
export const START_AMMO = 100;
// The original gave a single life, which was survivable when exactly one alien
// existed at a time. A whole formation needs more room for error.
export const START_HEALTH = 3;
// The game has no end: it runs until the last life is gone. This is only the
// score at which the game over screen congratulates you instead of mocking you.
export const SCORE_MILESTONE = 100;

// Clearing a wave pays back more ammo than a perfect run at it would have cost,
// so accurate play accumulates a buffer and spraying drains it. A fixed bonus
// cannot work in an endless game: later waves need far more shots than early
// ones, and a flat payout starves you no matter how well you shoot.
// 1.8 puts the break-even point near 55% accuracy. Tighter than that and a run
// ends through ammo starvation rather than through being overwhelmed, which is
// a slow, dull way to lose.
export const WAVE_AMMO_REFUND = 1.8;
export const WAVE_CLEAR_AMMO_MIN = 12;

// Hitting zero with aliens still on screen used to mean waiting helplessly for
// three breaches. A trickle keeps the run alive as a handicap instead of a
// dead end, so the aliens are what finish you.
export const AMMO_TRICKLE = { interval: 1.5, amount: 1 };

// --- Return fire ----------------------------------------------------------
export const BOMB_SPEED = 230;
// Seconds between drops. The formation fires faster every wave. The floor keeps
// creeping down too, so the pressure never stops rising.
export const BOMB_INTERVAL = {
	base: 2.2,
	perWave: 0.14,
	floorFrom: 0.55,
	floorPerWave: 0.015,
	floorMin: 0.28,
	// A boss fires faster, but never faster than this - the divisor used to be
	// applied after the floor, which at wave 25 produced a wall of ~36 bombs a
	// second that could not be dodged, only walked into.
	bossMin: 0.22,
};

export function bombInterval(wave) {
	const floor = Math.max(
		BOMB_INTERVAL.floorMin,
		BOMB_INTERVAL.floorFrom - BOMB_INTERVAL.floorPerWave * Math.max(0, wave - 12),
	);
	return Math.max(floor, BOMB_INTERVAL.base - BOMB_INTERVAL.perWave * (wave - 1));
}

// Late waves drop a volley rather than a single bomb.
export function bombsPerDrop(wave) {
	return 1 + Math.floor(wave / 16);
}
// A boss is a single target, so it has to fire much more often to be a threat.
export const BOSS_FIRE_RATE = 3.5;
// Grace period after being hit, during which the ship blinks and cannot be hit
// again - otherwise a cluster of bombs would take every life at once.
export const INVULN_TIME = 1.6;
export const WAVE_BANNER_TIME = 1.6; // seconds the "WAVE N" banner stays up

// Ammo bonuses, previously a chain of `if (gameScore == N)` branches.
export const AMMO_BONUSES = { 10: 30, 20: 25, 30: 20, 40: 20, 50: 10, 60: 45 };

export const BACKGROUND = 'pics/space3.jpg';
