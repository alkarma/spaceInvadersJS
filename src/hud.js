import { WAVE_BANNER_TIME } from './config.js';

// The HUD stays in the DOM: it is text and a row of hearts, it never changes
// per frame, and the original stylesheet already positions it. What changed is
// that the nodes are created once instead of on every call to game(), and the
// health row is only rebuilt when the number actually changes.
export function createHud(root) {
	const nick = document.createElement('span');
	nick.className = 'nick_display';

	const ammo = document.createElement('span');
	ammo.className = 'ammo';

	const score = document.createElement('span');
	score.className = 'game_score';

	const wave = document.createElement('span');
	wave.className = 'wave_display';

	const health = document.createElement('span');
	health.className = 'health_display';

	const banner = document.createElement('div');
	banner.className = 'wave_banner';

	root.append(nick, ammo, score, wave, health, banner);

	let shownHealth = -1;
	let bonusTimer = null;
	let bannerTimer = null;

	function setHealth(value) {
		if (value === shownHealth) return;
		shownHealth = value;
		health.replaceChildren();
		for (let i = 0; i < value; i++) {
			const item = document.createElement('span');
			item.className = 'health_item';
			health.append(item);
		}
	}

	return {
		setNick(value) {
			nick.textContent = value;
		},
		update({ score: scoreValue, ammo: ammoValue, health: healthValue, wave: waveValue, ammoBonus }) {
			score.textContent = scoreValue;
			wave.textContent = waveValue;
			// The original showed e.g. "130 +30" and then left it on screen until
			// the next shot. Here the suffix clears itself.
			ammo.textContent = ammoBonus ? `${ammoValue} +${ammoBonus}` : ammoValue;
			if (ammoBonus) {
				clearTimeout(bonusTimer);
				bonusTimer = setTimeout(() => {
					ammo.textContent = ammoValue;
				}, 1200);
			}
			setHealth(healthValue);
		},
		announceWave(value) {
			banner.textContent = 'WAVE ' + value;
			banner.classList.add('active');
			clearTimeout(bannerTimer);
			bannerTimer = setTimeout(() => {
				banner.classList.remove('active');
			}, WAVE_BANNER_TIME * 1000);
		},
		show() {
			root.classList.add('hud-visible');
		},
		hide() {
			root.classList.remove('hud-visible');
			banner.classList.remove('active');
			clearTimeout(bonusTimer);
			clearTimeout(bannerTimer);
		},
	};
}
