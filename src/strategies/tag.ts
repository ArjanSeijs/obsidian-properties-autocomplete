import AutoPropPlugin from "../main";
import {TFile} from "obsidian";
import {getMarkdownFilesWithTag, getTags} from "../util/fileutil";

import {SuggesterResult} from "./index";

/**
 * Match files with tag
 */
export interface TagStrategy {
	type: 'Tag'
	tag: string;
	exact: boolean;
}


export function evaluate(plugin: AutoPropPlugin, strategy: TagStrategy) {
	let files = getMarkdownFilesWithTag(plugin.app, strategy.tag);
	return [...files]
}

export function match(plugin: AutoPropPlugin, suggestion: SuggesterResult, strategy: TagStrategy): boolean {
	return suggestion instanceof TFile &&
		getTags(plugin.app, suggestion)
			.some(value => value === strategy.tag || value.startsWith(strategy.tag + '/') && !strategy.exact)
}
