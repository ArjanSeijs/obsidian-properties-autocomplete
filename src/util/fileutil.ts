import {App, getAllTags, normalizePath, TAbstractFile, TFile, Vault} from "obsidian";


export function getTags(app: App, file: TFile) {
	const fileCache = app.metadataCache.getFileCache(file);
	if (!fileCache) return [];
	return getAllTags(fileCache) ?? [];
}

/**
 * Get all files with tag.
 * @param app
 * @param tag The tag including '#'
 * @param subtags Whether it should match subtags. E.g. #example will also match #example/foo
 * @param invert Get the files withouth tag
 */
export function* getMarkdownFilesWithTag(app: App, tag: string, subtags = true, invert = false) {
	for (const file of app.vault.getMarkdownFiles()) {
		const tags = getTags(app, file)
		if (tags.some(value => value === tag || value.startsWith(tag) && subtags) != invert) {
			yield file;
		}
	}
}

export function getFilesInFolder(app: App, folder: string, includeSubFolders = true) {
	if (includeSubFolders) {
		let files: TAbstractFile[] = [];
		const folderByPath = app.vault.getFolderByPath(normalizePath(folder));
		if (folderByPath) Vault.recurseChildren(folderByPath, (file) => files.push(file))
		return files;
	} else {
		return app.vault.getFolderByPath(normalizePath(folder))?.children || [];
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
	if (!cache.frontmatter) return {} as T
	return cache.frontmatter as T;
}

/**
 *
 * @param app
 * @param file
 */
export function getAliases(app: App, file: TFile) {
	let frontmatter = getFrontmatter<{ aliases: string[] | undefined }>(app, file);
	return frontmatter?.aliases || [];
}

/**
 * Obsidian normalized path resolve similar to path.resolve from node.
 * e.g: [absolute/path/to/file, other/absolute/path/with/../, ./some/../relative]
 * will result in: other/absolute/path/relative
 * @param paths
 */
export function pathResolve(...paths: string[]) {
	let normalized = paths.map(normalizePath);

	// Find last absolute path
	let start = Math.max(0, normalized.findLastIndex(path => !path.startsWith(".")));
	let parts = normalized
		.slice(start)
		.map(path => path.split("/"))
		.flat()
		.filter(part => part.length > 0)

	let result: string[] = [];
	for (const part of parts) {
		if (part === ".") continue;
		if (part === "..") {
			if (result.length > 0) result.pop()
		} else {
			result.push(part);
		}
	}
	return normalizePath(result.join("/"));
}
