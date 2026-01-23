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
