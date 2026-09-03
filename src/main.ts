import {
	Plugin,
} from 'obsidian';
import {
	DEFAULT_SETTINGS,
	AutoPropSettings, PropertySettingsTab,
} from './settings';
import {patchPropertyMenu} from "./patch/propertymenu";
import {HTMLInputLikeElement, registerStrategySuggester} from "./suggesters/strategysuggester";
import {patchSuggester} from "./patch/suggester";


export default class AutoPropPlugin extends Plugin {
	settings!: AutoPropSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new PropertySettingsTab(this));
		this.register(patchPropertyMenu(this))
		this.register(patchSuggester(this))
		this.registerDomEvent(activeDocument, 'click', (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			if (!target.parentElement?.parentElement?.hasClass('metadata-property')) return;

			if (target.hasClass('multi-select-container')) {
				let input = target.querySelector('.multi-select-input') as HTMLInputLikeElement;
				if (input) registerStrategySuggester(this, input)
			} else if (target.hasClass('metadata-input-longtext')) {
				registerStrategySuggester(this, target as HTMLInputLikeElement);
			}
		})
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
