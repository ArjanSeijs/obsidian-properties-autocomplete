import {App, getAllTags, TFile} from "obsidian";

/**
 * Get all files with tag.
 * @param app
 * @param tag The tag including '#'
 * @param subtags Whether it should match subtags. E.g. #example will also match #example/foo
 */
export function* getMarkdownFilesWithTag(app: App, tag: string, subtags = true) {
	for (const file of app.vault.getMarkdownFiles()) {
		const fileCache = app.metadataCache.getFileCache(file);
		if (!fileCache) continue;
		const tags = getAllTags(fileCache);
		if (tags?.find(value => value === tag || value.startsWith(tag + '/') && subtags)) {
			yield file;
		}
	}
}

/**
 * Frontmatter on file, returns empty when CachedMetadata not found
 * @param app
 * @param file
 */
export function getFrontmatter<T>(app: App, file: TFile) {
	let cache = app.metadataCache.getFileCache(file)
	if (!cache) return {} as T
	return cache.frontmatter as T;
}

/**
 *
 * @param app
 * @param file
 */
export function getAliases(app: App, file: TFile) {
	let frontmatter = getFrontmatter<{ aliases: string[] | undefined }>(app, file);
	return frontmatter.aliases || [];
}
