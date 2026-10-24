import { TEXTS } from './texts.js';
import * as storage from './storage.js';

// Screen names for the state machine. The original had no such concept: menus
// were shown and hidden from half a dozen places and "back to main menu" was
// implemented as location.reload(), because there was no way to reset state.
export const SCREEN = {
	MENU: 'menu',
	OPTIONS: 'options',
	PLAYING: 'playing',
	PAUSED: 'paused',
	GAMEOVER: 'gameover',
};

export function createUi({ onPlay, onControlChange, onBackToMenu }) {
	const startMenu = document.querySelector('#start_menu');
	const controlsScreen = document.querySelector('#select_control');
	const pauseScreen = document.querySelector('#pause_screen');
	const gameOverScreen = document.querySelector('.gameover');
	const scoreOut = document.querySelector('.yourscore');
	const loginWrapper = document.querySelector('.login_wrapper');
	const nickInput = document.querySelector('#nickname');
	const greeting = document.querySelector('.greeting-text');
	const keyboardButton = document.querySelector('.button.keyboard');
	const mouseButton = document.querySelector('.button.mouse');

	let screen = null;

	function setGreeting(message) {
		greeting.textContent = message;
		greeting.classList.add('active');
	}

	function clearGreeting() {
		greeting.classList.remove('active');
	}

	function markControl(controlType) {
		keyboardButton.classList.toggle('active', controlType === 'keyboard');
		mouseButton.classList.toggle('active', controlType === 'mouse');
	}

	function login() {
		const nick = nickInput.value.trim();
		if (!nick) {
			loginWrapper.classList.add('error');
			setGreeting(TEXTS.emptyNick);
			return;
		}
		if (storage.isKnownNick(nick)) {
			storage.setActiveGamer(nick);
			loginWrapper.classList.remove('error');
			loginWrapper.classList.add('logged-in');
			setGreeting(TEXTS.welcomeBack(nick));
			return;
		}
		if (storage.isReservedNick(nick)) {
			loginWrapper.classList.add('error');
			setGreeting(TEXTS.nickTaken);
			return;
		}
		storage.registerNick(nick);
		storage.setActiveGamer(nick);
		loginWrapper.classList.remove('error');
		loginWrapper.classList.add('logged-in');
		setGreeting(TEXTS.welcomeNew(nick));
	}

	function logout() {
		storage.clearActiveGamer();
		loginWrapper.classList.remove('logged-in', 'error');
		clearGreeting();
		nickInput.value = '';
	}

	function show(next, payload = {}) {
		screen = next;
		startMenu.classList.toggle('active', next === SCREEN.MENU);
		controlsScreen.classList.toggle('active', next === SCREEN.OPTIONS);
		pauseScreen.classList.toggle('active', next === SCREEN.PAUSED);
		gameOverScreen.classList.toggle('active', next === SCREEN.GAMEOVER);

		if (next === SCREEN.OPTIONS) {
			markControl(storage.getControlType());
		}
		if (next === SCREEN.GAMEOVER) {
			gameOverScreen.classList.toggle('win', payload.status === 'win');
			gameOverScreen.classList.toggle('fail', payload.status !== 'win');
			scoreOut.textContent = TEXTS.score(payload.score);
		}
		if (next === SCREEN.MENU) {
			const nick = storage.getActiveGamer();
			loginWrapper.classList.toggle('logged-in', Boolean(nick));
			nickInput.value = nick || '';
		}
	}

	// Listeners are attached once here, not re-attached on every screen change.
	document.querySelector('.button.play').addEventListener('click', () => {
		clearGreeting();
		if (!storage.getActiveGamer()) {
			setGreeting(TEXTS.notLoggedIn);
			return;
		}
		onPlay();
	});

	document.querySelector('.button.options').addEventListener('click', () => {
		clearGreeting();
		show(SCREEN.OPTIONS);
	});

	for (const button of document.querySelectorAll('.button.back')) {
		button.addEventListener('click', onBackToMenu);
	}

	document.querySelector('.nickname_submit').addEventListener('click', login);

	nickInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') login();
	});

	nickInput.addEventListener('input', () => {
		clearGreeting();
		loginWrapper.classList.remove('error', 'logged-in');
	});

	document.querySelector('.button.logout').addEventListener('click', logout);

	keyboardButton.addEventListener('click', () => {
		storage.setControlType('keyboard');
		markControl('keyboard');
		onControlChange('keyboard');
	});

	mouseButton.addEventListener('click', () => {
		storage.setControlType('mouse');
		markControl('mouse');
		onControlChange('mouse');
	});

	return {
		show,
		get screen() {
			return screen;
		},
	};
}
