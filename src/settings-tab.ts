// ***************************************************************************************
// *    Title: obsidian-auto-note-mover (Settings logic)
// *    Author: farux
// *    Availability: https://github.com/farux/obsidian-auto-note-mover
// *    License: MIT
// ***************************************************************************************

import { App, PluginSettingTab, Setting } from 'obsidian';
import type AutoPropertiesPlugin from './main';
import type { GlobalProperty } from './types';
import { createPropertyHeaders, createPropertyRow } from './property-row';

export class AutoPropertiesSettingTab extends PluginSettingTab {
    plugin: AutoPropertiesPlugin;

    constructor(app: App, plugin: AutoPropertiesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Auto Properties Settings' });

        // Enable Auto Properties
        new Setting(containerEl)
            .setName('Enable Auto Properties')
            .setDesc('Automatically add configured properties to new notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.enabled = value;
                    await this.plugin.saveSettings();
                }));

        // Show notifications
        new Setting(containerEl)
            .setName('Show notifications')
            .setDesc('Show a notification when properties are added to a note')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showNotifications = value;
                    await this.plugin.saveSettings();
                }));

        // Delay after note creation
        new Setting(containerEl)
            .setName('Delay after note creation')
            .setDesc('Time to wait before applying properties (milliseconds, default: 500)')
            .addText(text => text
                .setPlaceholder('500')
                .setValue(String(this.plugin.settings.delayAfterCreate))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0 && num <= 5000) {
                        this.plugin.settings.delayAfterCreate = num;
                        await this.plugin.saveSettings();
                        text.inputEl.style.borderColor = '';
                    } else {
                        text.inputEl.style.borderColor = 'var(--text-error)';
                    }
                }));

        containerEl.createEl('h3', { text: 'Global Properties' });

        // Property headers
        createPropertyHeaders(containerEl);

        // Properties list
        const propertiesContainer = containerEl.createDiv('properties-container');
        propertiesContainer.style.maxHeight = '500px';
        propertiesContainer.style.overflowY = 'auto';
        propertiesContainer.style.marginBottom = '20px';
        this.renderPropertiesList(propertiesContainer);

        // Add property button
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('+ Add Property')
                .setCta()
                .onClick(() => {
                    const newProperty: GlobalProperty = {
                        name: '',
                        value: '',
                        type: 'text',
                        enabled: true,
                        overwrite: false
                    };
                    this.plugin.addProperty(newProperty);
                    this.renderPropertiesList(propertiesContainer);
                }));

        containerEl.createEl('h3', { text: 'Exclusion Rules' });
        const exclusionDesc = containerEl.createEl('p', { cls: 'setting-item-description' });
        exclusionDesc.innerHTML = 'Notes matching these rules will <strong>not</strong> have auto-properties applied.<br>' +
            '<strong>Tag:</strong> #example or example<br>' +
            '<strong>Property:</strong> key:value (checks specific value) or key (checks existence)';

        // Exclusion rules list
        const exclusionContainer = containerEl.createDiv('exclusion-rules-container');
        exclusionContainer.style.marginBottom = '20px';
        this.renderExclusionRulesList(exclusionContainer);

        // Add exclusion rule button
        // UI similar to Auto Note Mover's exclusions
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('+ Add Exclusion Rule')
                .onClick(async () => {
                    this.plugin.settings.exclusionRules.push({ type: 'tag', value: '' });
                    await this.plugin.saveSettings();
                    this.renderExclusionRulesList(exclusionContainer);
                }));
    }

    private renderPropertiesList(container: HTMLElement): void {
        container.empty();

        if (this.plugin.settings.properties.length === 0) {
            container.createEl('p', {
                text: 'No properties configured. Add your first property below.',
                cls: 'setting-item-description'
            });
            return;
        }

        this.plugin.settings.properties.forEach((property, index) => {
            createPropertyRow(
                container,
                property,
                {
                    onEnabledChange: async (enabled) => {
                        property.enabled = enabled;
                        await this.plugin.updateProperty(index, property);
                    },
                    onNameChange: async (name) => {
                        property.name = name;
                        await this.plugin.updateProperty(index, property);
                    },
                    onTypeChange: async (type) => {
                        property.type = type as any;
                        await this.plugin.updateProperty(index, property);
                    },
                    onValueChange: async (value) => {
                        property.value = value;
                        await this.plugin.updateProperty(index, property);
                    },
                    onOverwriteChange: async (overwrite) => {
                        property.overwrite = overwrite;
                        await this.plugin.updateProperty(index, property);
                    },
                    onMoveUp: async () => {
                        await this.plugin.moveProperty(index, index - 1);
                        this.renderPropertiesList(container);
                    },
                    onMoveDown: async () => {
                        await this.plugin.moveProperty(index, index + 1);
                        this.renderPropertiesList(container);
                    },
                    onDelete: async () => {
                        await this.plugin.removeProperty(index);
                        this.renderPropertiesList(container);
                    }
                },
                {
                    canMoveUp: index > 0,
                    canMoveDown: index < this.plugin.settings.properties.length - 1
                }
            );
        });
    }

    private renderExclusionRulesList(container: HTMLElement): void {
        container.empty();

        if (this.plugin.settings.exclusionRules.length === 0) {
            container.createEl('p', {
                text: 'No exclusion rules configured.',
                cls: 'setting-item-description'
            });
            return;
        }

        this.plugin.settings.exclusionRules.forEach((rule, index) => {
            const ruleSetting = new Setting(container)
                .addDropdown(dropdown => dropdown
                    .addOption('tag', 'Tag')
                    .addOption('property', 'Property')
                    .setValue(rule.type)
                    .onChange(async (value: 'tag' | 'property') => {
                        this.plugin.settings.exclusionRules[index].type = value;
                        await this.plugin.saveSettings();
                        this.renderExclusionRulesList(container);
                    }))
                .addText(text => {
                    const placeholder = rule.type === 'tag' ? '#example or example' : 'key:value or key';
                    text.setPlaceholder(placeholder)
                        .setValue(rule.value)
                        .onChange(async (value) => {
                            this.plugin.settings.exclusionRules[index].value = value.trim();
                            await this.plugin.saveSettings();
                            if (!value.trim()) {
                                text.inputEl.style.borderColor = 'var(--text-error)';
                            } else {
                                text.inputEl.style.borderColor = '';
                            }
                        });
                })
                .addExtraButton(button => button
                    .setIcon('up-chevron-glyph')
                    .setTooltip('Move up')
                    .onClick(async () => {
                        if (index > 0) {
                            const temp = this.plugin.settings.exclusionRules[index];
                            this.plugin.settings.exclusionRules[index] = this.plugin.settings.exclusionRules[index - 1];
                            this.plugin.settings.exclusionRules[index - 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExclusionRulesList(container);
                        }
                    }))
                .addExtraButton(button => button
                    .setIcon('down-chevron-glyph')
                    .setTooltip('Move down')
                    .onClick(async () => {
                        if (index < this.plugin.settings.exclusionRules.length - 1) {
                            const temp = this.plugin.settings.exclusionRules[index];
                            this.plugin.settings.exclusionRules[index] = this.plugin.settings.exclusionRules[index + 1];
                            this.plugin.settings.exclusionRules[index + 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExclusionRulesList(container);
                        }
                    }))
                .addExtraButton(button => button
                    .setIcon('cross')
                    .setTooltip('Delete')
                    .onClick(async () => {
                        this.plugin.settings.exclusionRules.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.renderExclusionRulesList(container);
                    }));

            ruleSetting.infoEl.remove();
        });
    }
}
