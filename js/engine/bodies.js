"use strict";

function mergeObj(obj, options) {
	Object.keys(options).forEach(option => {
		let value = options[option];
		
		if (Array.isArray(value)) {
			obj[option] = [ ...value ];
		}
		else if (typeof value === "object") {
			if (typeof obj[option] !== "object") {
				obj[option] = {};
			}
			mergeObj(obj[option], value);
		}
		else {
			obj[option] = value;
		}
	});
}
function getCenterOfMass(vertices) { /* https://bell0bytes.eu/centroid-convex/ */
	let centroid = new vec(0, 0);
	let det = 0;
	let tempDet = 0;
	let numVertices = vertices.length;

	for (let i = 0; i < vertices.length; i++) {
		let curVert = vertices[i];
		let nextVert = vertices[(i + 1) % numVertices];

		tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
		det += tempDet;

		centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
	}

	centroid.div2(3 * det);

	return centroid;
}
function angleDiff(angle1, angle2) {
	function mod(a, b) {
		return a - Math.floor(a / b) * b;
	}
	return mod(angle1 - angle2 + Math.PI, Math.PI * 2) - Math.PI;
}
Array.prototype.delete = function(val) {
	if (this.includes(val)) {
		this.splice(this.indexOf(val), 1);
	}
}
Array.prototype.choose = function() {
	return this[Math.floor(Math.random() * this.length)];
}

class Body {
	static id = 0;
	constructor(type, options, vertices) {
		this.type = type;
		this.id = Body.id++;

		if (!options.render) options.render = {};
		
		this.vertices = vertices;
		this.resetVertices();

		mergeObj(this, options);
	}

	id = 0;
	position = new vec(0, 0);
	angle = 0;
	rotationPoint = new vec(0, 0);
	vertices = [];
	removed = true;
	last = {
		angle: 0,
		position: new vec(0, 0),
	}
	render = {
		background: "#E3402A",
		border: "transparent",
		borderWidth: 3,
		borderType: "round",
		visible: true,
		opacity: 1,
		layer: 0,
	}
	
	// adding / removing from world
	delete() {
		Render.bodies[this.render.layer].delete(this);
		this.removed = true;

		return this;
	}
	add() {
		if (!Render.bodies[this.render.layer]) {
			Render.bodies[this.render.layer] = new Set();
		}
		Render.bodies[this.render.layer].add(this);

		return this;
	}

	// vertice setup
	resetVertices() {
		this.recenterVertices();
		this.updateAxes();
		this.makeCCW();
	}
	updateAxes() {
		let verts = this.vertices;
		let axes = [];

		for (let i = 0; i < verts.length; i++) {
			let curVert = verts[i];
			let nextVert = verts[(i + 1) % verts.length];

			// Prevents duplicate axes
			let axis = curVert.sub(nextVert);
			let dupe = false;
			
			for (let j = 0; j < axes.length; j++) {
				let sub = axes[j].sub(axis);
				let add = axes[j].add(axis);
				if (Math.abs(sub.x) < 0.001 && Math.abs(sub.y) < 0.001 || Math.abs(add.x) < 0.001 && Math.abs(add.y) < 0.001) {
					dupe = true;
					break;
				}
			}
			if (!dupe) {
				axes.push(axis);
			}
		}
		for (let i = 0; i < axes.length; i++) {
			axes[i] = axes[i].normal().normalize2();
		}

		this.axes = axes;
	}
	makeCCW() { // makes vertices go counterclockwise
		let vertices = this.vertices;
		let center = this.position;
		let mapped = vertices.map(v => [v, v.sub(center).angle]);
		mapped.sort((a, b) => a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0);
		this.vertices = mapped.map(v => v[0]);
	}
	getCenterOfMass() { /* https://bell0bytes.eu/centroid-convex/ */
		let vertices = this.vertices;
		let centroid = new vec(0, 0);
		let det = 0;
		let tempDet = 0;
		let numVertices = vertices.length;

		for (let i = 0; i < vertices.length; i++) {
			let curVert = vertices[i];
			let nextVert = vertices[(i + 1) % numVertices];

			tempDet = curVert.x * nextVert.y - nextVert.x * curVert.y;
			det += tempDet;

			centroid.add2({ x: (curVert.x + nextVert.x) * tempDet, y: (curVert.y + nextVert.y) * tempDet });
		}

		centroid.div2(3 * det);

		return centroid;
	}
	containsPoint(point) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			let curVertice = vertices[i];
			let nextVertice = vertices[(i + 1) % vertices.length];
			
