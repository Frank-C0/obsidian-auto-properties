// *    Availability: https://github.com/technohiker/obsidian-multi-properties
// ***************************************************************************************

import { Setting, TextComponent, ToggleComponent, MomentFormatComponent } from 'obsidian';
import type { GlobalProperty, PropertyType, ExclusionRule } from './types';
import { PROPERTY_TYPES } from './constants';
import { cleanTags } from './helpers';

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

    // Container for the value input (allows swapping controls dynamically)
    const valueControlContainer = setting.controlEl.createDiv('value-control-container');
    valueControlContainer.style.flex = '2';
    valueControlContainer.style.minWidth = '120px';
    valueControlContainer.style.display = 'flex';
    valueControlContainer.style.alignItems = 'center';

    // Type select (Moved to be earlier)
    const typeContainer = setting.controlEl.createDiv('type-control-container');
    typeContainer.style.flex = '1';
    typeContainer.style.minWidth = '100px';
    typeContainer.style.marginRight = '10px';


    const renderValueInput = (type: PropertyType, currentValue: any) => {
        valueControlContainer.empty();

        if (type === 'checkbox') {
            const toggle = new ToggleComponent(valueControlContainer);
            toggle.setValue(currentValue === 'true' || currentValue === true);
            toggle.onChange(async (val) => {
                await callbacks.onValueChange(String(val));
            });
        } else if (type === 'date') {
            const text = new TextComponent(valueControlContainer);
            text.inputEl.type = 'date';
            text.setValue(currentValue?.toString() || '');
            text.onChange(async (val) => {
                await callbacks.onValueChange(val);
            });
            text.inputEl.style.width = '100%';
        } else if (type === 'datetime') {
            const text = new TextComponent(valueControlContainer);
            text.inputEl.type = 'datetime-local';
            text.setValue(currentValue?.toString() || '');
            text.onChange(async (val) => {
                await callbacks.onValueChange(val);
            });
            text.inputEl.style.width = '100%';
        } else {
            // Default text/multitext/tags
            const text = new TextComponent(valueControlContainer);
            text.setPlaceholder(getPlaceholderForType(type));
            text.setValue(currentValue?.toString() || '');

            // Validation visual state
            const updateValidation = (val: string) => {
                const validation = validatePropertyInput(val, type);
                updateTextComponentVisuals(text, validation);
            };

            // Initial validation
            if ((currentValue?.toString() || '') !== '') {
                updateValidation(currentValue?.toString() || '');
            }

            text.onChange(async (val) => {
                updateValidation(val);
                await callbacks.onValueChange(val);
            });

            // Blur behavior (sanitization for tags)
            text.inputEl.addEventListener('blur', async () => {
                let val = text.getValue().trim();

                // Sanitize tags/aliases on blur
                if (type === 'tags' || type === 'aliases') {
                    if (val) {
                        const items = val.split(',').map(s => type === 'tags' ? cleanTags(s.trim()) : s.trim()).filter(s => s);
                        val = items.join(', ');
                        text.setValue(val);
                    }
                }

                if (val !== currentValue?.toString()) {
                    await callbacks.onValueChange(val);
                }
                updateValidation(val);
            });

            text.inputEl.style.width = '100%';
        }
    };



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

    // Type select (Moved here, before Name)
    const typeDropdown = new Setting(typeContainer).addDropdown(dropdown => {
        PROPERTY_TYPES.forEach(type => {
            dropdown.addOption(type, type);
        });
        dropdown
            .setValue(property.type)
            .onChange(async (value) => {
                currentType = value as PropertyType;
                renderValueInput(currentType, property.value);
                await callbacks.onTypeChange(value);

                // Auto-set name for special types
                if (value === 'tags' || value === 'aliases') {
                    await callbacks.onNameChange(value);
                    // We need to update the name input value visually as well, but we don't have direct access to the component here easily unless we store it.
                    // However, we can rely on the re-render or similar mechanism if the parent handles it, 
                    // or better, let's capture the text component.
                    if (nameTextComponent) {
                        nameTextComponent.setValue(value);
                    }
                }
            });
        dropdown.selectEl.style.width = '100%';
    });
    // Remove the default info/setting-item classes/styles that Setting adds to make it fit inside our div
    typeDropdown.settingEl.style.border = 'none';
    typeDropdown.settingEl.style.padding = '0';
    typeDropdown.infoEl.remove();

    // Name input
    let nameTextComponent: TextComponent;
    setting.addText(text => {
        nameTextComponent = text;
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



    // Initial render of value input
    renderValueInput(currentType, property.value);

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

    const typeHeader = headersDiv.createEl('span', { text: 'Type' });
    typeHeader.style.flex = '1';
    typeHeader.style.minWidth = '100px';

    const nameHeader = headersDiv.createEl('span', { text: 'Name' });
    nameHeader.style.flex = '2';
    nameHeader.style.minWidth = '120px';

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
