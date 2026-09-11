import AutoPropPlugin from "../main";
import {evalAndValidate} from "../util/code";

import {StrategySuggestionResult, isSuggestionResult, eqSuggestionResult} from "./suggestion";
import {ErrorWithNotice, EvalContext, SuggesterContext} from "../types";
import {text} from "../i18n";

/**
 * Matches string or file in list returned by dynamic code
 */
export interface CodeStrategy {
	type: 'JS'
	code: string;
}

export async function evaluate(plugin: AutoPropPlugin, code: CodeStrategy, ctx: EvalContext) {
	const results = await evalAndValidate(plugin, code.code, isSuggestionResult, ctx.suggester?.sourcePath);
	if (results === null) throw new ErrorWithNotice('Error executing code for ' + ctx.property, text('error.code.fail', ctx.property))
	return results ?? []
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, code: CodeStrategy, ctx: EvalContext): Promise<boolean> {
	const results = await evalAndValidate(plugin, code.code, isSuggestionResult, ctx.suggester?.sourcePath);
	return results?.some(other => eqSuggestionResult(suggestion, other)) ?? false;
}
