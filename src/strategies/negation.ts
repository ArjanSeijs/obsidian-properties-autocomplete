import AutoPropPlugin from "../main";
import {SuggestionStrategy, matchStrategy} from "./index";
import {getMarkdownFilesWithTag, pathResolve} from "../util/fileutil";

import {SuggesterContext} from "../types";
import {StrategySuggestionResult} from "./suggestion";

/**
 * Negation
 */
export interface NegationStrategy {
	type: 'Negation'
	strategy: Exclude<SuggestionStrategy, NegationStrategy>
}


export function evaluate(plugin: AutoPropPlugin, strategy: NegationStrategy, context?: SuggesterContext) {

	let subStrategy = strategy.strategy;
	switch (subStrategy.type) {
		case "List":
			throw new Error("Cannot query negation of list")
		case "Tag":
			return [...getMarkdownFilesWithTag(plugin.app, subStrategy.tag, subStrategy.exact, true)]
		case "Folder": {
			const folder = context ? pathResolve(context.sourcePath, "..", subStrategy.folder) : pathResolve(subStrategy.folder);
			return plugin.app.vault.getMarkdownFiles().filter(value => !value.path.includes(folder))
		}
		case "JS":
			throw new Error("Cannot query negation of code list")
		case "Disjunction":
			throw new Error("Cannot query negation of union")
		case "Conjunction":
			throw new Error("Cannot query negation of intersection")
	}
}

export function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: NegationStrategy, context?: SuggesterContext): boolean {
	return !matchStrategy(plugin, suggestion, strategy.strategy, context);
}
