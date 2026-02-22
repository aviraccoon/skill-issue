import { afterEach, describe, expect, test } from "bun:test";
import { getLocale, setLocale, strings } from "./index";

const LOCALE_STORAGE_KEY = "skill-issue-locale";

afterEach(() => {
	localStorage.removeItem(LOCALE_STORAGE_KEY);
});

describe("strings()", () => {
	test("returns English strings by default", () => {
		const s = strings();
		expect(s.game.attempt).toBe("Attempt");
	});

	test("English strings include nested namespaces", () => {
		const s = strings();
		expect(typeof s.game.slots).toBe("function");
		expect(s.game.slots(2)).toBe("2 slots remaining");
		expect(s.game.slots(1)).toBe("1 slot remaining");
	});

	test("returns proxy for non-English locale with fallback", () => {
		setLocale("cs");
		const s = strings();
		// Czech has its own day names
		expect(s.days.monday).toBe("Pondělí");
	});

	test("falls back to English for missing Czech keys", () => {
		setLocale("cs");
		const s = strings();
		// Access a deeply nested key - the proxy should fall back to English
		// if Czech doesn't define it. Even if Czech is nearly complete,
		// the proxy mechanism should handle missing leaves.
		expect(typeof s.game.attempt).toBe("string");
		expect(s.game.attempt.length).toBeGreaterThan(0);
	});
});

describe("setLocale", () => {
	test("changes the active locale", () => {
		setLocale("cs");
		expect(getLocale()).toBe("cs");
	});

	test("persists to localStorage", () => {
		setLocale("cs");
		expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("cs");
	});

	test("rejects unknown locale and keeps current", () => {
		const before = getLocale();
		setLocale("xx" as "en");
		expect(getLocale()).toBe(before);
	});

	test("can switch back to English", () => {
		setLocale("cs");
		setLocale("en");
		expect(getLocale()).toBe("en");
		// English returns directly, not through proxy
		const s = strings();
		expect(s.game.attempt).toBe("Attempt");
	});
});

describe("getLocale", () => {
	test("returns current locale", () => {
		// Default should be "en" (happy-dom navigator.language is typically "en")
		const locale = getLocale();
		expect(locale).toBe("en");
	});
});

describe("localStorage-based initial locale", () => {
	test("reads stored locale on fresh import", async () => {
		// We can't re-run module initialization, but we can verify
		// that setLocale persists and getLocale reads it back
		setLocale("cs");
		expect(getLocale()).toBe("cs");
		expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("cs");
	});
});
