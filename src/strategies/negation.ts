import AutoPropPlugin from "../main";
import {SuggestionStrategy, matchStrategy} from "./index";
import {getMarkdownFilesWithTag, pathResolve} from "../util/fileutil";

import {ErrorWithNotice, EvalContext} from "../types";
import {StrategySuggestionResult} from "./suggestion";
import {text} from "../i18n";

/**
 * Negation
 */
export interface NegationStrategy {
	type: 'Negation'
	strategy: Exclude<SuggestionStrategy, NegationStrategy>
}


export function evaluate(plugin: AutoPropPlugin, strategy: NegationStrategy, ctx: EvalContext) {
	let subStrategy = strategy.strategy;
	switch (subStrategy.type) {
		case "List":
			throw new ErrorWithNotice("Cannot query negation of list " + ctx.property, text('error.strategy.negation.list', ctx.property))
		case "Tag":
			return [...getMarkdownFilesWithTag(plugin.app, subStrategy.tag, subStrategy.exact, true)]
		case "Folder": {
			const folder = ctx.suggester ? pathResolve(ctx.suggester.sourcePath, "..", subStrategy.folder) : pathResolve(subStrategy.folder);
			return plugin.app.vault.getMarkdownFiles().filter(value => !value.path.includes(folder))
		}
		case "JS":
			throw new ErrorWithNotice("Cannot query negation of code list" + ctx.property, text('error.strategy.negation.code', ctx.property))
		case "Disjunction":
			throw new ErrorWithNotice("Cannot query negation of union" + ctx.property, text('error.strategy.negation.disjunction', ctx.property))
		case "Conjunction":
			throw new ErrorWithNotice("Cannot query negation of intersection" + ctx.property, text('error.strategy.negation.conjunction', ctx.property))
	}
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: NegationStrategy, ctx: EvalContext): Promise<boolean> {
	return !await matchStrategy(plugin, suggestion, strategy.strategy, ctx);
}
