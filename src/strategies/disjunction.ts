import AutoPropPlugin from "../main";
import {AutoPropStrategy, evaluateStrategy, matchStrategy, SuggesterResult} from "./index";
import {Context} from "../types";

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<AutoPropStrategy, DisjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, disjunctionStrategy: DisjunctionStrategy, context: Context) {
	const results = await Promise.all(disjunctionStrategy.strategies.map(strategy => evaluateStrategy(plugin, strategy, context)));
	return results.flat().unique()
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: DisjunctionStrategy, context: Context): boolean {
	return strategy.strategies.some(strategy => matchStrategy(plugin, suggestion, strategy, context));
}