			if ((point.x - curVertice.x) * (nextVertice.y - curVertice.y) + (point.y - curVertice.y) * (curVertice.x - nextVertice.x) < -1) {
				return false;
			}
		}
		return true;
	}
	isColliding(bodyB) {
		let bodyA = this;
		let collision = true;
		let minOverlap = Infinity;

		function getAllSupports(body, direction) {
			let vertices = body.vertices;
			let maxDist = -Infinity;
			let minDist = Infinity;
			// let maxVert, minVert;

			for (let i = 0; i < vertices.length; i++) {
				let dist = direction.dot(vertices[i]);

				if (dist > maxDist) {
					maxDist = dist;
					// maxVert = i;
				}
				if (dist < minDist) {
					minDist = dist;
					// minVert = i;
				}
			}

			return { max: maxDist, min: minDist };
		}

		// ~ bodyA axes
		for (let j = 0; j < bodyA.axes.length; j++) {
			let axis = bodyA.axes[j];
			let supportsA = getAllSupports(bodyA, axis);
			let supportsB = getAllSupports(bodyB, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);


			if (overlap < 0) {
				collision = false;
				break;
			}
			else if (overlap < minOverlap) minOverlap = overlap;
		}
		// ~ bodyB axes
		for (let j = 0; j < bodyB.axes.length; j++) {
			let axis = bodyB.axes[j];
			let supportsA = getAllSupports(bodyB, axis);
			let supportsB = getAllSupports(bodyA, axis);
			let overlap = Math.min(supportsA.max - supportsB.min, supportsB.max - supportsA.min);
			
			if (overlap < 0) {
				collision = false;
				break;
			}
			else if (overlap < minOverlap) minOverlap = overlap;
		}

		return {
			collision: collision,
			overlap: minOverlap,
		};
	}
	recenterVertices() {
		let center =  this.getCenterOfMass();
		center.sub2(this.position);
		for (let i = 0; i < this.vertices.length; i++) {
			this.vertices[i].sub2(center);
		}
	}
	centerSprite() {
		let options = this;
		if (options.render.sprite) {
			if (!(options.render.spriteWidth && options.render.spriteHeight)) {
				if (options.width) options.render.spriteWidth = options.width;
				if (options.height) options.render.spriteHeight = options.height;
				if (options.radius) {
					options.render.spriteWidth =  options.radius * 2;
					options.render.spriteHeight = options.radius * 2;
				}
			}
			if (options.render.spriteX === undefined || options.render.spriteY === undefined) {
				if (options.width && options.render.spriteX === undefined) options.render.spriteX = -options.width/2;
				if (options.height && options.render.spriteY === undefined) options.render.spriteY = -options.height/2;
				if (options.radius) {
					if (options.render.spriteX === undefined) options.render.spriteX = -options.render.spriteWidth  / 2;
					if (options.render.spriteY === undefined) options.render.spriteY = -options.render.spriteHeight / 2;
				}
			}
		}
	}
	// translating
	setAngle(angle) {
		if (angle !== this.last.angle) {
			let vertices = this.vertices;
			let position = this.position;
			let rotationPoint = this.rotationPoint.rotate(angle);
			let delta = -(this.last.angle - angle);
			let sin = Math.sin(delta);
			let cos = Math.cos(delta);

			for (let i = vertices.length; i-- > 0;) {
				let vert = vertices[i];
				let dist = vert.sub(position);
				vert.x = position.x + (dist.x * cos - dist.y * sin);
				vert.y = position.y + (dist.x * sin + dist.y * cos);
			}

			let posOffset = this.rotationPoint.rotate(this.last.angle).sub(rotationPoint);
			this.translate(posOffset);

			this.translateAngle(-this.angularVelocity);
			
			this.angle = angle;
			this.last.angle = angle;
		}

		return this;
	}
	translateAngle(angle, silent = false) {
			let vertices = this.vertices;
			let position = this.position;
			let rotationPoint = this.rotationPoint.rotate(this.angle + angle);
			let sin = Math.sin(angle);
			let cos = Math.cos(angle);

			for (let i = vertices.length; i-- > 0;) {
				let vert = vertices[i];
				let dist = vert.sub(position);
				vert.x = position.x + (dist.x * cos - dist.y * sin);
				vert.y = position.y + (dist.x * sin + dist.y * cos);
			}

			let posOffset = this.rotationPoint.rotate(this.angle).sub(rotationPoint);
			this.translate(posOffset);
			this.last.position.add2(posOffset);

			if (!silent) {
				this.angle += angle;
			}
			this.updateAxes();

		return this;
	}
	setPosition(position, silent = false) {
		let last = this.position;
		if (position.x !== last.x || position.y !== last.y) {
			let delta = position.sub(last);
			let vertices = this.vertices;
			for (let i = 0; i < vertices.length; i++) {
				vertices[i].add2(delta);
			}

			if (!silent) {
				this.last.position.x = position.x;
				this.last.position.y = position.y;
			}

			this.position.x = position.x;
			this.position.y = position.y;
		}
	}
	translate(delta, silent = false) {
		let vertices = this.vertices;
		for (let i = 0; i < vertices.length; i++) {
			vertices[i].add2(delta);
		}

		if (!silent) {
			this.position.add2(delta);
		}
	}
	// events
	events = {
		collisionStart: [],
		collisionActive: [],
		collisionEnd: [],
		delete: [],
	}
	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}
	off(event, callback) {
		event = this.events[event];
		if (event.includes(callback)) {
			event.splice(event.indexOf(callback), 1);
		}
	}
	trigger(event, arg1, arg2) {
		this.events[event].forEach(callback => {
			callback(arg1, arg2);
		});

		return this;
	}
}

