import AutoPropPlugin from "../main";
import {SuggestionStrategy, evaluateStrategy, matchStrategy} from "./index";
import {Context} from "../types";
import {StrategySuggestionResult} from "./suggestion";

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<SuggestionStrategy, DisjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, disjunctionStrategy: DisjunctionStrategy, context?: Context) {
	const results = await Promise.all(disjunctionStrategy.strategies.map(strategy => evaluateStrategy(plugin, strategy, context)));
	return results.flat().unique()
}

export function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: DisjunctionStrategy, context?: Context): boolean {
	return strategy.strategies.some(strategy => matchStrategy(plugin, suggestion, strategy, context));
}
