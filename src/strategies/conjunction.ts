
import type AutoPropPlugin from "../main";
import {
	AutoPropStrategy,
	evaluateStrategy,
	matchStrategies,
	matchStrategy,
	SuggesterResult,
	testSuggestionEquality
} from "./index";
import {intersection, partition} from "../util/listutil";

/**
 * And / Intersection
 */
export interface ConjunctionStrategy {
	type: 'Conjunction'
	strategies: Exclude<AutoPropStrategy, ConjunctionStrategy>[]
}

export async function evaluate(plugin: AutoPropPlugin, strategy: ConjunctionStrategy) {
	const {left: providers, right: filters} = partition(strategy.strategies, isProvider)
	const results = await Promise.all(providers.map(provider => evaluateStrategy(plugin, provider)))

	const suggestions = intersection((a, b) => testSuggestionEquality(a, b), ...results);
	return suggestions.filter(suggestions => matchStrategies(plugin, suggestions, filters))
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: ConjunctionStrategy): boolean {
	const strategies = strategy.strategies;
	return strategies.every(strategy => matchStrategy(plugin, suggestion, strategy));
}

function isProvider(value: AutoPropStrategy): boolean {
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
