"use strict";

let canv = document.getElementById("canv");
let ctx = canv.getContext("2d");

let Render = (() => {
	function Render() {

		const { position:cameraPosition, fov, boundSize } = camera;
		const canvWidth = canv.width;
		const canvHeight = canv.height;
		let bodies = Render.bodies;

		ctx.clearRect(0, 0, canvWidth, canvHeight);

		camera.translation = { x: -cameraPosition.x * boundSize/fov + canvWidth/2, y: -cameraPosition.y * boundSize/fov + canvHeight/2 };
		camera.scale = boundSize / fov;

		camera.bounds.min.set({ x: -camera.translation.x / camera.scale, y: -camera.translation.y / camera.scale });
		camera.bounds.max.set({ x:  (canvWidth - camera.translation.x) / camera.scale, y:  (canvHeight - camera.translation.y) / camera.scale });

		ctx.save();
		ctx.translate(camera.translation.x, camera.translation.y);
		ctx.scale(camera.scale, camera.scale);

		Render.trigger("beforeRender");
		let layers = Object.keys(bodies).sort((a, b) => {
			a = Number(a);
			b = Number(b);
			return a < b ? -1 : a > b ? 1 : 0;
		});
		for (let layerId of layers) {
			let layer = bodies[layerId];
			Render.trigger("beforeLayer" + layerId);
			for (let body of layer) {
				let { type, vertices, render, position } = body;
				
				if (render.visible) {
					const { background, border, borderWidth, borderType, bloom, opacity, sprite, round, } = render;
					ctx.beginPath();
					ctx.globalAlpha = opacity ?? 1;
					ctx.lineWidth = borderWidth;
					ctx.strokeStyle = border;
					ctx.fillStyle = background;
					ctx.lineJoin = borderType;
	
					if (bloom) {
						ctx.shadowColor = border;
						ctx.shadowBlur = bloom * camera.scale;
					}
					
					if (sprite && Render.images[sprite]) { // sprite render
						let { spriteX, spriteY, spriteWidth, spriteHeight } = render;
	
						ctx.translate(position.x, position.y);
						ctx.rotate(body.angle)
						ctx.drawImage(Render.images[sprite], spriteX, spriteY, spriteWidth, spriteHeight);
						ctx.rotate(-body.angle);
						ctx.translate(-position.x, -position.y);
	
						continue;
					}
		
					ctx.beginPath();
	
					if (body.type === "circle") { // circle render
						ctx.arc(position.x, position.y, body.radius, 0, Math.PI*2);
					}
					else { // vertice render
						if (round > 0) { // rounded vertices
							Render.roundedPolygon(vertices, round);
						}
						else { // normal vertices
							Render.vertices(vertices);
						}
					}
	
					if (ctx.fillStyle && ctx.fillStyle !== "transparent") ctx.fill();
					if (ctx.strokeStyle && ctx.strokeStyle !== "transparent") ctx.stroke();
					
					if (bloom) {
						ctx.shadowColor = "rgba(0, 0, 0, 0)";
						ctx.shadowBlur = 0;
					}
					ctx.globalAlpha = 1;
				}
			}
			Render.trigger("afterLayer" + layerId);
		}
		Render.trigger("afterRender");
		ctx.restore();
		Render.trigger("afterRestore");
	}
	Render.bodies = [new Set()];
	Render.camera = {
		position: { x: 0, y: 0 },
		fov: 1000,
		translation: { x: 0, y: 0 },
		scale: 1,
		boundSize: 1,
		bounds: {
			min: new vec(0, 0),
			max: new vec(1000, 1000),
		},
		// ~ Camera
		screenPtToGame: function(point) {
			let camera = Render.camera;
			let top = parseInt(canv.style.top) || 0;
			return new vec({ x: (point.x - camera.translation.x) / camera.scale, y: (point.y - camera.translation.y - top) / camera.scale });
		},
		gamePtToScreen: function(point) {
			let camera = Render.camera;
			return new vec({ x: point.x * camera.scale + camera.translation.x, y: point.y * camera.scale + camera.translation.y });
		},
	}
	Render.setSize = function(width, height) {
		let offsetTop = Math.min(height * 0.3, 100);
		height -= offsetTop;
		canv.width =  width;
		canv.height = height;
		canv.style.top = offsetTop + "px";
		Render.camera.boundSize = Math.min(width, height); // Math.sqrt(width * height) || 1; // Math.sqrt(width * height) || 1; // Math.sqrt(width**2 + height**2) / 2;
	}

	// - Rendering polygons
	Render.vertices = function(vertices) {
		ctx.moveTo(vertices[0].x, vertices[0].y);

		for (let j = 0; j < vertices.length; j++) {
			if (j > 0) {
				let vertice = vertices[j];
				ctx.lineTo(vertice.x, vertice.y);
			}
		}

		ctx.closePath();
	}
	Render.roundedPolygon = function(vertices, round) {
		if (vertices.length < 3) {
			console.warn("Render.roundedPolygon needs at least 3 vertices", vertices);
			return;
		}
		function getPoints(i) {
			let curPt = vertices[i];
			let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
			let nextPt = vertices[(i + 1) % vertices.length];

			let lastDiff = lastPt.sub(curPt);
			let nextDiff = curPt.sub(nextPt);
			let lastLen = lastDiff.length;
			let nextLen = nextDiff.length;

			let curRound = Math.min(lastLen / 2, nextLen / 2, round);
			let cp = curPt;
			let pt1 = cp.add(lastDiff.normalize().mult(curRound));
			let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

			return [pt1, cp, pt2];
		}

		let start = getPoints(0)
		ctx.moveTo(start[0].x, start[0].y);
		ctx.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

		for (let i = 1; i < vertices.length; i++) {
			let cur = getPoints(i);
			ctx.lineTo(cur[0].x, cur[0].y);
			ctx.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
		}

		ctx.closePath();
	}

	// - Images
	Render.images = {};
	Render.loadImg = function(name) {
		let img = new Image();
		img.src = "./img/" + name;

		img.onload = function() {
			Render.images[name.split(".")[0]] = img;
		}
	}

	// - Events
	Render.events = {
		beforeRender: [],
		afterRender: [],
		afterRestore: [],
		beforeSave: [],
	}
	Render.on = function(event, callback) {
		if (event.includes("beforeLayer") && !Render.events[event]) {
			Render.events[event] = [];
		}
		if (event.includes("afterLayer") && !Render.events[event]) {
			Render.events[event] = [];
		}

		if (Render.events[event]) {
			Render.events[event].push(callback);
		}
		else {
			console.warn(event + " is not a valid event");
		}
	}
	Render.off = function(event, callback) {
		event = Render.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	Render.trigger = function(event) {
		// Trigger each event
		if (Render.events[event]) {
			Render.events[event].forEach(callback => {
				callback();
			});
		}
	}

	return Render;
})();
