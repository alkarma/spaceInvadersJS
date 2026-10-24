// Input is collected into a plain state object that the game loop reads once
// per frame. In the original every call to game() attached a fresh mousemove /
// keydown listener, so replaying after a game over fired the handlers twice.
// Here the listeners are attached exactly once, at startup.
//
// Pointer events rather than mouse events, so a finger works the same as a
// mouse without a second code path.
export const input = {
	pointerX: 0,
	pointerY: 0,
	firing: false,
	left: false,
	right: false,
};

function release() {
	input.firing = false;
	input.left = false;
	input.right = false;
}

export function initInput({ onPauseToggle }) {
	window.addEventListener('pointermove', (e) => {
		input.pointerX = e.clientX;
		input.pointerY = e.clientY;
	});

	window.addEventListener('pointerdown', (e) => {
		// On a touch screen the first contact is both the aim and the trigger,
		// so take the position from the same event rather than waiting for a move.
		input.pointerX = e.clientX;
		input.pointerY = e.clientY;
		if (e.pointerType !== 'mouse' || e.button === 0) input.firing = true;
	});

	window.addEventListener('pointerup', () => {
		input.firing = false;
	});

	window.addEventListener('pointercancel', () => {
		input.firing = false;
	});

	window.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') input.left = true;
		if (e.key === 'ArrowRight') input.right = true;
		if (e.key === 'Escape') {
			e.preventDefault();
			onPauseToggle();
		}
	});

	window.addEventListener('keyup', (e) => {
		if (e.key === 'ArrowLeft') input.left = false;
		if (e.key === 'ArrowRight') input.right = false;
	});

	// Without this a key or button held while the tab loses focus stays stuck.
	window.addEventListener('blur', release);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) release();
	});
}
