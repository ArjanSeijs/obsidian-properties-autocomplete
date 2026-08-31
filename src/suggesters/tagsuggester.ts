import {AbstractInputSuggest} from "obsidian";

export class TagSuggester extends AbstractInputSuggest<string> {
	protected getSuggestions(query: string): string[] {
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Internal API
		const tags = this.app.metadataCache.getTags() as { [key: string]: number };
		const allTags = Object.keys(tags);
		const lower = query.toLowerCase();
		return allTags
			.filter((tag) => tag.toLowerCase().includes(lower))
			.sort((a, b) => a.localeCompare(b));
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(tag);
	}
}
