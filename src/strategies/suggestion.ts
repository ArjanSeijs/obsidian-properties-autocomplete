import {App, TFile} from "obsidian";
import type {ListItem} from "./list";
import {Context} from "../types";

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

export function suggestionToString(app: App, suggestion: StrategySuggestionResult, context?: Context) {
	if (typeof suggestion === "string") {
		return suggestion;
	} else if (suggestion instanceof TFile) {
		return app.fileManager.generateMarkdownLink(suggestion, context ? context.sourcePath : '/');
	} else {
		return suggestion.value;
	}
}
