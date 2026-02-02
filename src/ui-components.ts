import { Setting, TextComponent } from 'obsidian';
import type { GlobalProperty, PropertyType, ExclusionRule } from './types';
import { PROPERTY_TYPES } from './constants';

interface PropertyRowCallbacks {
    onEnabledChange: (enabled: boolean) => Promise<void>;
    onNameChange: (name: string) => Promise<void>;
    onTypeChange: (type: string) => Promise<void>;
    onValueChange: (value: string) => Promise<void>;
    onOverwriteChange: (overwrite: boolean) => Promise<void>;
    onMoveUp: () => Promise<void>;
    onMoveDown: () => Promise<void>;
    onDelete: () => Promise<void>;
}

interface PropertyRowOptions {
    canMoveUp: boolean;
    canMoveDown: boolean;
}

/**
 * Creates a property row in the specified container
 */
export function createPropertyRow(
    container: HTMLElement,
    property: GlobalProperty,
    callbacks: PropertyRowCallbacks,
    options: PropertyRowOptions
): void {
    const setting = new Setting(container);
    setting.setClass('property-item');
    setting.infoEl.remove(); // Remove the info element to use full width for controls

    let valueTextComponent: TextComponent | null = null;
    let currentType = property.type;

    // Enabled checkbox
    setting.addToggle(toggle => {
        toggle
            .setValue(property.enabled)
            .setTooltip('Enable/Disable')
            .onChange(async (value) => {
                await callbacks.onEnabledChange(value);
                updateRowVisualState(setting.settingEl, value);
            });
    });

    // Name input
    setting.addText(text => {
        text
            .setPlaceholder('Property name')
            .setValue(property.name)
            .onChange(async (value) => {
                const trimmed = value.trim();
                if (trimmed !== property.name) {
                    await callbacks.onNameChange(trimmed);
                }
            });

        // Restore blur behavior and styling
        text.inputEl.addEventListener('blur', async () => {
            const trimmed = text.getValue().trim();
            if (trimmed !== property.name) {
                text.setValue(trimmed); // Update UI
                await callbacks.onNameChange(trimmed);
            }
            if (!trimmed) {
                text.inputEl.style.borderColor = 'var(--text-error)';
                text.inputEl.title = 'Property name cannot be empty';
            } else {
                text.inputEl.style.borderColor = '';
                text.inputEl.title = '';
            }
        });

        text.inputEl.style.flex = '2';
        text.inputEl.style.minWidth = '120px';
    });

    // Type select
    setting.addDropdown(dropdown => {
        PROPERTY_TYPES.forEach(type => {
            dropdown.addOption(type, type);
        });
        dropdown
            .setValue(property.type)
            .onChange(async (value) => {
                currentType = value as PropertyType;

                // Update value placeholder and re-validate
                if (valueTextComponent) {
                    valueTextComponent.setPlaceholder(getPlaceholderForType(currentType));

                    const validation = validatePropertyInput(valueTextComponent.getValue(), currentType);
                    updateTextComponentVisuals(valueTextComponent, validation);
                }

                await callbacks.onTypeChange(value);
            });
        dropdown.selectEl.style.flex = '1';
        dropdown.selectEl.style.minWidth = '100px';
    });

    // Value input
    setting.addText(text => {
        valueTextComponent = text;

        // Initial validation visual state
        const initialVal = validatePropertyInput(property.value?.toString() || '', currentType);
        if (!initialVal.isValid && (property.value?.toString() || '') !== '') {
            // Only show error initially if there is a value
            updateTextComponentVisuals(text, initialVal);
        }

        text
            .setPlaceholder(getPlaceholderForType(property.type))
            .setValue(property.value?.toString() || '')
            .onChange(async (value) => {
                const validation = validatePropertyInput(value, currentType);
                updateTextComponentVisuals(text, validation);
                await callbacks.onValueChange(value.trim());
            });

        // Restore blur behavior
        text.inputEl.addEventListener('blur', async () => {
            const trimmed = text.getValue().trim();
            if (trimmed !== property.value?.toString()) {
                text.setValue(trimmed);
                await callbacks.onValueChange(trimmed);
            }
            // Re-validate on blur just to be safe
            const validation = validatePropertyInput(trimmed, currentType);
            updateTextComponentVisuals(text, validation);
        });

        text.inputEl.style.flex = '2';
        text.inputEl.style.minWidth = '120px';
    });

    // Overwrite checkbox
    setting.addToggle(toggle => {
        toggle
            .setValue(property.overwrite)
            .setTooltip('Overwrite if exists')
            .onChange(async (value) => {
                await callbacks.onOverwriteChange(value);
            });
    });

    // Actions
    addMoveButtons(setting, options.canMoveUp, options.canMoveDown, callbacks.onMoveUp, callbacks.onMoveDown);

    setting.addExtraButton(button => {
        button
            .setIcon('cross')
            .setTooltip('Delete')
            .onClick(async () => {
                await callbacks.onDelete();
            });
        button.extraSettingsEl.style.color = 'var(--text-error)';
    });

    // Apply initial visual state
    updateRowVisualState(setting.settingEl, property.enabled);
}

