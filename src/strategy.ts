/**
 * Match files with tag
 */
export interface FileTagStrategy {
	type: 'Tag'
	tag: string;
	exact: boolean;
}

/**
 * Matches file in folder
 */
export interface FileFolderStrategy {
	type: 'Folder'
	folder: string;
	includeSubFolders: boolean
}

/**
 * Matches string in list
 */
export interface ListStrategy {
	type: 'List'
	options: { label: string, value: string }[];
}

/**
 * Matches string or file in list returned by dynamic code
 */
export interface CodeStrategy {
	type: 'JS'
	code: string;
}

/**
 * Or / Union
 */
export interface DisjunctionStrategy {
	type: 'Disjunction'
	strategies: Exclude<AutoPropStrategy, DisjunctionStrategy>[]
}

/**
 * And / Intersection
 */
export interface ConjunctionStrategy {
	type: 'Conjunction'
	strategies: Exclude<AutoPropStrategy, ConjunctionStrategy>[]
}

/**
 * Negation
 */
export interface NegationStrategy {
	type: 'Negation'
	strategy: Exclude<AutoPropStrategy, NegationStrategy>
}

export type AutoPropStrategy =
	FileTagStrategy
	| FileFolderStrategy
	| ListStrategy
	| CodeStrategy
	| DisjunctionStrategy
	| ConjunctionStrategy
	| NegationStrategy

export type StrategyType = AutoPropStrategy['type']
