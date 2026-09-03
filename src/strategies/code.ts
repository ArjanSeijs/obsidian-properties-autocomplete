import AutoPropPlugin from "../main";
import {evalAndValidate, validateResult} from "../util/code";
import type {SuggesterResult} from "./index";

/**
 * Matches string or file in list returned by dynamic code
 */
export interface CodeStrategy {
	type: 'JS'
	code: string;
}

export async function evaluate(plugin: AutoPropPlugin, code: CodeStrategy) {
	const results = await evalAndValidate(plugin, code.code, validateResult);
	return results ?? []
}

export function match(_plugin: AutoPropPlugin, _suggestion : SuggesterResult, _code: CodeStrategy) : boolean {
	throw new Error("Not yet implemented");
}
