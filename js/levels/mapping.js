"use strict";

document.getElementById("mapInput").addEventListener("input", event => {
	let input = event.target;
	let fr = new FileReader();
	fr.readAsText(input.files[0]);

	fr.onload = function() {
		// Compile file
		let res = fr.result;
		let index = 0;
		
		let out = {
			point: [],
			badPoint: [],
			body: [],
			rect: 0,
			diagRect: 0,
			triangle: 0,
			examples: 0,
		}

		let types = {
			"#DF3C3C": "badPoint",
			"#3B57ED": "rect",
			"#2AE369": "diagRect",
			"#E3402A": "triangle",
			"#F1CA41": "examples",
			"#62C370": "body",
		}
		
		function getNext() {
			let iStart = res.indexOf("<rect", index);
			let iEnd = res.indexOf("/>", iStart);
			let clipStart = res.indexOf("clipPath");

			if (iStart > index && (iStart < clipStart || clipStart === -1)) {
				// get string of current rect
				let rectText = res.slice(iStart + 5, iEnd);

				// create rect object from string
				if (rectText == "") return;
				let rectArr = rectText.trim().split('"');
				let rect = (() => {
					let obj  = {};
					for (let i = 0; i < Math.floor(rectArr.length / 2) * 2; i += 2) {
						obj[rectArr[i].replace("=", "").replace(/[" "]/g, "")] = !isNaN(Number(rectArr[i + 1])) ? Number(rectArr[i + 1]) : rectArr[i + 1];
					}
					return obj;
				})();

				// add obj defaults
				if (!rect.x) rect.x = 0;
				if (!rect.y) rect.y = 0;
				if (!rect.rx) rect.rx = 0;
				if (!rect.fill) {
					console.warn(rect, rectText);
					index = iEnd + 2;
					return;
				}

				if (!rect.width || !rect.height) {
					console.error(rectText);
					index = iEnd + 2;
					return;
				}

				let name = types[rect.fill] ?? "point";
				if (name === "point" || name === "badPoint") {
					out[name].push({
						x: rect.x,
						y: rect.y,
					});
				}
				else {
					out[name]++;
				}

				index = iEnd + 2;
			}
			else {
				index = -1;
			}
		}
		function getPolygons() {
			let iStart = res.indexOf("<path", index);
			// if (res.indexOf("<path", index) > -1) iStart = Math.min(res.indexOf("<path", index), iStart);
			let iEnd = res.indexOf("/>", index);

			if (iStart > index) {
				index = iEnd + 2;
				
				// get string of current path
				let pathText = res.slice(iStart + 5, iEnd);
				
				// create object from string
				if (pathText == "") return;
				let pathObjArr = pathText.trim().split('"');
				let pathObj = (() => {
					let obj  = {};
					for (let i = 0; i < Math.floor(pathObjArr.length / 2) * 2; i += 2) {
						obj[pathObjArr[i].replace("=", "").replace(/[" "]/g, "")] = !isNaN(Number(pathObjArr[i + 1])) ? Number(pathObjArr[i + 1]) : pathObjArr[i + 1];
					}
					return obj;
				})();

				let text = res.slice(iStart + 5, iEnd);
				if (text == "") return;
				let polyArr = text.trim().split('"').flatMap((v, i, arr) => {
					if (i % 2 === 0 && v !== "") {
						return [ [ v, arr[i + 1] ] ];
					}
					else {
						return [];
					}
				});
				let obj = (() => {
					let obj  = {};
					for (let i = 0; i < polyArr.length; i++) {
						obj[polyArr[i][0].replace("=", "").replace(/[" "]/g, "")] = polyArr[i][1];
					}
					return obj;
				})();

				// parse path
				let pathArr = obj["d"].replace(/M/g, "!M").replace(/H/g, "!H").replace(/V/g, "!V").replace(/L/g, "!L").replace(/Z/g, "!Z").split("!").filter(v => v != "");
				let x = 0;
				let y = 0;
				let paths = [[]];
				let pathNum = 0;
				for (let i = 0; i < pathArr.length; i++) {
					let func = pathArr[i][0]
					let part = pathArr[i].slice(1).split(" ");

					if (func === "M") {
						x = Math.round(Number(part[0]));
						y = Math.round(Number(part[1]));
					}
					else if (func === "H") {
						x = Math.round(Number(part[0]));

						if (isNaN(Number(part[0]))) console.error(part, pathArr);
					}
					else if (func === "V") {
						y = Math.round(Number(part[0]));
					}
					else if (func === "L") {
						x = Math.round(Number(part[0]));
						y = Math.round(Number(part[1].replace("Z", "")));
					}
					else if (func === "Z") {
						console.warn("More than 1 path");
						// paths.push([]);
						// pathNum++;
					}
					else {
						console.error(func, part);
						console.error(pathArr, i);
					}

					paths[pathNum].push({ x: Math.round(x), y: Math.round(y) });
				}
				
				for (let path of paths) {
					if (path.length > 1) {
						let name = "";
						if (types[pathObj.fill] || types[pathObj.stroke]) {
							name = types[pathObj.fill] || types[pathObj.stroke];
						}
						if (!out[name]) {
							continue;
						}
						let center = getCenterOfMass(path);
	
						if (new vec(path[0]).equals(path[path.length - 1])) {
							path.pop();
						}
						out[name].push({
							x: Math.round(center.x),
							y: Math.round(center.y),
							vertices: path,
						});
					}
				}
			}
			else {
				index = -1;
			}
		}

		let n = 0;
		index = 0;
		while (index !== -1 && n < 500) {
			getPolygons();
			n++;
		}
		n = 0;
		index = 0;
		while (index !== -1 && n < 500) {
			getNext();
			n++
		}

		let min = new vec(Infinity, Infinity);
		for (let point of out.point) {
			min.min2(point);
		}
		
		let snap = 25 / 4;
		function transformPt(point, min) {
			return {
				x: Math.round((point.x - min.x) / snap) * snap / 25,
				y: Math.round((point.y - min.y) / snap) * snap / 25,
			}
		}

		for (let point of out.point) {
			let pt = transformPt(point, min);
			point.x = pt.x;
			point.y = pt.y;
		}
		for (let point of out.badPoint) {
			let pt = transformPt(point, min);
			point.x = pt.x;
			point.y = pt.y;
		}
		for (let body of out.body) {
			let min = new vec(Infinity, Infinity);
			for (let point of body.vertices) {
				min.min2(point);
			}

			for (let point of body.vertices) {
				let pt = transformPt(point, min);
				point.x = pt.x;
				point.y = pt.y;
			}

			let c = transformPt(body, min);
			body.x = c.x;
			body.y = c.y;
		}

		// out = JSON.stringify(out, null, "\t");
		out = JSON.stringify(out);

		copyToClipboard(out);
		console.log(out);
		input.value = "";
	}
});

function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        return window.clipboardData.setData("Text", text);

    }
    else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}