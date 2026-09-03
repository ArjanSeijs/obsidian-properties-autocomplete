import AutoPropPlugin from "../main";
import {getFilesInFolder, pathResolve} from "../util/fileutil";
import {TFile} from "obsidian";

import {SuggesterResult} from "./index";

import {Context} from "../types";

/**
 * Matches file in folder
 */
export interface FolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: boolean
}

export function evaluate(plugin: AutoPropPlugin, strategy: FolderStrategy, context: Context) {
	const folder = pathResolve(context.sourcePath, "..", strategy.folder);

	return getFilesInFolder(plugin.app, folder, strategy.includeSubFolders).filter(value => value instanceof TFile);
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: FolderStrategy, context: Context): boolean {
	const folder = pathResolve(context.sourcePath, "..", strategy.folder);
	return suggestion instanceof TFile && suggestion.path.toLowerCase().includes(folder)
}
