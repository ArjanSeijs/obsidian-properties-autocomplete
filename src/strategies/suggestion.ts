import {App, TFile} from "obsidian";
import type {ListItem} from "./list";
import {SuggesterContext} from "../types";

/**
 * StrategySuggestion result is the evaluation of a strategy.
 * Not te be confused with SuggestionResult which is the internal obsidian representation of suggestions.
 */
export type StrategySuggestionResult = TFile | string | ListItem;
export type StrategySuggestionResults = StrategySuggestionResult[]

export function eqSuggestionResult(a: StrategySuggestionResult, b: StrategySuggestionResult) {
	if (a instanceof TFile) {
		if (!(b instanceof TFile)) return false;
		return a.path === b.path
	} else if (typeof a === "object") {
		if (typeof b !== "object") return false;
		return ("value" in a) && ("value" in b) && a.value === b.value;
	} else if (typeof a === "string") {
		if (typeof b !== "string") return false;
		return a === b
	}
	return false;
}

/**
 * Check if a string option is equal to the string representation of a StrategySuggestionResult
 * @param app
 * @param option
 * @param suggestion
 */
export function validateSuggestionResult(app: App, option: string, suggestion: StrategySuggestionResult) {
	if (suggestion instanceof TFile) {
		if (!option.startsWith("[[") || !option.endsWith("]]")) return false;
		let file = app.metadataCache.getFirstLinkpathDest(option.substring(2, option.length - 2), '/')
		return file?.path === suggestion.path
	} else if (typeof suggestion === "string") {
		return suggestion === option;
	} else if (typeof suggestion === "object") {
		return suggestion.value === option;
	}
	return false;
}

/**
 * Validator for `evaluateStrategyCode`
 * @see evalAndValidate
 * @param value
 */
export function isSuggestionResult(value: unknown): value is StrategySuggestionResult {
	if (typeof value === 'string') return true;
	if (value != null &&
		typeof value === "object" &&
		"value" in value &&
		typeof value.value === "string") return true;
	return value instanceof TFile;
}

/**
 * String representation of strategy suggestion result.
 * @param app
 * @param suggestion
 * @param context
 * @param alias
 */
export function suggestionToString(app: App, suggestion: StrategySuggestionResult, context?: SuggesterContext, alias?: string) {
	if (typeof suggestion === "string") {
		return suggestion;
	} else if (suggestion instanceof TFile) {
		return app.fileManager.generateMarkdownLink(suggestion, context ? context.sourcePath : '/', undefined, alias ?? suggestion.basename);
	} else {
		return suggestion.value;
	}
}
