// lang/helpers.ts
import en from "./en";
import {getLanguage} from "obsidian";

export type i18n = typeof en;
export type i18nKey = keyof i18n;

const localeMap: Record<string, Partial<i18n>> = {
	en
};

export function text(key: i18nKey, ...args: (string | number | boolean | null | undefined)[]): string {
	let locale = localeMap[getLanguage()] ?? en;
	let translation: string = locale[key] ?? en[key];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		translation = translation.replace(`$${i}`, `${arg}`)
	}
	return translation;
}
