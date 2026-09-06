import AutoPropPlugin from "../main";
import {getFilesInFolder, pathResolve} from "../util/fileutil";
import {TFile} from "obsidian";

import {SuggesterContext} from "../types";
import {StrategySuggestionResult} from "./suggestion";

/**
 * Matches file in folder
 */
export interface FolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: boolean
}

export function evaluate(plugin: AutoPropPlugin, strategy: FolderStrategy, context?: SuggesterContext) {
	const folder = context ? pathResolve(context.sourcePath, "..", strategy.folder) : pathResolve(strategy.folder);

	return getFilesInFolder(plugin.app, folder, strategy.includeSubFolders).filter(value => value instanceof TFile);
}

export function match(_: AutoPropPlugin, suggestion: StrategySuggestionResult, strategy: FolderStrategy, context?: SuggesterContext): boolean {
	const folder = context ? pathResolve(context.sourcePath, "..", strategy.folder) : pathResolve(strategy.folder);
	return suggestion instanceof TFile && suggestion.path.toLowerCase().includes(folder)
}
