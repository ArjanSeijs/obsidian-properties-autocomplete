import AutoPropPlugin from "../main";
import {evalAndValidate} from "../util/code";

import {StrategySuggestionResult, isSuggestionResult} from "./suggestion";
import {SuggesterContext} from "../types";

/**
 * Matches string or file in list returned by dynamic code
 */
export interface CodeStrategy {
	type: 'JS'
	code: string;
}

export async function evaluate(plugin: AutoPropPlugin, code: CodeStrategy, context?: SuggesterContext) {
	const results = await evalAndValidate(plugin, code.code, isSuggestionResult, context?.sourcePath);
	return results ?? []
}

export function match(_plugin: AutoPropPlugin, _suggestion: StrategySuggestionResult, _code: CodeStrategy): boolean {
	throw new Error("Code strategy not supported for filtering");
}
