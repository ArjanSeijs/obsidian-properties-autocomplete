import {
	ButtonComponent, DisplayValueComponent, ExtraButtonComponent,
	Modal,
	Notice,
	PluginSettingTab, setIcon,
	Setting,
	SettingDefinitionItem, SettingGroup
} from "obsidian";
import AutoPropPlugin from "./main";
import {TagSuggester} from "./suggesters/tagsuggester";
import {FolderSuggester} from "./suggesters/foldersuggester";
import {evalAndValidate} from "./util/code";
import {TagStrategy} from "./strategies/tag";
import {FolderStrategy} from "./strategies/folder";
import {ListItem, ListStrategy} from "./strategies/list";
import {CodeStrategy} from "./strategies/code";
import {DisjunctionStrategy} from "./strategies/disjunction";
import {ConjunctionStrategy} from "./strategies/conjunction";
import {NegationStrategy} from "./strategies/negation";
import {isProvider, SuggestionStrategy, SuggestionStrategyType} from "./strategies";
import {IconSuggester} from "./suggesters/iconsuggester";
import {isSuggestionResult} from "./strategies/suggestion";
import {text} from "./i18n";

type DefaultSuggestionHandling = 'append' | 'prepend' | 'replace';
type PropertySetting = {
	strategy?: SuggestionStrategy,
	icon?: string,
	validate?: boolean
	defaultSuggestionHandling?: DefaultSuggestionHandling
};

export interface AutoPropSettings {
	// In case of migrating configs to newer version.
	version: string

	properties: { [key: string]: PropertySetting };
	// Code Execution
	allowJs: boolean;
	jsTimeout: number;
	// Rendering
	enableIcons: boolean
	enableBackgrounds: boolean
	enableValidation: boolean
}

export const DEFAULT_SETTINGS: AutoPropSettings = {
	version: "1.0.0",
	properties: {},
	allowJs: false,
	jsTimeout: 5000,
	enableIcons: true,
	enableBackgrounds: true,
	enableValidation: true
};


export class PropertySettingsTab extends PluginSettingTab {

	constructor(plugin: AutoPropPlugin) {
		super(plugin.app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "group",
				heading: text('settings.definitions.display.title'),
				items: [
					{
						name: text('settings.definitions.display.icon.name'),
						desc: text('settings.definitions.display.icon.description'),
						control: {type: 'toggle', key: 'enableIcons'}
					},
					{
						name: text('settings.definitions.display.background.name'),
						desc: text('settings.definitions.display.background.description'),
						control: {type: 'toggle', key: 'enableBackgrounds',}
					},
					{
						name: text('settings.definitions.display.validation.name'),
						desc: text('settings.definitions.display.validation.description'),
						control: {type: 'toggle', key: 'enableValidation',}
					}
				]
			},
			{
				type: "group",
				heading: text('settings.definitions.code.title'),
				items: [
					{
						name: text('settings.definitions.code.enabled.name'),
						desc: text('settings.definitions.code.enabled.description'),
						control: {type: 'toggle', key: 'allowJs'}
					},
					{
						name: text('settings.definitions.code.timeout.name'),
						desc: text('settings.definitions.code.timeout.description'),
						control: {type: 'number', key: 'jsTimeout'}
					}
				]
			},
		];
	}
}

// If true do net render
type RenderStrategyArgs = {
	negation?: boolean
	and?: boolean
	or?: boolean
	js?: boolean
}

export class PropertySettingsModal extends Modal {

	private warningBtn?: ExtraButtonComponent;

