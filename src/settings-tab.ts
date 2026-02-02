// *    Title: obsidian-auto-note-mover (Settings logic)
// *    Author: farux
// *    Availability: https://github.com/farux/obsidian-auto-note-mover
// *    License: MIT
// *    
// *    Title: obsidian-multi-properties (Property types and parsing logic)
// *    Author: technohiker (fez-github)
// *    Availability: https://github.com/technohiker/obsidian-multi-properties
// *    License: MIT
// ***************************************************************************************

import { App, PluginSettingTab, Setting } from 'obsidian';
import type AutoPropertiesPlugin from './main';
import type { GlobalProperty } from './types';
import {
    createPropertyHeaders,
    createPropertyRow,
    createExclusionHeaders,
    createExclusionRow,
    createFolderExclusionRow
} from './ui-components';

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
                        text.inputEl.title = '';
                    } else {
                        text.inputEl.style.borderColor = 'var(--text-error)';
                        text.inputEl.title = 'Must be between 0 and 5000ms';
                    }
                }));

        containerEl.createEl('h3', { text: 'Global Properties' });

        containerEl.createEl('div', {
            text: 'Type in a property name, then value. Use the dropdown to choose what type of data you wish to store.',
            cls: 'setting-item-description',
            attr: { style: 'margin-bottom: 5px;' }
        });
        containerEl.createEl('div', {
            text: 'If you want to make a List property, use the Text data type and separate each value with a comma.',
            cls: 'setting-item-description',
            attr: { style: 'margin-bottom: 5px;' }
        });
        containerEl.createEl('div', {
            text: 'If you want to add Tags, use the name "tags".',
            cls: 'setting-item-description',
            attr: { style: 'margin-bottom: 15px;' }
        });

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

        containerEl.createEl('h3', { text: 'Excluded Folders' });
        new Setting(containerEl)
            .setName('Use regular expressions to check for excluded folder')
            .setDesc('If enabled, you can use regular expressions to match folder paths.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useRegexForExcludedFolders)
                .onChange(async (value) => {
                    this.plugin.settings.useRegexForExcludedFolders = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        const excludedFoldersContainer = containerEl.createDiv('excluded-folders-container');
        excludedFoldersContainer.style.marginBottom = '20px';
        this.renderExcludedFoldersList(excludedFoldersContainer);

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('+ Add Excluded Folder')
                .onClick(async () => {
                    this.plugin.settings.excludedFolders.push({ folder: '' });
                    await this.plugin.saveSettings();
                    this.renderExcludedFoldersList(excludedFoldersContainer);
                }));

        containerEl.createEl('h3', { text: 'Exclusion Rules (Tags & Properties)' });
        const exclusionDesc = containerEl.createEl('p', { cls: 'setting-item-description' });
        exclusionDesc.innerHTML = 'Notes matching these rules will <strong>not</strong> have auto-properties applied.<br>' +
            '<strong>Tag:</strong> #example or example<br>' +
            '<strong>Property:</strong> key:value (checks specific value) or key (checks existence)';

        // Exclusion headers
        createExclusionHeaders(containerEl);

        // Exclusion rules list
        const exclusionContainer = containerEl.createDiv('exclusion-rules-container');
        exclusionContainer.style.marginBottom = '20px';
        this.renderExclusionRulesList(exclusionContainer);

        // Add exclusion rule button
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
            createExclusionRow(
                container,
                rule,
                {
                    onTypeChange: async (value) => {
                        this.plugin.settings.exclusionRules[index].type = value;
                        await this.plugin.saveSettings();
                        this.renderExclusionRulesList(container);
                    },
                    onValueChange: async (value) => {
                        this.plugin.settings.exclusionRules[index].value = value;
                        await this.plugin.saveSettings();
                    },
                    onMoveUp: async () => {
                        if (index > 0) {
                            const temp = this.plugin.settings.exclusionRules[index];
                            this.plugin.settings.exclusionRules[index] = this.plugin.settings.exclusionRules[index - 1];
                            this.plugin.settings.exclusionRules[index - 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExclusionRulesList(container);
                        }
                    },
                    onMoveDown: async () => {
                        if (index < this.plugin.settings.exclusionRules.length - 1) {
                            const temp = this.plugin.settings.exclusionRules[index];
                            this.plugin.settings.exclusionRules[index] = this.plugin.settings.exclusionRules[index + 1];
                            this.plugin.settings.exclusionRules[index + 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExclusionRulesList(container);
                        }
                    },
                    onDelete: async () => {
                        this.plugin.settings.exclusionRules.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.renderExclusionRulesList(container);
                    }
                },
                {
                    canMoveUp: index > 0,
                    canMoveDown: index < this.plugin.settings.exclusionRules.length - 1
                }
            );
        });
    }

    private renderExcludedFoldersList(container: HTMLElement): void {
        container.empty();

        if (this.plugin.settings.excludedFolders.length === 0) {
            container.createEl('p', {
                text: 'No folders excluded.',
                cls: 'setting-item-description'
            });
            return;
        }

        this.plugin.settings.excludedFolders.forEach((excluded, index) => {
            createFolderExclusionRow(
                container,
                excluded,
                {
                    onFolderChange: async (value) => {
                        this.plugin.settings.excludedFolders[index].folder = value;
                        await this.plugin.saveSettings();
                    },
                    onMoveUp: async () => {
                        if (index > 0) {
                            const temp = this.plugin.settings.excludedFolders[index];
                            this.plugin.settings.excludedFolders[index] = this.plugin.settings.excludedFolders[index - 1];
                            this.plugin.settings.excludedFolders[index - 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExcludedFoldersList(container);
                        }
                    },
                    onMoveDown: async () => {
                        if (index < this.plugin.settings.excludedFolders.length - 1) {
                            const temp = this.plugin.settings.excludedFolders[index];
                            this.plugin.settings.excludedFolders[index] = this.plugin.settings.excludedFolders[index + 1];
                            this.plugin.settings.excludedFolders[index + 1] = temp;
                            await this.plugin.saveSettings();
                            this.renderExcludedFoldersList(container);
                        }
                    },
                    onDelete: async () => {
                        this.plugin.settings.excludedFolders.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.renderExcludedFoldersList(container);
                    }
                },
                {
                    canMoveUp: index > 0,
                    canMoveDown: index < this.plugin.settings.excludedFolders.length - 1
                }
            );
        });
    }
}
