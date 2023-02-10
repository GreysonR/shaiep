"use strict";

let data = JSON.parse(localStorage.getItem("schaiepSave") ?? "{}");
let hints = JSON.parse(localStorage.getItem("schaiepHints") ?? "{}");

function save() {
	localStorage.setItem("schaiepSave", JSON.stringify(data));
	localStorage.setItem("schaiepHints", JSON.stringify(hints));
}
function loadSave() {
	let levelSets = document.getElementsByClassName("levelSet");
	let maxPid = 0;
	Object.keys(data).forEach(pid => {
		pid = Number(pid);
		let setElem = levelSets[pid];
		let nextSet = levelSets[pid + 1];


		if (data[pid].length >= 5 && nextSet) {
			nextSet.classList.remove("locked");
			maxPid = Math.max(maxPid, pid + 1);
		}

		for (let lid of data[pid]) {
			setElem.children[0].children[lid].classList.add("complete");
		}
	});

	shiftHome(maxPid - homePos);
}

window.addEventListener("load", loadSave);