import test from 'node:test';
import assert from 'node:assert/strict';

import { createGame } from '../src/game.js';
import { input } from '../src/input.js';
import { explosionLook } from '../src/render.js';
import {
	AMMO_BONUSES, START_AMMO, START_HEALTH, SHIP, FORMATION, waveLayout,
	ALIEN_FRAME_TIME, ENEMY_TYPES, BOSS_EVERY, bossHp, bossCount, isBossWave, INVULN_TIME,
	REFERENCE, bombInterval, bombsPerDrop, WAVE_AMMO_REFUND, AMMO_TRICKLE, BOMB_INTERVAL,
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
		onFinish: (score) => { events.finish = { score }; },
		...options,
	});
	return { game, events };
}

// Mirrors what startWave() builds, so the fixtures cannot drift from the real
// shape of an alien.
function alienAt(x, y, type = 'grunt') {
	const spec = ENEMY_TYPES[type];
	return {
		x,
		y,
		w: spec.width || 60,
		h: spec.height || 43,
		type,
		hp: spec.hp,
		maxHp: spec.hp,
		hitFlash: 0,
	};
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
	game.state.aliens = [alienAt(500, 300, 'elite'), alienAt(0, 100)];
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
	assert.ok(events.finish, 'the run ended');
	const snapshot = game.state.aliens.map((a) => a.x);
	game.update(0.5);
	game.update(0.5);
	assert.deepEqual(game.state.aliens.map((a) => a.x), snapshot, 'nothing moved after the end');
});

test('no score ends the run - only running out of lives does', () => {
	const { game, events } = newGame();
	game.state.score = 100000;
	game.update(0.016);
	assert.equal(events.finish, null, 'still playing');
	assert.ok(game.state.wave >= 1);
});

test('the difficulty keeps climbing after the grid stops growing', () => {
	const full = waveLayout(40);
	const later = waveLayout(80);
	assert.equal(full.cols, later.cols, 'the grid is maxed out at both');
	assert.equal(full.rows, later.rows);
	assert.ok(later.armour > full.armour, 'armour keeps going up instead');
	assert.ok(bombsPerDrop(80) > bombsPerDrop(40), 'and so does the volley size');
	assert.ok(bossCount(80) > bossCount(40), 'and the number of bosses');
});

test('armour only starts once the grid is full', () => {
	assert.equal(waveLayout(1).armour, 0);
	assert.equal(waveLayout(5).armour, 0);
	assert.ok(waveLayout(30).armour > 0);
});

test('nothing in the curve ever flattens out completely', () => {
	// Sample far enough ahead that a hidden cap would show up.
	let previous = waveLayout(50).armour;
	for (const wave of [100, 200, 500, 1000]) {
		const armour = waveLayout(wave).armour;
		assert.ok(armour > previous, `armour stalled at wave ${wave}`);
		previous = armour;
	}
	assert.ok(Number.isFinite(bombInterval(1000)), 'fire rate stays a real number');
	assert.ok(bombInterval(1000) > 0, 'and never reaches zero');
});

test('armoured aliens take as many hits as their armour says', () => {
	const { game } = newGame();
	const armour = waveLayout(30).armour;
	game.state.wave = 30;
	game.state.aliens = [];
	game.update(0.016); // clears the wave, spawning wave 31
	const alien = game.state.aliens.find((a) => a.type !== 'boss');
	assert.ok(alien, 'a grid wave');
	assert.ok(alien.hp > 1, 'armoured');
	assert.ok(alien.hp >= armour, `hp ${alien.hp} should reflect armour ${armour}`);
});

test('the ammo a wave pays back scales with what it cost to clear', () => {
	const early = newGame().game;
	const earlyCost = early.state.waveShotCost;
	early.state.aliens = [];
	const earlyAmmo = early.state.ammo;
	early.update(0.016);
	const earlyReward = early.state.ammo - earlyAmmo;

	const late = newGame().game;
	late.state.wave = 29;
	late.state.aliens = [];
	late.update(0.016); // spawn wave 30
	const lateCost = late.state.waveShotCost;
	late.state.aliens = [];
	const lateAmmo = late.state.ammo;
	late.update(0.016);
	const lateReward = late.state.ammo - lateAmmo;

	assert.ok(lateCost > earlyCost, 'a later wave costs more to clear');
	assert.ok(lateReward > earlyReward, 'and pays back more');
	assert.ok(
		lateReward >= lateCost,
		`a clean run must not lose ammo: paid ${lateReward} for a cost of ${lateCost}`,
	);
	assert.ok(lateReward <= lateCost * WAVE_AMMO_REFUND + 1, 'but not wildly more');
});

