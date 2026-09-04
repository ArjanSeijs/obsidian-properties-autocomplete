import type AutoPropPlugin from "../main";

import type {CodeStrategy} from "./code";
import * as Code from "./code";
import type {ConjunctionStrategy} from "./conjunction";
import * as Conjunction from "./conjunction";
import type {DisjunctionStrategy} from "./disjunction";
import * as Disjunction from "./disjunction";
import type {FolderStrategy} from "./folder";
import * as Folder from "./folder";
import type {ListItem, ListStrategy} from "./list";
import * as List from "./list";
import type {NegationStrategy} from "./negation";
import * as Negation from "./negation";
import type {TagStrategy} from "./tag";
import * as Tag from "./tag";
import {App, prepareFuzzySearch, SearchResult, TFile} from "obsidian";

import {Context, SuggestionResult} from "../types";

export type SuggestionStrategy =
	TagStrategy
	| FolderStrategy
	| ListStrategy
	| CodeStrategy
	| DisjunctionStrategy
	| ConjunctionStrategy
	| NegationStrategy
export type SuggestionStrategyType = SuggestionStrategy['type']
export type StrategySuggestionResult = TFile | string | ListItem;
export type StrategySuggestionResults = StrategySuggestionResult[]

export async function evaluateStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, context: Context): Promise<StrategySuggestionResults> {
	switch (strategy.type) {
		case "List":
			return List.evaluate(plugin, strategy)
		case "Tag":
			return Tag.evaluate(plugin, strategy)
		case "Folder":
			return Folder.evaluate(plugin, strategy, context)
		case "JS":
			return Code.evaluate(plugin, strategy)
		case "Disjunction":
			return Disjunction.evaluate(plugin, strategy, context)
		case "Conjunction":
			return Conjunction.evaluate(plugin, strategy, context);
		case "Negation":
			return Negation.evaluate(plugin, strategy, context);

	}
}

export function matchStrategies(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategies: SuggestionStrategy[], context: Context) {
	return strategies.every(strategy => matchStrategy(plugin, suggestion, strategy, context))
}

export function matchStrategy(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: SuggestionStrategy, context: Context): boolean {
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

export async function queryStrategy(plugin: AutoPropPlugin, strategy: SuggestionStrategy, query: string, context: Context) {
	let results = await evaluateStrategy(plugin, strategy, context);
	return results.map(suggestion => fuzzySearchSuggestions(plugin.app, suggestion, prepareFuzzySearch(query))).filter(value => value != null)
}


function fuzzySearchSuggestions(app: App, suggestion: StrategySuggestionResult, fuzzySearcher: (text: string) => (SearchResult | null)): SuggestionResult | null {
	if (typeof suggestion === "string") {
		let result = fuzzySearcher(suggestion);
		if (!result) return null;
		return {type: 'text', score: result.score, matches: result.matches, text: suggestion}
	} else if (suggestion instanceof TFile) {
		const wikilink = app.fileManager.generateMarkdownLink(suggestion, '/',);
		let result = fuzzySearcher(wikilink);
		if (!result) return null;
		return {type: 'text', score: result.score, matches: result.matches, text: wikilink}
	} else {
		let resultValue = fuzzySearcher(suggestion.value);
		let resultLabel = suggestion.label ? fuzzySearcher(suggestion.label) : null
		let result = resultLabel ?? resultValue ;
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

export function testSuggestionEquality(a: StrategySuggestionResult, b: StrategySuggestionResult) {
	if (a instanceof TFile) {
		if (!(b instanceof TFile)) return false;
		return a.path === b.path
	} else if (typeof a === "object") {
		if (typeof b !== "object") return false;
		return ("value" in a) && ("value" in b) && a.value === b.value;
	} else if (typeof a === "string") {
		if (typeof b !== "string") return false;
		return a === b
	}
	return false;
}


