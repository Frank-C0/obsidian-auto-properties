// ***************************************************************************************
// *    Title: obsidian-multi-properties/src/frontmatter.ts
// *    Author: technohiker (fez-github)
// *    Date: 2023
// *    License: MIT
// *    Availability: https://github.com/technohiker/obsidian-multi-properties
// ***************************************************************************************

/**
 * Verifica si dos tipos de propiedades pueden combinarse en un array
 * Based on canBeAppended from obsidian-multi-properties
 */
export function canBeAppended(type1: string, type2?: string): boolean {
    const nonAppendable = ['number', 'date', 'datetime', 'checkbox'];
    if (nonAppendable.includes(type1) || (type2 && nonAppendable.includes(type2))) {
        return false;
    }
    return true;
}

/**
 * Combina múltiples valores en un array único
 * Based on mergeIntoArrays from obsidian-multi-properties
 */
export function mergeIntoArrays(...args: (string | string[])[]): string[] {
    const arrays = args.map((arg) => (Array.isArray(arg) ? arg : [arg]));
    const flattened = arrays.flat();
    const unique = [...new Set(flattened)];
    return unique;
}
