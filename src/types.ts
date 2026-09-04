import type {App, HistoryHandler, ISuggestOwner, Scope} from "obsidian";

export type SuggestionResult<T extends object = object> = {
	type: string,
	text: string,
	score: number,
	matches: number[][],
	customData?: T
};
export type uninstaller = () => void
export type Context = { key: string, hoverSource: string, sourcePath: string };

/**
 * PopoverSuggester + AbstractInputSuggester + internal api for property suggester.
 */
export interface ObsidianPropertySuggester<T> extends ISuggestOwner<T>, HistoryHandler {

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
