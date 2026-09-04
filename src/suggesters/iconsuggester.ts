import {AbstractInputSuggest, getIconIds, prepareFuzzySearch, setIcon} from "obsidian";

export class IconSuggester extends AbstractInputSuggest<string> {

	protected getSuggestions(query: string): string[] {
		let searcher = prepareFuzzySearch(query)
		let icons = getIconIds();
		return icons.map(icon => {
			let score = searcher(icon)?.score;
			return {score, icon};
		}).filter(value => value.score !== undefined)
			.sort((a, b) => b.score! - a.score!)
			.map(value => value.icon)
	}

	renderSuggestion(icon: string, el: HTMLElement): void {
		const iconEl = el.createSpan();
		const textEl = el.createSpan();
		iconEl.addClass('icon-item')
		textEl.addClass('icon-item')
		setIcon(iconEl, icon)
		textEl.setText(icon);
	}

}
