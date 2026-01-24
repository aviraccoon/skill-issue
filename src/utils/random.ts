/** Array type that guarantees at least one element. */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Picks a variant from an array deterministically based on seed.
 * Same seed always picks the same variant.
 */
export function pickVariant<T>(variants: NonEmptyArray<T>, seed: number): T {
	const index = seed % variants.length;
	return variants[index] ?? variants[0];
}

/** Simple string hash for deterministic selection. */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

/** Minimal store interface for nextRoll. */
interface RollStore {
	getState(): { runSeed: number; rollCount: number };
	set(key: "rollCount", value: number): void;
}

/**
 * Gets the next deterministic random value and increments rollCount.
 * Uses the run seed + current roll count to generate reproducible values.
 * Same seed + same sequence of calls = same random values.
 */
export function nextRoll(store: RollStore): number {
	const state = store.getState();
	const value = seededRandom(state.runSeed, state.rollCount);
	store.set("rollCount", state.rollCount + 1);
	return value;
}

/** Seeded shuffle using Fisher-Yates algorithm. */
export function seededShuffle<T>(array: T[], seed: number): T[] {
	const result = [...array];
	let s = seed;
	for (let i = result.length - 1; i > 0; i--) {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		const j = s % (i + 1);
		const temp = result[i];
		result[i] = result[j] as T;
		result[j] = temp as T;
	}
	return result;
}

/**
 * Returns a seeded pseudo-random number in range [0, 1).
 * Same seed + salt always gives same result.
 */
export function seededRandom(seed: number, salt = 0): number {
	const s = (seed + salt) * 1103515245 + 12345;
	return ((s & 0x7fffffff) % 10000) / 10000;
}

/**
 * Returns a deterministic variation of a base value.
 * Result is in range [base - variance, base + variance].
 * Same seed + salt always gives same result.
 *
 * @param seed - Run seed for determinism
 * @param base - Center value
 * @param variance - Maximum deviation from base (absolute, not percentage)
 * @param salt - Extra value to differentiate multiple variations from same seed
 */
export function seededVariation(
	seed: number,
	base: number,
	variance: number,
	salt = 0,
): number {
	const random = seededRandom(seed, salt);
	// Map [0, 1) to [-variance, +variance]
	return base + (random * 2 - 1) * variance;
}
