import {AbstractInputSuggest, App, Component, MarkdownRenderer, TFile} from "obsidian";
import {AutoPropFileTagStrategy, AutoPropStrategy} from "../settings";
import {getAliases, getMarkdownFilesWithTag} from "../util/fileutil";
import AutoPropPlugin from "../main";


export class StrategySuggester extends AbstractInputSuggest<TFile | string> {
	private lifeCycleComponent = new Component();

	constructor(app: App, inputElm: HTMLInputElement | HTMLDivElement, propertyKey: string, private strategy: AutoPropStrategy) {
		super(app, inputElm);
		// @ts-ignore
		const suggestEl = this.suggestEl as HTMLElement;
		suggestEl.addClass('mod-property-value')
		suggestEl.setAttr('data-property-key', propertyKey)
		this.onSelect((value, evt) => {
			const sourcePath = '/' //TODO
			inputElm.innerText = typeof value === "string" ? value : this.app.fileManager.generateMarkdownLink(
				value,
				sourcePath,
			);
			this.close();
		})
	}

	protected getSuggestions(query: string): (TFile | string)[] | Promise<(TFile | string)[]> {
		if (this.strategy.type === "Tag") {
			return [...this.getTagSuggestions(this.strategy, query)]
		}
		throw new Error(`Not yet implemented strategy: ${this.strategy.type}`);
	}


	private* getTagSuggestions(strategy: AutoPropFileTagStrategy, query: string) {
		query = query.toLowerCase();
		let files = getMarkdownFilesWithTag(this.app, strategy.tag);
		for (let file of files) {
			if (file.name.toString().includes(query)
				|| getAliases(this.app, file).find(value => value.toLowerCase().includes(query))) {
				yield file;
			}
		}
		for (let file of files) {
			if (file.path.toLowerCase().includes(query)) {
				yield file;
			}
		}
	}

	renderSuggestion(suggestion: TFile | string, el: HTMLElement) {
		if (typeof suggestion === "string") {
			el.setText(suggestion);
		} else {
			const wikilink = this.app.fileManager.generateMarkdownLink(
				suggestion,
				'/',
			);
			void MarkdownRenderer.render(this.app, wikilink, el, '/', this.lifeCycleComponent)
		}
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
	if (target.hasClass('metadata-input-longtext')) {
		const querySelector = target.parentElement!.parentElement!.querySelector(".metadata-property-key-input") as HTMLInputElement;
		const strategy = plugin.settings.properties[querySelector.value];
		if (strategy) target.suggester = new StrategySuggester(plugin.app, target, querySelector.value, strategy)
	} else if (target.hasClass('multi-select-input')) {
		const querySelector = target.parentElement!.parentElement!.parentElement!.querySelector(".metadata-property-key-input") as HTMLInputElement;
		const strategy = plugin.settings.properties[querySelector.value];
		if (strategy) target.suggester = new StrategySuggester(plugin.app, target, querySelector.value, strategy)
	}
}
