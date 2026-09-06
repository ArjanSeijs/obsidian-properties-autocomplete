import type AutoPropPlugin from "../main";

import type {CodeStrategy} from "./code";
import * as Code from "./code";
import type {ConjunctionStrategy} from "./conjunction";
import * as Conjunction from "./conjunction";
import type {DisjunctionStrategy} from "./disjunction";
import * as Disjunction from "./disjunction";
import type {FolderStrategy} from "./folder";
import * as Folder from "./folder";
import type {ListStrategy} from "./list";
import * as List from "./list";
import type {NegationStrategy} from "./negation";
import * as Negation from "./negation";
import type {TagStrategy} from "./tag";
import * as Tag from "./tag";
import {App, prepareFuzzySearch, TFile} from "obsidian";

import {SuggesterContext, FuzzySearcher, SuggestionResult} from "../types";
import {StrategySuggestionResult, StrategySuggestionResults, suggestionToString} from "./suggestion";

export type SuggestionStrategy =
	TagStrategy
	| FolderStrategy
	| ListStrategy
	| CodeStrategy
	| DisjunctionStrategy
	| ConjunctionStrategy
	| NegationStrategy
export type SuggestionStrategyType = SuggestionStrategy['type']

export async function evaluateStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, context?: SuggesterContext): Promise<StrategySuggestionResults> {
	switch (strategy.type) {
		case "List":
			return List.evaluate(plugin, strategy)
		case "Tag":
			return Tag.evaluate(plugin, strategy)
		case "Folder":
			return Folder.evaluate(plugin, strategy, context)
		case "JS":
			return Code.evaluate(plugin, strategy, context)
		case "Disjunction":
			return Disjunction.evaluate(plugin, strategy, context)
		case "Conjunction":
			return Conjunction.evaluate(plugin, strategy, context);
		case "Negation":
			return Negation.evaluate(plugin, strategy, context);

	}
}

export function matchStrategies(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategies: SuggestionStrategy[], context?: SuggesterContext) {
	return strategies.every(strategy => matchStrategy(plugin, suggestion, strategy, context))
}

export function matchStrategy(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: SuggestionStrategy, context?: SuggesterContext): boolean {
	switch (strategy.type) {
		case "List":
			return List.match(plugin, suggestion, strategy)
		case "Tag":
			return Tag.match(plugin, suggestion, strategy)
		case "Folder":
			return Folder.match(plugin, suggestion, strategy, context)
		case "JS":
			return Code.match(plugin, suggestion, strategy)
		case "Disjunction":
			return Disjunction.match(plugin, suggestion, strategy, context)
		case "Conjunction":
			return Conjunction.match(plugin, suggestion, strategy, context);
		case "Negation":
			return Negation.match(plugin, suggestion, strategy, context);
	}
}

export async function queryStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, query: string, context: SuggesterContext) {
	let results = await evaluateStrategy(plugin, strategy, context);
	return results.map(suggestion => fuzzySearchSuggestions(plugin.app, suggestion, prepareFuzzySearch(query), context)).filter(value => value != null)
}


function fuzzySearchSuggestions(app: App, suggestion: StrategySuggestionResult, fuzzySearcher: FuzzySearcher, context: SuggesterContext): SuggestionResult | null {
	if (typeof suggestion === "string" || suggestion instanceof TFile) {
		let text = suggestionToString(app, suggestion, context);
		let result = fuzzySearcher(text);
		if (!result) return null;
		return {type: 'text', score: result.score, matches: result.matches, text}
	} else {
		let resultValue = fuzzySearcher(suggestion.value);
		let resultLabel = suggestion.label ? fuzzySearcher(suggestion.label) : null
		let result = resultLabel ?? resultValue;
		if (!result) return null;
		const text = suggestion.label ? suggestion.label : suggestion.value;
		return {
			type: 'text',
			score: result.score,
			matches: result.matches,
			text: text,
			customData: {color: suggestion.color, actualValue: suggestion.label ? suggestion.value : undefined}
		}
	}
}


