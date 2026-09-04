import AutoPropPlugin from "../main";
import {SuggesterResult, testSuggestionEquality} from "./index";

export type ListItem = { label?: string, value: string, color?: string };

/**
 * Matches string in list
 */
export interface ListStrategy {
	type: 'List'
	options: ListItem[];
}

export function evaluate(_: AutoPropPlugin, listStrategy: ListStrategy) {
	return listStrategy.options;
}

export function match(_: AutoPropPlugin, suggestion: SuggesterResult, strategy: ListStrategy): boolean {
	return strategy.options.some(value => testSuggestionEquality(value, suggestion))
}
