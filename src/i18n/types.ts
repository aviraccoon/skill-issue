import type { en } from "./en";

/**
 * Recursively widens types for translation checking:
 * - String literals → string (allows different text per language)
 * - Functions keep their parameter types but return string
 * - Objects recurse
 */
type Widen<T> = T extends string
	? string
	: T extends (...args: infer A) => string
		? (...args: A) => string
		: { [K in keyof T]: Widen<T[K]> };

/**
 * The shape all translation files must satisfy.
 * Derived from English (source of truth), with types widened.
 */
export type Strings = Widen<typeof en>;

/**
 * Partial variant of Strings for non-English locales.
 * Missing keys fall back to English at runtime via the i18n proxy.
 * Arrays are widened (any length) but not made optional at element level.
 */
type WidenPartial<T> = T extends string
	? string
	: T extends (...args: infer A) => string
		? (...args: A) => string
		: T extends readonly (infer E)[]
			? readonly Widen<E>[]
			: { [K in keyof T]?: WidenPartial<T[K]> };

export type PartialStrings = WidenPartial<typeof en>;
