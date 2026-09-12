export function intersection2<T>(test: (a: T, b: T) => boolean, array1: T[], array2: T[]): T[] {
	return array1.filter(value => array2.some(other => test(value, other)));
}

export function intersection<T>(test: (a: T, b: T) => boolean, ...arrays: T[][]): T[] {
	if (arrays.length === 0) return [];
	if (arrays.length === 1) return arrays[0]!;
	return arrays.reduce((acc, curr) => intersection2(test, acc, curr));
}

export async function asyncFilter<T>(predicate: (value: T) => Promise<boolean>, array: T[]): Promise<T[]> {
	let results: T[] = [];
	for (const item of array) {
		if (await predicate(item)) results.push(item);
	}
	return results;
}

/**
 * Left matches predicate right does not match predicate
 * @param array
 * @param predicate
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): { left: T[], right: T[] } {
	const left: T[] = [];
	const right: T[] = [];
	for (const item of array) {
		if (predicate(item)) {
			left.push(item);
		} else {
			right.push(item);
		}
	}
	return {left, right};
}
