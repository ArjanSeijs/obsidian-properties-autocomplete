import {AbstractInputSuggest, prepareFuzzySearch, TFolder} from "obsidian";

export class FolderSuggester extends AbstractInputSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] {
		let searcher = prepareFuzzySearch(query);
		let folders = this.app.vault.getAllFolders(false);
		return folders.map(folder => {
			let score = searcher(folder.path)?.score
			return {folder, score}
		}).filter(value => value.score != undefined)
			.sort((a, b) => a.score! - a.score!)
			.map(value => value.folder)
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}
}
