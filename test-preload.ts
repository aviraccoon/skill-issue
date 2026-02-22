import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { resetLocale } from "./src/i18n";

GlobalRegistrator.register();

// Reset module-level state that can leak between test files.
// localStorage is cleared per-file by individual tests, but in-memory
// module state (like currentLocale) persists across files in the same
// Bun test process.
afterEach(() => {
	resetLocale();
});
