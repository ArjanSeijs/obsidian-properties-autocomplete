import AutoPropPlugin from "../main";
import {App, CachedMetadata, Notice, TFile} from "obsidian";
import {getFrontmatter} from "./fileutil";
import {ErrorWithNotice} from "../types";
import {text} from "../i18n";

export type Validator<T> = (value: unknown) => value is T;

export type ExecContext = {
	file: TFile | null
	frontmatter: object | null
	metadata: CachedMetadata | null
}

/**
 * Throw error after ms
 * @param ms
 */
export function timeout(ms: number): Promise<never> {
	return new Promise((_, reject) =>
		window.setTimeout(() => reject(new ErrorWithNotice(`Timeout (${ms} ms)`, text('error.code.timeout', ms))), ms));
}

/**
 *
 * @param plugin
 * @param code
 * @param validator Function output validator
 * @param ms Timeout in ms
 * @param sourcePath
 */
export async function evalAndValidate<T>(plugin: AutoPropPlugin, code: string, validator: Validator<T>, sourcePath?: string, ms = plugin.settings.jsTimeout): Promise<T[] | null> {
	if (!plugin.settings.allowJs) {
		new Notice(text('error.code.disabled'));
		return null;
	}
	try {
		let file = sourcePath ? plugin.app.vault.getFileByPath(sourcePath) : null;
		let frontmatter = file ? getFrontmatter(plugin.app, file) : null;
		let metadata = file ? plugin.app.metadataCache.getFileCache(file) : null;
		let ectx = {file, frontmatter, metadata};
		// eslint-disable-next-line eslint-comments/no-restricted-disable -- See below
		// eslint-disable-next-line @typescript-eslint/no-implied-eval,obsidianmd/rule-custom-message -- Users own risk, only executed if enabled in settings.
		let func = new Function("app", "ectx", code) as (app: App, ectx: ExecContext) => Promise<unknown>;
		let result = await Promise.race([func(plugin.app, ectx), timeout(ms)]);

		if (!Array.isArray(result)) {
			new Notice(text('error.code.array', typeof result));
			console.warn("Result is not an array but was: ", result);
			return null;
		}

		if (!result.every(validator)) {
			new Notice(text('error.code.valid'))
			console.warn("Result validation failed: ", result);
			return null;
		}

		return result
	} catch (e) {
		console.error(e);
		return null;
	}
}

