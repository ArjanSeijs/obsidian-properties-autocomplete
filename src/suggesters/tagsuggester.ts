import {AbstractInputSuggest, prepareFuzzySearch} from "obsidian";

export class TagSuggester extends AbstractInputSuggest<string> {
	protected getSuggestions(query: string): string[] {
		let searcher = prepareFuzzySearch(query);
		// @ts-ignore
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Internal API
		const tags = this.app.metadataCache.getTags() as { [key: string]: number };
		const allTags = Object.keys(tags);
		return allTags.map(tag => {
			let score = searcher(tag)?.score
			return {tag, score}
		}).filter(value => value.score != undefined)
			.sort((a, b) => b.score! - a.score!)
			.map(value => value.tag)
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.setText(tag);
	}
}
