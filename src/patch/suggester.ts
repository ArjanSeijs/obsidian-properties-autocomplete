import {around, dedupe} from "monkey-around";
import AutoPropPlugin from "../main";
import {AbstractInputSuggest, App, HistoryHandler, ISuggestOwner, Scope} from "obsidian";

type uninstaller = () => void
type patched = { _uninstaller: uninstaller }

export function patchSuggester(plugin: AutoPropPlugin) {
	// Patch getValue of AbstractInputSuggest to intercept an instance of the Internal PropertySuggester.
	return around(AbstractInputSuggest.prototype, {
		getValue(old: () => string) {
			return function () {
				// @ts-ignore -- This has type any but is a AbstractInputSuggest
				// this is an instance of abstract input suggester and may be a ObsidianPropertySuggester
				const instance = this as (AbstractInputSuggest<string> & Partial<ObsidianPropertySuggester<SuggestionType>>);
				if (!isPatched(instance) && isPropertySuggester(instance)) {
					tagPatched(instance, patchGetSuggestions(plugin, instance));
				}
				return old.call(instance)
			}
		}
	});
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
					results.push({type: 'text', matches: [], score: 10, text: 'Test'})
					return results;
				}
				return old.call(instance, query);
			})
		}
	})
}

function isPropertySuggester<T>(instance: Partial<ObsidianPropertySuggester<T>>): instance is ObsidianPropertySuggester<T> {
	const suggestEl = instance.suggestEl;
	return suggestEl !== undefined &&
		suggestEl !== null &&
		suggestEl.instanceOf(HTMLElement) &&
		suggestEl.hasClass('suggestion-container') &&
		suggestEl.hasClass('mod-property-value')
}

function isPatched(obj: object): obj is patched {
	return "_uninstaller" in obj && typeof obj._uninstaller === "function";
}

function tagPatched(obj: object, uninstaller: () => void): obj is patched {
	(obj as patched)._uninstaller = uninstaller;
	return true;
}

/**
 * PopoverSuggester + AbstractInputSuggester + internal api for property suggester.
 */
interface ObsidianPropertySuggester<T> extends ISuggestOwner<T>, HistoryHandler {

	/* == Internal API == */
	suggestEl: HTMLElement

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
