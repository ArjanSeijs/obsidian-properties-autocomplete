import {Menu} from "obsidian";
import {around} from "monkey-around";
import AutoPropPlugin from "../main";
import {PropertySettingsModal} from "../settings";

export function patchPropertyMenu(plugin: AutoPropPlugin) {
	return around(Menu.prototype, {
		showAtMouseEvent(old: (evt: MouseEvent) => Menu) {
			return function (evt: MouseEvent) {
				// @ts-ignore -- cannot detect this as Menu
				const instance = this as Menu;
				const target = evt.target as HTMLElement;
				const closest = target?.closest<HTMLElement>(".metadata-property");
				if (closest) {
					instance.addItem(item =>
						item.setIcon('settings')
							.setTitle('Autocomplete settings')
							.onClick(() => {
								const propertyKey = target
									.closest(".metadata-property")
									?.getAttribute("data-property-key");
								if (propertyKey) new PropertySettingsModal(plugin, propertyKey, closest).open();
							}))
				}
				return old.call(instance, evt)
			};
		}
	});
}
