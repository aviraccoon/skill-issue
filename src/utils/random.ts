/** Simple string hash for deterministic selection. */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
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
