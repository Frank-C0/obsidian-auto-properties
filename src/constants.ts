import type { PropertyType, AutoPropertiesSettings } from './types';

export const PROPERTY_TYPES: PropertyType[] = [
    'text',
    'multitext',
    'number',
    'checkbox',
    'date',
    'datetime',
    'tags',
    'aliases'
];

export const DEFAULT_SETTINGS: AutoPropertiesSettings = {
    enabled: true,
    properties: [],
    showNotifications: true,
    exclusionRules: [],
    delayAfterCreate: 500
};

// Known bad characters for tags (from obsidian-multi-properties)
export const KNOWN_BAD_CHARACTERS = [
    "‒", "–", "—", "―", "⁏", "‽", "‘", "‚", "‛", "‹", "›", "“", "”", "„", "‟",
    "⁅", "⁆", "⁋", "⁎", "⁑", "⁄", "⁊", "‰", "‱", "⁒", "†", "‡", "•", "‣", "⁃",
    "⁌", "⁍", "′", "‵", "‸", "※", "⁐", "⁁", "⁂", "‖", "‑", "″", "‴", "⁗", "‶",
    "‷", "`", "^", "‾", "‗", "⁓", ";", ":", "!", "‼", "⁉", "?", "⁈", "⁇", ".",
    "․", "‥", "…", "'", '"', "(", ")", "[", "]", "{", "}", "@", "*", "&", "%",
    "⁔", "+", "<", "=", ">", "|", "~", "$", "⁕", "⁖", "⁘", "⁙", "⁚", "⁛", "⁜",
    "⁝", "⁞", "⸀", "⸁", "⸂", "⸃", "⸄", "⸅", "⸆", "⸇", "⸈", "⸉", "⸊", "⸋", "⸌",
    "⸍", "⸎", "⸏", "⸐", "⸑", "⸒", "⸓", "⸔", "⸕", "⸖", "⸗", "⸜", "⸝", " ", "#"
];
