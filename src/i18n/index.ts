import { cs } from "./cs";
import { en } from "./en";
import type { Strings } from "./types";

type Locale = "en" | "cs";

const locales: Record<Locale, Strings> = {
	en,
	cs,
};

let currentLocale: Locale = "en";

/**
 * Gets a value from the current locale's strings, with English fallback.
 * Logs a warning if falling back (missing translation).
 */
function getWithFallback<T>(
	path: string[],
	current: Record<string, unknown>,
	fallback: Record<string, unknown>,
): T {
	let currentValue: unknown = current;
	let fallbackValue: unknown = fallback;

	for (const key of path) {
		currentValue = (currentValue as Record<string, unknown>)?.[key];
		fallbackValue = (fallbackValue as Record<string, unknown>)?.[key];
	}

	if (currentValue === undefined && fallbackValue !== undefined) {
		console.warn(
			`[i18n] Missing translation for "${path.join(".")}" in locale "${currentLocale}", using English fallback`,
		);
		return fallbackValue as T;
	}

	return (currentValue ?? fallbackValue) as T;
}

/**
 * Creates a proxy that provides access to strings with automatic fallback.
 * Usage: strings.game.attempt or strings.a11y.taskSucceeded('Shower')
 */
function createStringsProxy(
	current: Strings,
	fallback: Strings,
	path: string[] = [],
): Strings {
	return new Proxy(current, {
		get(_target, prop: string) {
			const newPath = [...path, prop];
			const value = getWithFallback<unknown>(newPath, current, fallback);

			// If it's an object (namespace), return another proxy
			if (value !== null && typeof value === "object") {
				return createStringsProxy(
					value as Strings,
					getWithFallback<Strings>(newPath, fallback, fallback),
					[],
				);
			}

			return value;
		},
	}) as Strings;
}

/**
 * Returns the strings object for the current locale.
 * Automatically falls back to English for missing translations.
 */
export function strings(): Strings {
	const current = locales[currentLocale];
	const fallback = locales.en;

	// If current is English, no proxy needed
	if (currentLocale === "en") {
		return current;
	}

	return createStringsProxy(current, fallback);
}

/**
 * Sets the active locale.
 */
export function setLocale(locale: Locale): void {
	if (!(locale in locales)) {
		console.warn(
			`[i18n] Unknown locale "${locale}", keeping "${currentLocale}"`,
		);
		return;
	}
	currentLocale = locale;
}

/**
 * Gets the current locale.
 */
export function getLocale(): Locale {
	return currentLocale;
}

// Re-export types for convenience
export type { Strings };
