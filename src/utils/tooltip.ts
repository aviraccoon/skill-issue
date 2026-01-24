/**
 * Styled tooltips for elements with data-tooltip attribute.
 * Supports mouse hover and keyboard focus.
 */

let tooltip: HTMLDivElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function cancelHide() {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
}

function hide() {
	cancelHide();
	if (tooltip) {
		tooltip.remove();
		tooltip = null;
	}
}

function scheduleHide() {
	hideTimeout = setTimeout(hide, 100);
}

function show(ref: HTMLElement) {
	cancelHide();
	if (tooltip) tooltip.remove();

	const content = ref.dataset.tooltip;
	if (!content) return;

	tooltip = document.createElement("div");
	tooltip.className = "tooltip";
	tooltip.setAttribute("role", "tooltip");
	tooltip.textContent = content;
	document.body.appendChild(tooltip);

	tooltip.addEventListener("mouseenter", cancelHide);
	tooltip.addEventListener("mouseleave", scheduleHide);

	// Position tooltip
	const rect = ref.getBoundingClientRect();
	const tooltipRect = tooltip.getBoundingClientRect();
	const gap = 6;

	// Prefer above, fall back to below if not enough space
	const showBelow = rect.top - tooltipRect.height - gap < 8;

	// Center horizontally, keep on screen
	tooltip.style.left = `${
		Math.max(
			8,
			Math.min(
				rect.left + (rect.width - tooltipRect.width) / 2,
				window.innerWidth - tooltipRect.width - 8,
			),
		) + window.scrollX
	}px`;

	tooltip.style.top = `${
		(showBelow ? rect.bottom + gap : rect.top - tooltipRect.height - gap) +
		window.scrollY
	}px`;
}

/**
 * Initializes tooltips for all elements with data-tooltip attribute.
 * Call after DOM updates that add new tooltip elements.
 */
export function initTooltips(container: Element = document.body) {
	const refs = container.querySelectorAll<HTMLElement>("[data-tooltip]");

	refs.forEach((ref) => {
		// Skip if already initialized
		if (ref.dataset.tooltipInit) return;
		ref.dataset.tooltipInit = "true";

		ref.addEventListener("mouseenter", () => show(ref));
		ref.addEventListener("mouseleave", scheduleHide);
		ref.addEventListener("focus", () => show(ref));
		ref.addEventListener("blur", hide);
	});
}
