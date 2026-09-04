import {
	Plugin, setIcon, TFile,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	AutoPropSettings, PropertySettingsTab,
} from './settings';
import {patchPropertyMenu} from "./patch/propertymenu";
import {patchSuggester} from "./patch/suggester";
import {evaluateStrategy} from "./strategies";


export default class AutoPropPlugin extends Plugin {
	settings!: AutoPropSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PropertySettingsTab(this));
		this.register(patchPropertyMenu(this))
		this.register(patchSuggester(this))
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyLayoutChanges()));
		this.registerEvent(this.app.workspace.on("file-open", () => this.applyLayoutChanges()));
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

	applyLayoutChanges() {
		document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyLayout(value))
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
		if (!this.settings.properties[key]) return
		let strategy = this.settings.properties[key].strategy
		if (!strategy) return;
		void evaluateStrategy(this, strategy).then(value => {
			for (const result of value) {
				if (typeof result === "string") continue;
				if (result instanceof TFile) continue
				if (valueEl.innerText === result.value && result.color) {
					valueEl.addClass('custom-color');
					valueEl.setCssProps({'--custom-color': result.color});
				}
			}
		});
	}


	applyIcon(propEl: HTMLElement) {
		const key = propEl.getAttribute("data-property-key");
		if (!key || !this.settings.properties[key]) return;

		const iconEl = propEl.querySelector<HTMLElement>(".metadata-property-icon");
		const icon = this.settings.properties[key].icon;
		if (icon && iconEl) setIcon(iconEl, icon)
	}

}