test('boss fire has a floor of its own, however late the wave', () => {
	// The divisor used to be applied after the floor, so a late boss wave fired
	// roughly ten times faster than anything was meant to.
	const { game } = newGame();
	for (const wave of [BOSS_EVERY, BOSS_EVERY * 10, BOSS_EVERY * 200]) {
		game.state.wave = wave;
		game.state.aliens = [alienAt(400, 300, 'boss')];
		game.state.bombTimer = 0;
		game.update(0.016);
		assert.ok(
			game.state.bombTimer >= BOMB_INTERVAL.bossMin,
			`wave ${wave} fired every ${game.state.bombTimer}s`,
		);
	}
});

test('an empty magazine trickles rather than dead-ending the run', () => {
	const { game } = newGame();
	game.state.ammo = 0;
	assert.ok(game.state.aliens.length, 'there is still something to shoot');

	game.update(AMMO_TRICKLE.interval * 0.9);
	assert.equal(game.state.ammo, 0, 'not yet');
	game.update(AMMO_TRICKLE.interval * 0.2);
	assert.equal(game.state.ammo, AMMO_TRICKLE.amount, 'a round arrives');
});

test('the trickle does not top up a magazine that has ammo in it', () => {
	const { game } = newGame();
	game.state.ammo = 5;
	game.update(AMMO_TRICKLE.interval * 3);
	assert.equal(game.state.ammo, 5, 'untouched');
});

test('a late boss wave sends more than one boss', () => {
	const { game } = newGame();
	const wave = BOSS_EVERY * 4; // the first wave where a second boss appears
	game.state.wave = wave - 1;
	game.state.aliens = [];
	game.update(0.016);
	assert.ok(isBossWave(game.state.wave));
	assert.equal(game.state.aliens.length, bossCount(wave));
	for (const boss of game.state.aliens) {
		assert.equal(boss.type, 'boss');
		assert.ok(boss.x >= 0 && boss.x + boss.w <= 1000, 'on screen at ' + boss.x);
	}
});

test('resizing keeps the ship and the formation on screen', () => {
	const { game } = newGame();
	game.resize(400, 300);
	assert.ok(game.state.ship.x <= 400 - SHIP.width / 2);
	for (const alien of game.state.aliens) {
		assert.ok(alien.x >= 0 && alien.x + alien.w <= 400, 'alien at ' + alien.x);
	}
});

test('every fifth wave is a single boss', () => {
	const { game } = newGame();
	// Walk forward by clearing each wave outright.
	while (game.state.wave < BOSS_EVERY) {
		game.state.aliens = [];
		game.update(0.016);
	}
	assert.ok(isBossWave(game.state.wave));
	assert.equal(game.state.aliens.length, 1, 'one alien, not a grid');
	assert.equal(game.state.aliens[0].type, 'boss');
	assert.equal(game.state.aliens[0].hp, bossHp(BOSS_EVERY));
});

test('a boss soaks up hits instead of dying to the first one', () => {
	const { game } = newGame();
	game.state.aliens = [alienAt(400, 300, 'boss')];
	const boss = game.state.aliens[0];
	const hp = boss.hp;

	const hit = () => {
		game.state.bullets = [{ x: 450, y: 320, w: 4, h: 10 }];
		game.update(0.016);
	};

	hit();
	assert.equal(game.state.aliens.length, 1, 'still alive');
	assert.equal(boss.hp, hp - 1, 'took one point of damage');
	assert.ok(boss.hitFlash > 0, 'flashes on a hit');
	assert.equal(game.state.score, 0, 'scores nothing until it dies');

	for (let i = 0; i < hp - 1; i++) hit();
	// Killing it empties the wave, which immediately spawns the next one, so
	// check that the boss specifically is gone rather than that nothing is left.
	assert.ok(!game.state.aliens.some((a) => a.type === 'boss'), 'dies once out of hp');
	assert.equal(game.state.score, ENEMY_TYPES.boss.score);
});

test('a bullet is consumed by a boss it did not kill', () => {
	const { game } = newGame();
	game.state.aliens = [alienAt(400, 300, 'boss')];
	game.state.bullets = [{ x: 450, y: 320, w: 4, h: 10 }];
	game.update(0.016);
	assert.equal(game.state.bullets.length, 0, 'the bullet is spent, not passing through');
});

test('later bosses are tougher', () => {
	assert.ok(bossHp(BOSS_EVERY * 2) > bossHp(BOSS_EVERY));
});

test('a boss moves faster than a full formation', () => {
	const grid = newGame().game;
	const gridStep = (() => {
		const before = grid.state.aliens[0].x;
		grid.update(0.1);
		return Math.abs(grid.state.aliens[0].x - before);
	})();

	const boss = newGame().game;
	boss.state.aliens = [alienAt(400, 300, 'boss')];
	boss.state.formation.size = 1;
	const before = boss.state.aliens[0].x;
	boss.update(0.1);
	const bossStep = Math.abs(boss.state.aliens[0].x - before);

	assert.ok(bossStep > gridStep, `boss ${bossStep} should exceed grid ${gridStep}`);
});

