import { Setting, TextComponent, ToggleComponent } from 'obsidian';
import type { GlobalProperty, PropertyType } from './types';
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
 * Crea una fila de propiedad en el contenedor especificado
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
            } else {
                text.inputEl.style.borderColor = '';
            }
        });

        text.inputEl.style.flex = '2';
        text.inputEl.style.minWidth = '120px';
    });

    // Container for the value input (allows swapping controls dynamically)
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

            text.onChange(async (val) => {
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
            });

            text.inputEl.style.width = '100%';
        }
    };

    // Type select
    setting.addDropdown(dropdown => {
        PROPERTY_TYPES.forEach(type => {
            dropdown.addOption(type, type);
        });
        dropdown
            .setValue(property.type)
            .onChange(async (value) => {
                currentType = value as PropertyType;
                renderValueInput(currentType, property.value);
                await callbacks.onTypeChange(value);
            });
        dropdown.selectEl.style.flex = '1';
        dropdown.selectEl.style.minWidth = '100px';
    });

    // Render initial value input
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
    setting.addExtraButton(button => {
        button
            .setIcon('up-chevron-glyph')
            .setTooltip('Move up')
            .setDisabled(!options.canMoveUp)
            .onClick(async () => {
                if (options.canMoveUp) {
                    await callbacks.onMoveUp();
                }
            });
        if (!options.canMoveUp) button.extraSettingsEl.style.opacity = '0.5';
    });

    setting.addExtraButton(button => {
        button
            .setIcon('down-chevron-glyph')
            .setTooltip('Move down')
            .setDisabled(!options.canMoveDown)
            .onClick(async () => {
                if (options.canMoveDown) {
                    await callbacks.onMoveDown();
                }
            });
        if (!options.canMoveDown) button.extraSettingsEl.style.opacity = '0.5';
    });

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

/**
 * Actualiza el estado visual de una fila según si está habilitada o no
 */
function updateRowVisualState(rowElement: HTMLElement, enabled: boolean): void {
    if (!enabled) {
        rowElement.style.opacity = '0.5';
    } else {
        rowElement.style.opacity = '1';
    }
}

/**
 * Obtiene el placeholder apropiado según el tipo de propiedad
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
 * Creates the headers (kept since they were in property-row.ts previously)
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

    const actionsHeader = headersDiv.createEl('span', { text: 'Actions' });
    actionsHeader.style.minWidth = '100px';
    actionsHeader.style.textAlign = 'center';
}
