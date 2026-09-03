import {
	ButtonComponent, DisplayValueComponent,
	Modal,
	Notice,
	PluginSettingTab, setIcon,
	Setting,
	SettingDefinitionItem
} from "obsidian";
import AutoPropPlugin from "./main";
import {TagSuggester} from "./suggesters/tagsuggester";
import {FolderSuggester} from "./suggesters/foldersuggester";
import {evalAndValidate, validateResult} from "./util/code";
import {TagStrategy} from "./strategies/tag";
import {FolderStrategy} from "./strategies/folder";
import {ListStrategy} from "./strategies/list";
import {CodeStrategy} from "./strategies/code";
import {DisjunctionStrategy} from "./strategies/disjunction";
import {ConjunctionStrategy} from "./strategies/conjunction";
import {NegationStrategy} from "./strategies/negation";
import {AutoPropStrategy, StrategyType} from "./strategies";
import {IconSuggester} from "./suggesters/iconsuggester";

type PropertySetting = { strategy?: AutoPropStrategy, icon?: string };

export interface AutoPropSettings {
	properties: { [key: string]: PropertySetting };
	allowJs: boolean;
	// In case of migrating configs to newer version.
	version: string
}

export const DEFAULT_SETTINGS: AutoPropSettings = {
	version: "1.0.0",
	properties: {},
	allowJs: false,
};


export class PropertySettingsTab extends PluginSettingTab {

	constructor(plugin: AutoPropPlugin) {
		super(plugin.app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{name: 'AllowJSCode', control: {type: 'toggle', key: 'allowJs'}}
		];
	}
}

type RenderStrategyArgs = {
	negation?: boolean
	and?: boolean
	or?: boolean
	js?: boolean
}

export class PropertySettingsModal extends Modal {
	constructor(private plugin: AutoPropPlugin, private property: string) {
		super(plugin.app);
		this.setTitle("Property settings for " + this.property);
		this.render();
	}


	get settings() {
		return this.plugin.settings.properties;
	}

	get strategy() {
		return this.settings[this.property]?.strategy;
	}

	get icon() {
		return this.settings[this.property]?.icon;
	}

	set strategy(value: AutoPropStrategy | undefined) {
		let setting = this.ensureSetting(this.property)
		setting.strategy = value;
		this.cleanupSetting(this.property);
	}

	set icon(value: string | undefined) {
		let setting = this.ensureSetting(this.property)
		setting.icon = value;
		this.cleanupSetting(this.property);
	}

	private ensureSetting(property: string): PropertySetting {
		let setting = this.settings[property];
		if (!setting) {
			setting = {};
			this.settings[property] = setting;
		}
		return setting;
	}

	private cleanupSetting(property: string) {
		if (this.settings[property]?.icon === undefined && this.settings[property]?.strategy === undefined) {
			delete this.settings[property];
		}
	}

	render() {
		this.contentEl.empty()
		this.renderIconSelection(this.contentEl)
		this.renderStrategySelector(this.contentEl,
			(value) => this.strategy = value,
			() => this.strategy, 0);
	}


