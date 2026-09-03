import {around, dedupe} from "monkey-around";
import AutoPropPlugin from "../main";
import {
	AbstractInputSuggest,
	App,
	HistoryHandler,
	ISuggestOwner,
	Scope,
	TFile
} from "obsidian";
import {queryStrategy, SuggesterResult} from "../strategies";

type uninstaller = () => void

export function patchSuggester(plugin: AutoPropPlugin) {
	// Patch getValue of AbstractInputSuggest to intercept an instance of the Internal PropertySuggester.
	let patches: uninstaller[] = []
	let uninstaller = around(AbstractInputSuggest.prototype, {
		getValue(old: () => string) {
			return function () {
				// @ts-ignore -- This has type any but is a AbstractInputSuggest
				// this is an instance of abstract input suggester and may be a ObsidianPropertySuggester
				const instance = this as (AbstractInputSuggest<string> & Partial<ObsidianPropertySuggester<SuggestionType>>);
				if (isPropertySuggester(instance)) {
					patches.push(patchGetSuggestions(plugin, instance));
				}
				return old.call(instance)
			}
		}
	});
	return () => {
		patches.forEach(patch => patch())
		uninstaller();
	}
}

type SuggestionType = { type: string, text: string, score: number, matches: number[][] };

function patchGetSuggestions(plugin: AutoPropPlugin, obj: ObsidianPropertySuggester<SuggestionType>): () => void {
	const prototypeOf = Object.getPrototypeOf(obj) as (ObsidianPropertySuggester<SuggestionType>);
	return around(prototypeOf, {
		getSuggestions(old: (query: string) => SuggestionType[] | Promise<SuggestionType[]>) {
			return dedupe("eternal.getSuggestions", old, async function (query: string) {
				// @ts-ignore -- Instance type
				const instance = this as ObsidianPropertySuggester<SuggestionType>;
				if (isPropertySuggester(instance)) {
					const results = await old.call(instance, query);
					const property = instance.context.key.toLowerCase();
					const strategy = plugin.settings.properties[property];
					if (strategy) {
						let additional = await queryStrategy(plugin, strategy, query, instance.context);
						let suggestions = additional.map(suggestion => convertSuggestion(plugin.app, suggestion));
						results.push(...suggestions);
					}
					return results;
				}
				return old.call(instance, query);
			})
		}
	})
}

function convertSuggestion(app: App, suggestion: SuggesterResult): SuggestionType {
	if (typeof suggestion === "string") {
		return {type: 'text', score: 10, matches: [], text: suggestion}
	} else if (suggestion instanceof TFile) {
		const wikilink = app.fileManager.generateMarkdownLink(suggestion, '/',);
		return {type: 'text', score: 10, matches: [], text: wikilink}
	} else {
		return {type: 'text', score: 10, matches: [], text: suggestion.value}
	}
}

function isPropertySuggester<T>(instance: Partial<ObsidianPropertySuggester<T>>): instance is ObsidianPropertySuggester<T> {
	const suggestEl = instance.suggestEl;
	return suggestEl !== undefined &&
		suggestEl !== null &&
		suggestEl.instanceOf(HTMLElement) &&
		suggestEl.hasClass('suggestion-container') &&
		suggestEl.hasClass('mod-property-value')
}

export type Context = { key: string, hoverSource: string, sourcePath: string };

/**
 * PopoverSuggester + AbstractInputSuggester + internal api for property suggester.
 */
interface ObsidianPropertySuggester<T> extends ISuggestOwner<T>, HistoryHandler {

	/* == Internal API == */
	suggestEl: HTMLElement

	context: Context

	/* == PopOver + AbstractInput == */

	/** @public */
	app: App;
	/** @public */
	scope: Scope;
	/**
	 * Limit to the number of elements rendered at once. Set to 0 to disable. Defaults to 100.
	 * @public
	 * @since 1.4.10
	 */
	limit: number;

	/** @public */
	open(): void;

	/** @public */
	close(): void;

	/**
	 * Sets the value into the input element.
	 * @public
	 * @since 1.4.10
	 */
	setValue(value: string): void;

	/**
	 * Gets the value from the input element.
	 * @public
	 * @since 1.4.10
	 */
	getValue(): string;

	/**
	 * @inheritDoc
	 * @param query
	 */
	getSuggestions(query: string): T[] | Promise<T[]>;

	/**
	 * @inheritDoc
	 * @public
	 */
	renderSuggestion(value: T, el: HTMLElement): void;

	/**
	 * @public
	 * @since 1.6.6
	 */
	selectSuggestion(value: T, evt: MouseEvent | KeyboardEvent): void;

	/**
	 * Registers a callback to handle when a suggestion is selected by the user.
	 * @public
	 * @since 1.4.10
	 */
	onSelect(callback: (value: T, evt: MouseEvent | KeyboardEvent) => void): this;


}
