import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../src/game.js';
import { input } from '../src/input.js';
import { explosionLook } from '../src/render.js';
import {
	SCORE_TO_WIN, AMMO_BONUSES, START_AMMO, START_HEALTH, SHIP, FORMATION, waveLayout,
	ALIEN_FRAME_TIME,
} from '../src/config.js';

// src/game.js deliberately has no DOM dependency, so the rules can be checked here.
function newGame(options = {}) {
	const events = { waves: [], finish: null };
	const game = createGame({
		width: 1000,
		height: 800,
		controlType: 'mouse',
		onStats: () => {},
		onWave: (wave) => events.waves.push(wave),
		onFinish: (status, score) => { events.finish = { status, score }; },
		...options,
	});
	return { game, events };
}

function alienAt(x, y) {
	return { x, y, w: 60, h: 43, type: 'grunt' };
}

test.afterEach(() => {
	input.firing = false;
	input.left = false;
	input.right = false;
	input.pointerX = 500;
});

test('a hit on the very edge of an alien counts', () => {
	const { game } = newGame();
	game.state.aliens = [alienAt(500, 300)];
	game.state.bullets = [{ x: 558, y: 320, w: 4, h: 10 }]; // 2px of overlap
	game.update(0.016);
	assert.equal(game.state.score, 1);
});

test('a clear miss does not count', () => {
	const { game } = newGame();
	game.state.aliens = [alienAt(500, 300)];
	game.state.bullets = [{ x: 400, y: 320, w: 4, h: 10 }];
	game.update(0.016);
	assert.equal(game.state.score, 0);
});

test('one bullet kills one alien, not every overlapping one', () => {
	const { game } = newGame();
	game.state.aliens = [alienAt(500, 300), alienAt(520, 300)];
	game.state.bullets = [{ x: 530, y: 320, w: 4, h: 10 }];
	game.update(0.016);
	assert.equal(game.state.aliens.length, 1);
});

test('the ship stays on screen', () => {
	const { game } = newGame();
	input.pointerX = 99999;
	game.update(0.016);
	assert.ok(game.state.ship.x <= 1000 - SHIP.width / 2);
	input.pointerX = -99999;
	game.update(0.016);
	assert.ok(game.state.ship.x >= SHIP.width / 2);
});

test('firing costs ammo and honours the cooldown', () => {
	const { game } = newGame();
	input.firing = true;
	game.update(0.016);
	assert.equal(game.state.ammo, START_AMMO - 1);
	game.update(0.016);
	assert.equal(game.state.ammo, START_AMMO - 1, 'cooldown blocks the second shot');
	game.update(0.2);
	assert.equal(game.state.ammo, START_AMMO - 2);
});

test('wave 1 spawns the configured formation', () => {
	const { game, events } = newGame();
	const { cols, rows } = waveLayout(1);
	assert.equal(game.state.wave, 1);
	assert.equal(game.state.aliens.length, cols * rows);
	assert.deepEqual(events.waves, [1]);
});

test('the formation reverses and steps down when it reaches an edge', () => {
	const { game } = newGame();
	const startY = Math.min(...game.state.aliens.map((a) => a.y));
	// Shove the formation hard against the right wall.
	const maxX = Math.max(...game.state.aliens.map((a) => a.x + a.w));
	const shift = 1000 - maxX;
	for (const alien of game.state.aliens) alien.x += shift;

	assert.equal(game.state.formation.dir, 1);
	game.update(0.1);
	assert.equal(game.state.formation.dir, -1, 'direction flipped');
	const newY = Math.min(...game.state.aliens.map((a) => a.y));
	assert.equal(newY, startY + FORMATION.stepDown, 'formation stepped down');
});

test('the formation speeds up as it is thinned out', () => {
	const { game } = newGame();
	const measure = () => {
		const before = game.state.aliens[0].x;
		game.update(0.1);
		return Math.abs(game.state.aliens[0].x - before);
	};
	const full = measure();
	// Kill everything except the alien being measured.
	game.state.aliens = [game.state.aliens[0]];
	const thinned = measure();
	assert.ok(thinned > full, `thinned ${thinned} should exceed full ${full}`);
});

