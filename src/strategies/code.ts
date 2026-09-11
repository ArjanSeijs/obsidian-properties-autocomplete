import AutoPropPlugin from "../main";
import {evalAndValidate} from "../util/code";

import {StrategySuggestionResult, isSuggestionResult, eqSuggestionResult} from "./suggestion";
import {ErrorWithNotice, SuggesterContext} from "../types";
import {text} from "../i18n";

/**
 * Matches string or file in list returned by dynamic code
 */
export interface CodeStrategy {
	type: 'JS'
	code: string;
}

export async function evaluate(plugin: AutoPropPlugin, code: CodeStrategy, context?: SuggesterContext) {
	const results = await evalAndValidate(plugin, code.code, isSuggestionResult, context?.sourcePath);
	if (results === null) throw new ErrorWithNotice('Error executing code for ' + context?.key, text('error.code.fail', context?.key))
	return results ?? []
}

export async function match(plugin: AutoPropPlugin, suggestion: StrategySuggestionResult, code: CodeStrategy, context?: SuggesterContext): Promise<boolean> {
	const results = await evalAndValidate(plugin, code.code, isSuggestionResult, context?.sourcePath);
	return results?.some(other => eqSuggestionResult(suggestion, other)) ?? false;
}
