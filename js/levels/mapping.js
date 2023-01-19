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
			rect: 0,
			diagRect: 0,
			triangle: 0,
		}

		let types = {
			"#3B57ED": "rect",
			"#2AE369": "diagRect",
			"#E3402A": "triangle",
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
				if (name === "point") {
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

		let n = 0;
		index = 0;
		while (index !== -1 && n < 500) {
			getNext();
			n++
		}

		let min = new vec(Infinity, Infinity);
		for (let point of out.point) {
			min.min2(point);
		}
		for (let point of out.point) {
			point.x = Math.round((point.x - min.x) / 12.5) / 2;
			point.y = Math.round((point.y - min.y) / 12.5) / 2;
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