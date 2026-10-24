import { createGame } from './game.js';
import { createRenderer, loadAssets } from './render.js';
import { createHud } from './hud.js';
import { createUi, SCREEN } from './ui.js';
import { initInput } from './input.js';
import * as audio from './audio.js';
import * as storage from './storage.js';
import { VERSION } from './config.js';

const canvas = document.querySelector('#field');
const wrap = document.querySelector('.space-wrap');

let renderer = null;
let hud = null;
let ui = null;
let game = null;
let screen = SCREEN.MENU;
let viewWidth = 0;
let viewHeight = 0;

function resizeCanvas() {
	// Draw at device resolution but keep the game's coordinate system in CSS
	// pixels, so gameplay does not change on a retina screen.
	const ratio = window.devicePixelRatio || 1;
	viewWidth = window.innerWidth;
	viewHeight = window.innerHeight;
	canvas.width = Math.floor(viewWidth * ratio);
	canvas.height = Math.floor(viewHeight * ratio);
	canvas.style.width = viewWidth + 'px';
	canvas.style.height = viewHeight + 'px';
	// Resizing the backing store resets the transform, so reapply the scale.
	canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
	if (game) game.resize(viewWidth, viewHeight);
}

function setScreen(next, payload) {
	screen = next;
	ui.show(next, payload);
	const playing = next === SCREEN.PLAYING;
	wrap.classList.toggle('fight', playing || next === SCREEN.PAUSED);
	if (playing || next === SCREEN.PAUSED || next === SCREEN.GAMEOVER) {
		hud.show();
	} else {
		hud.hide();
	}
}

function startGame() {
	const controlType = storage.getControlType();
	if (!controlType) {
		setScreen(SCREEN.OPTIONS);
		return;
	}
	hud.setNick(storage.getActiveGamer() || '');
	game = createGame({
		width: viewWidth,
		height: viewHeight,
		controlType,
		onStats: (stats) => hud.update(stats),
		onWave: (wave) => hud.announceWave(wave),
		onFinish: (status, score) => {
			audio.pauseMusic();
			// The original incremented a local variable here and threw it away;
			// the run is actually saved against the profile now.
			const nick = storage.getActiveGamer();
			const result = nick ? storage.recordScore(nick, score) : null;
			setScreen(SCREEN.GAMEOVER, {
				status,
				score,
				result,
				leaderboard: storage.getLeaderboard(),
			});
		},
	});
	audio.startMusic();
	setScreen(SCREEN.PLAYING);
}

function backToMenu() {
	// A real reset. The original could only get here via location.reload(),
	// because nothing ever cleaned up the running intervals.
	game = null;
	audio.rewindMusic();
	setScreen(SCREEN.MENU);
}

function togglePause() {
	if (screen === SCREEN.PLAYING) {
		audio.pauseMusic();
		setScreen(SCREEN.PAUSED);
	} else if (screen === SCREEN.PAUSED) {
		audio.resumeMusic();
		setScreen(SCREEN.PLAYING);
	}
}

function loop(now) {
	const dt = Math.min((now - loop.last) / 1000, 1 / 30);
	loop.last = now;
	// Only the PLAYING screen advances the simulation; everything else still
	// renders, so a paused game shows the frozen field behind the overlay.
	if (screen === SCREEN.PLAYING && game) game.update(dt);
	renderer.render(game ? game.state : null, viewWidth, viewHeight);
	requestAnimationFrame(loop);
}

async function boot() {
	const assets = await loadAssets();
	resizeCanvas();
	renderer = createRenderer(canvas, assets);
	hud = createHud(document.querySelector('#hud'));
	ui = createUi({
		onPlay: startGame,
		onControlChange: () => {},
		onBackToMenu: backToMenu,
	});
	initInput({ onPauseToggle: togglePause });
	window.addEventListener('resize', resizeCanvas);
	setScreen(SCREEN.MENU);
	loop.last = performance.now();
	requestAnimationFrame(loop);
	console.info('Space Invaders JS v' + VERSION);
}

boot();