test('a small screen scales the playfield down, not just the layout', () => {
	const big = newGame({ width: 1400, height: 900 }).game;
	const small = newGame({ width: 375, height: 812 }).game;

	assert.equal(big.state.scale, 1, 'a roomy screen plays at design size');
	assert.ok(small.state.scale < 1, 'a phone scales down');
	assert.ok(
		small.state.aliens[0].w < big.state.aliens[0].w,
		'aliens shrink with the field',
	);

	// What actually matters is the share of the screen the ship takes up.
	const share = (game) => (SHIP.width * game.state.scale) / game.state.width;
	assert.ok(
		share(small) < share(big) * 2,
		`phone ${(share(small) * 100).toFixed(0)}% vs desktop ${(share(big) * 100).toFixed(0)}%`,
	);
});

test('the scale never collapses below its floor', () => {
	const tiny = newGame({ width: 200, height: 300 }).game;
	assert.equal(tiny.state.scale, REFERENCE.minScale);
});

test('resizing rescales what is already on screen', () => {
	const { game } = newGame({ width: 1400, height: 900 });
	const before = game.state.aliens[0].w;
	game.resize(375, 812);

	assert.ok(game.state.scale < 1, 'scale followed the window');
	assert.ok(game.state.aliens[0].w < before, 'existing aliens shrank too');
	for (const alien of game.state.aliens) {
		assert.ok(alien.x >= 0 && alien.x + alien.w <= 375, 'and stayed on screen');
	}
	assert.ok(game.state.ship.x >= 0 && game.state.ship.x <= 375, 'ship too');
});

test('a narrow screen drops columns so nothing spawns out of reach', () => {
	// Wave 9 wants 7 columns; 375px cannot hold them at 60px each.
	const { game } = newGame({ width: 375, height: 700 });
	while (game.state.wave < 9) {
		game.state.aliens = [];
		game.update(0.016);
	}
	assert.ok(waveLayout(9).cols > 5, 'the layout really does ask for more');
	for (const alien of game.state.aliens) {
		assert.ok(alien.x >= 0, 'alien off the left edge at ' + alien.x);
		assert.ok(alien.x + alien.w <= 375, 'alien off the right edge at ' + alien.x);
	}
});

test('only the front line of the formation drops bombs', () => {
	const { game } = newGame();
	// One column, three deep: just the lowest one may fire.
	game.state.aliens = [alienAt(300, 100), alienAt(300, 200), alienAt(300, 300)];
	game.state.bombTimer = 0;
	game.update(0.016);
	assert.equal(game.state.bombs.length, 1);
	const bomb = game.state.bombs[0];
	assert.ok(bomb.y >= 300, `fired from the bottom alien, not y=${bomb.y}`);
});

test('a bomb that reaches the ship costs a life', () => {
	const { game } = newGame();
	const ship = game.state.ship.x;
	game.state.bombs = [{ x: ship - 3, y: 800 - 30, w: 6, h: 14 }];
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH - 1);
	assert.equal(game.state.bombs.length, 0, 'the bomb is spent');
});

test('a near miss over the barrel is not a hit', () => {
	const { game } = newGame();
	// Beside the hull, where only empty space is drawn.
	game.state.bombs = [{ x: game.state.ship.x + 200, y: 800 - 30, w: 6, h: 14 }];
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH, 'no damage');
});

test('being hit grants a grace period instead of losing every life at once', () => {
	const { game } = newGame();
	const ship = game.state.ship.x;
	const bombAtShip = () => ({ x: ship - 3, y: 800 - 30, w: 6, h: 14 });

	game.state.bombs = [bombAtShip(), bombAtShip(), bombAtShip()];
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH - 1, 'a cluster costs one life');
	assert.ok(game.state.invuln > 0, 'grace period started');

	game.state.bombs = [bombAtShip()];
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH - 1, 'still invulnerable');

	game.update(INVULN_TIME);
	assert.equal(game.state.invuln, 0, 'grace period expires');
	game.state.bombs = [bombAtShip()];
	game.update(0.016);
	assert.equal(game.state.health, START_HEALTH - 2, 'vulnerable again');
});

test('bombs that fall past the bottom are cleaned up', () => {
	const { game } = newGame();
	game.state.bombs = [{ x: 10, y: 790, w: 6, h: 14 }];
	game.update(0.5);
	assert.equal(game.state.bombs.length, 0);
});

test('a boss fires far more often than a formation', () => {
	const grid = newGame().game;
	grid.state.bombTimer = 0;
	grid.update(0.016);
	const gridInterval = grid.state.bombTimer;

	const boss = newGame().game;
	while (!isBossWave(boss.state.wave)) {
		boss.state.aliens = [];
		boss.update(0.016);
	}
	boss.state.bombTimer = 0;
	boss.update(0.016);
	assert.ok(
		boss.state.bombTimer < gridInterval,
		`boss ${boss.state.bombTimer} should be shorter than grid ${gridInterval}`,
	);
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
