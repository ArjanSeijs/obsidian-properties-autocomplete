import {AbstractInputSuggest, Component, MarkdownRenderer, normalizePath, TAbstractFile, TFile, Vault} from "obsidian";
import {getAliases, getFilesInFolder, getMarkdownFilesWithTag} from "../util/fileutil";
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


export type SuggesterResult = TFile | string | { label: string, value: string };

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
		query = query.toLowerCase();
		switch (this.strategy.type) {
			case "Tag":
				return [...this.queryTagSelections(this.strategy, query)]
			case "Folder":
				return [...this.queryFolderSelections(this.strategy, query)]
			case "List":
				return [...this.queryListSuggestions(this.strategy, query)]
			case "JS":
				return this.queryCodeSuggestions(this.strategy, query)
			// case "Disjunction":
			// 	return this.queryDisjunctSuggestions(this.strategy, query)
			// case "Conjunction":
			// 	return this.queryConjunctSuggestions(this.strategy, query)
			// case "Negation":
			// 	return this.queryNegationSuggestions(this.strategy, query)
		}
		throw new Error(`Not yet implemented strategy: ${this.strategy.type}`);
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
		let files = getFilesInFolder(this.app, strategy.folder, strategy.includeSubFolders);
		yield* this.queryFiles(files, query);
	}

	/**
	 * File suggestions, checks name or aliases first then path for matches with the query.
	 * @param files
	 * @param query
	 * @private
	 */
	private* queryFiles(files: TAbstractFile[] | Generator<TAbstractFile>, query: string) {
		let lowerCase = query.toLowerCase();
		for (let file of files) {
			if (!(file instanceof TFile)) continue;
			if (file.name.toLowerCase().includes(lowerCase)
				|| getAliases(this.app, file).find(value => value.toLowerCase().includes(lowerCase))) {
				yield file;
			}
		}
		for (let file of files) {
			if (!(file instanceof TFile)) continue;
			if (file.name.toLowerCase().includes(lowerCase)
				|| getAliases(this.app, file).find(value => value.toLowerCase().includes(lowerCase))) continue
			if (file.path.toLowerCase().includes(lowerCase)) {
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
		return await evaluateStrategyCode(this.plugin, strategy.code, validateResult) ?? [];
	}

	/*
	The following logic is applied for the junctions and negation:
	Querying a negation of a tag gets all files without the tag, - this is the only negation allowed to query directly all
	other negations need to be part of a junction: TODO: Also prevent this in the settings creation
	(it should not be really considered a logical negation but more WithoutTagStrategy)
	Thoughts (1):
	A negation in a conjunction will filter out all matches after the intersection of the other options had been taken.
	A negation in a union for now does not make any sense

	A disjunction will take a union of all its sub strategies.
	A conjunction will take a intersection of all its sub strategies followed by filtering out the negation.

	Thoughts (2):
	Top conjunction is union of its strategies.
	Can only contain: TagStrategy, Negation(TagStrategy), ListStrategy, FolderStrategy, CodeStrategy

	The nested disjunction is a intersection of its strategies + filters on the other strategies:
	Intersection of: TagStrategy, Negation(TagStrategy), ListStrategy, FolderStrategy, CodeStrategy
	Then filter intersection with Negation(ListStrategy), Negation(FolderStrategy), Negation(CodeStrategy)

	Thoughts (3):
	Improvement on (2) Split ConjunctionStrategy into a top level CNF provider, using union and intersections,
	and use deeper CNF as a filter on the providers. Use Different Type.

	Thoughts (4):
	In case of conjuction and disjuctions etc just get all files and use it as a filter.


	 */

	private async queryDisjunctSuggestions(strategy: DisjunctionStrategy, query: string) {
		throw new Error("Not yet implemented");
	}

	private queryConjunctSuggestions(strategy: ConjunctionStrategy, query: string) {
		throw new Error("Not yet implemented");
	}

	private* queryNegationSuggestions(strategy: NegationStrategy, query: string) {
		let subStrategy = strategy.strategy;
		yield
		throw new Error("Not yet implemented");
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