class rectangle extends Body {
	constructor(width, height, position, options={}) {
		super("rectangle", options, [
			new vec(-width/2, -height/2),
			new vec( width/2, -height/2),
			new vec( width/2,  height/2),
			new vec(-width/2,  height/2),
		]);

		this.width = width;
		this.height = height;
		this.centerSprite();

		this.setPosition(position);
		this.add();
	}
}
class polygon extends Body {
	constructor(radius, numSides, position, options={}) {
		super("polygon", options, (() => {
			let vertices = [];
			let angle = Math.PI * 2 / numSides;
			for (let i = 0; i < numSides; i++) {
				vertices.push(new vec(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius));
			}
			return vertices;
		})());


		this.radius = radius;
		this.numSides = numSides;
		this.centerSprite();

		this.setPosition(position);
		this.add();
	}
}
class circle extends Body {
	constructor(radius, position, options={}) {
		super("circle", options, (() => {
			let vertices = [];
			let numSides = options.numSides || Math.round(Math.pow(radius, 1/3) * 2.8);
			let angle = Math.PI * 2 / numSides;
			for (let i = 0; i < numSides; i++) {
				vertices.push(new vec(Math.cos(angle * i) * radius, Math.sin(angle * i) * radius));
			}
			return vertices;
		})());

		this.radius = radius;
		
		this.setPosition(position);
		this.add();
	}
}
class fromVertices extends Body {
	constructor(vertices, position, options={}) {
		super("polygon", options, vertices);

		this.setPosition(position);
		this.centerSprite();
		this.add();
	}
}