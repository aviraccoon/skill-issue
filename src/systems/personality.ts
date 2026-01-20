import type { TimeBlock } from "../state";
import { seededVariation } from "../utils/random";

/**
 * Time preference axis - affects when you're most productive.
 */
export type TimePreference = "nightOwl" | "earlyBird" | "neutral";

/**
 * Social preference axis - affects how social interaction impacts energy.
 */
export type SocialPreference = "socialBattery" | "hermit" | "neutral";

/**
 * Combined personality determined by seed at run start.
 */
export interface Personality {
	time: TimePreference;
	social: SocialPreference;
}

// Salt values for time modifier variation
const SALT_TIME_MORNING = 3001;
const SALT_TIME_AFTERNOON = 3002;
const SALT_TIME_EVENING = 3003;
const SALT_TIME_NIGHT = 3004;

const TIME_BLOCK_SALTS: Record<TimeBlock, number> = {
	morning: SALT_TIME_MORNING,
	afternoon: SALT_TIME_AFTERNOON,
	evening: SALT_TIME_EVENING,
	night: SALT_TIME_NIGHT,
};

/**
 * Base time modifiers by personality type.
 * Maps TimePreference -> TimeBlock -> { base, variance }.
 */
const TIME_MODIFIERS: Record<
	TimePreference,
	Record<TimeBlock, { base: number; variance: number }>
> = {
	nightOwl: {
		morning: { base: 0.9, variance: 0.03 }, // -10% +/- 3%
		afternoon: { base: 1.0, variance: 0 },
		evening: { base: 1.0, variance: 0 },
		night: { base: 1.3, variance: 0.05 }, // +30% +/- 5%
	},
	earlyBird: {
		morning: { base: 1.15, variance: 0.05 }, // +15% +/- 5%
		afternoon: { base: 1.0, variance: 0 },
		evening: { base: 1.0, variance: 0 },
		night: { base: 1.15, variance: 0.03 }, // +15% +/- 3%
	},
	neutral: {
		morning: { base: 1.1, variance: 0.03 }, // +10% +/- 3%
		afternoon: { base: 0.9, variance: 0.03 }, // -10% +/- 3%
		evening: { base: 1.0, variance: 0 },
		night: { base: 1.25, variance: 0.05 }, // +25% +/- 5%
	},
};

/**
 * Returns time modifier based on personality, time block, and seed.
 * Seed-based variation means the 2am spike strength varies per run.
 */
export function getPersonalityTimeModifier(
	personality: Personality,
	timeBlock: TimeBlock,
	seed: number,
): number {
	const { base, variance } = TIME_MODIFIERS[personality.time][timeBlock];
	if (variance === 0) return base;
	return seededVariation(seed, base, variance, TIME_BLOCK_SALTS[timeBlock]);
}

/**
 * Returns base time modifier without seed variation (for testing).
 */
export function getBaseTimeModifier(
	personality: Personality,
	timeBlock: TimeBlock,
): number {
	return TIME_MODIFIERS[personality.time][timeBlock].base;
}

/**
 * Energy effect from friend rescue by social preference.
 */
const FRIEND_RESCUE_ENERGY: Record<SocialPreference, number> = {
	socialBattery: 0.12, // +12%
	hermit: -0.03, // -3% (helps momentum, costs energy)
	neutral: 0.1, // +10%
};

/**
 * Returns energy change from friend rescue.
 */
export function getFriendRescueEnergyEffect(personality: Personality): number {
	return FRIEND_RESCUE_ENERGY[personality.social];
}

/**
 * Extra energy modifier for social task success (stacks with base effect).
 */
const SOCIAL_SUCCESS_ENERGY: Record<SocialPreference, number> = {
	socialBattery: 0.03, // +3% extra
	hermit: -0.02, // -2% (draining even on success)
	neutral: 0,
};

/**
 * Returns extra energy change for social task success.
 */
export function getSocialSuccessEnergyEffect(personality: Personality): number {
	return SOCIAL_SUCCESS_ENERGY[personality.social];
}

/**
 * Energy bonus for solo task success.
 */
const SOLO_SUCCESS_ENERGY: Record<SocialPreference, number> = {
	socialBattery: 0,
	hermit: 0.02, // +2% (energizing to work alone)
	neutral: 0,
};

/**
 * Returns energy bonus for solo task success.
 */
export function getSoloSuccessEnergyEffect(personality: Personality): number {
	return SOLO_SUCCESS_ENERGY[personality.social];
}

/**
 * Determines personality from run seed.
 * Uses different bits of the seed for each axis to ensure variety.
 */
export function getPersonalityFromSeed(seed: number): Personality {
	// Use lower bits for time preference (3 options)
	const timeBits = seed % 100;
	let time: TimePreference;
	if (timeBits < 33) {
		time = "nightOwl";
	} else if (timeBits < 66) {
		time = "earlyBird";
	} else {
		time = "neutral";
	}

	// Use different bits for social preference (3 options)
	const socialBits = Math.floor(seed / 100) % 100;
	let social: SocialPreference;
	if (socialBits < 33) {
		social = "socialBattery";
	} else if (socialBits < 66) {
		social = "hermit";
	} else {
		social = "neutral";
	}

	return { time, social };
}

/**
 * Calculates starting energy from seed.
 * Range: 0.55 to 0.65 (55-65%)
 */
export function getStartingEnergyFromSeed(seed: number): number {
	// Use different bits than personality
	const energyBits = Math.floor(seed / 10000) % 1000;
	const normalized = energyBits / 999; // 0 to 1
	return 0.55 + normalized * 0.1; // 0.55 to 0.65
}

/**
 * Calculates starting momentum from seed.
 * Range: 0.45 to 0.55 (45-55%)
 */
export function getStartingMomentumFromSeed(seed: number): number {
	// Use different bits than energy
	const momentumBits = Math.floor(seed / 10000000) % 1000;
	const normalized = momentumBits / 999; // 0 to 1
	return 0.45 + normalized * 0.1; // 0.45 to 0.55
}

/**
 * Human-readable personality description for "Your Patterns" reveal.
 */
export function describePersonality(personality: Personality): string {
	const timeDesc: Record<TimePreference, string> = {
		nightOwl: "Night Owl",
		earlyBird: "Early Bird",
		neutral: "Flexible Schedule",
	};

	const socialDesc: Record<SocialPreference, string> = {
		socialBattery: "Social Battery",
		hermit: "Hermit",
		neutral: "Social Neutral",
	};

	return `${timeDesc[personality.time]} + ${socialDesc[personality.social]}`;
}
