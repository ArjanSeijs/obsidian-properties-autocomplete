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

import {EvalContext, FuzzySearcher, SuggestionResult} from "../types";
import {StrategySuggestionResult, StrategySuggestionResults, suggestionToString} from "./suggestion";
import {getAliases} from "../util/fileutil";

export type SuggestionStrategy =
	TagStrategy
	| FolderStrategy
	| ListStrategy
	| CodeStrategy
	| DisjunctionStrategy
	| ConjunctionStrategy
	| NegationStrategy
export type SuggestionStrategyType = SuggestionStrategy['type']

/**
 * Evaluate to strategy to get a list of suggestions.
 * @param plugin
 * @param strategy
 * @param ctx
 */
export async function evaluateStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, ctx: EvalContext): Promise<StrategySuggestionResults> {
	switch (strategy.type) {
		case "List":
			return List.evaluate(plugin, strategy)
		case "Tag":
			return Tag.evaluate(plugin, strategy)
		case "Folder":
			return Folder.evaluate(plugin, strategy, ctx)
		case "JS":
			return Code.evaluate(plugin, strategy, ctx)
		case "Disjunction":
			return Disjunction.evaluate(plugin, strategy, ctx)
		case "Conjunction":
			return Conjunction.evaluate(plugin, strategy, ctx);
		case "Negation":
			return Negation.evaluate(plugin, strategy, ctx);

	}
}

/**
 * Check whether a suggestion matches a list of strategies. (And / Intersection)
 * @param plugin
 * @param suggestion
 * @param strategies
 * @param ctx
 */
export async function matchStrategies(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategies: SuggestionStrategy[], ctx: EvalContext) {
	for (const strategy of strategies) {
		if (!await matchStrategy(plugin, suggestion, strategy, ctx)) {
			return false;
		}
	}
	return true;
}

/**
 * Check whether a suggestion matches a strategy
 * @param plugin
 * @param suggestion
 * @param strategy
 * @param ctx
 */
export async function matchStrategy(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: SuggestionStrategy, ctx: EvalContext): Promise<boolean> {
	switch (strategy.type) {
		case "List":
			return List.match(plugin, suggestion, strategy)
		case "Tag":
			return Tag.match(plugin, suggestion, strategy)
		case "Folder":
			return Folder.match(plugin, suggestion, strategy, ctx)
		case "JS":
			return await Code.match(plugin, suggestion, strategy, ctx)
		case "Disjunction":
			return await Disjunction.match(plugin, suggestion, strategy, ctx)
		case "Conjunction":
			return await Conjunction.match(plugin, suggestion, strategy, ctx);
		case "Negation":
			return await Negation.match(plugin, suggestion, strategy, ctx);
	}
}

/**
 * Evaluate a strategy and then fuzzySearch those suggestions to get the obsidian SuggestionResults.
 * @param plugin
 * @param strategy
 * @param query
 * @param ctx
 */
export async function queryStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, query: string, ctx: EvalContext) {
	if (!isProvider(strategy)) return [];
	let results = await evaluateStrategy(plugin, strategy, ctx);
	return results.map(suggestion => fuzzySearchSuggestions(plugin.app, suggestion, prepareFuzzySearch(query), ctx))
		.flat()
		.filter(value => value != null)
}

/**
 * Convert Strategy Suggestion to obsidian SuggestionResult using fuzzy-search.
 * @param app
 * @param suggestion
 * @param fuzzySearcher
 * @param ctx
 */
function fuzzySearchSuggestions(app: App, suggestion: StrategySuggestionResult, fuzzySearcher: FuzzySearcher, ctx: EvalContext): SuggestionResult[] {
	if (typeof suggestion === "string") {
		let text = suggestionToString(app, suggestion, ctx.suggester);
		let result = fuzzySearcher(text);
		if (!result) return [];
		return [{type: 'text', score: result.score, matches: result.matches, text}]
	} else if (suggestion instanceof TFile) {
		let fileText = suggestionToString(app, suggestion, ctx.suggester);
		let aliasTexts = getAliases(app, suggestion).map(value => suggestionToString(app, suggestion, ctx.suggester, value));
		return [fileText, ...aliasTexts]
			.map(text => {
				let result = fuzzySearcher(text)
				if (!result) return null;
				return {type: 'text', score: result.score, matches: result.matches, text}
			})
			.filter(value => value != null)
	} else {
		let resultValue = fuzzySearcher(suggestion.value);
		let resultLabel = suggestion.label ? fuzzySearcher(suggestion.label) : null
		let result = resultLabel ?? resultValue;
		if (!result) return [];
		const text = suggestion.label ? suggestion.label : suggestion.value;
		return [{
			type: 'text',
			score: result.score,
			matches: result.matches,
			text: text,
			customData: {color: suggestion.color, actualValue: suggestion.label ? suggestion.value : undefined}
		}]
	}
}


/**
 * Not all strategies can be used to generate a list of suggestions.
 * For example, a negation of a list cannot be used to generate a list of suggestions, only filter already existing lists.
 * A provider is a strategy that can be used to retrieve a list of values.
 * @param value
 */
export function isProvider(value: SuggestionStrategy): boolean {
	switch (value.type) {
		case "List":
		case "Tag":
		case "Folder":
		case "JS":
			return true;
		case "Disjunction":
			return value.strategies.every(strategy => isProvider(strategy));
		case "Conjunction":
			return value.strategies.some(strategy => isProvider(strategy))
		case "Negation":
			return value.strategy.type === "Tag" || value.strategy.type === "Folder";
	}
}
