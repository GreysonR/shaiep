"use strict";

const { camera } = Render;

Render.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
	Render.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener("contextmenu", event => {
	event.preventDefault();
});

function main() {
	Performance.update();

	// - render
	Render();
	// Performance.render();

	// - run animations
	animation.run();

	requestAnimationFrame(main);
}
window.addEventListener("load", main);