import AutoPropPlugin from "../main";
import {SuggesterResult, testSuggestionEquality} from "./index";

/**
 * Matches string in list
 */
export interface ListStrategy {
	type: 'List'
	options: { label?: string, value: string }[];
}

export function evaluate(_: AutoPropPlugin, listStrategy: ListStrategy) {
	return listStrategy.options;
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: ListStrategy): boolean {
	return strategy.options.some(value => testSuggestionEquality(value, suggestion))
}