interface ExclusionRowCallbacks {
    onTypeChange: (type: 'tag' | 'property') => Promise<void>;
    onValueChange: (value: string) => Promise<void>;
    onMoveUp: () => Promise<void>;
    onMoveDown: () => Promise<void>;
    onDelete: () => Promise<void>;
}

/**
 * Creates an exclusion rule row in the specified container
 */
export function createExclusionRow(
    container: HTMLElement,
    rule: ExclusionRule,
    callbacks: ExclusionRowCallbacks,
    options: PropertyRowOptions
): void {
    const setting = new Setting(container);
    setting.setClass('exclusion-item');
    setting.infoEl.remove();

    let valueTextComponent: TextComponent | null = null;
    let currentType = rule.type;

    // Type select
    setting.addDropdown(dropdown => {
        dropdown
            .addOption('tag', 'Tag')
            .addOption('property', 'Property')
            .setValue(rule.type)
            .onChange(async (value: 'tag' | 'property') => {
                currentType = value;
                if (valueTextComponent) {
                    valueTextComponent.setPlaceholder(value === 'tag' ? '#example or example' : 'key:value or key');
                    // Trigger validation?
                }
                await callbacks.onTypeChange(value);
            });

        // Match style with property row
        dropdown.selectEl.style.flex = '1';
        dropdown.selectEl.style.minWidth = '100px';
    });

    // Value input
    setting.addText(text => {
        valueTextComponent = text;
        const placeholder = rule.type === 'tag' ? '#example or example' : 'key:value or key';
        text
            .setPlaceholder(placeholder)
            .setValue(rule.value)
            .onChange(async (value) => {
                await callbacks.onValueChange(value.trim());
                if (!value.trim()) {
                    text.inputEl.style.borderColor = 'var(--text-error)';
                    text.inputEl.title = 'Value cannot be empty';
                } else {
                    text.inputEl.style.borderColor = '';
                    text.inputEl.title = '';
                }
            });

        // Add blur listener
        text.inputEl.addEventListener('blur', () => {
            const trimmed = text.getValue().trim();
            if (trimmed !== rule.value) {
                text.setValue(trimmed);
            }
        });

        text.inputEl.style.flex = '3'; // Give it more space
        text.inputEl.style.minWidth = '200px';
    });

    // Actions
    addMoveButtons(setting, options.canMoveUp, options.canMoveDown, callbacks.onMoveUp, callbacks.onMoveDown);

    setting.addExtraButton(button => {
        button
            .setIcon('cross')
            .setTooltip('Delete')
            .onClick(async () => {
                await callbacks.onDelete();
            });
        button.extraSettingsEl.style.color = 'var(--text-error)';
    });
}

function addMoveButtons(
    setting: Setting,
    canMoveUp: boolean,
    canMoveDown: boolean,
    onMoveUp: () => Promise<void>,
    onMoveDown: () => Promise<void>
) {
    setting.addExtraButton(button => {
        button
            .setIcon('up-chevron-glyph')
            .setTooltip('Move up')
            .setDisabled(!canMoveUp)
            .onClick(async () => {
                if (canMoveUp) {
                    await onMoveUp();
                }
            });
        if (!canMoveUp) button.extraSettingsEl.style.opacity = '0.5';
    });

    setting.addExtraButton(button => {
        button
            .setIcon('down-chevron-glyph')
            .setTooltip('Move down')
            .setDisabled(!canMoveDown)
            .onClick(async () => {
                if (canMoveDown) {
                    await onMoveDown();
                }
            });
        if (!canMoveDown) button.extraSettingsEl.style.opacity = '0.5';
    });
}


/**
 * Updates the visual state of a row based on whether it is enabled
 */
function updateRowVisualState(rowElement: HTMLElement, enabled: boolean): void {
    if (!enabled) {
        rowElement.style.opacity = '0.5';
    } else {
        rowElement.style.opacity = '1';
    }
}

/**
 * Gets the appropriate placeholder based on property type
 */
function getPlaceholderForType(type: PropertyType): string {
    switch (type) {
        case 'text': return 'Text value';
        case 'multitext': return 'value1, value2, ...';
        case 'number': return '42';
        case 'checkbox': return 'true/false';
        case 'date': return 'YYYY-MM-DD or "today"';
        case 'datetime': return 'YYYY-MM-DD or "now"';
        case 'tags': return 'tag1, tag2, ...';
        case 'aliases': return 'alias1, alias2, ...';
        default: return 'Value';
    }
}

