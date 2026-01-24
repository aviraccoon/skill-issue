import type { Task } from "../state";
import { hashString, pickVariant } from "../utils/random";

export type EvolutionStage = "neutral" | "aware" | "honest" | "resigned";

/** Returns the evolution stage based on failure count. */
export function getEvolutionStage(failureCount: number): EvolutionStage {
	if (failureCount <= 1) return "neutral";
	if (failureCount <= 3) return "aware";
	if (failureCount <= 5) return "honest";
	return "resigned";
}

/** Gets the evolved description for a task based on its failure count. */
export function getEvolvedDescription(task: Task, runSeed: number): string {
	const stage = getEvolutionStage(task.failureCount);

	if (stage === "neutral" || !task.evolution) {
		return task.name;
	}

	const seed = hashString(task.id + stage + runSeed);
	return pickVariant(task.evolution[stage], seed);
}
