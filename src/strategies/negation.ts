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
	let keyMessage = context ? `(${context.key}) ` : '';
	let subStrategy = strategy.strategy;
	switch (subStrategy.type) {
		case "List":
			throw new Error("Cannot query negation of list " + keyMessage)
		case "Tag":
			return [...getMarkdownFilesWithTag(plugin.app, subStrategy.tag, subStrategy.exact, true)]
		case "Folder": {
			const folder = context ? pathResolve(context.sourcePath, "..", subStrategy.folder) : pathResolve(subStrategy.folder);
			return plugin.app.vault.getMarkdownFiles().filter(value => !value.path.includes(folder))
		}
		case "JS":
			throw new Error("Cannot query negation of code list" + keyMessage)
		case "Disjunction":
			throw new Error("Cannot query negation of union" + keyMessage)
		case "Conjunction":
			throw new Error("Cannot query negation of intersection" + keyMessage)
	}
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: NegationStrategy, context?: SuggesterContext): Promise<boolean> {
	return !await matchStrategy(plugin, suggestion, strategy.strategy, context);
}
