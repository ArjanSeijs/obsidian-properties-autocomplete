import AutoPropPlugin from "../main";
import {StrategySuggestionResult, testSuggestionEquality} from "./index";
import {HexString} from "obsidian";

export type ListItem = { label?: string, value: string, color?: HexString };

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

export function match(_: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: ListStrategy): boolean {
	return strategy.options.some(value => testSuggestionEquality(value, suggestion))
}
