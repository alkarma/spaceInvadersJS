// Every tunable number lives here. The original version had these scattered
// across script.js as magic values inside setInterval callbacks.
export const VERSION = '0.3.0.1';

// --- Geometry -------------------------------------------------------------
// Taken from the original style.css so the game looks identical: the ship was
// three CSS rectangles (#spaceship plus its ::before / ::after pseudo-elements).
export const SHIP = {
	width: 100,
	height: 50,
	color: '#4B4E31',
	// offsets relative to the ship's centre x and the bottom of the screen
	parts: [
		{ dx: -50, dy: -20, w: 100, h: 20 }, // hull
		{ dx: -30, dy: -35, w: 60, h: 15 },  // turret base
		{ dx: -5, dy: -50, w: 10, h: 15 },   // barrel
	],
};

export const ROCKET = { width: 4, height: 10, color: '#ffff00', glow: 'rgba(255, 0, 51, 0.51)' };

export const ALIEN = { width: 60, height: 43, sprite: 'pics/move1.png' };

export const CROSS = { size: 50, color: 'red' };

export const EXPLOSION = { duration: 1.0, from: 20, to: 60 };

// --- Speeds ---------------------------------------------------------------
// The original used setInterval(fn, 1) and moved things by a fixed number of
// pixels per tick, so the real speed depended on the browser's timer clamping
// and on how fast the machine could reflow the DOM. There is no exact number to
// port, so these are px/second values tuned to feel like the original.
export const ROCKET_SPEED = 420;
export const ALIEN_FALL_SPEED = 42;
// The original drifted sideways by randIndex/2 px per tick while falling 1 px,
// so horizontal speed was 0.5x-2x the fall speed. That ratio is preserved.
export const ALIEN_DRIFT_RATIOS = [0.5, 1, 1.5, 2];
export const SHIP_KEY_SPEED = 600; // the original jumped 30px per keydown event
export const SHOOT_COOLDOWN = 0.12; // seconds; the original had none at all

// --- Rules ----------------------------------------------------------------
export const START_AMMO = 100;
export const START_HEALTH = 1;
export const SCORE_TO_WIN = 100;

// Ammo bonuses, previously a chain of `if (gameScore == N)` branches.
export const AMMO_BONUSES = { 10: 30, 20: 25, 30: 20, 40: 20, 50: 10, 60: 45 };

export const BACKGROUND = 'pics/space3.jpg';
