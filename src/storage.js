// Thin wrapper over localStorage. Keys are unchanged from the original so an
// existing saved nickname and control choice keep working.
const ACTIVE_GAMER = 'activeGamer';
const CONTROLS = 'controls';
const ANON = 'Anon';

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
	return read(nick) === 'nickname';
}

// True when the nickname collides with something already in localStorage that
// is not one of our profile markers.
export function isReservedNick(nick) {
	const value = read(nick);
	return value !== null && value !== 'nickname';
}

export function registerNick(nick) {
	write(nick, 'nickname');
}
