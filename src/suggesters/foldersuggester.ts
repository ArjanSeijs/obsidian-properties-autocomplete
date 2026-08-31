import {AbstractInputSuggest, TFolder} from "obsidian";

export class FolderSuggester extends AbstractInputSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.app.vault.getAllFolders(false)
			.filter(folder => folder.path.toLowerCase().includes(lower))
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}
}
