import {
	SHIP, ROCKET, BOMB, ALIEN, ENEMY_TYPES, ALIEN_FRAME_TIME, EXPLOSION, FORMATION,
	waveLayout, isBossWave, bossHp, bossCount, bombInterval, bombsPerDrop,
	BOMB_SPEED, BOMB_INTERVAL, BOSS_FIRE_RATE, INVULN_TIME, computeScale,
	ROCKET_SPEED, SHIP_KEY_SPEED, SHOOT_COOLDOWN,
	START_AMMO, START_HEALTH, AMMO_BONUSES, WAVE_AMMO_REFUND, WAVE_CLEAR_AMMO_MIN,
	AMMO_TRICKLE,
} from './config.js';
import { input } from './input.js';
import { playSound } from './audio.js';

// How long an alien glows after taking a hit that did not kill it.
const HIT_FLASH_TIME = 0.12;

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
		// Everything in config.js is a design unit; this turns it into pixels.
		scale: computeScale(width, height),
		controlType,
		ship: { x: width / 2 },
		bullets: [],
		bombs: [],
		aliens: [],
		explosions: [],
		score: 0,
		ammo: START_AMMO,
		health: START_HEALTH,
		wave: 0,
		waveShotCost: 0,
		shootTimer: 0,
		trickleTimer: 0,
		bombTimer: 0,
		invuln: 0,
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

	function spawnAlien(type, x, y, armour = 0) {
		const spec = ENEMY_TYPES[type];
		const hp = (type === 'boss' ? bossHp(state.wave) : spec.hp) + armour;
		state.aliens.push({
			x,
			y,
			w: (spec.width || ALIEN.width) * state.scale,
			h: (spec.height || ALIEN.height) * state.scale,
			type,
			hp,
			maxHp: hp,
			hitFlash: 0,
		});
		// What a flawless run at this wave would cost in shots; the wave-clear
		// refund is based on it.
		state.waveShotCost += hp;
	}

	function startWave() {
		state.wave++;
		state.formation.dir = 1;
		state.waveShotCost = 0;
		state.bombTimer = waveBombInterval();

		if (isBossWave(state.wave)) {
			const spec = ENEMY_TYPES.boss;
			const count = bossCount(state.wave);
			const bossW = spec.width * state.scale;
			// Spread them evenly, shrinking the spacing rather than letting one
			// hang off the edge of a narrow screen.
			const step = Math.min(bossW + 20 * state.scale, state.width / count);
			const originX = Math.max(0, (state.width - step * count) / 2);
			for (let i = 0; i < count; i++) {
				spawnAlien(
					'boss',
					Math.min(originX + i * step, Math.max(0, state.width - bossW)),
					FORMATION.marginTop * state.scale,
				);
			}
			state.formation.size = state.aliens.length;
			onWave(state.wave);
			return;
		}

		const layout = waveLayout(state.wave);
		const { rows, eliteRows, armour } = layout;
		// Narrow screens shrink the gaps first and then, if the grid still will
		// not fit, drop columns - otherwise a phone spawns aliens off-screen that
		// can never be shot.
		const alienW = ALIEN.width * state.scale;
		const alienH = ALIEN.height * state.scale;
		const minGap = 4;
		const fitCols = Math.floor((state.width - minGap) / (alienW + minGap));
		const cols = Math.max(1, Math.min(layout.cols, fitCols));
		const gapX = Math.min(
			FORMATION.gapX * state.scale,
			Math.max(minGap, (state.width - 40 - cols * alienW) / Math.max(1, cols - 1)),
		);
		const totalWidth = cols * alienW + (cols - 1) * gapX;
		const originX = Math.max(0, (state.width - totalWidth) / 2);
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				spawnAlien(
					row < eliteRows ? 'elite' : 'grunt',
					originX + col * (alienW + gapX),
					(FORMATION.marginTop + row * (ALIEN.height + FORMATION.gapY)) * state.scale,
					armour,
				);
			}
		}
		state.formation.size = state.aliens.length;
		onWave(state.wave);
	}

	function addExplosion(x, y, w = ALIEN.width * state.scale, h = ALIEN.height * state.scale) {
		state.explosions.push({ x, y, w, h, t: 0 });
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
		const xRatio = state.width ? w / state.width : 1;
		const nextScale = computeScale(w, h);
		// Everything already on screen is resized too, so a mid-game resize does
		// not leave a full-size formation on a shrunken playfield.
		const k = nextScale / state.scale;
		state.width = w;
		state.height = h;
		state.scale = nextScale;

		for (const entity of [...state.aliens, ...state.bullets, ...state.bombs]) {
			entity.x *= xRatio;
			entity.y *= k;
			entity.w *= k;
			entity.h *= k;
		}
		for (const alien of state.aliens) {
			alien.x = Math.max(0, Math.min(alien.x, w - alien.w));
		}
		for (const explosion of state.explosions) {
			explosion.x *= xRatio;
			explosion.y *= k;
			explosion.w *= k;
			explosion.h *= k;
		}

		const half = (SHIP.width * state.scale) / 2;
		state.ship.x = Math.max(half, Math.min(w - half, state.ship.x * xRatio));
	}

	function updateShip(dt) {
		if (state.controlType === 'mouse') {
			state.ship.x = input.pointerX;
		} else {
			if (input.left) state.ship.x -= SHIP_KEY_SPEED * state.scale * dt;
			if (input.right) state.ship.x += SHIP_KEY_SPEED * state.scale * dt;
		}
		const half = (SHIP.width * state.scale) / 2;
		// Clamped after moving, not before: the original checked the bound first
		// and so let the ship slide one whole step past the edge.
		state.ship.x = Math.max(half, Math.min(state.width - half, state.ship.x));
	}

	// Only runs when the magazine is empty and there is still something to shoot.
	function updateAmmoTrickle(dt) {
		if (state.ammo > 0 || !state.aliens.length) {
			state.trickleTimer = 0;
			return;
		}
		state.trickleTimer += dt;
		if (state.trickleTimer < AMMO_TRICKLE.interval) return;
		state.trickleTimer -= AMMO_TRICKLE.interval;
		state.ammo += AMMO_TRICKLE.amount;
		emitStats();
	}

	function updateShooting(dt) {
		state.shootTimer -= dt;
		if (!input.firing || state.ammo <= 0 || state.shootTimer > 0) return;
		state.shootTimer = SHOOT_COOLDOWN;
		state.ammo--;
		state.bullets.push({
			x: state.ship.x - (ROCKET.width * state.scale) / 2,
			y: state.height - (SHIP.height + ROCKET.height) * state.scale,
			w: ROCKET.width * state.scale,
			h: ROCKET.height * state.scale,
		});
		playSound('shoot');
		emitStats();
	}

	function updateBullets(dt) {
		for (const bullet of state.bullets) {
			bullet.y -= ROCKET_SPEED * state.scale * dt;
		}
		state.bullets = state.bullets.filter((b) => b.y + b.h > 0);
	}

	function formationSpeed() {
		const base = FORMATION.baseSpeed + FORMATION.speedPerWave * (state.wave - 1);
		const alive = state.aliens.length;
		const total = state.formation.size || 1;
		// Thinning the formation speeds up what is left, as in the arcade original.
		const thinned = 1 - alive / total;
		// A boss is a one-alien formation, so the thinning term never kicks in;
		// its speed comes from the type instead.
		const factor = Math.max(...state.aliens.map((a) => ENEMY_TYPES[a.type].speedFactor));
		return base * state.scale * factor * (1 + thinned * (FORMATION.clearSpeedUp - 1));
	}

	function updateAliens(dt) {
		if (!state.aliens.length) return;

		for (const alien of state.aliens) {
			if (alien.hitFlash > 0) alien.hitFlash = Math.max(0, alien.hitFlash - dt);
		}

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
				alien.y += FORMATION.stepDown * state.scale;
			}
		} else {
			for (const alien of state.aliens) {
				alien.x += dx;
			}
		}

		// Reaching the ship's line costs one life and pushes the survivors back
		// to the top, rather than costing a life per alien in the bottom row.
		const landingLine = state.height - SHIP.height * state.scale;
		if (state.aliens.some((a) => a.y + a.h >= landingLine)) {
			state.health--;
			const lift = Math.min(...state.aliens.map((a) => a.y)) - FORMATION.marginTop * state.scale;
			for (const alien of state.aliens) {
				alien.y -= lift;
			}
			emitStats();
		}
	}

	// Only an alien with nothing of its own below it can drop a bomb, so the
	// formation fires from its front edge instead of from the middle of itself.
	function frontLine() {
		return state.aliens.filter((alien) => !state.aliens.some((other) => (
			other !== alien &&
			other.y > alien.y &&
			other.x < alien.x + alien.w &&
			other.x + other.w > alien.x
		)));
	}

	function waveBombInterval() {
		const interval = bombInterval(state.wave);
		if (!isBossWave(state.wave)) return interval;
		// Floor applied after the boss divisor, not before it.
		return Math.max(BOMB_INTERVAL.bossMin, interval / BOSS_FIRE_RATE);
	}

	function updateEnemyFire(dt) {
		if (!state.aliens.length) return;
		state.bombTimer -= dt;
		if (state.bombTimer > 0) return;
		state.bombTimer = waveBombInterval();

		const shooters = frontLine();
		if (!shooters.length) return;
		// Late waves fire a volley instead of a single bomb.
		for (let i = 0; i < bombsPerDrop(state.wave); i++) {
			const shooter = shooters[Math.floor(Math.random() * shooters.length)];
			state.bombs.push({
				x: shooter.x + shooter.w / 2 - (BOMB.width * state.scale) / 2,
				y: shooter.y + shooter.h,
				w: BOMB.width * state.scale,
				h: BOMB.height * state.scale,
			});
		}
		playSound('shoot');
	}

	function shipHitbox() {
		const box = SHIP.hitbox;
		return {
			x: state.ship.x + box.dx * state.scale,
			y: state.height + box.dy * state.scale,
			w: box.w * state.scale,
			h: box.h * state.scale,
		};
	}

	function updateBombs(dt) {
		if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);

		for (const bomb of state.bombs) {
			bomb.y += BOMB_SPEED * state.scale * dt;
		}

		const ship = shipHitbox();
		const spent = new Set();
		for (const bomb of state.bombs) {
			if (bomb.y > state.height) {
				spent.add(bomb);
				continue;
			}
			if (state.invuln > 0 || !overlaps(bomb, ship)) continue;
			spent.add(bomb);
			state.health--;
			state.invuln = INVULN_TIME;
			addExplosion(state.ship.x - (ALIEN.width * state.scale) / 2, state.height - SHIP.height * state.scale);
			playSound('explosion');
			emitStats();
		}
		if (spent.size) state.bombs = state.bombs.filter((b) => !spent.has(b));
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
				alien.hp--;
				alien.hitFlash = HIT_FLASH_TIME;
				playSound('explosion');
				if (alien.hp <= 0) {
					deadAliens.add(alien);
					// A boss is big enough that one puff in a corner looks wrong.
					addExplosion(alien.x, alien.y, alien.w, alien.h);
					state.score += ENEMY_TYPES[alien.type].score;
				} else {
					// A hit that did not kill still shows where it landed.
					addExplosion(bullet.x - ALIEN.width / 2, bullet.y - ALIEN.height / 2);
				}
				break;
			}
		}
		if (!deadBullets.size) return;
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
		// Scaled to what the wave just cleared would have cost at perfect
		// accuracy, so the economy keeps up with waves that never stop growing.
		const reward = Math.max(
			WAVE_CLEAR_AMMO_MIN,
			Math.ceil(state.waveShotCost * WAVE_AMMO_REFUND),
		);
		state.ammo += reward;
		startWave();
		emitStats(reward);
	}

	function checkFinish() {
		// There is no winning score: the run ends when the last life is gone.
		if (state.finished || state.health > 0) return;
		state.finished = 'fail';
		onFinish(state.score);
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
		updateAmmoTrickle(dt);
		updateShooting(dt);
		updateBullets(dt);
		updateAliens(dt);
		updateEnemyFire(dt);
		updateBombs(dt);
		updateCollisions();
		updateExplosions(dt);
		checkFinish();
		checkWaveCleared();
	}

	startWave();
	emitStats();

	return { state, update, resize };
}
