import AutoPropPlugin from "../main";
import {App, CachedMetadata, Notice, TFile} from "obsidian";
import {getFrontmatter} from "./fileutil";
import {AsyncFunction, ErrorWithNotice} from "../types";
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


type FunCtx = { file: TFile | null; frontmatter: object | null; metadata: CachedMetadata | null };

type UserScript = (app: App, ctx: ExecContext) => Promise<unknown>;


/**
 * Execute function inside a promise context.
 * @param code
 * @param app
 * @param ctx
 */
async function createFunction(code: string, app: App, ctx: FunCtx): Promise<unknown> {
	let func = new AsyncFunction("app", "ctx", code) as UserScript;
	return await func(app, ctx);
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
		let ctx: FunCtx = {file, frontmatter, metadata};

		let func = createFunction(code, plugin.app, ctx);
		let result = await Promise.race([func, timeout(ms)]);

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

