import {around, dedupe} from "monkey-around";
import AutoPropPlugin from "../main";
import {AbstractInputSuggest} from "obsidian";
import {queryStrategy} from "../strategies";
import {ObsidianPropertySuggester, SuggestionResult, uninstaller} from "../types";

const MONKEY_KEY = "eternal.prop";

export function patchSuggester(plugin: AutoPropPlugin) {
	// Patch getValue of AbstractInputSuggest to intercept an instance of the Internal PropertySuggester.
	let patch: uninstaller;
	let uninstaller = around(AbstractInputSuggest.prototype, {
		getValue(original) {
			return function () {
				// @ts-ignore -- This has type any but is a AbstractInputSuggest
				// this is an instance of abstract input suggester and may be a ObsidianPropertySuggester
				const instance = this as (AbstractInputSuggest<string> & Partial<ObsidianPropertySuggester<SuggestionResult>>);
				if (isPropertySuggester(instance)) {
					patch = patchGetSuggestions(plugin, instance);
				}
				return original.call(instance)
			}
		}
	});
	return () => {
		if (patch) patch();
		uninstaller();
	}
}

function patchGetSuggestions(plugin: AutoPropPlugin, obj: ObsidianPropertySuggester<SuggestionResult>): () => void {
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
	if (strategy) {
		let additional = await queryStrategy(plugin, strategy, query, instance.context);
		additional = additional.filter(value => results.every(other => other.text !== value.text));
		results.push(...additional);
	}
	return results;
}

function renderSuggestionPatch(instance: ObsidianPropertySuggester<SuggestionResult>, original: (value: SuggestionResult, el: HTMLElement) => void, value: SuggestionResult, el: HTMLElement) {
	original.call(instance, value, el)
	if (value.customData) {
		if ("label" in value.customData && typeof value.customData.label === "string") {
			el.setText(value.customData.label)
		}
		if ("color" in value.customData && typeof value.customData.color === "string") {
			el.style.backgroundColor = value.customData.color
		}
	}
}

function isPropertySuggester<T>(instance: Partial<ObsidianPropertySuggester<T>>): instance is ObsidianPropertySuggester<T> {
	const suggestEl = instance.suggestEl;
	return suggestEl !== undefined &&
		suggestEl !== null &&
		suggestEl.instanceOf(HTMLElement) &&
		suggestEl.hasClass('suggestion-container') &&
		suggestEl.hasClass('mod-property-value')
}

