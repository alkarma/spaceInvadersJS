import test from 'node:test';
import assert from 'node:assert/strict';

// storage.js migrates on import, so each scenario needs a fresh module against
// a fresh fake store. The query string is what defeats the module cache.
let moduleCounter = 0;

function withStore(initial = {}) {
	const data = new Map(Object.entries(initial));
	globalThis.localStorage = {
		getItem: (key) => (data.has(key) ? data.get(key) : null),
		setItem: (key, value) => { data.set(key, String(value)); },
		removeItem: (key) => { data.delete(key); },
		key: (i) => [...data.keys()][i] ?? null,
		get length() { return data.size; },
	};
	return {
		has: (key) => data.has(key),
		load: () => import(`../src/storage.js?case=${++moduleCounter}`),
	};
}

test('data written before the prefix existed is migrated, not lost', async () => {
	const store = withStore({ Alex: 'nickname', Bob: 'nickname', activeGamer: 'Alex', controls: 'mouse' });
	const storage = await store.load();

	assert.equal(storage.getActiveGamer(), 'Alex', 'still logged in');
	assert.equal(storage.getControlType(), 'mouse', 'control choice kept');
	assert.ok(storage.isKnownNick('Alex'), 'profile carried over');
	assert.ok(storage.isKnownNick('Bob'), 'other profiles too');
	assert.equal(store.has('Alex'), false, 'bare nickname key cleaned up');
	assert.equal(store.has('activeGamer'), false, 'legacy key cleaned up');
});

test('a nickname that collides with a setting no longer corrupts it', async () => {
	// Logging in as "controls" used to overwrite the control type, because the
	// nickname was written as a top-level key.
	const store = withStore({});
	const storage = await store.load();
	storage.setControlType('keyboard');
	storage.registerNick('controls');
	storage.setActiveGamer('controls');

	assert.equal(storage.getControlType(), 'keyboard', 'setting survived');
	assert.ok(storage.isKnownNick('controls'), 'and the profile exists');
});

test('scores are kept sorted, best first', async () => {
	const storage = await withStore({}).load();
	storage.registerNick('Alex');
	storage.recordScore('Alex', 12);
	storage.recordScore('Alex', 40);
	storage.recordScore('Alex', 7);
	assert.equal(storage.getBestScore('Alex'), 40);
});

test('a personal best is reported only when it is one', async () => {
	const storage = await withStore({}).load();
	storage.registerNick('Alex');
	assert.equal(storage.recordScore('Alex', 10).isPersonalBest, true, 'first run counts');
	assert.equal(storage.recordScore('Alex', 5).isPersonalBest, false, 'worse does not');
	assert.equal(storage.recordScore('Alex', 25).isPersonalBest, true, 'better does');
	assert.equal(storage.recordScore('Alex', 25).isPersonalBest, false, 'a tie does not');
});

test('only the ten best runs per profile are kept', async () => {
	const storage = await withStore({}).load();
	storage.registerNick('Alex');
	for (let i = 1; i <= 15; i++) storage.recordScore('Alex', i);
	assert.equal(storage.getBestScore('Alex'), 15);
	const rows = storage.getLeaderboard(50);
	assert.equal(rows.length, 1, 'one row per profile, not per run');
});

test('the leaderboard ranks profiles and skips the ones that never scored', async () => {
	const storage = await withStore({}).load();
	for (const nick of ['Alex', 'Bob', 'Carol', 'Dave']) storage.registerNick(nick);
	storage.recordScore('Alex', 30);
	storage.recordScore('Bob', 70);
	storage.recordScore('Carol', 50);
	// Dave registered but never finished a run.

	const rows = storage.getLeaderboard(10);
	assert.deepEqual(rows.map((r) => r.nick), ['Bob', 'Carol', 'Alex']);
	assert.deepEqual(rows.map((r) => r.score), [70, 50, 30]);
});

test('the leaderboard honours its limit', async () => {
	const storage = await withStore({}).load();
	for (const [nick, score] of [['A', 1], ['B', 2], ['C', 3], ['D', 4]]) {
		storage.registerNick(nick);
		storage.recordScore(nick, score);
	}
	assert.equal(storage.getLeaderboard(2).length, 2);
});

test('logging out clears the active profile but keeps its scores', async () => {
	const storage = await withStore({}).load();
	storage.registerNick('Alex');
	storage.setActiveGamer('Alex');
	storage.recordScore('Alex', 42);
	storage.clearActiveGamer();

	assert.equal(storage.getActiveGamer(), null);
	assert.equal(storage.getBestScore('Alex'), 42, 'scores survive a logout');
});
