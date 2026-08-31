import {Modal, Setting} from "obsidian";
import AutoPropPlugin from "./main";
import {TagSuggester} from "./suggesters/tagsuggester";

export interface AutoPropSettings {
	properties: { [key: string]: AutoPropStrategy };
}

export interface AutoPropFileTagStrategy {
	type: 'Tag'
	tag: string;
}

export interface AutoPropFileFolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: number
}

export interface AutoPropListStrategy {
	type: 'List'
	options: { label: string, value: string }[];
}

export interface AutoPropJSStrategy {
	type: 'JS'
	code: string;
}

export interface AutoPropDisjunctionStrategy {
	type: 'Disjunction'
	strategies: AutoPropStrategy[]
}

export interface AutoPropConjunctionStrategy {
	type: 'Conjunction'
	strategies: AutoPropStrategy[]
}

export type AutoPropStrategy =
	AutoPropFileTagStrategy
	| AutoPropFileFolderStrategy
	| AutoPropListStrategy
	| AutoPropJSStrategy
	| AutoPropDisjunctionStrategy
	| AutoPropConjunctionStrategy

export type StrategyType = AutoPropStrategy['type']
export type OptStrategyType = StrategyType | ''

export const DEFAULT_SETTINGS: AutoPropSettings = {
	properties: {}
};


export class PropertySettingsModal extends Modal {
	constructor(private plugin: AutoPropPlugin, private property: string) {
		super(plugin.app);
		this.setTitle("Property settings for " + this.property);
		this.render();
	}

	get properties() {
		return this.plugin.settings.properties
	}

	get propertyStrategy() {
		return this.plugin.settings.properties[this.property];
	}

	set propertyStrategy(value: AutoPropStrategy | undefined) {
		if (value) this.plugin.settings.properties[this.property] = value;
		else delete this.plugin.settings.properties[this.property];
	}

	render() {
		this.contentEl.empty()
		this.renderStrategySelector(this.contentEl);
	}

	renderStrategySelector(contentEl: HTMLElement) {
		const setting = new Setting(contentEl)
		const strategyContentEl = contentEl.createDiv();
		setting
			.setName('Type')
			.setDesc('Select the options for ' + this.property)
			.addDropdown(dropdown => {
				dropdown
					.addOption('', '')
					.addOption('Tag', 'Tag')
					.addOption('Folder', 'Folder')
					.addOption('List', 'List')
					.addOption('JS', 'JS')
					.addOption('Disjunction', 'And')
					.addOption('Conjunction', 'Or')
					.setValue(this.properties[this.property]?.type ?? '')
					.onChange(async value => {
						if (value === '') {
							this.propertyStrategy = undefined;
						} else {
							this.propertyStrategy = defaultStrategy(value as StrategyType);
						}
						this.renderStrategy(value as StrategyType, strategyContentEl);
						await this.plugin.saveSettings();
					})
					.then(() => this.renderStrategy(dropdown.getValue() as StrategyType, strategyContentEl))
			})

	}

	private renderStrategy(value: OptStrategyType, contentEl: HTMLDivElement) {
		contentEl.empty();
		switch (value) {
			case "Tag":
				return this.renderTagStrategy(contentEl)
			case "Folder":
				break;
			case "List":
				break;
			case "JS":
				break;
			case "Disjunction":
				break;
			case "Conjunction":
				break;
			case "":
				break;
		}
	}

	private renderTagStrategy(contentEl: HTMLDivElement) {
		let strategy = this.propertyStrategy as AutoPropFileTagStrategy;
		new Setting(contentEl)
			.setName('Tag')
			.setDesc('Select the tag the file should match')
			.addText(text => {
				text.setValue(strategy?.tag ?? '')
					.onChange(async value => {
					strategy.tag = value;
					await this.plugin.saveSettings();
				});
				const suggest = new TagSuggester(this.app, text.inputEl);
				suggest.onSelect(async (tag) => {
					text.setValue(tag);
					strategy.tag = tag;
					await this.plugin.saveSettings();
					suggest.close();
				});

			})

	}

}


function defaultStrategy(value: Exclude<StrategyType, ''>): AutoPropStrategy {
	switch (value) {
		case "Tag":
			return {type: 'Tag', tag: ''};
		case "Folder":
			return {type: 'Folder', folder: '', includeSubFolders: 0};
		case "List":
			return {type: 'List', options: []};
		case "JS":
			return {type: 'JS', code: ''}
		case "Disjunction":
			return {type: 'Disjunction', strategies: []}
		case "Conjunction":
			return {type: 'Conjunction', strategies: []}

	}
}
