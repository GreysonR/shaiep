var inTitle = true;

function openTitle() {
	unloadLevel();
	noise.seed(Math.random());

	bg.opacity = 1;
	bg.noisePos = new vec(0, 0);
	bg.scale = 1;

	inGame = false;
	inTitle = true;
	document.getElementById("home").classList.remove("active");
	document.getElementById("title").classList.add("active");
	document.getElementById("game").classList.remove("active");
	document.getElementById("game").classList.add("title");

	curLevel.bounds.min.set({ x: -3.5, y: -2 });
	curLevel.bounds.max.set({ x:  3.5, y:  2 });
}
function closeTitle() {
	inTitle = false;
	document.getElementById("home").classList.add("active");
	document.getElementById("title").classList.remove("active");
	document.getElementById("game").classList.remove("title");
}

openTitle();

function openMainTitle() {
	document.getElementById("title").classList.remove("credits");
	document.getElementById("title").classList.remove("help");
}
function openCredits() {
	document.getElementById("title").classList.add("credits");
}
function openHelp() {
	document.getElementById("title").classList.add("help");
}