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
		this.settings.properties = Object.assign({}, current.properties, changed.properties);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async strategyCacheSet(key: string, strategy: SuggestionStrategy) {
		this.strategyCache[key] = await evaluateStrategy(this, strategy)
	}

	applyLayoutChanges() {
		document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyIcon(value))
		document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyBackgrounds(value))
	}

	applyLayout(propEl: HTMLElement) {
		this.applyIcon(propEl);
		this.applyBackgrounds(propEl)
	}

	applyBackgrounds(propEl: HTMLElement) {
		const key = propEl.getAttribute("data-property-key");
		if (!key) return;

		let longText = propEl.querySelectorAll<HTMLElement>('.metadata-input-longtext')
		let selectPill = propEl.querySelectorAll<HTMLElement>('.multi-select-pill-content');
		longText.forEach(value => this.applyBackground(value, key))
		selectPill.forEach(value => this.applyBackground(value, key))

	}

	applyBackground(valueEl: HTMLElement, key: string) {
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
		const key = propEl.getAttribute("data-property-key");
		if (!key || !this.settings.properties[key]) return;

		const iconEl = propEl.querySelector<HTMLElement>(".metadata-property-icon");
		const icon = this.settings.properties[key].icon;
		if (icon && iconEl) setIcon(iconEl, icon)
	}

}