	constructor(private plugin: AutoPropPlugin, private property: string, private propertyEl: HTMLElement) {
		super(plugin.app);
		this.setTitle(text('settings.modal.title', this.property));
		this.render();
		this.containerEl.addClass('property-setting-modal')
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

	get validate() {
		return this.settings[this.property]?.validate
	}

	get defaultSuggestionHandling() {
		return this.settings[this.property]?.defaultSuggestionHandling ?? "default"
	}

	set strategy(value: SuggestionStrategy | undefined) {
		let setting = this.ensureSetting(this.property)
		setting.strategy = value;
		this.cleanupSetting(this.property);
	}

	set icon(value: string | undefined) {
		let setting = this.ensureSetting(this.property)
		setting.icon = value;
		this.cleanupSetting(this.property);
	}

	set validate(value: boolean | undefined) {
		let setting = this.ensureSetting(this.property)
		setting.validate = value;
		this.cleanupSetting(this.property);
	}

	set defaultSuggestionHandling(value: DefaultSuggestionHandling | 'default') {
		let setting = this.ensureSetting(this.property)
		setting.defaultSuggestionHandling = value === 'default' ? undefined : value;
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

	async onQueryChange() {
		this.validateQuery();
		await this.plugin.saveSettings();
	}

	validateQuery() {
		if (!this.warningBtn) return;
		this.warningBtn.extraSettingsEl.removeClass('query-unknown', 'query-valid', 'query-invalid');
		if (!this.strategy) {
			this.warningBtn.setIcon('badge-question-mark').setTooltip('')
			this.warningBtn.extraSettingsEl.addClass('query-unknown')
			return
		}
		if (isProvider(this.strategy)) {
			this.warningBtn.setIcon('check').setTooltip('')
			this.warningBtn.extraSettingsEl.addClass('query-valid')
			return true;
		} else {
			this.warningBtn.setIcon('shield-x').setTooltip(text('settings.modal.invalidquery'))
			this.warningBtn.extraSettingsEl.addClass('query-invalid')
			return false;
		}
	}

	onClose() {
		super.onClose();
		if (this.strategy) {
			void this.plugin.strategyCacheSet(this.property, this.strategy)
				.then(() => this.plugin.applyLayout(this.propertyEl))
		} else {
			this.plugin.applyLayout(this.propertyEl);
		}


	}

	render() {
		this.contentEl.empty()
		this.renderAppearanceSelection(this.contentEl)
		this.renderTopStrategySelector(this.contentEl,
			(value) => this.strategy = value,
			() => this.strategy, 0);
	}


	renderTopStrategySelector(contentEl: HTMLElement, setValue: (cb: SuggestionStrategy | undefined) => void, getValue: () => SuggestionStrategy | undefined, depth: number, options: RenderStrategyArgs = {}) {

		let group = new SettingGroup(contentEl).setHeading(text('settings.modal.strategyselector.title')).addExtraButton(btn => {
			this.warningBtn = btn;
			this.validateQuery();
		})
		this.renderSelector(group, options, getValue, setValue, depth);

	}

	renderStrategySelector(contentEl: HTMLElement, setValue: (cb: SuggestionStrategy | undefined) => void, getValue: () => SuggestionStrategy | undefined, depth: number, options: RenderStrategyArgs = {}) {
		let group = new SettingGroup(contentEl);
		this.renderSelector(group, options, getValue, setValue, depth);
	}

	private renderSelector(group: SettingGroup, options: RenderStrategyArgs, getValue: () => (SuggestionStrategy | undefined), setValue: (cb: (SuggestionStrategy | undefined)) => void, depth: number) {
		let strategyContentEl: HTMLElement;
		group
			.addSetting(setting => {
				setting
					.setName(text('settings.modal.strategyselector.type'))
					.addDropdown(dropdown => {
						dropdown
							.addOption('', '')
							.addOption('Tag', text('settings.modal.strategyselector.tag'))
							.addOption('Folder', text('settings.modal.strategyselector.folder'))
							.addOption('List', text('settings.modal.strategyselector.list'))
						if (!options.js || !this.plugin.settings.allowJs) dropdown.addOption('JS', 'JS')
						if (!options.or) dropdown.addOption('Disjunction', text('settings.modal.strategyselector.or'))
						if (!options.and) dropdown.addOption('Conjunction', text('settings.modal.strategyselector.and'))
						if (!options.negation) dropdown.addOption('Negation', text('settings.modal.strategyselector.not'))
						dropdown
							.setValue(getValue()?.type ?? '')
							.onChange(async value => {
								if (value === '') {
									setValue(undefined)
								} else {
									setValue(defaultStrategy(value as SuggestionStrategyType));
								}
								if (strategyContentEl) this.renderStrategy(strategyContentEl, getValue(), depth);
								await this.onQueryChange()
							})
					});
			})
		strategyContentEl = group.listEl.createDiv()
		this.renderStrategy(strategyContentEl, getValue(), depth);
	}

	private renderStrategy(contentEl: HTMLElement, value: SuggestionStrategy | undefined, depth: number) {
		contentEl.empty();
		contentEl.addClass(`depth-${depth % 3}`, 'strategy-nested');
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

	private renderTagStrategy(contentEl: HTMLElement, strategy: TagStrategy) {
		new Setting(contentEl)
			.setName(text('settings.modal.strategyselector.tag'))
			.setDesc(text('settings.modal.tag.description'))
			.addText(text => {
				text.setValue(strategy?.tag ?? '')
					.onChange(async value => {
						strategy.tag = value;
						await this.onQueryChange()
					});
				const suggest = new TagSuggester(this.app, text.inputEl);
				suggest.onSelect(async (tag) => {
					text.setValue(tag);
					strategy.tag = tag;
					await this.onQueryChange()
					suggest.close();
				});

			})
		new Setting(contentEl)
			.setName(text('settings.modal.tag.match.name'))
			.setDesc(text('settings.modal.tag.match.description'))
			.addToggle(toggle => toggle.setValue(strategy.exact)
				.onChange(async value => {
					strategy.exact = value;
					await this.onQueryChange()
				}));

	}

	private renderFolderStrategy(contentEl: HTMLElement, strategy: FolderStrategy) {
		new Setting(contentEl)
			.setName(text('settings.modal.strategyselector.folder'))
			.setDesc(text('settings.modal.folder.description'))
			.addText(text => {
				text.setValue(strategy?.folder ?? '')
					.onChange(async value => {
						strategy.folder = value;
						await this.onQueryChange()
					})
				const suggest = new FolderSuggester(this.app, text.inputEl);
				suggest.onSelect(async (tag) => {
					text.setValue(tag.path);
					strategy.folder = tag.path;
					await this.onQueryChange()
					suggest.close();
				});
			})
		new Setting(contentEl)
			.setName(text('settings.modal.folder.subfolders.name'))
			.setDesc(text('settings.modal.folder.subfolders.description'))
			.addToggle(toggle => toggle.setValue(strategy.includeSubFolders)
				.onChange(async value => {
					strategy.includeSubFolders = value;
					await this.onQueryChange()
				}));
	}

	private renderListStrategy(contentEl: HTMLElement, strategy: ListStrategy) {
		let settings: Setting[] = []
		let onChange = () => {
			for (let i = 0; i < Math.max(strategy.options.length, settings.length); i++) {
				let option = strategy.options[i];
				let setting = settings[i];
				if (!setting) {
					console.error(`Could not render option in list on index: ${i}`)
				} else {
					if (option) {
						this.renderListOption(setting, option, strategy, i, onChange)
					} else {
						setting.clear();
						setting.controlEl.parentElement?.addClass('is-empty');
					}
				}
			}
		}
		let settingGroup = new SettingGroup(contentEl)
			.setHeading(text('settings.modal.strategyselector.list'))
			.addExtraButton(btn =>
				btn.setIcon('plus').onClick(async () => {
					const option = {label: '', value: ''};
					strategy.options.push(option);
					const setting = settings[strategy.options.length - 1];
					if (setting) {
						setting.controlEl.parentElement?.removeClass('is-empty');
						this.renderListOption(setting, option, strategy, strategy.options.length - 1, onChange);
					} else {
						settingGroup.addSetting(setting => {
								settings.push(setting);
								this.renderListOption(setting, option, strategy, strategy.options.length - 1, onChange);
							}
						);
					}
					await this.onQueryChange()
				})
			)

		for (let i = 0; i < strategy.options.length; i++) {
			let option = strategy.options[i]!;
			settingGroup.addSetting(setting => {
				settings.push(setting);
				this.renderListOption(setting, option, strategy, i, onChange);
			})
		}
	}

	private renderListOption(setting: Setting, option: ListItem, strategy: ListStrategy, idx: number, onChange: () => void) {
		setting
			.clear()
			.addText(txt => txt.setPlaceholder('Label').setValue(option.label ?? '')
				.onChange(async value => {
					option.label = value;
					await this.onQueryChange()
				})
			)
			.addText(txt => txt.setPlaceholder('Value').setValue(option.value)
				.onChange(async value => {
					option.value = value;
					await this.onQueryChange()
				}))
			.addColorPicker(color => color.setValue(option.color ?? '#000000')
				.onChange(async value => {
					option.color = value !== '#000000' ? value : undefined;
					await this.onQueryChange()
				})
			)
			.addButton(btn => btn.setIcon('move-up').onClick(async _ => {
				let swap = strategy.options[idx]!;
				strategy.options[idx] = strategy.options[idx - 1]!;
				strategy.options[idx - 1] = swap;
				await this.onQueryChange()
				onChange()
			}).setDisabled(idx === 0))
			.addButton(btn => btn.setIcon('move-down').onClick(async _ => {
				let swap = strategy.options[idx]!;
				strategy.options[idx] = strategy.options[idx + 1]!;
				strategy.options[idx + 1] = swap;
				await this.onQueryChange()
				onChange()
			}).setDisabled(idx === strategy.options.length - 1))
			.addButton(btn => btn.setIcon('trash').onClick(async _ => {
				strategy.options.splice(idx, 1);
				// "Tail recursion (ish)" should be fine?
				await this.onQueryChange()
				void setting.clear()
				onChange()
			}));
		setting.controlEl.addClass('setting-item-control-flex');
	}

	private renderCodeBlock(element: HTMLElement, strategy: CodeStrategy) {
		new Setting(element)
			.setName('JavaScript')
			.setDesc('function(app, ctx) { ... }')
			.addTextArea(text => text
				.setValue(strategy.code)
				.setPlaceholder('...')
				.onChange(async value => {
				strategy.code = value;
				await this.onQueryChange()
			}))
			.addButton(btn =>
				btn.setIcon('square-chevron-right')
					.onClick(_ => this.validateCode(btn, strategy)));

	}

	private async validateCode(btn: ButtonComponent, strategy: CodeStrategy) {
		btn.setIcon('circle-dashed')
		btn.setDisabled(true);
		let result = await evalAndValidate(this.plugin, strategy.code, (value) => isSuggestionResult(value))
		if (result == null) {
			new Notice(text('settings.modal.code.fail'))
		} else {
			new Notice(text('settings.modal.code.success'));
		}
		btn.setDisabled(false);
		btn.setIcon('square-chevron-right')
	}

	private renderDisjunction(element: HTMLElement, strategy: DisjunctionStrategy, depth: number) {
		let setting = new Setting(element);
		let strategyListElement = element.createDiv();
		setting
			.setName(text('settings.modal.strategyselector.or'))
			.setDesc(text('settings.modal.or.description'))
			.addButton(btn =>
				btn.setIcon('plus').onClick(async _ => {
					strategy.strategies.push(defaultStrategy('Tag') as TagStrategy);
					this.renderStrategyList(strategyListElement, strategy, depth, {or: true});
					await this.onQueryChange()
				})
			)
		this.renderStrategyList(strategyListElement, strategy, depth, {or: true});

	}

	private renderConjunctions(element: HTMLElement, strategy: ConjunctionStrategy, depth: number) {
		let setting = new Setting(element);
		let strategyListElement = element.createDiv();
		setting
			.setName(text('settings.modal.strategyselector.and'))
			.setDesc(text('settings.modal.and.description'))
			.addButton(btn =>
				btn.setIcon('plus').onClick(async _ => {
					strategy.strategies.push(defaultStrategy('Tag') as TagStrategy);
					this.renderStrategyList(strategyListElement, strategy, depth, {and: true});
					await this.onQueryChange()
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
	private renderStrategyList(element: HTMLElement, strategy: ConjunctionStrategy | DisjunctionStrategy, depth: number, options: RenderStrategyArgs) {
		element.empty()
		for (let i = 0; i < strategy.strategies.length; i++) {
			new Setting(element)
				.setName(text('settings.modal.strategylist.heading', i))
				.setHeading()
				.addButton(btn => btn.setIcon('move-up').onClick(async _ => {
					let swap = strategy.strategies[i]!;
					strategy.strategies[i] = strategy.strategies[i - 1]!;
					strategy.strategies[i - 1] = swap;
					await this.onQueryChange()
					this.renderStrategyList(element, strategy, depth, options);
				}).setDisabled(i === 0))
				.addButton(btn => btn.setIcon('move-down').onClick(async _ => {
					let swap = strategy.strategies[i]!;
					strategy.strategies[i] = strategy.strategies[i + 1]!;
					strategy.strategies[i + 1] = swap;
					await this.onQueryChange()
					this.renderStrategyList(element, strategy, depth, options);
				}).setDisabled(i === strategy.strategies.length - 1))
				.addButton(btn => btn.setIcon('trash').onClick(async _ => {
					strategy.strategies.splice(i, 1);
					await this.onQueryChange()
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

	private renderNegation(contentEl: HTMLElement, strategy: NegationStrategy, depth: number) {
		new Setting(contentEl)
			.setName(text('settings.modal.strategyselector.not'))
			.setDesc(text('settings.modal.not.description'))
			.setHeading();

		const element = contentEl.createDiv();
		element.addClass(`depth-${depth % 3}`, 'strategy-nested');
		this.renderStrategySelector(element,
			(value) => strategy.strategy = (value as Exclude<SuggestionStrategy, NegationStrategy>) ?? strategy.strategy,
			() => strategy.strategy, depth + 1, {negation: true, js: true})
	}

	private renderAppearanceSelection(contentEl: HTMLElement) {
		let button: DisplayValueComponent | undefined;
		new SettingGroup(contentEl)
			.setHeading(text('settings.modal.display.heading'))
			.addSetting(setting => void setting
				.setName(text('settings.definitions.display.icon.name'))
				.setDesc(text('settings.definitions.display.icon.description'))
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
					suggester.onSelect(async value => {
						text.setValue(value);
						this.icon = value ?? undefined;
						if (button && this.icon) setIcon(button.valueEl, this.icon)
						suggester.close();
						this.plugin.applyLayoutChanges()
						await this.plugin.saveSettings()
					})

				}))
			.addSetting(setting => void setting
				.setName(text('settings.modal.display.validation.name'))
				.setDesc(text('settings.modal.display.validation.description'))
				.addToggle(toggle => {
					toggle.setValue(this.validate ?? false)
						.onChange(async value => {
							this.validate = value ?? undefined;
							this.plugin.applyLayoutChanges()
							await this.plugin.saveSettings()
						})
				})
			).addSetting(setting => void setting
			.setName(text('settings.modal.handling.name'))
			.setDesc(text('settings.modal.handling.description'))
			.addDropdown(dropdown => {
				dropdown
					.addOption('default', text('settings.modal.handling.default'))
					.addOption('append', text('settings.modal.handling.append'))
					.addOption('prepend', text('settings.modal.handling.prepend'))
					.addOption('replace', text('settings.modal.handling.replace'))
					.setValue(this.defaultSuggestionHandling)
					.onChange(async value => {
						this.defaultSuggestionHandling = value as DefaultSuggestionHandling | 'default';
						await this.plugin.saveSettings();
					})
			})
		)

	}
}


function defaultStrategy(value: Exclude<SuggestionStrategyType, ''>): SuggestionStrategy {
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
