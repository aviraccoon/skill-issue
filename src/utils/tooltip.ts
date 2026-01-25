/**
 * Styled tooltips for elements with data-tooltip attribute.
 * Uses the Popover API with popover="hint" for proper layering.
 * Supports mouse hover and keyboard focus.
 */

let tooltip: HTMLDivElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let currentRef: HTMLElement | null = null;

function cancelHide() {
	if (hideTimeout) {
		clearTimeout(hideTimeout);
		hideTimeout = null;
	}
}

function hide() {
	cancelHide();
	if (tooltip) {
		try {
			tooltip.hidePopover();
		} catch {
			// Popover may already be hidden
		}
		tooltip.remove();
		tooltip = null;
		currentRef = null;
	}
}

function scheduleHide() {
	hideTimeout = setTimeout(hide, 100);
}

function show(ref: HTMLElement) {
	// Don't re-show for the same element
	if (currentRef === ref && tooltip) {
		cancelHide();
		return;
	}

	cancelHide();
	if (tooltip) {
		try {
			tooltip.hidePopover();
		} catch {
			// Ignore
		}
		tooltip.remove();
	}

	const content = ref.dataset.tooltip;
	if (!content) return;

	currentRef = ref;

	// Create tooltip with popover="hint" for proper top-layer stacking
	tooltip = document.createElement("div");
	tooltip.className = "tooltip";
	tooltip.setAttribute("role", "tooltip");
	tooltip.setAttribute("popover", "hint");
	tooltip.textContent = content;
	document.body.appendChild(tooltip);

	tooltip.addEventListener("mouseenter", cancelHide);
	tooltip.addEventListener("mouseleave", scheduleHide);

	// Show the popover (promotes to top layer)
	tooltip.showPopover();

	// Position tooltip relative to the reference element
	const rect = ref.getBoundingClientRect();
	const tooltipRect = tooltip.getBoundingClientRect();
	const gap = 6;

	// Prefer above, fall back to below if not enough space
	const showBelow = rect.top - tooltipRect.height - gap < 8;

	// Center horizontally, keep on screen
	const left = Math.max(
		8,
		Math.min(
			rect.left + (rect.width - tooltipRect.width) / 2,
			window.innerWidth - tooltipRect.width - 8,
		),
	);

	const top = showBelow
		? rect.bottom + gap
		: rect.top - tooltipRect.height - gap;

	// Popover uses fixed positioning by default in top layer
	tooltip.style.left = `${left}px`;
	tooltip.style.top = `${top}px`;
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
