
import AutoPropPlugin from "../main";
import {AutoPropStrategy, evaluateStrategy, matchStrategy, SuggesterResult} from "./index";

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<AutoPropStrategy, DisjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, disjunctionStrategy: DisjunctionStrategy) {
	const results = await Promise.all(disjunctionStrategy.strategies.map(strategy => evaluateStrategy(plugin, strategy)));
	return results.flat()
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: DisjunctionStrategy): boolean {
	return strategy.strategies.some(strategy => matchStrategy(plugin, suggestion, strategy));
}
