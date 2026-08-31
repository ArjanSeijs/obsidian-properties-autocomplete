import {Menu} from "obsidian";
import {around} from "monkey-around";
import AutoPropPlugin from "../main";
import {PropertySettingsModal} from "../settings";

export function patchPropertyMenu(plugin: AutoPropPlugin) {
	return around(Menu.prototype, {
		showAtMouseEvent(old: (evt: MouseEvent) => Menu) {
			return function (evt: MouseEvent) {
				// @ts-ignore -- cannot detect this as Menu
				const thiss = this as Menu;
				const target = evt.target as HTMLElement;
				if (target?.closest(".metadata-property")) {
					thiss.addItem(item =>
						item.setIcon('settings')
							.setTitle('Autocomplete settings')
							.onClick(() => {
								const propertyKey = target
									.closest(".metadata-property")
									?.getAttribute("data-property-key");
								if (propertyKey) new PropertySettingsModal(plugin, propertyKey).open();
							}))
				}
				return old.call(thiss, evt)
			};
		}
	});
}
