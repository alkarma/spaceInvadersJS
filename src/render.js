import { SHIP, ROCKET, BOMB, ALIEN, ENEMY_TYPES, CROSS, EXPLOSION, BACKGROUND } from './config.js';
import { input } from './input.js';

function loadImage(src) {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () => resolve(image);
		// Resolve on error too: a missing picture should degrade to a flat colour
		// rather than hang the loading screen forever.
		image.onerror = () => resolve(null);
		image.src = src;
	});
}

export async function loadAssets() {
	// Every frame referenced by an enemy type, loaded once and keyed by path.
	const framePaths = [...new Set(Object.values(ENEMY_TYPES).flatMap((t) => t.frames))];
	const [background, ...frames] = await Promise.all([
		loadImage(BACKGROUND),
		...framePaths.map(loadImage),
	]);
	const sprites = {};
	framePaths.forEach((path, i) => {
		sprites[path] = frames[i];
	});
	return { background, sprites };
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

// Mirrors the @keyframes exp animation from the original stylesheet.
// Exported so the port of those keyframes can be checked without a browser.
export function explosionLook(progress) {
	if (progress < 0.5) {
		const t = progress / 0.5;
		return {
			size: lerp(EXPLOSION.from, 40, t),
			fill: `rgba(${lerp(255, 255, t)}, ${lerp(81, 251, t)}, ${lerp(1, 0, t)}, ${lerp(1, 0.5, t)})`,
			glow: lerp(0, 50, t),
		};
	}
	const t = (progress - 0.5) / 0.5;
	return {
		size: lerp(40, EXPLOSION.to, t),
		fill: `rgba(255, 251, 0, ${lerp(0.5, 0, t)})`,
		glow: lerp(50, 110, t),
	};
}

export function createRenderer(canvas, assets) {
	const ctx = canvas.getContext('2d');
	const pattern = assets.background ? ctx.createPattern(assets.background, 'repeat') : null;

	function drawBackground(width, height) {
		if (pattern) {
			ctx.fillStyle = pattern;
		} else {
			ctx.fillStyle = '#05010f';
		}
		ctx.fillRect(0, 0, width, height);
	}

	function drawShip(x, height, invuln) {
		ctx.save();
		if (invuln > 0) {
			// Blink while the hit grace period runs, so it is obvious why bombs
			// are passing straight through.
			ctx.globalAlpha = Math.floor(invuln * 12) % 2 ? 0.25 : 0.8;
		}
		ctx.fillStyle = SHIP.color;
		for (const part of SHIP.parts) {
			ctx.fillRect(Math.round(x + part.dx), height + part.dy, part.w, part.h);
		}
		ctx.restore();
	}

	function drawBombs(bombs) {
		ctx.save();
		ctx.fillStyle = BOMB.color;
		ctx.shadowColor = BOMB.glow;
		ctx.shadowBlur = 12;
		for (const bomb of bombs) {
			ctx.fillRect(Math.round(bomb.x), Math.round(bomb.y), bomb.w, bomb.h);
		}
		ctx.restore();
	}

	function drawBullets(bullets) {
		ctx.save();
		ctx.fillStyle = ROCKET.color;
		ctx.shadowColor = ROCKET.glow;
		ctx.shadowBlur = 20;
		const rounded = typeof ctx.roundRect === 'function';
		for (const bullet of bullets) {
			if (rounded) {
				ctx.beginPath();
				ctx.roundRect(bullet.x, bullet.y, bullet.w, bullet.h, 2);
				ctx.fill();
			} else {
				ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
			}
		}
		ctx.restore();
	}

	function drawHealthBar(alien) {
		const height = 8;
		const y = alien.y - height - 10;
		const ratio = Math.max(0, alien.hp / alien.maxHp);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
		ctx.fillRect(alien.x, y, alien.w, height);
		ctx.fillStyle = ratio > 0.3 ? '#00cc00' : '#ff3333';
		ctx.fillRect(alien.x, y, alien.w * ratio, height);
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		ctx.strokeRect(alien.x + 0.5, y + 0.5, alien.w - 1, height - 1);
	}

	function drawAliens(aliens, frame) {
		for (const alien of aliens) {
			const type = ENEMY_TYPES[alien.type];
			// The whole formation shares one frame counter, so they animate in
			// lockstep the way the arcade original did.
			const sprite = assets.sprites[type.frames[frame % type.frames.length]];
			const x = Math.round(alien.x);
			const y = Math.round(alien.y);
			if (sprite) {
				ctx.drawImage(sprite, x, y, alien.w, alien.h);
				if (alien.hitFlash > 0) {
					// Redrawing the sprite additively makes the hit read as a flash
					// without needing a second set of artwork.
					ctx.save();
					ctx.globalCompositeOperation = 'lighter';
					ctx.globalAlpha = Math.min(1, alien.hitFlash * 6);
					ctx.drawImage(sprite, x, y, alien.w, alien.h);
					ctx.restore();
				}
			} else {
				ctx.fillStyle = alien.type === 'elite' ? '#8000ff' : '#00cc00';
				ctx.fillRect(x, y, alien.w, alien.h);
			}
			// Only something that can survive a hit needs a bar.
			if (alien.maxHp > 1) drawHealthBar(alien);
		}
	}

	function drawExplosions(explosions) {
		ctx.save();
		for (const explosion of explosions) {
			const look = explosionLook(Math.min(1, explosion.t / EXPLOSION.duration));
			const cx = explosion.x + (explosion.w || ALIEN.width) / 2;
			const cy = explosion.y + (explosion.h || ALIEN.height) / 2;
			// A big target gets a correspondingly big blast.
			const scale = (explosion.w || ALIEN.width) / ALIEN.width;
			ctx.fillStyle = look.fill;
			ctx.shadowColor = 'rgba(255, 0, 51, 0.51)';
			ctx.shadowBlur = look.glow * scale;
			ctx.beginPath();
			ctx.arc(cx, cy, (look.size * scale) / 2, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	function drawCrosshair(controlType, shipX) {
		// In mouse mode the crosshair tracks the pointer. In keyboard mode the
		// original pinned it to a fixed height above the ship, so it stays there.
		const x = controlType === 'mouse' ? input.pointerX : shipX;
		const y = controlType === 'mouse' ? input.pointerY : 100 + CROSS.size / 2;
		const half = CROSS.size / 2;
		ctx.save();
		ctx.strokeStyle = CROSS.color;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x - half, y);
		ctx.lineTo(x + half, y);
		ctx.moveTo(x, y - half);
		ctx.lineTo(x, y + half);
		ctx.stroke();
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(x, y, CROSS.size * 0.35, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}

	// `state` is null between rounds, when only the starfield should be visible
	// behind the menus.
	function render(state, width, height) {
		drawBackground(width, height);
		if (!state) return;
		drawAliens(state.aliens, state.frame);
		drawBullets(state.bullets);
		drawBombs(state.bombs);
		drawShip(state.ship.x, state.height, state.invuln);
		drawExplosions(state.explosions);
		if (!state.finished) drawCrosshair(state.controlType, state.ship.x);
	}

	return { render };
}
