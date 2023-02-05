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
	points: [],
	bodies: [],
	otherBodies: [],
}

function loadLevel(name) {
	let level = typeof name === "object" ? name : levels[name];

	curLevel.name = typeof name === "object" ? "Unknown" : name;
	curLevel.data = level;

	unloadLevel();

	let { point, badPoint, rect, diagRect, triangle } = level;

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

	curLevel.otherBodies.push(new rectangle((bounds.max.x - bounds.min.x) * 100 + 150, (bounds.max.y - bounds.min.y) * 100 + 150, new vec(0, 0), {
		render: {
			visible: false,
			layer: -1,
			background: "#111429",
			border: "#0D0F1840",
			borderWidth: 0,
			bloom: 0,
			round: 20,
		}
	}));

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

	window.dispatchEvent(new CustomEvent("mousedown")); // reset dragging

	curLevel.points.length = 0;
	curLevel.bodies.length = 0;
	curLevel.otherBodies.length = 0;
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
}

Render.on("beforeRender", () => { // Render background
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
		
		/*
		for (let s = 0; s < 8; s++) { // maybe change to dots later
			ctx.beginPath();
			let m = 100 * (s + 1);
			Render.roundedPolygon([
					new vec((bounds.min.x * 100 - center.x) - m, (bounds.min.y * 100 - center.y) - m * 0.9),
					new vec((bounds.max.x * 100 - center.x) + m, (bounds.min.y * 100 - center.y) - m * 0.9),
					new vec((bounds.max.x * 100 - center.x) + m, (bounds.max.y * 100 - center.y) + m),
					new vec((bounds.min.x * 100 - center.x) - m, (bounds.max.y * 100 - center.y) + m),
				], 150);
			ctx.strokeStyle = "#171D3C10";
			ctx.lineWidth = 30;
			ctx.stroke();
		}*/

		let dotSpace = 70;
		let dotSize = 12;
		let camBounds = camera.bounds;
		let width =  Math.ceil((camBounds.max.x - camBounds.min.x) / dotSpace) * dotSpace;
		let height = Math.ceil((camBounds.max.y - camBounds.min.y) / dotSpace) * dotSpace;
		ctx.fillStyle = "#13172E";
		for (let x = 0; x < width; x += dotSpace) {
			for (let y = 0; y < height; y += dotSpace) {
				let curX = x + camBounds.min.x;
				let curY = y + camBounds.min.y + 10;
				let size = dotSize * Math.max(0.3, (1 - 100 / new vec(curX, curY).sub(mouse.gamePos).length));
				let opacity = (300 / (Math.max(0, Math.max(Math.abs(x + camBounds.min.x), Math.abs(y + camBounds.min.y)) - 200))) ** 1.5 * bg.opacity ** (bg.scale ** 0.5);
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
		ctx.globalAlpha = bg.opacity;


		bg.offset.sub2(bg.offset.sub(mouse.gamePos.mult(0.1)).mult(delta * 0.03));
		// bg.offset.y += (bg.offset.y - Math.pow(Math.abs(mouse.gamePos.y * 0.06), 1) * Math.sign(mouse.gamePos.y)) * 0.01 * delta;

		ctx.beginPath();
		Render.roundedPolygon(bgVerts.map(v => v.add({ x: -offset*0.8 + bg.offset.x, y: offset*2 + bg.offset.y})), round);
		ctx.fillStyle = "#111529";
		fill();

		ctx.beginPath();
		Render.roundedPolygon(bgVerts.map(v => v.add({ x: -offset*0.4 + bg.offset.x / 2, y: offset + bg.offset.y / 2})), round);
		ctx.fillStyle = "#13172E";
		fill();

		ctx.beginPath();
		Render.roundedPolygon(bgVerts, round);
		ctx.fillStyle = "#161A31";
		fill();

		ctx.scale(1 / bg.scale, 1 / bg.scale);

		ctx.globalAlpha = 1;
	}
});