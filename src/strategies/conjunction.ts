import type AutoPropPlugin from "../main";
import {evaluateStrategy, isProvider, matchStrategies, matchStrategy, SuggestionStrategy} from "./index";
import {asyncFilter, intersection, partition} from "../util/listutil";

import {EvalContext} from "../types";
import {eqSuggestionResult, StrategySuggestionResult} from "./suggestion";

/**
 * And / Intersection
 */
export interface ConjunctionStrategy {
	type: 'Conjunction'
	strategies: Exclude<SuggestionStrategy, ConjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, strategy: ConjunctionStrategy, ctx: EvalContext) {
	const {left: providers, right: filters} = partition(strategy.strategies, isProvider)
	const results = await Promise.all(providers.map(provider => evaluateStrategy(plugin, provider, ctx)))

	const suggestions = intersection((a, b) => eqSuggestionResult(a, b), ...results);
	return asyncFilter(suggestions => matchStrategies(plugin, suggestions, filters, ctx), suggestions)
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: ConjunctionStrategy, ctx: EvalContext): Promise<boolean> {
	const strategies = strategy.strategies;
	for (const subStrategy of strategies) {
		if (!await matchStrategy(plugin, suggestion, subStrategy, ctx)) {
			return false;
		}
	}
	return true;
}

