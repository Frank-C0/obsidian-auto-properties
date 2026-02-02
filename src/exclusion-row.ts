import { Setting, TextComponent } from 'obsidian';
import type { ExclusionRule } from './types';
import { addMoveButtons } from './ui-utils';

export interface ExclusionRowCallbacks {
    onTypeChange: (type: 'tag' | 'property') => Promise<void>;
    onValueChange: (value: string) => Promise<void>;
    onMoveUp: () => Promise<void>;
    onMoveDown: () => Promise<void>;
    onDelete: () => Promise<void>;
}

export interface ExclusionRowOptions {
    canMoveUp: boolean;
    canMoveDown: boolean;
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

/**
 * Creates an exclusion rule row in the specified container
 */
export function createExclusionRow(
    container: HTMLElement,
    rule: ExclusionRule,
    callbacks: ExclusionRowCallbacks,
    options: ExclusionRowOptions
): void {
    const setting = new Setting(container);
    setting.setClass('exclusion-item');
    setting.infoEl.remove();

    let valueTextComponent: TextComponent | null = null;

    // Type select
    setting.addDropdown(dropdown => {
        dropdown
            .addOption('tag', 'Tag')
            .addOption('property', 'Property')
            .setValue(rule.type)
            .onChange(async (value: 'tag' | 'property') => {
                if (valueTextComponent) {
                    valueTextComponent.setPlaceholder(value === 'tag' ? '#example or example' : 'key:value or key');
                }
                await callbacks.onTypeChange(value);
            });

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

        text.inputEl.addEventListener('blur', () => {
            const trimmed = text.getValue().trim();
            if (trimmed !== rule.value) {
                text.setValue(trimmed);
            }
        });

        text.inputEl.style.flex = '3';
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