test('a breach costs one life and lifts the survivors, not one life per alien', () => {
	const { game } = newGame();
	assert.ok(game.state.aliens.length > 1, 'needs several aliens to be meaningful');
	for (const alien of game.state.aliens) alien.y = 800 - SHIP.height - 10;
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH - 1, 'exactly one life lost');
	assert.equal(
		Math.min(...game.state.aliens.map((a) => a.y)),
		FORMATION.marginTop,
		'survivors lifted back to the top',
	);
});

test('clearing a wave starts the next, bigger one', () => {
	const { game, events } = newGame();
	const firstSize = game.state.aliens.length;
	game.state.aliens = [];
	game.update(0.016);
	assert.equal(game.state.wave, 2);
	assert.ok(game.state.aliens.length > firstSize, 'wave 2 is larger');
	assert.deepEqual(events.waves, [1, 2]);
});

test('ammo bonuses are awarded by crossing a threshold, not by an exact score', () => {
	const { game } = newGame();
	// The elite enemy is worth 3, so the score skips over the round numbers.
	game.state.score = 8;
	game.state.ammo = 50;
	// A bystander out of the line of fire, so killing the target does not also
	// clear the wave and pay the separate wave-clear bonus.
	game.state.aliens = [{ x: 500, y: 300, w: 60, h: 43, type: 'elite' }, alienAt(0, 100)];
	game.state.bullets = [{ x: 520, y: 320, w: 4, h: 10 }];
	game.update(0.016);
	assert.equal(game.state.score, 11, 'jumped straight over 10');
	assert.equal(game.state.ammo, 50 + AMMO_BONUSES[10], 'the bonus for 10 was still paid');
});

test('each ammo bonus is paid only once', () => {
	const { game } = newGame();
	game.state.score = 10;
	game.state.ammo = 0;
	for (let i = 0; i < 3; i++) {
		game.state.aliens = [alienAt(500, 300), alienAt(0, 100)];
		game.state.bullets = [{ x: 520, y: 320, w: 4, h: 10 }];
		game.update(0.016);
	}
	assert.equal(game.state.ammo, AMMO_BONUSES[10], 'not paid again on later kills');
});

test('running out of health ends the game and freezes the simulation', () => {
	const { game, events } = newGame();
	game.state.health = 1;
	for (const alien of game.state.aliens) alien.y = 800 - SHIP.height - 10;
	game.update(0.016);
	assert.equal(events.finish.status, 'fail');
	const snapshot = game.state.aliens.map((a) => a.x);
	game.update(0.5);
	game.update(0.5);
	assert.deepEqual(game.state.aliens.map((a) => a.x), snapshot, 'nothing moved after the end');
});

test('reaching the target score wins', () => {
	const { game, events } = newGame();
	game.state.score = SCORE_TO_WIN - 1;
	game.state.aliens = [alienAt(500, 300)];
	game.state.bullets = [{ x: 520, y: 320, w: 4, h: 10 }];
	game.update(0.016);
	assert.equal(events.finish.status, 'win');
	assert.equal(events.finish.score, SCORE_TO_WIN);
});

test('resizing keeps the ship and the formation on screen', () => {
	const { game } = newGame();
	game.resize(400, 300);
	assert.ok(game.state.ship.x <= 400 - SHIP.width / 2);
	for (const alien of game.state.aliens) {
		assert.ok(alien.x >= 0 && alien.x + alien.w <= 400, 'alien at ' + alien.x);
	}
});

test('the formation animates in lockstep on a timer', () => {
	const { game } = newGame();
	assert.equal(game.state.frame, 0);
	game.update(ALIEN_FRAME_TIME * 0.9);
	assert.equal(game.state.frame, 0, 'not yet');
	game.update(ALIEN_FRAME_TIME * 0.2);
	assert.equal(game.state.frame, 1, 'flipped once the frame time elapsed');
});

test('the explosion matches the keyframes it was ported from', () => {
	// 0% 20px rgb(255,81,1) blur 0 / 50% 40px rgba(255,251,0,.5) blur 50
	// 100% 60px rgba(255,251,0,0) blur 110
	assert.deepEqual(
		[0, 0.5, 1].map((t) => explosionLook(t).size),
		[20, 40, 60],
	);
	assert.deepEqual(
		[0, 0.5, 1].map((t) => explosionLook(t).glow),
		[0, 50, 110],
	);
	assert.equal(explosionLook(0).fill, 'rgba(255, 81, 1, 1)');
	assert.equal(explosionLook(1).fill, 'rgba(255, 251, 0, 0)');
});
