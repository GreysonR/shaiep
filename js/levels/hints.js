"use strict";

let lastHint = -5000;
let currentHints = {};
function getHint() {
	let { name, solution: bodies, center } = curLevel;
	let hintTime = 3000;

	if (bodies.length > 0 && Performance.lastUpdate - lastHint > hintTime && curLevel.complete === false) {

		lastHint = Performance.lastUpdate;
		if (hints[name] === undefined) hints[name] = -1;

		let curHint = hints[name] + 1;
		if (curHint >= bodies.length) curHint = 0;
		let hid = name + "-" + curHint;

		if (currentHints[hid]) return;

		playSound(`sharpClick1.mp3`, 0.4);
		hints[name] = curHint;

		let body = bodies[curHint];
		let vertices = body.vertices.map(v => new vec(v).mult2(100).sub2(center));
		let position = new vec(body).mult2(100).sub2(center);

		let obj = new fromVertices(vertices, position, {
			hid: hid,
			onend: setTimeout(() => {
				delete currentHints[obj.hid];
				obj.delete();
			}, 4000),
			render: {
				background: "#FFA36118",
				border: "#FFA361a0",
				borderWidth: 4,
				opacity: 0,
				layer: 1,
			}
		});
		currentHints[hid] = obj;

		animations.showHint(obj);

		document.getElementById("hint").classList.add("inactive");

		setTimeout(() => {
			document.getElementById("hint").classList.remove("inactive");
		}, hintTime);
	}
}