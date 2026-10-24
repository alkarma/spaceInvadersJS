import {
	SHIP, ROCKET, ALIEN, ENEMY_TYPES, ALIEN_FRAME_TIME, EXPLOSION, FORMATION, waveLayout,
	ROCKET_SPEED, SHIP_KEY_SPEED, SHOOT_COOLDOWN,
	START_AMMO, START_HEALTH, SCORE_TO_WIN, AMMO_BONUSES, WAVE_CLEAR_AMMO,
} from './config.js';
import { input } from './input.js';
import { playSound } from './audio.js';

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

export function createGame({ width, height, controlType, onStats, onWave, onFinish }) {
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
		wave: 0,
		shootTimer: 0,
		animTimer: 0,
		frame: 0,
		formation: { dir: 1, size: 0 },
		finished: null, // 'win' | 'fail'
	};

	// Ammo bonuses are awarded by threshold crossing, not by an exact score
	// match: the higher-scoring enemy makes the score jump, so `score == 10`
	// would often never be true.
	const pendingBonuses = Object.keys(AMMO_BONUSES)
		.map(Number)
		.sort((a, b) => a - b);

	function startWave() {
		state.wave++;
		const { cols, rows, eliteRows } = waveLayout(state.wave);
		// Shrink the gaps rather than the grid if the screen is too narrow.
		const gapX = Math.min(
			FORMATION.gapX,
			Math.max(4, (state.width - 40 - cols * ALIEN.width) / Math.max(1, cols - 1)),
		);
		const totalWidth = cols * ALIEN.width + (cols - 1) * gapX;
		const originX = Math.max(0, (state.width - totalWidth) / 2);
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				state.aliens.push({
					x: originX + col * (ALIEN.width + gapX),
					y: FORMATION.marginTop + row * (ALIEN.height + FORMATION.gapY),
					w: ALIEN.width,
					h: ALIEN.height,
					type: row < eliteRows ? 'elite' : 'grunt',
				});
			}
		}
		state.formation.dir = 1;
		state.formation.size = state.aliens.length;
		onWave(state.wave);
	}

	function addExplosion(x, y) {
		state.explosions.push({ x, y, t: 0 });
	}

	function emitStats(ammoBonus = 0) {
		onStats({
			score: state.score,
			ammo: state.ammo,
			health: state.health,
			wave: state.wave,
			ammoBonus,
		});
	}

	function resize(w, h) {
		// The original read the screen size once at load, so resizing the window
		// left the movement bounds and spawn range wrong for the rest of the session.
		const scale = state.width ? w / state.width : 1;
		state.width = w;
		state.height = h;
		state.ship.x = Math.min(state.ship.x, w - SHIP.width / 2);
		for (const alien of state.aliens) {
			alien.x = Math.max(0, Math.min(alien.x * scale, w - alien.w));
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

	function formationSpeed() {
		const base = FORMATION.baseSpeed + FORMATION.speedPerWave * (state.wave - 1);
		const alive = state.aliens.length;
		const total = state.formation.size || 1;
		// Thinning the formation speeds up what is left, as in the arcade original.
		const thinned = 1 - alive / total;
		return base * (1 + thinned * (FORMATION.clearSpeedUp - 1));
	}

	function updateAliens(dt) {
		if (!state.aliens.length) return;

		state.animTimer += dt;
		if (state.animTimer >= ALIEN_FRAME_TIME) {
			state.animTimer -= ALIEN_FRAME_TIME;
			state.frame++;
		}

		const dx = state.formation.dir * formationSpeed() * dt;
		let minX = Infinity;
		let maxX = -Infinity;
		for (const alien of state.aliens) {
			minX = Math.min(minX, alien.x);
			maxX = Math.max(maxX, alien.x + alien.w);
		}

		if (maxX + dx > state.width || minX + dx < 0) {
			// Touching an edge reverses the march and drops the formation a step
			// closer to the player, instead of moving sideways this frame.
			state.formation.dir *= -1;
			for (const alien of state.aliens) {
				alien.y += FORMATION.stepDown;
			}
		} else {
			for (const alien of state.aliens) {
				alien.x += dx;
			}
		}

		// Reaching the ship's line costs one life and pushes the survivors back
		// to the top, rather than costing a life per alien in the bottom row.
		const landingLine = state.height - SHIP.height;
		if (state.aliens.some((a) => a.y + a.h >= landingLine)) {
			state.health--;
			const lift = Math.min(...state.aliens.map((a) => a.y)) - FORMATION.marginTop;
			for (const alien of state.aliens) {
				alien.y -= lift;
			}
			emitStats();
		}
	}

	function grantAmmoBonus() {
		let granted = 0;
		while (pendingBonuses.length && state.score >= pendingBonuses[0]) {
			granted += AMMO_BONUSES[pendingBonuses.shift()];
		}
		if (granted) {
			state.ammo += granted;
			playSound('bonus');
		}
		return granted;
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
				state.score += ENEMY_TYPES[alien.type].score;
				break;
			}
		}
		if (!deadAliens.size) return;
		state.bullets = state.bullets.filter((b) => !deadBullets.has(b));
		state.aliens = state.aliens.filter((a) => !deadAliens.has(a));
		emitStats(grantAmmoBonus());
	}

	function updateExplosions(dt) {
		for (const explosion of state.explosions) {
			explosion.t += dt;
		}
		state.explosions = state.explosions.filter((e) => e.t < EXPLOSION.duration);
	}

	function checkWaveCleared() {
		if (state.aliens.length || state.finished) return;
		state.ammo += WAVE_CLEAR_AMMO;
		startWave();
		emitStats(WAVE_CLEAR_AMMO);
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
		checkWaveCleared();
	}

	startWave();
	emitStats();

	return { state, update, resize };
}
