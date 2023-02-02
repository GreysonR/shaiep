"use strict";

let audioCache = {};
async function playSound(filename, volume = 0.7, pitch = 1) {
	let name = "./audio/" + filename;
	let v = audioCache[name];

	if (!v) {
		v = new Audio(name);
		audioCache[name] = v;
	}

	if (pitch !== 1) {
		v.mozPreservesPitch = false;
		v.webkitPreservesPitch = false;
    	v.playbackRate = pitch;
	}
	else {
		v.playbackRate = 1;
	}
	v.currentTime = 0;
	v.volume = volume;
	v.play();
}
function loadSound(filename) {
	let name = "./audio/" + filename;
	let v = new Audio(name);
	audioCache[name] = v;
}
loadSound("softClick3.mp3");