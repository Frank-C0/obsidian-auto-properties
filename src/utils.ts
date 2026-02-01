import type { PropertyType } from './types';
import { KNOWN_BAD_CHARACTERS } from './constants';

/**
 * Verifica si dos tipos de propiedades pueden combinarse en un array
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
 */
export function mergeIntoArrays(...args: (string | string[])[]): string[] {
    const arrays = args.map((arg) => (Array.isArray(arg) ? arg : [arg]));
    const flattened = arrays.flat();
    const unique = [...new Set(flattened)];
    return unique;
}

/**
 * Limpia caracteres inválidos de los tags
 */
export function cleanTags(str: string): string {
    const escaped = KNOWN_BAD_CHARACTERS
        .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join("");

    const regex = new RegExp(`[${escaped}]`, "g");
    return str.replace(regex, "");
}

/**
 * Procesa el valor de una propiedad según su tipo
 */
export function processPropertyValue(value: any, type: PropertyType): any {
    if (value === null || value === undefined) {
        return getDefaultValueForType(type);
    }

    switch (type) {
        case 'text':
            return String(value);

        case 'multitext':
            if (Array.isArray(value)) {
                return value.map(v => String(v));
            }
            return [String(value)];

        case 'number':
            const num = Number(value);
            return isNaN(num) ? 0 : num;

        case 'checkbox':
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                const lower = value.toLowerCase().trim();
                return lower === 'true' || lower === 'yes' || lower === '1';
            }
            return Boolean(value);

        case 'date':
        case 'datetime':
            if (!value) return '';
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            const str = String(value).trim();
            if (str === 'today' || str === 'now') {
                return new Date().toISOString().split('T')[0];
            }
            return str;

        case 'tags':
            if (Array.isArray(value)) {
                return value.map(v => cleanTags(String(v).trim())).filter(v => v);
            }
            const tagValue = String(value).trim();
            if (!tagValue) return [];

            const tags = tagValue.split(',')
                .map(t => cleanTags(t.trim()))
                .filter(t => t);

            return tags;

        case 'aliases':
            if (Array.isArray(value)) {
                return value.map(v => String(v).trim()).filter(v => v);
            }
            const aliasValue = String(value).trim();
            if (!aliasValue) return [];

            const aliases = aliasValue.split(',')
                .map(a => a.trim())
                .filter(a => a);

            return aliases;

        default:
            return value;
    }
}

/**
 * Obtiene el valor por defecto para un tipo de propiedad
 */
export function getDefaultValueForType(type: PropertyType): any {
    switch (type) {
        case 'text':
            return '';
        case 'multitext':
        case 'tags':
        case 'aliases':
            return [];
        case 'number':
            return 0;
        case 'checkbox':
            return false;
        case 'date':
        case 'datetime':
            return '';
        default:
            return '';
    }
}
