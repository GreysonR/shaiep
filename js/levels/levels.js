"use strict";

let levels = {};
let rectCounter = document.getElementById("rectCounter");
let diagRectCounter = document.getElementById("diagRectCounter");
let triangleCounter = document.getElementById("triangleCounter");
let curLevel = {
	name: "",
	data: {},
	max: {
		rect: 0,
		diagRect: 0,
		triangle: 0,
	},
	used: {
		rect: 0,
		diagRect: 0,
		triangle: 0,
	},
	coveredPoints: 0,
	center: new vec(0, 0),
	bounds: { min: new vec(0, 0), max: new vec(1, 1) },
	maxPoints: 0,
	complete: false,
	points: [],
	bodies: [],
	solution: [],
	otherBodies: [],
	text: "",
}

function loadLevel(name) {
	noise.seed(Math.random());

	let level = typeof name === "object" ? name : levels[name];

	curLevel.name = typeof name === "object" ? "Unknown" : name;
	curLevel.data = level;

	unloadLevel();

	let { point, badPoint, rect, diagRect, triangle, body, text } = level;

	if (body) {
		curLevel.solution = [...body];
	}
	if (badPoint === undefined) badPoint = [];

	rectCounter.innerHTML = rect + " / " + rect;
	diagRectCounter.innerHTML = diagRect + " / " + diagRect;
	triangleCounter.innerHTML = triangle + " / " + triangle;

	if (rect === 0) rectCounter.classList.add("hidden");
	else rectCounter.classList.remove("hidden");
	if (diagRect === 0) diagRectCounter.classList.add("hidden");
	else diagRectCounter.classList.remove("hidden");
	if (triangle === 0) triangleCounter.classList.add("hidden");
	else triangleCounter.classList.remove("hidden");

	curLevel.max.rect = rect;
	curLevel.max.diagRect = diagRect;
	curLevel.max.triangle = triangle;

	let bounds = { min: new vec(0, 0), max: new vec(0, 0) };
	for (let p of point) {
		bounds.min.min2(p);
		bounds.max.max2(p);
	}
	
	let vertices = hull(point, Infinity, [".x", ".y"]);
	vertices = vertices.map(pt => new vec(pt));
	let center = getCenterOfMass(vertices);
	curLevel.center = center.mult(100);

	curLevel.bounds = bounds;


	if (bounds.max.x > 8 || bounds.max.y > 5) {
		let diff = Math.max(bounds.max.x - 8, bounds.max.y - 5)
		camera.fov = 1000 + diff * 100;
	}
	else {
		camera.fov = 1000;
	}

	curLevel.maxPoints = 0;
	for (let p of point) {
		let obj = new circle(7, new vec(p).sub2(center).mult2(100), {
			render: {
				background: "#BFD1E5",
				visible: false,
			}
		});
		curLevel.maxPoints++;
		curLevel.points.push(obj);
	}
	for (let p of badPoint) {
		let obj = new circle(7, new vec(p).sub2(center).mult2(100), {
			bad: true,
			render: {
				background: "#DF3C3C",
				visible: false,
			}
		});
		curLevel.points.push(obj);
	}

	animations.openLevel(curLevel);

	// load examples
	if (text) {
		curExample.hasExample = true;
		curLevel.text = text;
		loadExample();
	}
	else {
		curExample.hasExample = false;
		curLevel.text = "";
	}
}
function unloadLevel() {
	curLevel.used.rect = 0;
	curLevel.used.diagRect = 0;
	curLevel.used.triangle = 0;
	curLevel.coveredPoints = 0;
	curLevel.maxPoints = 0;
	curLevel.center = new vec(0, 0);
	
	curLevel.bounds.min = new vec(0, 0);
	curLevel.bounds.max = new vec(1, 1);

	for (let p of curLevel.points) {
		p.delete();
	}
	for (let body of curLevel.bodies) {
		body.delete();
	}
	for (let body of curLevel.otherBodies) {
		body.delete();
	}
	let hids = Object.keys(currentHints);
	for (let hid of hids) {
		clearInterval(currentHints[hid].onend);
		currentHints[hid].delete();
		delete currentHints[hid];
	}

	window.dispatchEvent(new CustomEvent("mousedown")); // reset dragging

	curLevel.points.length = 0;
	curLevel.bodies.length = 0;
	curLevel.solution.length = 0;
	curLevel.otherBodies.length = 0;
	curLevel.complete = false;

	bg.noisePos.set({ x: 0, y: 0 });
}

