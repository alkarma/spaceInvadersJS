// Input is collected into a plain state object that the game loop reads once
// per frame. In the original every call to game() attached a fresh mousemove /
// keydown listener, so replaying after a game over fired the handlers twice.
// Here the listeners are attached exactly once, at startup.
export const input = {
	pointerX: 0,
	pointerY: 0,
	firing: false,
	left: false,
	right: false,
};

export function initInput({ onPauseToggle }) {
	window.addEventListener('mousemove', (e) => {
		input.pointerX = e.clientX;
		input.pointerY = e.clientY;
	});

	window.addEventListener('mousedown', (e) => {
		if (e.button === 0) input.firing = true;
	});

	window.addEventListener('mouseup', (e) => {
		if (e.button === 0) input.firing = false;
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
	window.addEventListener('blur', () => {
		input.firing = false;
		input.left = false;
		input.right = false;
	});
}
