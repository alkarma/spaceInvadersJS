import {
	SHIP, ROCKET, ALIEN, EXPLOSION,
	ROCKET_SPEED, ALIEN_FALL_SPEED, ALIEN_DRIFT_RATIOS, SHIP_KEY_SPEED, SHOOT_COOLDOWN,
	START_AMMO, START_HEALTH, SCORE_TO_WIN, AMMO_BONUSES,
} from './config.js';
import { input } from './input.js';
import { playSound } from './audio.js';

function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function overlaps(a, b) {
	// Proper AABB test. The original required the rocket to be *entirely*
	// inside the alien's horizontal span, so edge hits silently missed.
	return (
		a.x < b.x + b.w &&
		a.x + a.w > b.x &&
		a.y < b.y + b.h &&
		a.y + a.h > b.y
	);
}

export function createGame({ width, height, controlType, onStats, onFinish }) {
	const state = {
		width,
		height,
		controlType,
		ship: { x: width / 2 },
		bullets: [],
		aliens: [],
		explosions: [],
		score: 0,
		ammo: START_AMMO,
		health: START_HEALTH,
		shootTimer: 0,
		finished: null, // 'win' | 'fail'
	};

	function spawnAlien() {
		const x = randInt(1, Math.max(1, state.width - ALIEN.width - 1));
		state.aliens.push({
			x,
			y: 0,
			w: ALIEN.width,
			h: ALIEN.height,
			// The original picked direction from the parity of the spawn x.
			dir: x % 2 ? 1 : -1,
			driftRatio: ALIEN_DRIFT_RATIOS[randInt(0, ALIEN_DRIFT_RATIOS.length - 1)],
		});
	}

	function addExplosion(x, y) {
		state.explosions.push({ x, y, t: 0 });
	}

	function emitStats(ammoBonus = 0) {
		onStats({ score: state.score, ammo: state.ammo, health: state.health, ammoBonus });
	}

	function resize(w, h) {
		// The original read the screen size once at load, so resizing the window
		// left the movement bounds and spawn range wrong for the rest of the session.
		state.width = w;
		state.height = h;
		state.ship.x = Math.min(state.ship.x, w - SHIP.width / 2);
		for (const alien of state.aliens) {
			alien.x = Math.min(alien.x, Math.max(0, w - alien.w));
		}
	}

	function updateShip(dt) {
		if (state.controlType === 'mouse') {
			state.ship.x = input.pointerX;
		} else {
			if (input.left) state.ship.x -= SHIP_KEY_SPEED * dt;
			if (input.right) state.ship.x += SHIP_KEY_SPEED * dt;
		}
		const half = SHIP.width / 2;
		// Clamped after moving, not before: the original checked the bound first
		// and so let the ship slide one whole step past the edge.
		state.ship.x = Math.max(half, Math.min(state.width - half, state.ship.x));
	}

	function updateShooting(dt) {
		state.shootTimer -= dt;
		if (!input.firing || state.ammo <= 0 || state.shootTimer > 0) return;
		state.shootTimer = SHOOT_COOLDOWN;
		state.ammo--;
		state.bullets.push({
			x: state.ship.x - ROCKET.width / 2,
			y: state.height - SHIP.height - ROCKET.height,
			w: ROCKET.width,
			h: ROCKET.height,
		});
		playSound('shoot');
		emitStats();
	}

	function updateBullets(dt) {
		for (const bullet of state.bullets) {
			bullet.y -= ROCKET_SPEED * dt;
		}
		state.bullets = state.bullets.filter((b) => b.y + b.h > 0);
	}

	function updateAliens(dt) {
		const escaped = [];
		for (const alien of state.aliens) {
			alien.y += ALIEN_FALL_SPEED * dt;
			alien.x += alien.dir * ALIEN_FALL_SPEED * alien.driftRatio * dt;
			if (alien.x >= state.width - alien.w) {
				alien.x = state.width - alien.w;
				alien.dir = -1;
			} else if (alien.x <= 0) {
				alien.x = 0;
				alien.dir = 1;
			}
			if (alien.y > state.height) escaped.push(alien);
		}
		if (escaped.length) {
			state.aliens = state.aliens.filter((a) => !escaped.includes(a));
			state.health -= escaped.length;
			emitStats();
			if (state.health > 0) escaped.forEach(spawnAlien);
		}
	}

	function grantAmmoBonus() {
		const bonus = AMMO_BONUSES[state.score];
		if (!bonus) return 0;
		state.ammo += bonus;
		playSound('bonus');
		return bonus;
	}

	function updateCollisions() {
		const deadBullets = new Set();
		const deadAliens = new Set();
		for (const bullet of state.bullets) {
			for (const alien of state.aliens) {
				if (deadAliens.has(alien) || !overlaps(bullet, alien)) continue;
				deadBullets.add(bullet);
				deadAliens.add(alien);
				addExplosion(alien.x, alien.y);
				playSound('explosion');
				state.score++;
				break;
			}
		}
		if (!deadAliens.size) return;
		state.bullets = state.bullets.filter((b) => !deadBullets.has(b));
		state.aliens = state.aliens.filter((a) => !deadAliens.has(a));
		const bonus = grantAmmoBonus();
		emitStats(bonus);
		// One alien at a time, exactly as before: each kill spawns one replacement.
		deadAliens.forEach(spawnAlien);
	}

	function updateExplosions(dt) {
		for (const explosion of state.explosions) {
			explosion.t += dt;
		}
		state.explosions = state.explosions.filter((e) => e.t < EXPLOSION.duration);
	}

	function checkFinish() {
		if (state.finished) return;
		if (state.score >= SCORE_TO_WIN) state.finished = 'win';
		else if (state.health <= 0) state.finished = 'fail';
		if (state.finished) onFinish(state.finished, state.score);
	}

	function update(dt) {
		if (state.finished) {
			// Keep explosions animating out, but stop the simulation. The original
			// never cleared its intervals, so aliens kept falling and draining
			// health after the game over screen had already appeared.
			updateExplosions(dt);
			return;
		}
		updateShip(dt);
		updateShooting(dt);
		updateBullets(dt);
		updateAliens(dt);
		updateCollisions();
		updateExplosions(dt);
		checkFinish();
	}

	spawnAlien();
	emitStats();

	return { state, update, resize };
}
