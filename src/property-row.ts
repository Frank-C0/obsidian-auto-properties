import { Setting, TextComponent, ToggleComponent } from 'obsidian';
import type { GlobalProperty, PropertyType } from './types';
import { PROPERTY_TYPES } from './constants';
import { cleanTags } from './helpers';
import { addMoveButtons, updateRowVisualState } from './ui-utils';

export interface PropertyRowCallbacks {
    onEnabledChange: (enabled: boolean) => Promise<void>;
    onNameChange: (name: string) => Promise<void>;
    onTypeChange: (type: string) => Promise<void>;
    onValueChange: (value: string) => Promise<void>;
    onOverwriteChange: (overwrite: boolean) => Promise<void>;
    onMoveUp: () => Promise<void>;
    onMoveDown: () => Promise<void>;
    onDelete: () => Promise<void>;
}

export interface PropertyRowOptions {
    canMoveUp: boolean;
    canMoveDown: boolean;
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
 * Creates a property row in the specified container with the correct order:
 * Enabled, Type, Name, Value, Overwrite, Actions
 */
export function createPropertyRow(
    container: HTMLElement,
    property: GlobalProperty,
    callbacks: PropertyRowCallbacks,
    options: PropertyRowOptions
): void {
    const setting = new Setting(container);
    setting.setClass('property-item');
    setting.infoEl.remove();

    let currentType = property.type;

    // 1. ENABLED CHECKBOX
    setting.addToggle(toggle => {
        toggle
            .setValue(property.enabled)
            .setTooltip('Enable/Disable')
            .onChange(async (value) => {
                await callbacks.onEnabledChange(value);
                updateRowVisualState(setting.settingEl, value);
            });
        toggle.toggleEl.style.width = '42px';
        toggle.toggleEl.style.justifyContent = 'center';
    });

    // 2. TYPE DROPDOWN
    const typeControlContainer = setting.controlEl.createDiv('type-control-container');
    typeControlContainer.style.flex = '1';
    typeControlContainer.style.minWidth = '100px';

    const typeDropdown = new Setting(typeControlContainer).addDropdown(dropdown => {
        PROPERTY_TYPES.forEach(type => {
            dropdown.addOption(type, type);
        });
        dropdown
            .setValue(property.type)
            .onChange(async (value) => {
                currentType = value as PropertyType;
                renderValueInput(currentType, property.value);
                await callbacks.onTypeChange(value);

                if (value === 'tags' || value === 'aliases') {
                    await callbacks.onNameChange(value);
                    if (nameTextComponent) {
                        nameTextComponent.setValue(value);
                    }
                }
            });
        dropdown.selectEl.style.width = '100%';
    });
    typeDropdown.settingEl.style.border = 'none';
    typeDropdown.settingEl.style.padding = '0';
    typeDropdown.infoEl.remove();

    // 3. NAME INPUT
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

        text.inputEl.addEventListener('blur', async () => {
            const trimmed = text.getValue().trim();
            if (trimmed !== property.name) {
                text.setValue(trimmed);
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

    // 4. VALUE INPUT
    const valueControlContainer = setting.controlEl.createDiv('value-control-container');
    valueControlContainer.style.flex = '2';
    valueControlContainer.style.minWidth = '120px';
    valueControlContainer.style.display = 'flex';
    valueControlContainer.style.alignItems = 'center';

    const renderValueInput = (type: PropertyType, currentValue: any) => {
        valueControlContainer.empty();

        if (type === 'checkbox') {
            const toggle = new ToggleComponent(valueControlContainer);
            toggle.setValue(currentValue === 'true' || currentValue === true);
            toggle.onChange(async (val) => {
                await callbacks.onValueChange(String(val));
            });
        } else if (type === 'date' || type === 'datetime') {
            const text = new TextComponent(valueControlContainer);
            text.inputEl.type = type === 'date' ? 'date' : 'datetime-local';
            text.setValue(currentValue?.toString() || '');
            text.onChange(async (val) => {
                await callbacks.onValueChange(val);
            });
            text.inputEl.style.width = '100%';
        } else {
            const text = new TextComponent(valueControlContainer);
            text.setPlaceholder(getPlaceholderForType(type));
            text.setValue(currentValue?.toString() || '');

            const updateValidation = (val: string) => {
                const validation = validatePropertyInput(val, type);
                if (!validation.isValid) {
                    text.inputEl.style.borderColor = 'var(--text-error)';
                    text.inputEl.title = validation.message;
                } else {
                    text.inputEl.style.borderColor = '';
                    text.inputEl.title = '';
                }
            };

            if ((currentValue?.toString() || '') !== '') {
                updateValidation(currentValue?.toString() || '');
            }

            text.onChange(async (val) => {
                updateValidation(val);
                await callbacks.onValueChange(val);
            });

            text.inputEl.addEventListener('blur', async () => {
                let val = text.getValue().trim();
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

    renderValueInput(currentType, property.value);

    // 5. OVERWRITE TOGGLE
    setting.addToggle(toggle => {
        toggle
            .setValue(property.overwrite)
            .setTooltip('Overwrite if exists')
            .onChange(async (value) => {
                await callbacks.onOverwriteChange(value);
            });
        toggle.toggleEl.style.width = '42px';
        toggle.toggleEl.style.justifyContent = 'center';
    });

    // 6. ACTIONS
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

    updateRowVisualState(setting.settingEl, property.enabled);
}

export function getPlaceholderForType(type: PropertyType): string {
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

export function validatePropertyInput(value: string, type: PropertyType): { isValid: boolean; message: string } {
    if (value === undefined || value === null) value = '';
    const trimmed = value.toString().trim();
    if (!trimmed) return { isValid: true, message: '' };

    switch (type) {
        case 'number':
            return !isNaN(Number(trimmed)) ? { isValid: true, message: '' } : { isValid: false, message: 'Must be a valid number' };
        case 'checkbox':
            const lower = trimmed.toLowerCase();
            return (lower === 'true' || lower === 'false') ? { isValid: true, message: '' } : { isValid: false, message: 'Must be "true" or "false"' };
        case 'date':
            if (trimmed.toLowerCase() === 'today') return { isValid: true, message: '' };
            return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? { isValid: true, message: '' } : { isValid: false, message: 'Format: YYYY-MM-DD or "today"' };
        case 'datetime':
            if (trimmed.toLowerCase() === 'now') return { isValid: true, message: '' };
            return /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? { isValid: true, message: '' } : { isValid: false, message: 'Format: YYYY-MM-DD HH:mm or "now"' };
        default:
            return { isValid: true, message: '' };
    }
}
