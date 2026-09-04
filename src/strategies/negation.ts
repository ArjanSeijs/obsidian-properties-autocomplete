import AutoPropPlugin from "../main";
import {SuggestionStrategy, matchStrategy, StrategySuggestionResult} from "./index";
import {getMarkdownFilesWithTag, pathResolve} from "../util/fileutil";

import {Context} from "../types";

/**
 * Negation
 */
export interface NegationStrategy {
	type: 'Negation'
	strategy: Exclude<SuggestionStrategy, NegationStrategy>
}


export function evaluate(plugin: AutoPropPlugin, strategy: NegationStrategy, context: Context) {

	let subStrategy = strategy.strategy;
	switch (subStrategy.type) {
		case "List":
			throw new Error("Cannot query negation of list")
		case "Tag":
			return [...getMarkdownFilesWithTag(plugin.app, subStrategy.tag, subStrategy.exact, true)]
		case "Folder": {
			const folder = pathResolve(context.sourcePath, "..", subStrategy.folder);
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

export function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: NegationStrategy, context : Context): boolean {
	return !matchStrategy(plugin, suggestion, strategy.strategy, context);
}
