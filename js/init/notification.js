"use strict";

function createNotification(type) {
	let elem = document.createElement("div");
	elem.classList.add("notification");
	elem.classList.add(type);
	elem.onclick = function() { closeNotification(elem); }

	document.getElementById("game").appendChild(elem);

	setTimeout(() => {
		if (!elem.classList.contains("deleted")) {
			closeNotification(elem);
		}
	}, 1200);
}

function closeNotification(elem) {
	if (!elem.classList.contains("deleted")) {
		elem.classList.add("deleted");

		setTimeout(() => {
			elem.parentNode.removeChild(elem);
		}, 400);
	}
}