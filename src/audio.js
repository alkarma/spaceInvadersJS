// The original created `new Audio(...)` on every single shot and explosion,
// which meant a fresh decode and a new object per bullet. Here each sound is
// decoded once and played from a small round-robin pool, so rapid fire overlaps
// instead of cutting itself off.
//
// Pools are built lazily on first use rather than at import time, both to avoid
// allocating before the first user gesture and to keep this module importable
// outside a browser (so the game logic stays unit-testable).
const POOL_SIZE = 6;

const SOURCES = {
	shoot: 'audio/shoot-01.wav',
	explosion: 'audio/explosion-02.wav',
	bonus: 'audio/pickup-01.wav',
};

const pools = {};
let music = null;

function available() {
	return typeof Audio !== 'undefined';
}

function getPool(name) {
	if (!pools[name]) {
		const voices = [];
		for (let i = 0; i < POOL_SIZE; i++) {
			const audio = new Audio(SOURCES[name]);
			audio.preload = 'auto';
			voices.push(audio);
		}
		pools[name] = { voices, next: 0 };
	}
	return pools[name];
}

function getMusic() {
	if (!music) {
		music = new Audio('audio/main_theme.mp3');
		music.loop = true;
	}
	return music;
}

export function playSound(name) {
	if (!available() || !SOURCES[name]) return;
	const pool = getPool(name);
	const audio = pool.voices[pool.next];
	pool.next = (pool.next + 1) % POOL_SIZE;
	audio.currentTime = 0;
	// Autoplay policies reject this until the first user gesture; a sound effect
	// that cannot start must not take the game down with it.
	audio.play().catch(() => {});
}

export function startMusic() {
	if (!available()) return;
	getMusic().play().catch(() => {});
}

export function pauseMusic() {
	if (!available()) return;
	getMusic().pause();
}

export function resumeMusic() {
	startMusic();
}

export function rewindMusic() {
	if (!available()) return;
	const track = getMusic();
	track.pause();
	track.currentTime = 0;
}