function updateCounters() {
	let { rect, diagRect, triangle } = curLevel.max;
	rectCounter.innerHTML = (rect - curLevel.used.rect) + " / " + rect;
	diagRectCounter.innerHTML = (diagRect - curLevel.used.diagRect) + " / " + diagRect;
	triangleCounter.innerHTML = (triangle - curLevel.used.triangle) + " / " + triangle;
}

let bg = {
	scale: 1,
	opacity: 1,
	offset: new vec(0, 0),
	noisePos: new vec(0, 0),
}

let renderExampleBG = null;
let renderExampleFG = null;

Render.on("beforeRender", () => { // Render background
	if (inGame || inTitle) {
		let delta = Performance.delta / 17;
		bg.noisePos.x += delta * 0.004;
		bg.noisePos.y += delta * 0.004;
	}
	if (inGame) {
		// boxes
		let { bounds, center } = curLevel;
		ctx.scale(bg.scale, bg.scale);
		ctx.globalAlpha = bg.opacity;
		let margin = 100;
		let offset = 50;
		let round = 70;
		let delta = Performance.delta / 17;
		let bgVerts = [
			new vec((bounds.min.x * 100 - center.x) - margin, (bounds.min.y * 100 - center.y) - margin * 0.9),
			new vec((bounds.max.x * 100 - center.x) + margin, (bounds.min.y * 100 - center.y) - margin * 0.9),
			new vec((bounds.max.x * 100 - center.x) + margin, (bounds.max.y * 100 - center.y) + margin),
			new vec((bounds.min.x * 100 - center.x) - margin, (bounds.max.y * 100 - center.y) + margin),
		];

		function fill() {
			ctx.globalCompositeOperation = "destination-out";
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.fill();
		}

		let small =  (window.innerWidth * window.innerHeight) / 1000 < 600;
		let medium = (window.innerWidth * window.innerHeight) / 1000 < 1400; // assume smaller screen size = less cpu power
		let dotSpace = small ? 130 : medium ? 110 : 90;
		let dotSize = small ? 16 : medium ? 15 : 14;
		let camBounds = camera.bounds;
		let width =  Math.ceil((camBounds.max.x - camBounds.min.x) / dotSpace) * dotSpace;
		let height = Math.ceil((camBounds.max.y - camBounds.min.y) / dotSpace) * dotSpace;
		ctx.fillStyle = "#1A1E39";
		if (small) {
			ctx.beginPath();
			for (let x = 0; x < width; x += dotSpace) {
				for (let y = 0; y < height; y += dotSpace) {
					let curX = x + camBounds.min.x;
					let curY = y + camBounds.min.y + 20;

					let size = dotSize;
					let opacity = bg.opacity * Math.min(1, 200 / new vec(curY, curX).length)
					// if (Math.abs(curY) > height/2 - 300) {
					// 	opacity *= (height/2 - 300) / Math.abs(curY);
					// }
					if (opacity <= 0.3) continue;
					ctx.moveTo(curX, curY);
					ctx.arc(curX, curY, size, 0, Math.PI*2);
				}
			}
			ctx.fill();
		}
		else {
			for (let x = 0; x < width; x += dotSpace) {
				for (let y = 0; y < height; y += dotSpace) {
					let noiseVal = (noise.simplex2(x * 0.002 + bg.noisePos.x, y * 0.002 + bg.noisePos.y) + 1) / 2 * 1 + 0;
					let curX = x + camBounds.min.x;
					let curY = y + camBounds.min.y + 10;
					// let size = dotSize * Math.max(0.3, (1 - 100 / new vec(curX, curY).sub(mouse.gamePos).length));
					let size = dotSize * noiseVal * Math.max(0.3, (1 - 100 / new vec(curX, curY).sub(mouse.gamePos).length));
					// let opacity = (300 / (Math.max(0, Math.max(Math.abs(x + camBounds.min.x), Math.abs(y + camBounds.min.y)) - 200))) ** 1.5 * noiseVal * bg.opacity ** (bg.scale ** 0.5);
					let opacity = (noiseVal * 0.5 + 0.5) * bg.opacity ** (bg.scale ** 0.5);
					if (Math.abs(curY) > height/2 - 300) {
						opacity *= (height/2 - 300) / Math.abs(curY);
					}
					if (opacity <= 0.2) continue;
					ctx.globalAlpha = opacity;
					ctx.beginPath();
					ctx.arc(curX, curY, size, 0, Math.PI*2);
					ctx.fill();
				}
			}
		}
		ctx.globalAlpha = bg.opacity;


		bg.offset.sub2(bg.offset.sub(mouse.gamePos.mult(0.1)).mult(delta * 0.03));
		// bg.offset.y += (bg.offset.y - Math.pow(Math.abs(mouse.gamePos.y * 0.06), 1) * Math.sign(mouse.gamePos.y)) * 0.01 * delta;

		ctx.beginPath();
		Render.roundedPolygon(bgVerts.map(v => v.add({ x: -offset*0.8 + bg.offset.x, y: offset*2 + bg.offset.y})), round);
		ctx.fillStyle = "#111529";
		fill();

		if (renderExampleBG && curExample.hasExample) renderExampleBG();

		ctx.beginPath();
		Render.roundedPolygon(bgVerts.map(v => v.add({ x: -offset*0.4 + bg.offset.x / 2, y: offset + bg.offset.y / 2})), round);
		ctx.fillStyle = "#13172E";
		fill();

		ctx.beginPath();
		Render.roundedPolygon(bgVerts, round);
		ctx.fillStyle = "#1A1E39";
		fill();

		if (renderExampleFG && curExample.hasExample) renderExampleFG();

		ctx.scale(1 / bg.scale, 1 / bg.scale);

		ctx.globalAlpha = 1;
	}
	if (inTitle) {
		let small =  (window.innerWidth * window.innerHeight) / 1000 < 600;
		let medium = (window.innerWidth * window.innerHeight) / 1000 < 1400; // assume smaller screen size = less cpu power
		let dotSpace = small ? 130 : medium ? 110 : 90;
		let dotSize = small ? 16 : medium ? 15 : 14;
		let camBounds = camera.bounds;
		let width =  Math.ceil((camBounds.max.x - camBounds.min.x) / dotSpace) * dotSpace;
		let height = Math.ceil((camBounds.max.y - camBounds.min.y) / dotSpace) * dotSpace;
		ctx.fillStyle = "#1A1E39";
		if (small) {
			ctx.beginPath();
			for (let x = 0; x < width; x += dotSpace) {
				for (let y = 0; y < height; y += dotSpace) {
					let curX = x + camBounds.min.x;
					let curY = y + camBounds.min.y + 20;

					let size = dotSize;
					let opacity = bg.opacity * Math.min(1, 200 / new vec(curY, curX).length)
					if (opacity <= 0.3) continue;
					ctx.moveTo(curX, curY);
					ctx.arc(curX, curY, size, 0, Math.PI*2);
				}
			}
			ctx.fill();
		}
		else {
			for (let x = 0; x < width; x += dotSpace) {
				for (let y = 0; y < height; y += dotSpace) {
					let noiseVal = (noise.simplex2(x * 0.002 + bg.noisePos.x, y * 0.002 + bg.noisePos.y) + 1) / 2;
					let curX = x + camBounds.min.x;
					let curY = y + camBounds.min.y + 10;
					let size = dotSize * noiseVal;
					let opacity = noiseVal * bg.opacity ** (bg.scale ** 0.5);
					if (Math.abs(curY) > height/2 - 300) {
						opacity *= (height/2 - 300) / Math.abs(curY);
					}
					if (opacity <= 0.2) continue;
					ctx.globalAlpha = opacity;
					ctx.beginPath();
					ctx.arc(curX, curY, size, 0, Math.PI*2);
					ctx.fill();
				}
			}
		}
	}
});