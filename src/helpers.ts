// ***************************************************************************************
// *    Title: obsidian-multi-properties/src/helpers.ts
// *    Author: technohiker (fez-github)
// *    Date: 2023
// *    License: MIT
// *    Availability: https://github.com/technohiker/obsidian-multi-properties
// *
// *    Portions (cleanTags) based on:
// *    Title: obsidian-quick-tagger
// *    Author: Gorkycreator
// *    Availability: https://github.com/Gorkycreator/obsidian-quick-tagger
// ***************************************************************************************

import { KNOWN_BAD_CHARACTERS } from './constants';
import type { PropertyType } from './types';

/**
 * Limpia caracteres inválidos de los tags
 * Based on cleanTags from obsidian-multi-properties / obsidian-quick-tagger
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
 * Functionally similar to parseValue in obsidian-multi-properties
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
            const multiTextValue = String(value).trim();
            if (!multiTextValue) return [];

            return multiTextValue.split(',').map(v => v.trim()).filter(v => v);

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
