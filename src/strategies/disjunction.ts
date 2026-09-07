import AutoPropPlugin from "../main";
import {SuggestionStrategy, evaluateStrategy, matchStrategy} from "./index";
import {SuggesterContext} from "../types";
import {StrategySuggestionResult} from "./suggestion";

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<SuggestionStrategy, DisjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, disjunctionStrategy: DisjunctionStrategy, context?: SuggesterContext) {
	const results = await Promise.all(disjunctionStrategy.strategies.map(strategy => evaluateStrategy(plugin, strategy, context)));
	return results.flat().unique()
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: DisjunctionStrategy, context?: SuggesterContext): Promise<boolean> {
	for (const subStrategy of strategy.strategies) {
		if (await matchStrategy(plugin, suggestion, subStrategy, context)) {
			return true
		}
	}
	return false;
}
