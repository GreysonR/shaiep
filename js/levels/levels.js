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

	let center = new vec(0, 0);
	let bounds = { min: new vec(0, 0), max: new vec(0, 0) };
	for (let p of point) {
		center.add2(p);

		bounds.min.min2(p);
		bounds.max.max2(p);
	}
	center.div2(point.length);

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
			}
		});
		curLevel.points.push(obj);
	}
}
function unloadLevel() {
	curLevel.used.rect = 0;
	curLevel.used.diagRect = 0;
	curLevel.used.triangle = 0;
	curLevel.coveredPoints = 0;
	curLevel.maxPoints = 0;

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