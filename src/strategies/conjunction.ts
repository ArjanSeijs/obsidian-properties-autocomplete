import type AutoPropPlugin from "../main";
import {
	SuggestionStrategy,
	evaluateStrategy,
	matchStrategies,
	matchStrategy
} from "./index";
import {intersection, partition} from "../util/listutil";

import {SuggesterContext} from "../types";
import {StrategySuggestionResult, eqSuggestionResult} from "./suggestion";

/**
 * And / Intersection
 */
export interface ConjunctionStrategy {
	type: 'Conjunction'
	strategies: Exclude<SuggestionStrategy, ConjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, strategy: ConjunctionStrategy, context?: SuggesterContext) {
	const {left: providers, right: filters} = partition(strategy.strategies, isProvider)
	const results = await Promise.all(providers.map(provider => evaluateStrategy(plugin, provider, context)))

	const suggestions = intersection((a, b) => eqSuggestionResult(a, b), ...results);
	return suggestions.filter(suggestions => matchStrategies(plugin, suggestions, filters, context))
}

export function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: ConjunctionStrategy, context?: SuggesterContext): boolean {
	const strategies = strategy.strategies;
	return strategies.every(strategy => matchStrategy(plugin, suggestion, strategy, context));
}

function isProvider(value: SuggestionStrategy): boolean {
	switch (value.type) {
		case "List":
		case "Tag":
		case "Folder":
		case "JS":
		case "Disjunction":
			return true;
		case "Conjunction":
			return value.strategies.some(strategy => isProvider(strategy))
		case "Negation":
			return value.strategy.type === "Tag" || value.strategy.type === "Folder";
	}
}
