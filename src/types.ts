import type { PropertyTypes } from './types/custom';

export interface GlobalProperty {
    name: string;
    value: any;
    type: PropertyType;
    enabled: boolean;
    overwrite: boolean;
}

export interface ExclusionRule {
    type: 'tag' | 'property';
    value: string;
}

export interface ExcludedFolder {
    folder: string;
}

export type PropertyType = PropertyTypes;

export interface AutoPropertiesSettings {
    enabled: boolean;
    properties: GlobalProperty[];
    showNotifications: boolean;
    exclusionRules: ExclusionRule[];
    excludedFolders: ExcludedFolder[];
    useRegexForExcludedFolders: boolean;
    delayAfterCreate: number;
}
