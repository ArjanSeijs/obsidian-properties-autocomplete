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
import {TFile} from "obsidian";
import {getAliases} from "../util/fileutil";
import {Context} from "../patch/suggester";

export type AutoPropStrategy =
	TagStrategy
	| FolderStrategy
	| ListStrategy
	| CodeStrategy
	| DisjunctionStrategy
	| ConjunctionStrategy
	| NegationStrategy
export type StrategyType = AutoPropStrategy['type']
export type SuggesterResult = TFile | string | { label?: string, value: string };
export type SuggesterResults = SuggesterResult[]

export async function evaluateStrategy(plugin: AutoPropPlugin, strategy: AutoPropStrategy, context: Context): Promise<SuggesterResults> {
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

export function matchStrategies(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategies: AutoPropStrategy[], context : Context) {
	return strategies.every(strategy => matchStrategy(plugin, suggestion, strategy, context))
}

export function matchStrategy(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: AutoPropStrategy, context: Context): boolean {
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

export async function queryStrategy(plugin: AutoPropPlugin, strategy: AutoPropStrategy, query: string, context: Context) {
	query = query.toLowerCase();
	let results = await evaluateStrategy(plugin, strategy, context);
	return results.filter(result => matchQuery(plugin, result, query))
}

function matchQuery(plugin: AutoPropPlugin, value: SuggesterResult, query: string): boolean {
	if (value instanceof TFile) {
		const file = value;
		return file.name.toLowerCase().includes(query)
			|| getAliases(plugin.app, file).some(value => value.toLowerCase().includes(query))
	} else if (typeof value === "string") {
		return value.toLowerCase().includes(query)
	} else {
		return !!value.label && (value.value.toLowerCase().includes(query) || value.label.toLowerCase().includes(query))
	}
}

export function testSuggestionEquality(a: SuggesterResult, b: SuggesterResult) {
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


