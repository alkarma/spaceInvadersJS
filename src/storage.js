// Everything this game keeps lives under one prefix.
//
// The original wrote the nickname itself as a top-level key (`localStorage
// .setItem(nick, 'nickname')`) next to `controls` and `activeGamer`, so logging
// in as "controls" corrupted the control setting, and any nickname that
// happened to match an existing key was rejected as taken. Prefixing removes
// that whole class of problem; legacy keys are migrated on first load.
const PREFIX = 'si:';
const ACTIVE_GAMER = PREFIX + 'activeGamer';
const CONTROLS = PREFIX + 'controls';
const PROFILE = PREFIX + 'profile:';
const ANON = 'Anon';

// How many scores each profile remembers.
const SCORES_KEPT = 10;

function read(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null; // private mode / disabled storage
	}
}

function write(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* ignore: the game is still playable without persistence */
	}
}

function remove(key) {
	try {
		localStorage.removeItem(key);
	} catch {
		/* ignore */
	}
}

function keys() {
	// length/key(i) is the canonical way to enumerate; it does not rely on the
	// store exposing its entries as plain properties.
	try {
		const result = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key !== null) result.push(key);
		}
		return result;
	} catch {
		return [];
	}
}

function readProfile(nick) {
	try {
		return JSON.parse(read(PROFILE + nick)) || { scores: [] };
	} catch {
		return { scores: [] };
	}
}

function writeProfile(nick, profile) {
	write(PROFILE + nick, JSON.stringify(profile));
}

// Moves data written by versions before the prefix existed.
function migrateLegacy() {
	if (read(PREFIX + 'migrated')) return;
	const legacyActive = read('activeGamer');
	const legacyControls = read('controls');
	for (const key of keys()) {
		if (key.startsWith(PREFIX)) continue;
		if (read(key) !== 'nickname') continue;
		if (!read(PROFILE + key)) writeProfile(key, { scores: [] });
		remove(key);
	}
	if (legacyActive && !read(ACTIVE_GAMER)) write(ACTIVE_GAMER, legacyActive);
	if (legacyControls && !read(CONTROLS)) write(CONTROLS, legacyControls);
	remove('activeGamer');
	remove('controls');
	write(PREFIX + 'migrated', '1');
}

migrateLegacy();

export function getControlType() {
	return read(CONTROLS);
}

export function setControlType(type) {
	write(CONTROLS, type);
}

export function getActiveGamer() {
	const nick = read(ACTIVE_GAMER);
	return nick && nick !== ANON ? nick : null;
}

export function setActiveGamer(nick) {
	write(ACTIVE_GAMER, nick);
}

export function clearActiveGamer() {
	write(ACTIVE_GAMER, ANON);
}

export function isKnownNick(nick) {
	return read(PROFILE + nick) !== null;
}

export function registerNick(nick) {
	if (!isKnownNick(nick)) writeProfile(nick, { scores: [] });
}

export function getBestScore(nick) {
	return readProfile(nick).scores[0] ?? 0;
}

// Records a finished run and reports how it placed, so the game over screen can
// say something useful instead of just repeating the number.
export function recordScore(nick, score) {
	const profile = readProfile(nick);
	const previousBest = profile.scores[0] ?? null;
	profile.scores = [...profile.scores, score]
		.sort((a, b) => b - a)
		.slice(0, SCORES_KEPT);
	writeProfile(nick, profile);
	return {
		best: profile.scores[0],
		isPersonalBest: previousBest === null || score > previousBest,
	};
}

// One row per profile, best score first. The login has existed since the first
// version without ever being used for anything; this is what it was for.
export function getLeaderboard(limit = 5) {
	return keys()
		.filter((key) => key.startsWith(PROFILE))
		.map((key) => ({
			nick: key.slice(PROFILE.length),
			score: readProfile(key.slice(PROFILE.length)).scores[0] ?? 0,
		}))
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
