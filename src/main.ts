import {
	Plugin, setIcon, TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	AutoPropSettings, PropertySettingsTab,
} from './settings';
import {patchPropertyMenu} from "./patch/propertymenu";
import {patchSuggester} from "./patch/suggester";
import {StrategyCache} from "./types";
import {evaluateStrategy, SuggestionStrategy} from "./strategies";
import {validateSuggestionResult} from "./strategies/suggestion";


export default class AutoPropPlugin extends Plugin {
	settings!: AutoPropSettings;
	strategyCache: StrategyCache = {};

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PropertySettingsTab(this));
		this.register(patchPropertyMenu(this))
		this.register(patchSuggester(this))
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyLayoutChanges()));
		this.registerEvent(this.app.workspace.on("file-open", () => this.applyLayoutChanges()));
		this.registerEvent(this.app.metadataCache.on("changed", () => this.applyLayoutChanges()));
		// Lazy loading inital cache.
		Object.entries(this.settings.properties).forEach(([key, value]) => {
			if (value.strategy) void this.strategyCacheSet(key, value.strategy)
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AutoPropSettings>,
		);
	}

	async onExternalSettingsChange() {
		let current = this.settings;
		let changed = await this.loadData() as AutoPropSettings;
		this.settings.allowJs = changed.allowJs;
		this.settings.enableIcons = changed.enableIcons
		this.settings.enableBackgrounds = changed.enableBackgrounds;
		this.settings.jsTimeout = changed.jsTimeout;
		this.settings.properties = Object.assign({}, current.properties, changed.properties);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async strategyCacheSet(key: string, strategy: SuggestionStrategy) {
		this.strategyCache[key] = await evaluateStrategy(this, strategy)
	}

	applyLayoutChanges() {
		if (this.settings.enableIcons) {
			document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyIcon(value))
		}
		if (this.settings.enableBackgrounds) {
			document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyBackgrounds(value))
		}
		if (this.settings.enableValidation) {
			document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.validateValues(value))
		}
	}

	applyLayout(propEl: HTMLElement) {
		if (this.settings.enableIcons) this.applyIcon(propEl);
		if (this.settings.enableBackgrounds) this.applyBackgrounds(propEl)
		if (this.settings.enableValidation) this.validateValues(propEl)
	}

	applyBackgrounds(propEl: HTMLElement) {
		if (!this.settings.enableBackgrounds) return;
		const key = propEl.getAttribute("data-property-key");
		if (!key) return;

		let longText = propEl.querySelectorAll<HTMLElement>('.metadata-input-longtext')
		let selectPill = propEl.querySelectorAll<HTMLElement>('.multi-select-pill-content');
		longText.forEach(value => this.applyBackground(value, key))
		selectPill.forEach(value => this.applyBackground(value, key))

	}

	applyBackground(valueEl: HTMLElement, key: string) {
		if (!this.settings.enableBackgrounds) return;
		if (!this.strategyCache[key]) return
		let strategy = this.strategyCache[key];
		if (!strategy) return;
		for (const result of strategy) {
			if (typeof result === "string" || result instanceof TFile) {
				valueEl.removeClass('custom-color')
				valueEl.setCssProps({'--custom-color': ''});
			} else if (valueEl.innerText === result.value) {
				if (result.color) {
					valueEl.addClass('custom-color');
					valueEl.setCssProps({'--custom-color': result.color});
				} else {
					valueEl.removeClass('custom-color')
					valueEl.setCssProps({'--custom-color': ''});
				}
			}
		}
	}


	applyIcon(propEl: HTMLElement) {
		if (!this.settings.enableIcons) return;
		const key = propEl.getAttribute("data-property-key");
		if (!key || !this.settings.properties[key]) return;

		const iconEl = propEl.querySelector<HTMLElement>(".metadata-property-icon");
		const icon = this.settings.properties[key].icon;
		if (icon && iconEl) setIcon(iconEl, icon)
	}

	validateValues(propEl: HTMLElement) {
		if (!this.settings.enableValidation) return;
		const key = propEl.getAttribute("data-property-key");
		if (!key) return;


		let longText = propEl.querySelectorAll<HTMLElement>('.metadata-property-value')
		let selectPill = propEl.querySelectorAll<HTMLElement>('.multi-select-pill');
		longText.forEach(value => this.validateValue(value, key))
		selectPill.forEach(value => this.validateValue(value, key))

	}

	validateValue(valueEl: HTMLElement, key: string) {
		if (!this.settings.enableBackgrounds) return;
		if (!this.strategyCache[key]) return
		if (!this.settings.properties[key]?.validate) return
		let strategy = this.strategyCache[key];
		if (!strategy) return;
		const option =
			valueEl.querySelector<HTMLElement>('.multi-select-pill-content')?.innerText
			?? valueEl.querySelector<HTMLElement>('.metadata-input-longtext')?.innerText
		if (!strategy.some(suggestion => validateSuggestionResult(this.app, option!, suggestion))) {
			valueEl.addClass('invalid-suggestion');
		}
	}
}
