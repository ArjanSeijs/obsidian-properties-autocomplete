import {
	Plugin, setIcon,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	AutoPropSettings, PropertySettingsTab,
} from './settings';
import {patchPropertyMenu} from "./patch/propertymenu";
import {patchSuggester} from "./patch/suggester";


export default class AutoPropPlugin extends Plugin {
	settings!: AutoPropSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PropertySettingsTab(this));
		this.register(patchPropertyMenu(this))
		this.register(patchSuggester(this))
		this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.applyIcons()));
		this.registerEvent(this.app.workspace.on("file-open", () => this.applyIcons()));
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

	applyIcons() {
		document.querySelectorAll<HTMLElement>(".metadata-property").forEach(value => this.applyIcon(value))
	}


	applyIcon(propEl: HTMLElement) {
		const key = propEl.getAttribute("data-property-key");
		if (!key || !this.settings.properties[key]) return;

		const iconEl = propEl.querySelector<HTMLElement>(".metadata-property-icon");
		const icon = this.settings.properties[key].icon;
		if (icon && iconEl) setIcon(iconEl, icon)
	}

}
