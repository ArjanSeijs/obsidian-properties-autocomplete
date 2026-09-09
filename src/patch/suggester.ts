import {around, dedupe} from "monkey-around";
import AutoPropPlugin from "../main";
import {AbstractInputSuggest} from "obsidian";
import {queryStrategy} from "../strategies";
import {ObsidianPropertySuggester, SuggestionResult, uninstaller} from "../types";

const MONKEY_KEY = "eternal.prop";

export function patchSuggester(plugin: AutoPropPlugin): uninstaller {
	// Patch getValue of AbstractInputSuggest to intercept an instance of the Internal PropertySuggester.
	let patch: uninstaller[] = [];
	let uninstaller = around(AbstractInputSuggest.prototype, {
		getValue(original) {
			return function () {
				// @ts-ignore -- This has type any but is a AbstractInputSuggest
				// this is an instance of abstract input suggester and may be a ObsidianPropertySuggester
				const instance = this as (AbstractInputSuggest<string> & Partial<ObsidianPropertySuggester<SuggestionResult>>);
				if (isPropertySuggester(instance)) {
					patch.push(patchGetSuggestions(plugin, instance));
				}
				return original.call(instance)
			}
		}
	});
	return () => {
		patch.forEach(p => p());
		uninstaller();
	}
}

function patchGetSuggestions(plugin: AutoPropPlugin, obj: ObsidianPropertySuggester<SuggestionResult>): uninstaller {
	const prototypeOf = Object.getPrototypeOf(obj) as (ObsidianPropertySuggester<SuggestionResult>);
	return around(prototypeOf, {
		getSuggestions(original) {
			return dedupe(MONKEY_KEY + '.getSuggestions', original, async function (query) {
				// @ts-ignore -- Instance type
				const instance = this as ObsidianPropertySuggester<SuggestionResult>;

				if (isPropertySuggester(instance)) {
					try {
						return await getSuggestionsPatch(instance, original, query, plugin);
					} catch (error) {
						console.error(error);
					}
				}
				return original.call(instance, query);
			})
		},
		renderSuggestion(original) {
			return dedupe(MONKEY_KEY + '.renderSuggestion', original, function (value, el) {
				// @ts-ignore -- Instance type
				const instance = this as ObsidianPropertySuggester<SuggestionResult>;
				if (isPropertySuggester(instance)) {
					try {
						return renderSuggestionPatch(instance, original, value, el);
					} catch (error) {
						console.error(error);
					}
				}
				return original.call(instance, value, el);
			})
		},
		selectSuggestion(original) {
			return dedupe(MONKEY_KEY + '.selectSuggestion', original, function (value, el) {

				// @ts-ignore -- Instance type
				const instance = this as ObsidianPropertySuggester<SuggestionResult>;
				if (isPropertySuggester(instance)) {
					try {
						return selectSuggestionPatch(instance, original, value, el);
					} catch (error) {
						console.error(error);
					}
				}
				return original.call(instance, value, el);
			})
		}
	})
}

/**
 * Inject additional suggestions into results of getSuggetions().
 * @param instance
 * @param original
 * @param query
 * @param plugin
 */
async function getSuggestionsPatch(instance: ObsidianPropertySuggester<SuggestionResult>, original: (query: string) => (SuggestionResult[] | Promise<SuggestionResult[]>), query: string, plugin: AutoPropPlugin) {
	const results = await original.call(instance, query);
	const property = instance.context.key.toLowerCase();
	const strategy = plugin.settings.properties[property]?.strategy;
	if (!strategy) return results;

	let additional = await queryStrategy(plugin, strategy, query, instance.context);
	// Filter out duplicates but do copy customData
	additional = additional.filter(value => {
		let duplicate = results.find(other => other.text === value.text)
		if (duplicate) {
			duplicate.customData = value.customData;
			return false;
		}
		return true
	})
	switch (plugin.settings.properties[property]?.defaultSuggestionHandling) {
		case "append":
			return [...results, ...additional]
		case "prepend":
			return [...additional, ...results]
		case "replace":
			return additional;
		default:
			return [...results, ...additional]
	}
}

function renderSuggestionPatch(instance: ObsidianPropertySuggester<SuggestionResult>, original: (value: SuggestionResult, el: HTMLElement) => void, value: SuggestionResult, el: HTMLElement) {
	original.call(instance, value, el)
	if (value.customData) {
		if ("color" in value.customData && typeof value.customData.color === "string") {
			el.addClass('custom-color');
			el.setCssProps({'--custom-color': value.customData.color});
		}
	}
}

function selectSuggestionPatch(instance: ObsidianPropertySuggester<SuggestionResult>, original: (value: SuggestionResult, evt: (MouseEvent | KeyboardEvent)) => void, value: SuggestionResult, evt: MouseEvent | KeyboardEvent) {
	if (value.customData) {
		if ("actualValue" in value.customData && typeof value.customData.actualValue === "string" && value.customData.actualValue !== "") {
			let actualValue = {...value};
			actualValue.text = value.customData.actualValue;
			return original.call(instance, actualValue, evt)
		}
	}
	return original.call(instance, value, evt)
}

function isPropertySuggester<T>(instance: Partial<ObsidianPropertySuggester<T>>): instance is ObsidianPropertySuggester<T> {
	const suggestEl = instance.suggestEl;
	return suggestEl !== undefined &&
		suggestEl !== null &&
		suggestEl.instanceOf(HTMLElement) &&
		suggestEl.hasClass('suggestion-container') &&
		suggestEl.hasClass('mod-property-value')
}