/**
 * Validates property input based on type
 */
function validatePropertyInput(value: string, type: PropertyType): { isValid: boolean; message: string } {
    if (value === undefined || value === null) value = '';
    const trimmed = value.toString().trim();

    // Allow empty values generally
    if (!trimmed) return { isValid: true, message: '' };

    switch (type) {
        case 'number':
            return !isNaN(Number(trimmed)) ? { isValid: true, message: '' } : { isValid: false, message: 'Must be a valid number' };
        case 'checkbox':
            const lower = trimmed.toLowerCase();
            return (lower === 'true' || lower === 'false') ? { isValid: true, message: '' } : { isValid: false, message: 'Must be "true" or "false"' };
        case 'date':
            if (trimmed.toLowerCase() === 'today') return { isValid: true, message: '' };
            // Simple YYYY-MM-DD validation
            return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? { isValid: true, message: '' } : { isValid: false, message: 'Format: YYYY-MM-DD or "today"' };
        case 'datetime':
            if (trimmed.toLowerCase() === 'now') return { isValid: true, message: '' };
            // Simple YYYY-MM-DD HH:mm validation
            return /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? { isValid: true, message: '' } : { isValid: false, message: 'Format: YYYY-MM-DD HH:mm or "now"' };
        default:
            return { isValid: true, message: '' };
    }
}

function updateTextComponentVisuals(component: TextComponent, validation: { isValid: boolean; message: string }) {
    if (!validation.isValid) {
        component.inputEl.style.borderColor = 'var(--text-error)';
        component.inputEl.title = validation.message;
    } else {
        component.inputEl.style.borderColor = '';
        component.inputEl.title = '';
    }
}

/**
 * Creates column headers for the property list
 */
export function createPropertyHeaders(container: HTMLElement): void {
    const headersDiv = container.createDiv('properties-headers');
    headersDiv.style.display = 'flex';
    headersDiv.style.alignItems = 'center';
    headersDiv.style.gap = '8px';
    headersDiv.style.marginBottom = '8px';
    headersDiv.style.paddingLeft = '10px';
    headersDiv.style.paddingRight = '10px';
    headersDiv.style.fontSize = '0.85em';
    headersDiv.style.fontWeight = '600';
    headersDiv.style.color = 'var(--text-muted)';

    const enabledHeader = headersDiv.createEl('span', { text: '✓' });
    enabledHeader.style.width = '42px';
    enabledHeader.style.textAlign = 'center';
    enabledHeader.title = 'Enabled';

    const nameHeader = headersDiv.createEl('span', { text: 'Name' });
    nameHeader.style.flex = '2';
    nameHeader.style.minWidth = '120px';

    const typeHeader = headersDiv.createEl('span', { text: 'Type' });
    typeHeader.style.flex = '1';
    typeHeader.style.minWidth = '100px';

    const valueHeader = headersDiv.createEl('span', { text: 'Value' });
    valueHeader.style.flex = '2';
    valueHeader.style.minWidth = '120px';

    const overwriteHeader = headersDiv.createEl('span', { text: '⚠' });
    overwriteHeader.style.width = '42px';
    overwriteHeader.style.textAlign = 'center';
    overwriteHeader.title = 'Overwrite';

    const actionsHeader = headersDiv.createEl('span', { text: 'Actions' });
    actionsHeader.style.minWidth = '100px';
    actionsHeader.style.textAlign = 'center';
}

/**
 * Creates column headers for the exclusion rules list
 */
export function createExclusionHeaders(container: HTMLElement): void {
    const headersDiv = container.createDiv('exclusion-headers');
    headersDiv.style.display = 'flex';
    headersDiv.style.alignItems = 'center';
    headersDiv.style.gap = '8px';
    headersDiv.style.marginBottom = '8px';
    headersDiv.style.paddingLeft = '10px';
    headersDiv.style.paddingRight = '10px';
    headersDiv.style.fontSize = '0.85em';
    headersDiv.style.fontWeight = '600';
    headersDiv.style.color = 'var(--text-muted)';

    const typeHeader = headersDiv.createEl('span', { text: 'Type' });
    typeHeader.style.flex = '1';
    typeHeader.style.minWidth = '100px';

    const valueHeader = headersDiv.createEl('span', { text: 'Value' });
    valueHeader.style.flex = '3';
    valueHeader.style.minWidth = '200px';

    const actionsHeader = headersDiv.createEl('span', { text: 'Actions' });
    actionsHeader.style.minWidth = '100px';
    actionsHeader.style.textAlign = 'center';
}
