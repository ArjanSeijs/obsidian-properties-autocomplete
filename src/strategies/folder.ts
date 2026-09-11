import AutoPropPlugin from "../main";
import {getFilesInFolder, pathResolve} from "../util/fileutil";
import {TFile} from "obsidian";

import {EvalContext} from "../types";
import {StrategySuggestionResult} from "./suggestion";

/**
 * Matches file in folder
 */
export interface FolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: boolean
}

export function evaluate(plugin: AutoPropPlugin, strategy: FolderStrategy, ctx: EvalContext) {
	const folder = ctx.suggester ? pathResolve(ctx.suggester.sourcePath, "..", strategy.folder) : pathResolve(strategy.folder);

	return getFilesInFolder(plugin.app, folder, strategy.includeSubFolders).filter(value => value instanceof TFile);
}

export function match(_: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: FolderStrategy, ctx: EvalContext): boolean {
	const folder = ctx.suggester ? pathResolve(ctx.suggester.sourcePath, "..", strategy.folder) : pathResolve(strategy.folder);
	return suggestion instanceof TFile && suggestion.path.toLowerCase().includes(folder)
}
