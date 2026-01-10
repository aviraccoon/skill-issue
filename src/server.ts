import index from "../index.html";

const DEFAULT_PORT = 3141; // pi-ish, uncommon
const port = Number(Bun.env.PORT) || DEFAULT_PORT;
const devTools = Bun.env.DEV_TOOLS === "true";

const server = Bun.serve({
	port,
	routes: {
		"/": index,
		// Expose dev tools setting to client
		"/api/config": () =>
			Response.json({
				devTools,
			}),
	},
	development: {
		hmr: false, // Disabled due to Bun bug with CSS modules (#18258)
		console: true,
	},
});

console.log(`Skill Issue running at ${server.url}`);
if (devTools) {
	console.log("Dev tools enabled");
}
