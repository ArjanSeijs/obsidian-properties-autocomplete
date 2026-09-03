import AutoPropPlugin from "../main";
import {getFilesInFolder, pathResolve} from "../util/fileutil";
import {TFile} from "obsidian";

import {SuggesterResult} from "./index";

/**
 * Matches file in folder
 */
export interface FolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: boolean
}

export function evaluate(plugin: AutoPropPlugin, strategy: FolderStrategy) {
	//TODO get from context instead of activefile
	const activeFile = plugin.app.workspace.getActiveFile();
	const folder = activeFile != null ? pathResolve(activeFile.parent!.path, strategy.folder) : strategy.folder;

	return getFilesInFolder(plugin.app, folder, strategy.includeSubFolders).filter(value => value instanceof TFile);
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: FolderStrategy): boolean {
	const activeFile = plugin.app.workspace.getActiveFile();
	const folder = activeFile != null ? pathResolve(activeFile.parent!.path, strategy.folder) : strategy.folder;
	return suggestion instanceof TFile && suggestion.path.toLowerCase().includes(folder)
}
