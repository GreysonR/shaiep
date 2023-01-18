
let Performance = {
	enabled: true,
	getAvgs: false,
	lastUpdate: performance.now(),
	fps: 60,
	delta: 16.67,
	frame: 0,
	aliveTime: 0,

	history: {
		avgFps: 60,
		avgDelta: 16.67,
		fps: [],
		delta: [],
	},

	update: function() {
		let curTime = performance.now();
		Performance.delta = Math.min(35, curTime - Performance.lastUpdate);
		Performance.fps = 1000 / Performance.delta;
		Performance.lastUpdate = curTime;
		Performance.aliveTime += Performance.delta;

		if (!Performance.enabled && Performance.getAvgs) {
			Performance.history.fps.push(Performance.fps);
			Performance.history.delta.push(Performance.delta);

			if (Performance.history.fps.length > 100) {
				Performance.history.fps.shift();
				Performance.history.delta.shift();
			}
			let fps = (() => {
				let v = 0;
				for (let i = 0; i < Performance.history.fps.length; i++) {
					v += Performance.history.fps[i] / Math.max(1, Performance.history.fps.length);
				}
				return v;
			})();
			let delta = (() => {
				let v = 0;
				for (let i = 0; i < Performance.history.delta.length; i++) {
					v += Performance.history.delta[i] / Math.max(1, Performance.history.delta.length);
				}
				return v;
			})();

			Performance.history.avgFps = fps;
			Performance.history.avgDelta = delta;
		}
	},
	render: function() {
		Performance.history.fps.push(Performance.fps);
		Performance.history.delta.push(Performance.delta);

		if (Performance.history.fps.length > 100) {
			Performance.history.fps.shift();
			Performance.history.delta.shift();
		}
		let fps = (() => {
			let v = 0;
			for (let i = 0; i < Performance.history.fps.length; i++) {
				v += Performance.history.fps[i] / Math.max(1, Performance.history.fps.length);
			}
			return v;
		})();
		let delta = (() => {
			let v = 0;
			for (let i = 0; i < Performance.history.delta.length; i++) {
				v += Performance.history.delta[i] / Math.max(1, Performance.history.delta.length);
			}
			return v;
		})();

		Performance.history.avgFps = fps;
		Performance.history.avgDelta = delta;

		ctx.fillStyle = "#2D2D2D80";
		ctx.fillRect(20, 20, 200, 70);

		ctx.textAlign = "left";
		ctx.font = "12px Arial";
		ctx.fillStyle = "#C7C8C9";
		ctx.fillText("FPS", 45, 50);
		ctx.fillText("Δ T", 45, 70);

		ctx.textAlign = "right";
		ctx.fillStyle = "#FFFFFF";
		ctx.fillText(Math.round(fps), 190, 50);
		ctx.fillText((Math.round(delta * 100) / 100).toFixed(2) + "ms", 190, 70);
	}
}