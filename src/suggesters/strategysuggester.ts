import {
	AbstractInputSuggest,
	Component,
	MarkdownRenderer,
	Notice,
	TAbstractFile,
	TFile
} from "obsidian";
import {getAliases, getFilesInFolder, getMarkdownFilesWithTag, getTags, pathResolve} from "../util/fileutil";
import AutoPropPlugin from "../main";
import {
	AutoPropStrategy,
	CodeStrategy, ConjunctionStrategy,
	DisjunctionStrategy,
	FileFolderStrategy,
	FileTagStrategy,
	ListStrategy, NegationStrategy
} from "../strategy";
import {evaluateStrategyCode, validateResult} from "../util/code";
import {intersection, partition} from "../util/listutil";


export type SuggesterResult = TFile | string | { label: string, value: string };
type SuggesterResults = SuggesterResult[]

export class StrategySuggester extends AbstractInputSuggest<SuggesterResult> {
	private lifeCycleComponent = new Component();

	constructor(private plugin: AutoPropPlugin, inputElm: HTMLInputElement | HTMLDivElement, propertyKey: string, private strategy: AutoPropStrategy) {
		super(plugin.app, inputElm);
		// @ts-ignore -- internal api
		const suggestEl = this.suggestEl as HTMLElement;
		suggestEl.addClass('mod-property-value')
		suggestEl.setAttr('data-property-key', propertyKey)
		this.onSelect((value, _evt) => {
			const sourcePath = '/' //TODO
			if (typeof value === "string") {
				inputElm.innerText = value;
			} else if (value instanceof TFile) {
				inputElm.innerText = this.app.fileManager.generateMarkdownLink(value, sourcePath,);
			} else {
				inputElm.innerText = value.value
			}
			this.close();
		})
	}

	protected getSuggestions(query: string): SuggesterResult[] | Promise<SuggesterResult[]> {
		try {
			query = query.toLowerCase();
			return this.querySuggestions(this.strategy, query);
		} catch (e) {
			new Notice("Could not get suggestions.")
			console.error(e);
			return [];
		}
	}

	private async querySuggestions(strategy: AutoPropStrategy, query: string): Promise<SuggesterResults> {
		switch (strategy.type) {
			case "Tag":
				return [...this.queryTagSelections(strategy, query)]
			case "Folder":
				return [...this.queryFolderSelections(strategy, query)]
			case "List":
				return [...this.queryListSuggestions(strategy, query)]
			case "JS":
				return await this.queryCodeSuggestions(strategy, query)
			case "Disjunction":
				return this.queryDisjunctSuggestions(strategy, query)
			case "Conjunction":
				return this.queryConjunctSuggestions(strategy, query)
			case "Negation":
				return [...this.queryNegationSuggestions(strategy, query)]
		}
	}

	private matchQuery(value: SuggesterResult, query: string): boolean {
		if (value instanceof TFile) {
			const file = value;
			return file.name.toLowerCase().includes(query)
				|| getAliases(this.app, file).some(value => value.toLowerCase().includes(query))
		} else if (typeof value === "string") {
			return value.toLowerCase().includes(query)
		} else {
			return value.value.toLowerCase().includes(query) || value.label.toLowerCase().includes(query)
		}
	}

	renderSuggestion(suggestion: SuggesterResult, el: HTMLElement) {
		if (typeof suggestion === "string") {
			el.setText(suggestion);
		} else if (suggestion instanceof TFile) {
			const wikilink = this.app.fileManager.generateMarkdownLink(suggestion, '/',);
			void MarkdownRenderer.render(this.app, wikilink, el, '/', this.lifeCycleComponent)
		} else {
			el.setText(suggestion.label ?? suggestion.value)
		}
	}


	private* queryTagSelections(strategy: FileTagStrategy, query: string) {
		let files = getMarkdownFilesWithTag(this.app, strategy.tag);
		yield* this.queryFiles([...files], query);
	}

	private* queryFolderSelections(strategy: FileFolderStrategy, query: string) {
		const activeFile = this.app.workspace.getActiveFile();
		const folder = activeFile != null ? pathResolve(activeFile.parent!.path, strategy.folder) : strategy.folder;

		let files = getFilesInFolder(this.app, folder, strategy.includeSubFolders);
		yield* this.queryFiles(files, query);
	}

	/**
	 * File suggestions, checks name or aliases first then path for matches with the query.
	 * @param files
	 * @param query
	 * @private
	 */
	private* queryFiles(files: TAbstractFile[] | Generator<TAbstractFile>, query: string) {
		for (let file of files) {
			if (file instanceof TFile && this.matchQuery(file, query)) {
				yield file;
			}
		}
	}

	private queryListSuggestions(strategy: ListStrategy, query: string) {
		return strategy.options
			.filter(value =>
				value.label.toLowerCase().includes(query) ||
				value.value.toLowerCase().includes(query))
	}

	private async queryCodeSuggestions(strategy: CodeStrategy, query: string) {
		const results = (await evaluateStrategyCode(this.plugin, strategy.code, validateResult)) ?? [];
		return results.filter(value => this.matchQuery(value, query));
	}