	renderStrategySelector(contentEl: HTMLElement, setValue: (cb: AutoPropStrategy | undefined) => void, getValue: () => AutoPropStrategy | undefined, depth: number, options: RenderStrategyArgs = {}) {
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
				if (!options.js) dropdown.addOption('JS', 'JS')
				if (!options.or) dropdown.addOption('Disjunction', 'Or')
				if (!options.and) dropdown.addOption('Conjunction', 'And')
				if (!options.negation) dropdown.addOption('Negation', 'Not')
				dropdown
					.setValue(getValue()?.type ?? '')
					.onChange(async value => {
						if (value === '') {
							setValue(undefined)
						} else {
							setValue(defaultStrategy(value as StrategyType));
						}
						this.renderStrategy(strategyContentEl, getValue(), depth);
						await this.plugin.saveSettings();
					})
					.then(() => this.renderStrategy(strategyContentEl, getValue(), depth))
			})

	}

	private renderStrategy(contentEl: HTMLDivElement, value: AutoPropStrategy | undefined, depth: number) {
		contentEl.empty();
		switch (value?.type) {
			case "Tag":
				return this.renderTagStrategy(contentEl, value)
			case "Folder":
				return this.renderFolderStrategy(contentEl, value)
			case "List":
				return this.renderListStrategy(contentEl, value)
			case "JS":
				return this.renderCodeBlock(contentEl, value)
			case "Disjunction":
				return this.renderDisjunction(contentEl, value, depth)
			case "Conjunction":
				return this.renderConjunctions(contentEl, value, depth)
			case "Negation":
				return this.renderNegation(contentEl, value, depth)
			default:
				break;
		}
	}

	private renderTagStrategy(contentEl: HTMLDivElement, strategy: TagStrategy) {
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
		new Setting(contentEl)
			.setName('Exact match')
			.setDesc('Should tag match exactly or include subtags')
			.addToggle(toggle => toggle.setValue(strategy.exact)
				.onChange(async value => {
					strategy.exact = value;
					await this.plugin.saveSettings();
				}));

	}

	private renderFolderStrategy(contentEl: HTMLDivElement, strategy: FolderStrategy) {
		new Setting(contentEl)
			.setName('Folder')
			.setDesc('Select the folder should match')
			.addText(text => {
				text.setValue(strategy?.folder ?? '')
					.onChange(async value => {
						strategy.folder = value;
						await this.plugin.saveSettings();
					})
				const suggest = new FolderSuggester(this.app, text.inputEl);
				suggest.onSelect(async (tag) => {
					text.setValue(tag.path);
					strategy.folder = tag.path;
					await this.plugin.saveSettings();
					suggest.close();
				});
			})
		new Setting(contentEl)
			.setName('Include subfolders')
			.addToggle(toggle => toggle.setValue(strategy.includeSubFolders)
				.onChange(async value => {
					strategy.includeSubFolders = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderListStrategy(contentEl: HTMLDivElement, strategy: ListStrategy) {
		let setting = new Setting(contentEl);
		let listElement = contentEl.createDiv();
		setting
			.setName('List')
			.setDesc('List of options')
			.addButton(btn =>
				btn.setIcon('plus').onClick(_ => {
					strategy.options.push({label: '', value: ''});
					this.renderListOptions(listElement, strategy);
				})
			)
		this.renderListOptions(listElement, strategy);

	}

	private renderListOptions(element: HTMLDivElement, strategy: ListStrategy) {
		element.empty();
		for (let i = 0; i < strategy.options.length; i++) {
			let option = strategy.options[i]!;
			new Setting(element)
				.addText(txt => txt.setPlaceholder('Label').setValue(option.label ?? '')
					.onChange(async value => {
						option.label = value;
						await this.plugin.saveSettings();
					})
				)
				.addText(txt => txt.setPlaceholder('Value').setValue(option.value)
					.onChange(async value => {
						option.value = value;
						await this.plugin.saveSettings();
					}))
				.addButton(btn => btn.setIcon('move-up').onClick(async _ => {
					let swap = strategy.options[i]!;
					strategy.options[i] = strategy.options[i - 1]!;
					strategy.options[i - 1] = swap;
					await this.plugin.saveSettings();
					this.renderListOptions(element, strategy);
				}).setDisabled(i === 0))
				.addButton(btn => btn.setIcon('move-down').onClick(async _ => {
					let swap = strategy.options[i]!;
					strategy.options[i] = strategy.options[i + 1]!;
					strategy.options[i + 1] = swap;
					await this.plugin.saveSettings();
					this.renderListOptions(element, strategy);
				}).setDisabled(i === strategy.options.length - 1))
				.addButton(btn => btn.setIcon('trash').onClick(_ => {
					strategy.options.splice(i, 1);
					// "Tail recursion (ish)" should be fine?
					this.renderListOptions(element, strategy);
				}))
		}
	}

	private renderCodeBlock(element: HTMLDivElement, strategy: CodeStrategy) {
		new Setting(element)
			.setName('JavaScript')
			.setDesc('JavaScript code: function(app) { ... }')
			.addTextArea(text => text.setValue(strategy.code).onChange(async value => {
				strategy.code = value;
				await this.plugin.saveSettings();
			}))
			.addButton(btn =>
				btn.setIcon('square-chevron-right')
					.onClick(_ => this.validate(btn, strategy)));

	}

	private async validate(btn: ButtonComponent, strategy: CodeStrategy) {
		btn.setIcon('circle-dashed')
		btn.setDisabled(true);
		let result = await evalAndValidate(this.plugin, strategy.code, (value) => validateResult(value))
		if (result != null) {
			new Notice('Code completed successfully.');
		}
		btn.setDisabled(false);
		btn.setIcon('square-chevron-right')
	}

	private renderDisjunction(element: HTMLDivElement, strategy: DisjunctionStrategy, depth: number) {
		let setting = new Setting(element);
		let strategyListElement = element.createDiv();
		setting
			.setName('Or')
			.setDesc('Disjunctions')
			.addButton(btn =>
				btn.setIcon('plus').onClick(_ => {
					strategy.strategies.push(defaultStrategy('Tag') as TagStrategy);
					this.renderStrategyList(strategyListElement, strategy, depth, {or: true});
				})
			)
		this.renderStrategyList(strategyListElement, strategy, depth, {or: true});

	}

	private renderConjunctions(element: HTMLDivElement, strategy: ConjunctionStrategy, depth: number) {
		let setting = new Setting(element);
		let strategyListElement = element.createDiv();
		setting
			.setName('And')
			.setDesc('Conjunctions')
			.addButton(btn =>
				btn.setIcon('plus').onClick(_ => {
					strategy.strategies.push(defaultStrategy('Tag') as TagStrategy);
					this.renderStrategyList(strategyListElement, strategy, depth, {and: true});
				})
			)
		this.renderStrategyList(strategyListElement, strategy, depth, {and: true});
	}

	/**
	 * @param element
	 * @param strategy
	 * @param depth
	 * @param options
	 */
	private renderStrategyList(element: HTMLDivElement, strategy: ConjunctionStrategy | DisjunctionStrategy, depth: number, options: RenderStrategyArgs) {
		element.empty()
		for (let i = 0; i < strategy.strategies.length; i++) {
			new Setting(element)
				.setName(`SubStrategy ${i}`)
				.setHeading()
				.addButton(btn => btn.setIcon('move-up').onClick(async _ => {
					let swap = strategy.strategies[i]!;
					strategy.strategies[i] = strategy.strategies[i - 1]!;
					strategy.strategies[i - 1] = swap;
					await this.plugin.saveSettings();
					this.renderStrategyList(element, strategy, depth, options);
				}).setDisabled(i === 0))
				.addButton(btn => btn.setIcon('move-down').onClick(async _ => {
					let swap = strategy.strategies[i]!;
					strategy.strategies[i] = strategy.strategies[i + 1]!;
					strategy.strategies[i + 1] = swap;
					await this.plugin.saveSettings();
					this.renderStrategyList(element, strategy, depth, options);
				}).setDisabled(i === strategy.strategies.length - 1))
				.addButton(btn => btn.setIcon('trash').onClick(_ => {
					strategy.strategies.splice(i, 1);
					// "Tail recursion (ish)" should be fine?
					this.renderStrategyList(element, strategy, depth, options);
				}))
			const contentEl = element.createDiv();
			contentEl.addClass(`depth-${depth % 3}`, 'strategy-nested');
			this.renderStrategySelector(contentEl,
				(value) => strategy.strategies[i] = value ?? strategy.strategies[i]!,
				() => strategy.strategies[i],
				depth + 1, options);
		}
	}

	private renderNegation(contentEl: HTMLDivElement, strategy: NegationStrategy, depth: number) {
		new Setting(contentEl)
			.setName('Negation')
			.setHeading();

		const element = contentEl.createDiv();
		element.addClass(`depth-${depth % 3}`, 'strategy-nested');
		this.renderStrategySelector(element,
			(value) => strategy.strategy = (value as Exclude<AutoPropStrategy, NegationStrategy>) ?? strategy.strategy,
			() => strategy.strategy, depth + 1, {negation: true, js: true})
	}

	private renderIconSelection(contentEl: HTMLElement) {
		let button: DisplayValueComponent | undefined;
		new Setting(contentEl)
			.setName('Icon')
			.setDesc('Property icon')
			.addDisplayValue(btn => {
					if (this.icon) setIcon(btn.valueEl, this.icon)
					button = btn;
				}
			)
			.addText(text => {
				text.setValue(this.icon ?? '')
					.onChange(value => {
						this.icon = value ?? undefined;
						if (button && this.icon) setIcon(button.valueEl, this.icon)
					})

				let suggester = new IconSuggester(this.app, text.inputEl)
				suggester.onSelect(value => {
					text.setValue(value);
					this.icon = value ?? undefined;
					if (button && this.icon) setIcon(button.valueEl, this.icon)
					suggester.close();
				}).open();

			})

	}
}


function defaultStrategy(value: Exclude<StrategyType, ''>): AutoPropStrategy {
	switch (value) {
		case "Tag":
			return {type: 'Tag', tag: '', exact: true};
		case "Folder":
			return {type: 'Folder', folder: '', includeSubFolders: false};
		case "List":
			return {type: 'List', options: []};
		case "JS":
			return {type: 'JS', code: ''}
		case "Disjunction":
			return {type: 'Disjunction', strategies: []}
		case "Conjunction":
			return {type: 'Conjunction', strategies: []}
		case "Negation":
			return {type: 'Negation', strategy: defaultStrategy('Tag') as TagStrategy}

	}
}
