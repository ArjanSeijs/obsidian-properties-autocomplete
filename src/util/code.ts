import AutoPropPlugin from "../main";
import {App, Notice, TFile} from "obsidian";


import {SuggesterResult} from "../strategies";

export type Validator<T> = (value: unknown) => value is T;

/**
 * Throw error after ms
 * @param ms
 */
export function timeout(ms: number): Promise<never> {
	return new Promise((_, reject) =>
		window.setTimeout(() => reject(new Error(`Timeout (${ms} ms)`)), ms));
}

/**
 *
 * @param plugin
 * @param code
 * @param validator Function output validator
 * @param ms Timeout in ms
 */
export async function evalAndValidate<T>(plugin: AutoPropPlugin, code: string, validator: Validator<T>, ms = 5000): Promise<T[] | null> {
	if (!plugin.settings.allowJs) {
		new Notice('Enable JavaScript support in settings.');
		return null;
	}
	try {
		// eslint-disable-next-line eslint-comments/no-restricted-disable -- See below
		// eslint-disable-next-line @typescript-eslint/no-implied-eval,obsidianmd/rule-custom-message -- Users own risk, only executed if enabled in settings.
		let func = new Function(code) as (app: App) => Promise<unknown>;
		let result = await Promise.race([func(plugin.app), timeout(ms)]);

		if (!Array.isArray(result)) {
			new Notice("Result is not an array but was: " + typeof result);
			console.warn("Result is not an array but was: ", result);
			return null;
		}

		if (!result.every(validator)) {
			new Notice("Result validation failed")
			console.warn("Result validation failed: ", result);
			return null;
		}

		return result
	} catch (e) {
		new Notice("Error occurred executing code")
		console.error(e);
		return null;
	}
}

/**
 * Validator for `evaluateStrategyCode`
 * @see evalAndValidate
 * @param value
 */
export function validateResult(value: unknown): value is SuggesterResult {
	if (typeof value === 'string') return true;
	if (value != null &&
		typeof value === "object" &&
		"value" in value &&
		typeof value.value === "string") return true;
	return value instanceof TFile;
}
