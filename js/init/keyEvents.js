"use strict";

window.addEventListener("keydown", event => {
	let key = event.key.toLowerCase();

	if (key === "r" && inGame) {
		playSound(`reverse.mp3`);
		loadLevel(curLevel.name);
	}
	if (key === "escape" && inGame) {
		playSound(`sharpClick1.mp3`, 0.4);
		unloadLevel();
		openHome();
	}
	if (event.altKey && key === "q") {
		document.getElementById("mapInput").classList.toggle("active");
	}
	if (event.shiftKey && key === "x") {
		localStorage.clear();
		window.location.reload();
	}
});
window.addEventListener("keyup", event => {
	let key = event.key.toLowerCase();
});

let mouse = {
	screenPos: new vec(0, 0),
	gamePos: new vec(0, 0),
	path: [],
	dragging: false,
	badLine: false,
};
window.addEventListener("mousemove", event => {
	let screenPos = new vec(event.clientX, event.clientY);
	let gamePos = camera.screenPtToGame(screenPos);

	mouse.screenPos = screenPos;
	mouse.gamePos = gamePos;
});
window.addEventListener("mousedown", event => {
	if (mouse.dragging || !inGame) return;

	let mousePos = new vec(event.clientX, event.clientY);
	let gamePos = camera.screenPtToGame(mousePos);
	let downStart = performance.now();

	if (event.button === 2) { // delete box with right click
		for (let body of curLevel.bodies) {
			if (body.containsPoint(gamePos)) {
				// get points in other bodies (super slow big O but who cares it's 4 shapes and 10 points max)
				let coveredPoints = new Set();
				for (let bodyB of curLevel.bodies) {
					if (bodyB === body) continue;

					for (let point of curLevel.points) {
						if (bodyB.containsPoint(point.position) && (point.isEdge || point.isInside)) {
							coveredPoints.add(point);
						}
					}
				}

				// remove points covered by this body but not by others
				for (let point of curLevel.points) {
					if (!coveredPoints.has(point) && (point.isEdge || point.isInside) && body.containsPoint(point.position)) {
						point.isEdge = false;
						point.isInside = false;
						point.render.background = "#BFD1E5";
						curLevel.coveredPoints--;
					}
				}
				body.delete();
				curLevel.bodies.delete(body);
				curLevel.used[body.shapeType]--;

				updateCounters();
				break;
			}
		}
	}
	if (event.button !== 0) return;


	for (let point of curLevel.points) {
		if (!point.bad && !point.isInside && point.position.sub(gamePos).length <= 40) {
			playSound(`softClick${ Math.floor(Math.random() * 3) + 1 }.mp3`);
			mouse.path.push(point);

			if (!point.isEdge && !point.isInside && !point.bad) {
				point.render.background = "#62C370";
			}
			
			animations.selectPoint(point);

			function mousemove(event) {
				mouse.badLine = false;

				// check for bad points in line
				(function checkBadPoints() {
					if (mouse.path.length === 0) return;
					point = mouse.path[mouse.path.length - 1];

					let posA = mouse.gamePos;
					let dirA = point.position.sub(posA).normalize2();
					let dirALen = point.position.sub(posA).length;

					for (let pointB of curLevel.points) {
						if (!pointB.bad || mouse.path.includes(pointB) && (mouse.path.length <= 2 || mouse.path[0] !== pointB)) continue;
	
						let dirB = pointB.position.sub(posA);
						
						let dot = dirA.dot(dirB);
						let cross = dirA.cross(dirB);
	
						if (dot > -10 && dot <= dirALen + 20 && Math.abs(cross) <= 10) {
							mouse.badLine = true;
							break;
						}
					}
				})();

				for (let point of curLevel.points) {
					if (!point.isInside && point.position.sub(mouse.gamePos).length <= 25 && (!mouse.path.includes(point) || mouse.path.length > 2 && mouse.path[0] === point)) {

						let foundPoints = [];

						// check if any points are in the line
						let posA = mouse.path[mouse.path.length - 1].position;
						let dirALen = point.position.sub(posA).length;
						let dirA = point.position.sub(posA).normalize2();
						for (let pointB of curLevel.points) {
							if (mouse.path.includes(pointB) && (mouse.path.length <= 2 || mouse.path[0] !== pointB)) continue;

							let dirB = pointB.position.sub(posA);
							
							let dot = dirA.dot(dirB);
							let cross = dirA.cross(dirB);

							if (dot > 0 && dot <= dirALen + 20 && Math.abs(cross) <= 10) {
								if (pointB.bad) {
									foundPoints.length = 0;
									break;
								}
								foundPoints.push([pointB, dot]);
							}
						}

						let foundEnd = false;
						foundPoints.sort((a, b) => a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0);
						for (let i = 0; i < foundPoints.length; i++) {
							let point = foundPoints[i][0];
							if (!point.isEdge && !point.isInside && !point.bad) {
								point.render.background = "#62C370";
							}

							animations.selectPoint(point);

							if (mouse.path[0] === point) {
								foundEnd = true;
								cancel();
								break;
							}
							else {
								mouse.path.push(point);
							}
						}
						if (foundPoints.length > 0 && !foundEnd) {
							playSound(`softClick${ Math.floor(Math.random() * 3) + 1 }.mp3`);
						}

						break;
					}
				}
			}
			function cancel(event) {
				for (let point of mouse.path) {
					if (!point.isEdge && !point.isInside && !point.bad) {
						point.render.background = "#BFD1E5";
					}
				}

				let vertices = mouse.path.map(v => new vec(v.position));
				if (vertices.length >= 3 && !event) {
					// get axes
					let axes = [];
					for (let i = 1; i <= vertices.length; i++) {
						axes.push(vertices[i % vertices.length].sub(vertices[i - 1]).normalize2());
					}

					// remove colinear points
					for (let i = 1; i <= vertices.length; i++) {
						let curAxis = axes[i % axes.length];
						let lastAxis = axes[i - 1];

						if (curAxis.sub(lastAxis).length <= 0.01) {
							i = i % vertices.length;
							vertices.splice(i, 1);
							axes.splice(i, 1);
							if (i === 0) break;
							i--;
						}
					}

					function fail() {
						playSound(`WrongClick.mp3`, 0.6);
					}

					// detect shape type
					let rect = vertices.length === 4;
					let diagRect = vertices.length === 4;
					let triangle = vertices.length === 3;
					if (rect) {
						for (let axis of axes) { // check if rect
							if (rect && axis.x && axis.y) {
								rect = false;
								break;
							}
						}
						if (!rect) { // check if diag rect
							let axisA = null;
							let axisB = null;
							for (let axis of axes) {
								if (!axisA) {
									axisA = axis;
								}
								else if (!axisB) {
									axisB = axis;

									if (1 - Math.abs(axisA.cross(axisB)) > 0.01) {
										diagRect = false;
										break;
									}
								}
								else {
									if ((axisA.sub(axis).length > 0.01 && axisA.add(axis).length > 0.01) && (axisB.sub(axis).length > 0.01 && axisB.add(axis).length > 0.01)) {
										diagRect = false;
										break;
									}
								}
							}
						}
						else {
							diagRect = false;
						}
					}


					if (rect || diagRect || triangle) {
						let overMax = false;
						if (triangle) overMax = curLevel.used.triangle >= curLevel.max.triangle;
						else if (rect) overMax = curLevel.used.rect >= curLevel.max.rect;
						else if (diagRect) overMax = curLevel.used.diagRect >= curLevel.max.diagRect;

						if (!overMax) {
							let center = getCenterOfMass(vertices);
							let obj = new fromVertices(vertices, center, {
								render: {
									background: "#62C37020",
									border: "#62C370",
									borderWidth: 4,
								}
							});
		
							let insideShape = false;
							for (let body of curLevel.bodies) {
								let collision = obj.isColliding(body);
								if (collision.collision && collision.overlap > 1) {
									insideShape = true;
									obj.delete();
									break;
								}
							}
							let containsBad = false;
							for (let point of curLevel.points) {
								if (point.bad && obj.containsPoint(point.position)) {
									containsBad = true;
									obj.delete();
									break;
								}
							}
							if (!insideShape && !containsBad) {
								curLevel.bodies.push(obj);
	
								if (triangle) curLevel.used.triangle++;
								else if (rect) curLevel.used.rect++;
								else if (diagRect) curLevel.used.diagRect++;
								updateCounters();
	
								for (let point of curLevel.points) {
									if (obj.containsPoint(point.position)) {
										point.render.background = "#62C370";
										
										if (!point.isEdge && !point.isInside) {
											curLevel.coveredPoints++;
	
											if (curLevel.coveredPoints >= curLevel.maxPoints) {
												if (curLevel.name) {
													let split = curLevel.name.split("-");
													let pid = split[0];
													let lid = split[1];

													let unlockedNext = false;
													if (!data[pid]) data[pid] = [];
													if (!data[pid].includes(lid)) {
														data[pid].push(lid);

														if (data[pid].length >= 5) unlockedNext = true;
													}

													let setElem = document.getElementsByClassName("levelSet")[pid];
													let levelElem = setElem.children[0].children[lid];
													levelElem.classList.add("complete");

													save();
													setTimeout(() => {
														animations.closeLevel(curLevel);
														curLevel.complete = true;
	
														setTimeout(() => {
																let elem = document.getElementsByClassName("levelSet")[pid];
																let maxLid = elem.children[0].childElementCount;
																let maxPid = elem.parentNode.childElementCount;
			
																lid++;
																if (unlockedNext) {
																	lid = 0;
																	pid++;
			
																	if (pid >= maxPid) {
																		pid--;
																	}
																	openHome();
																	setTimeout(() => {
																		shiftHome(1);
	
																		setTimeout(() => {
																			unlockWorld(pid);
																		}, 300);
																	}, 300);
																}
																else if (lid >= maxLid) {
																	lid = 0;
																	openHome();
																}
																else {
																	loadLevel(pid + "-" + lid);
																}
														}, 500);
													}, 400);
												}
											}
										}
										if (mouse.path.includes(point)) { // is an edge point
											point.isEdge = true;
										}
										else { // is inner point
											point.isInside = true;
										}
									}
								}

								// succeed
								obj.shapeType = rect ? "rect" : diagRect ? "diagRect" : "triangle";
								playSound(`shapeCreate${ Math.floor(Math.random() * 3) + 1 }.mp3`);
							}
							else {
								fail();
							}
						}
						else {
							fail();
						}
					}
					else {
						fail();
					}
				}
				mouse.path.length = 0;
				window.removeEventListener("mousemove", mousemove);
				window.removeEventListener("mousedown", cancel);
				window.removeEventListener("mouseup", checkCancel);
				mouse.dragging = false;
			}
			function checkCancel(event) {
				if (event.button === 0 && performance.now() - downStart > 300) {
					cancel(event);
				}
			}
			window.addEventListener("mousemove", mousemove);
			window.addEventListener("mousedown", cancel);
			window.addEventListener("mouseup", checkCancel);
			mouse.dragging = true;

			break;
		}
	}
});

Render.on("beforeLayer0", () => {
	if (mouse.path.length > 0) {
		ctx.beginPath();
		for (let i = 0; i < mouse.path.length; i++) {
			let point = mouse.path[i];
			if (i === 0) {
				ctx.moveTo(point.position.x, point.position.y);
			}
			else {
				ctx.lineTo(point.position.x, point.position.y);
			}
		}

		if (!mouse.badLine) ctx.lineTo(mouse.gamePos.x, mouse.gamePos.y);
		ctx.lineWidth = 6;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.strokeStyle = "#62C370";
		ctx.stroke();

		if (mouse.badLine) {
			ctx.beginPath();
			let lastPos = mouse.path[mouse.path.length - 1].position;
			ctx.moveTo(lastPos.x, lastPos.y);
			ctx.lineTo(mouse.gamePos.x, mouse.gamePos.y);
			ctx.strokeStyle = "#C5594A";
			ctx.stroke();
		}
	}
});