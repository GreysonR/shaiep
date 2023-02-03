"use strict";

let homePos = 0;
let inGame = false;
function shiftHome(dir) {
	let lastHomePos = homePos;
	let levelSetsElem = document.getElementById("levelSets");
	let levelListElem = document.getElementById("levelList");
	let numSets = levelSetsElem.childElementCount;

	levelListElem.children[homePos].classList.remove("active");
	homePos = Math.max(0, Math.min(numSets - 1, homePos + dir));
	levelSetsElem.style.transform = `translate(${ -homePos * 100 }vw, -50%)`;
	levelListElem.children[homePos].classList.add("active");
	
	if (lastHomePos !== homePos && performance.now() > 1000) {
		playSound("swipe.mp3", 0.6);
	}
}
function switchBlock(elem) {
	let pid = Array.from(elem.parentNode.children).indexOf(elem);
	shiftHome(pid - homePos);
}

function selectLevel(elem) {
	let lid = Array.from(elem.parentNode.children).indexOf(elem);
	let pid = Array.from(elem.parentNode.parentNode.parentNode.children).indexOf(elem.parentNode.parentNode);

	
	playSound(`startLevel.mp3`, 0.7);
	loadLevel(pid + "-" + lid);
	document.getElementById("game").classList.add("active");
	document.getElementById("home").classList.remove("active");
	inGame = true;
}
function openHome() {
	document.getElementById("game").classList.remove("active");
	document.getElementById("home").classList.add("active");
	inGame = false;
}

function unlockWorld(n) {
	let worldElem = document.getElementsByClassName("levelSet")[n];
	worldElem.classList.remove("locked");
}