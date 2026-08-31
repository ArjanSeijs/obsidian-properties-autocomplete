import AutoPropPlugin from "../main";
import {App, Notice, TFile} from "obsidian";
import {SuggesterResult} from "../suggesters/strategysuggester";

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
 */
export async function evaluateStrategyCode<T>(plugin: AutoPropPlugin, code: string, validator: Validator<T>): Promise<T[] | null> {
	if (!plugin.settings.allowJs) {
		new Notice('Enable JavaScript support in settings.');
		return null;
	}
	try {
		// eslint-disable-next-line eslint-comments/no-restricted-disable -- See below
		// eslint-disable-next-line @typescript-eslint/no-implied-eval,obsidianmd/rule-custom-message -- Users own risk, only executed if enabled in settings.
		let func = new Function(code) as (app: App) => Promise<unknown>;
		let result = await Promise.race([func(plugin.app), timeout(5000)]);
		if (!Array.isArray(result)) {
			new Notice("Result is not an array but was: " + typeof result);
			console.warn("Result is not an array but was: ",);
			return null;
		}
		return result.every(validator) ? result : null;
	} catch (e) {
		new Notice("Error occurred executing code")
		console.error(e);
		return null;
	}
}

/**
 * Validator for `evaluateStrategyCode`
 * @see evaluateStrategyCode
 * @param value
 */
export function validateResult(value: unknown): value is SuggesterResult {
	if (typeof value === 'string') return true;
	if (value != null &&
		typeof value === "object" &&
		"label" in value &&
		"value" in value &&
		typeof value.label === "string" &&
		typeof value.value === "string") return true;
	return value instanceof TFile;
}
