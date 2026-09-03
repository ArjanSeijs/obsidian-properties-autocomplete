import AutoPropPlugin from "../main";
import { Context } from "../patch/suggester";
import {AutoPropStrategy, evaluateStrategy, matchStrategy, SuggesterResult} from "./index";

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<AutoPropStrategy, DisjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, disjunctionStrategy: DisjunctionStrategy, context: Context) {
	const results = await Promise.all(disjunctionStrategy.strategies.map(strategy => evaluateStrategy(plugin, strategy, context)));
	return results.flat()
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: DisjunctionStrategy, context: Context): boolean {
	return strategy.strategies.some(strategy => matchStrategy(plugin, suggestion, strategy, context));
}
