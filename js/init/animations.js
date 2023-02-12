"use strict";

var animations = {
	selectPoint: function(point) {
		if (point.animation) point.animation.stop();
		if (!point.originalRadius) point.originalRadius = point.radius;

		point.animation = animation.create({
			duration: 150,
			curve: ease.in.quintic,
			callback: function(p) {
				point.radius = point.originalRadius + 4 * (1 - p);
			},
			onend: function() {
				point.radius = point.originalRadius;
			},
			onstop: function() {
				point.radius = point.originalRadius;
			},
		});
	},
	openExample: function(level) {
		animation.create({
			delay: 0,
			duration: 300,
			curve: ease.out.cubic,
			callback: function(p) {
				exbg.opacity = p;
				exbg.scale = 0.7 + p * 0.3;
			},
			onend: function() {
				exbg.opacity = 1;
				exbg.scale = 1;
			},
		});
	},
	openLevel: function(level) {
		let { bodies, points } = level;
		let center = new vec(0, 0);

		for (let point of points) {
			animations.openPoint(point, center);
		}

		animation.create({
			delay: 0,
			duration: 300,
			curve: ease.out.cubic,
			callback: function(p) {
				bg.opacity = p;
				bg.scale = 0.7 + p * 0.3;
			},
			onend: function() {
				bg.opacity = 1;
				bg.scale = 1;
			},
		});
	},
		openPoint: function(point, center) {
			if (point.animation) point.animation.stop();
			if (!point.originalRadius) point.originalRadius = point.radius;
			if (!point.originalPosition) point.originalPosition = new vec(point.position);

			let diff = point.originalPosition.sub(center);

			animation.create({
				duration: 200,
				curve: ease.out.quintic,
				callback: function(p) {
					point.render.visible = true;
					point.render.opacity = p;
				},
				onend: function() {
					point.render.opacity = 1;
				},
			});
	
			point.animation = animation.create({
				duration: 300,
				curve: ease.out.quintic,
				callback: function(p) {
					p = 0.7 + 0.3 * p;
					point.radius = point.originalRadius * (p ** 0.5);
					point.position = center.add(diff.mult(p));
				},
				onend: function() {
					point.radius = point.originalRadius;
					point.position = new vec(point.originalPosition);
				},
				onstop: function() {
					point.radius = point.originalRadius;
					point.position = new vec(point.originalPosition);
				},
			});
		},
	closeExample: function() {
		animation.create({
			delay: 50,
			duration: 250,
			curve: ease.in.cubic,
			callback: function(p) {
				exbg.opacity = 1 - p;
				exbg.scale = 1 - 0.3 * p
			},
			onend: function() {
				exbg.opacity = 0;
				exbg.scale = 0.7;
			},
		});
	},
	closeLevel: function(level) {
		let { bodies, points } = level;
		let center = new vec(0, 0);

		for (let point of points) {
			animations.closePoint(point, center);
		}
		for (let body of bodies) {
			animations.closeBody(body, center);
		}
		
		let hids = Object.keys(currentHints);
		for (let hid of hids) {
			clearInterval(currentHints[hid].onend);
			currentHints[hid].delete();
			delete currentHints[hid];
		}

		animation.create({
			delay: 50,
			duration: 250,
			curve: ease.in.cubic,
			callback: function(p) {
				bg.opacity = 1 - p;
				bg.scale = 1 - 0.3 * p
			},
			onend: function() {
				bg.opacity = 0;
				bg.scale = 0.7;
			},
		});
	},
		closePoint: function(point, center) {
			if (point.animation) point.animation.stop();
			if (!point.originalRadius) point.originalRadius = point.radius;
			if (!point.originalPosition) point.originalPosition = new vec(point.position);

			let diff = point.originalPosition.sub(center);
	
			animation.create({
				delay: 200,
				duration: 150,
				curve: ease.out.quintic,
				callback: function(p) {
					point.render.opacity = 1 - p;
				},
				onend: function() {
					point.render.opacity = 0;
				},
			});
			point.animation = animation.create({
				duration: 300,
				curve: ease.in.cubic,
				callback: function(p) {
					p = 0.6 * p;
					point.radius = point.originalRadius * (1 - p ** 2);
					point.position = center.add(diff.mult(1 - p));
				},
				onend: function() {
					point.radius = point.originalRadius;
					point.position = new vec(point.originalPosition);
					point.delete();
				},
				onstop: function() {
					point.radius = point.originalRadius;
					point.position = new vec(point.originalPosition);
					point.delete();
				},
			});
		},
		closeBody: function(body, center) {
			if (!body.originalPosition) body.originalPosition = new vec(body.position);
			let bodyDiff = body.originalPosition.sub(center);

			animation.create({
				delay: 200,
				duration: 150,
				curve: ease.out.quintic,
				callback: function(p) {
					body.render.opacity = 1 - p;
				},
				onend: function() {
					body.render.opacity = 0;
				},
			});

			for (let point of body.vertices) {
				if (point.animation) point.animation.stop();
				if (!point.originalPosition) point.originalPosition = new vec(point);
				let ptDiff = point.originalPosition.sub(body.position);

				point.animation = animation.create({
					duration: 300,
					curve: ease.in.cubic,
					callback: function(p) {
						p = 0.6 * p;
						point.set(center.add(bodyDiff.add(ptDiff).mult(1 - p)));
					},
					onend: function() {
						point.set(new vec(point.originalPosition));
						body.delete();
					},
					onstop: function() {;
						point.set(new vec(point.originalPosition));
						body.delete();
					},
				});
			}
		},
	showHint: function(body) {
		animation.create({
			duration: 1000,
			curve: ease.out.quintic,
			callback: function(p) {
				body.render.opacity = p;
			},
			onend: function() {
				body.render.opacity = 1;
			}
		});
		animation.create({
			delay: 2500,
			duration: 1500,
			curve: ease.in.quintic,
			callback: function(p) {
				body.render.opacity = 1 - p;
			},
			onend: function() {
				body.render.opacity = 1;
			}
		});
	},
	deleteShape: function(body, delay = 500, duration = 200) {
		animation.create({
			delay: delay,
			duration: duration,
			curve: ease.in.cubic,
			callback: function(p) {
				body.render.opacity = 1 - p;
			},
			onend: function() {
				body.delete();
			}
		})
	},
}