	/*
	The following logic is applied for the junctions and negation:
	"Providers" are used as strategies that produce a list of suggestions and can be queried
	"Filters" can filter list of suggestions. All providers are also filters.
	The following strategies are providers:
		Tag, List, Folder, JS, Disjunction, Conjunction (if a substrategies is a provider), Negation of Tag or Folder
	The following strategies are only filters
		Conjunction if all its strategies are filters, and negations of lists, disjunctions and conjunctions.
	Top level strategy needs to be a provider otherwise it is impossible to query.
	Disjunctions needs all the substrategies to be providers
	Conjunctions are where the filters come into play as it is here where suggestions are filtered based on the strategies
	 */

	private async queryDisjunctSuggestions(strategy: DisjunctionStrategy, query: string): Promise<SuggesterResults> {
		const map = Promise.all(strategy.strategies.map(value => this.querySuggestions(value, query)));
		return (await map).flat().unique()
	}

	private async queryConjunctSuggestions(strategy: ConjunctionStrategy, query: string): Promise<SuggesterResults> {
		const {left: providers, right: filters} = partition(strategy.strategies, isProvider)
		const result = Promise.all(providers.map(provider => this.querySuggestions(provider, query)));
		const suggestions = intersection((a, b) => testSuggestionEquality(a, b), ...await result);
		return suggestions.filter(suggestion => this.matchStrategies(suggestion, filters))

	}

	private matchStrategies(suggestion: SuggesterResult, strategies: AutoPropStrategy[]): boolean {
		return strategies.every(strategy => this.matchStrategy(suggestion, strategy))
	}

	private matchStrategy(suggestion: SuggesterResult, strategy: AutoPropStrategy): boolean {
		switch (strategy.type) {
			case "List":
				return strategy.options.some(value => testSuggestionEquality(value, suggestion))
			case "Tag":
				return suggestion instanceof TFile &&
					getTags(this.app, suggestion)
						.some(value => value === strategy.tag || value.startsWith(strategy.tag + '/') && !strategy.exact)
			case "Folder": {
				const activeFile = this.app.workspace.getActiveFile();
				const folder = activeFile != null ? pathResolve(activeFile.parent!.path, strategy.folder) : strategy.folder;
				return suggestion instanceof TFile && suggestion.path.toLowerCase().includes(folder)
			}
			case "JS":
				throw new Error("Code not yet supported here")
			case "Disjunction":
				return strategy.strategies.every(strategy => this.matchStrategy(suggestion, strategy));
			case "Conjunction":
				return strategy.strategies.some(strategy => this.matchStrategy(suggestion, strategy));
			case "Negation":
				return !this.matchStrategy(suggestion, strategy.strategy);
		}
	}

	private queryNegationSuggestions(strategy: NegationStrategy, query: string) {
		let subStrategy = strategy.strategy;
		switch (subStrategy.type) {
			case "List":
				throw new Error("Cannot query negation of list")
			case "Tag":
				return this.queryFiles(getMarkdownFilesWithTag(this.app, subStrategy.tag, subStrategy.exact, true), query);
			case "Folder":
				return this.queryFiles(this.app.vault.getMarkdownFiles().filter(value => !value.path.includes(subStrategy.folder)), query);
			case "JS":
				throw new Error("Cannot query negation of code list")
			case "Disjunction":
				throw new Error("Cannot query negation of union")
			case "Conjunction":
				throw new Error("Cannot query negation of intersection")
		}
	}
}

function testSuggestionEquality(a: SuggesterResult, b: SuggesterResult) {
	if (a instanceof TFile) {
		if (!(b instanceof TFile)) return false;
		return a.path === b.path
	} else if (typeof a === "object") {
		if (typeof b !== "object") return false;
		return ("value" in a) && ("value" in b) && a.value === b.value;
	} else if (typeof a === "string") {
		if (typeof b !== "string") return false;
		return a === b
	}
	return false;
}

function isProvider(value: AutoPropStrategy): boolean {
	switch (value.type) {
		case "List":
		case "Tag":
		case "Folder":
		case "JS":
		case "Disjunction":
			return true;
		case "Conjunction":
			return value.strategies.some(strategy => isProvider(strategy))
		case "Negation":
			return value.strategy.type === "Tag" || value.strategy.type === "Folder";
	}
}

export type HTMLInputLikeElement = (HTMLInputElement | HTMLDivElement) & { suggester?: StrategySuggester };

/**
 * Registers a suggester on an input element if not already present.
 * @param plugin
 * @param target
 */
export function registerStrategySuggester(plugin: AutoPropPlugin, target: HTMLInputLikeElement) {
	// Already registered.
	if (target.suggester) return;
	const propertyKey = target
		.closest(".metadata-property")
		?.getAttribute("data-property-key");
	const strategy = propertyKey ? plugin.settings.properties[propertyKey] : null;
	if (strategy && propertyKey) target.suggester = new StrategySuggester(plugin, target, propertyKey, strategy)
}
