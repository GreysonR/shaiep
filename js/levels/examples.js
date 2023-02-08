
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
	const words = text.split(' ');
	let line = '';
	for (const [index, w] of words.entries()) {
		const testLine = line + w + ' ';
		const metrics = ctx.measureText(testLine);
		const testWidth = metrics.width;
		if (testWidth > maxWidth && index > 0) {
			ctx.fillText(line, x, y);
			line = w + ' ';
			y += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, y);
}
const textSize = (ctx, text, maxWidth, lineHeight) => {
	const words = text.split(' ');
	let height = lineHeight;
	let line = '';
	for (const [index, w] of words.entries()) {
		const testLine = line + w + ' ';
		const metrics = ctx.measureText(testLine);
		const testWidth = metrics.width;
		if (testWidth > maxWidth && index > 0) {
			line = w + ' ';
			height += lineHeight;
		} else {
			line = testLine;
		}
	}

	return { width: maxWidth, height: height };
}
let curExample = {
	bounds: { min: new vec(0, 0), max: new vec(1, 1) },
	center: new vec(0, 0),
	scale: 40,
}
function loadExample() {
	let scale = curExample.scale;

	ctx.textAlign = "center";
	ctx.font = "500 25px Montserrat";
	ctx.fillStyle = "#E0EAF5";
	let textBounds = textSize(ctx, curLevel.text, scale*6, 28);
	let bounds = {
		min: new vec(-1, -textBounds.height / 2 / scale),
		max: new vec( 1,  textBounds.height / 2 / scale),
	}
	curExample.bounds = bounds;

	exbg.position.x = (curLevel.bounds.max.x + 8 + (bounds.max.x - bounds.min.x) / 2) * scale;
	exbg.position.y = 0;
}

let exbg = {
	scale: 1,
	opacity: 1,
	offset: new vec(0, 0),
	position: new vec(0, 0),
}

Render.on("beforeRender", () => { // Render example background
	// don't touch please for your own sanity
	if (inGame && curExample.hasExample) {
		let scale = curExample.scale;
		let bgPos = new vec(exbg.position);
		let { bounds, center } = curExample;

		if (canv.width / canv.height < 1.33) { // change to vertical layout
			bgPos.x = 0;
			bgPos.y = (curLevel.bounds.max.y + 6.5 + (bounds.max.y - bounds.min.y) / 2) * scale;
		}

		// boxes
		center = center.sub(bgPos);
		let marginX = 100;
		let marginY = 50;
		let offset = 50;
		let round = 20;
		let delta = Performance.delta / 17;
		let bgVerts = [
			new vec((bounds.min.x * scale - center.x) - marginX, (bounds.min.y * scale - center.y) - marginY * 0.9),
			new vec((bounds.max.x * scale - center.x) + marginX, (bounds.min.y * scale - center.y) - marginY * 0.9),
			new vec((bounds.max.x * scale - center.x) + marginX, (bounds.max.y * scale - center.y) + marginY),
			new vec((bounds.min.x * scale - center.x) - marginX, (bounds.max.y * scale - center.y) + marginY),

			new vec((bounds.min.x * scale - center.x) - marginX, scale * (bounds.max.y - bounds.min.y)/2 - center.y + 30 - 20), // arrow
			new vec((bounds.min.x * scale - center.x) - marginX - 40, scale * (bounds.max.y - bounds.min.y)/2 - center.y - 20),
			new vec((bounds.min.x * scale - center.x) - marginX, scale * (bounds.max.y - bounds.min.y)/2 - center.y - 30 - 20),
		];
		
		if (canv.width / canv.height < 1.33) { // change to vertical layout
			bgVerts = [
				new vec((bounds.min.x * scale - center.x) - marginX, (bounds.min.y * scale - center.y) - marginY * 0.9),

				new vec(scale * (bounds.max.x - bounds.min.x)/2 - center.x - 35 - 30, (bounds.min.y * scale - center.y) - marginY * 0.9), // arrow
				new vec(scale * (bounds.max.x - bounds.min.x)/2 - center.x - 35, (bounds.min.y * scale - center.y) - marginY * 0.9 - 40),
				new vec(scale * (bounds.max.x - bounds.min.x)/2 - center.x - 35 + 30, (bounds.min.y * scale - center.y) - marginY * 0.9),

				new vec((bounds.max.x * scale - center.x) + marginX, (bounds.min.y * scale - center.y) - marginY * 0.9),
				new vec((bounds.max.x * scale - center.x) + marginX, (bounds.max.y * scale - center.y) + marginY * 0.9),
				new vec((bounds.min.x * scale - center.x) - marginX, (bounds.max.y * scale - center.y) + marginY * 0.9),
			];
		}

		function fill() {
			ctx.globalCompositeOperation = "destination-out";
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";
			ctx.fill();
		}

		exbg.offset.sub2(exbg.offset.sub(mouse.gamePos.mult(0.1)).mult(delta * 0.03));

		renderExampleBG = function() {
			ctx.beginPath();
			Render.roundedPolygon(bgVerts.map(v => v.add({ x: -offset*0.2 + bg.offset.x * 0.3, y: offset + bg.offset.y * 0.3})), round);
			ctx.fillStyle = "#13172E";
			fill();
		}
		renderExampleFG = function() {
			ctx.beginPath();
			Render.roundedPolygon(bgVerts, round);
			ctx.fillStyle = "#1F243F";
			fill();

			// fill text
			ctx.beginPath();
			ctx.textAlign = "center";
			ctx.font = "500 25px Montserrat";
			ctx.fillStyle = "#E0EAF5";
	
			wrapText(ctx, curLevel.text || "", -center.x, -center.y - bounds.max.y * scale + 25, (bounds.max.x - bounds.min.x) * scale + scale*4, 28);
		}
	}
});