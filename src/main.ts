import {
	Plugin,
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
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AutoPropSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}
