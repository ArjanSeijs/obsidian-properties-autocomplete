
import AutoPropPlugin from "../main";
import {AutoPropStrategy, matchStrategy, SuggesterResult} from "./index";
import {getMarkdownFilesWithTag} from "../util/fileutil";

/**
 * Negation
 */
export interface NegationStrategy {
	type: 'Negation'
	strategy: Exclude<AutoPropStrategy, NegationStrategy>
}


export function evaluate(plugin: AutoPropPlugin, strategy: NegationStrategy) {
	let subStrategy = strategy.strategy;
	switch (subStrategy.type) {
		case "List":
			throw new Error("Cannot query negation of list")
		case "Tag":
			return [...getMarkdownFilesWithTag(plugin.app, subStrategy.tag, subStrategy.exact, true)]
		case "Folder":
			return plugin.app.vault.getMarkdownFiles().filter(value => !value.path.includes(subStrategy.folder))
		case "JS":
			throw new Error("Cannot query negation of code list")
		case "Disjunction":
			throw new Error("Cannot query negation of union")
		case "Conjunction":
			throw new Error("Cannot query negation of intersection")
	}
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: NegationStrategy): boolean {
	return !matchStrategy(plugin, suggestion, strategy.strategy);
}
