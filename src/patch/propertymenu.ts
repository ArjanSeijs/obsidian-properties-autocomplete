import {Menu} from "obsidian";
import {around} from "monkey-around";
import AutoPropPlugin from "../main";
import {PropertySettingsModal} from "../settings";

/**
 * Inject the property settings modal into the right click property menu.
 * @param plugin
 */
export function patchPropertyMenu(plugin: AutoPropPlugin) {
	return around(Menu.prototype, {
		showAtMouseEvent(old: (evt: MouseEvent) => Menu) {
			return function (evt: MouseEvent) {
				// @ts-ignore -- cannot detect this as Menu
				const instance = this as Menu;
				const target = evt.target as HTMLElement;
				const propertyContainerEl = target?.closest<HTMLElement>(".metadata-property");
				if (propertyContainerEl) {
					instance.addItem(item =>
						item.setIcon('settings')
							.setTitle('Autocomplete settings')
							.onClick(() => {
								const propertyKey = propertyContainerEl.getAttribute("data-property-key");
								if (propertyKey) new PropertySettingsModal(plugin, propertyKey, propertyContainerEl).open();
							}))
				}
				return old.call(instance, evt)
			};
		}
	});
}
