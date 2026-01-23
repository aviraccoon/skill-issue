/**
 * Announces a message to screen readers via the live region.
 * The announcer element must exist in the DOM (see index.html).
 */
export function announce(message: string) {
	const el = document.getElementById("announcer");
	if (el) {
		// Clear first to ensure re-announcement of same message
		el.textContent = "";
		// Use requestAnimationFrame + setTimeout to ensure the DOM update
		// happens after the browser has painted and screen reader is ready
		requestAnimationFrame(() => {
			setTimeout(() => {
				el.textContent = message;
			}, 100);
		});
	}
}
