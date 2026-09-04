import {around, dedupe} from "monkey-around";
import AutoPropPlugin from "../main";
import {AbstractInputSuggest} from "obsidian";
import {queryStrategy} from "../strategies";
import {ObsidianPropertySuggester, SuggestionResult, uninstaller} from "../types";

export function patchSuggester(plugin: AutoPropPlugin) {
	// Patch getValue of AbstractInputSuggest to intercept an instance of the Internal PropertySuggester.
	let patch: uninstaller;
	let uninstaller = around(AbstractInputSuggest.prototype, {
		getValue(old: () => string) {
			return function () {
				// @ts-ignore -- This has type any but is a AbstractInputSuggest
				// this is an instance of abstract input suggester and may be a ObsidianPropertySuggester
				const instance = this as (AbstractInputSuggest<string> & Partial<ObsidianPropertySuggester<SuggestionResult>>);
				if (isPropertySuggester(instance)) {
					patch = patchGetSuggestions(plugin, instance);
				}
				return old.call(instance)
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
		getSuggestions(old: (query: string) => SuggestionResult[] | Promise<SuggestionResult[]>) {
			return dedupe("eternal.getSuggestions", old, async function (query: string) {
				// @ts-ignore -- Instance type
				const instance = this as ObsidianPropertySuggester<SuggestionResult>;

				if (isPropertySuggester(instance)) {
					try {
						return await getAdditionalSuggestions(old, instance, query, plugin);
					} catch (error) {
						console.error(error);
					}
				}
				return old.call(instance, query);
			})
		}
	})
}

async function getAdditionalSuggestions(old: (query: string) => (SuggestionResult[] | Promise<SuggestionResult[]>), instance: ObsidianPropertySuggester<SuggestionResult>, query: string, plugin: AutoPropPlugin) {
	const results = await old.call(instance, query);
	const property = instance.context.key.toLowerCase();
	const strategy = plugin.settings.properties[property]?.strategy;
	if (strategy) {
		let additional = await queryStrategy(plugin, strategy, query, instance.context);
		additional = additional.filter(value => results.every(other => other.text !== value.text));
		results.push(...additional);
	}
	return results;
}

function isPropertySuggester<T>(instance: Partial<ObsidianPropertySuggester<T>>): instance is ObsidianPropertySuggester<T> {
	const suggestEl = instance.suggestEl;
	return suggestEl !== undefined &&
		suggestEl !== null &&
		suggestEl.instanceOf(HTMLElement) &&
		suggestEl.hasClass('suggestion-container') &&
		suggestEl.hasClass('mod-property-value')
}

