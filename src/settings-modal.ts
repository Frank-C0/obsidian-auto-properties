import { App, Modal, Setting, Notice } from 'obsidian';
import type AutoPropertiesPlugin from './main';
import type { GlobalProperty } from './types';
import { createPropertyHeaders, createPropertyRow } from './property-row';

export class SettingsModal extends Modal {
	plugin: AutoPropertiesPlugin;

	constructor(app: App, plugin: AutoPropertiesPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.setTitle('Auto Properties - Quick Settings');

		// Enable/Disable toggle
		new Setting(contentEl)
			.setName('Enable Auto Properties')
			.setDesc('Automatically add configured properties to new notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					new Notice(`Auto Properties ${value ? 'enabled' : 'disabled'}`);
				}));

		// Show notifications toggle
		new Setting(contentEl)
			.setName('Show notifications')
			.setDesc('Show a notification when properties are added to a note')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));

		contentEl.createEl('h3', { text: 'Quick Property Management' });

		// Property headers
		createPropertyHeaders(contentEl);

		// Properties list
		const propertiesContainer = contentEl.createDiv('properties-list');
		propertiesContainer.style.maxHeight = '400px';
		propertiesContainer.style.overflowY = 'auto';
		this.renderPropertiesList(propertiesContainer);

		// Add property button
		new Setting(contentEl)
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

		// Separator
		contentEl.createDiv('setting-item-separator');

		// Apply properties button
		new Setting(contentEl)
			.setName('Apply Properties Now')
			.setDesc('Apply global properties to the current active note')
			.addButton(button => button
				.setButtonText('Apply')
				.setCta()
				.onClick(async () => {
					const file = this.app.workspace.getActiveFile();
					if (!file) {
						new Notice('No active file. Please open a note first.', 3000);
						return;
					}
					if (file.extension !== 'md') {
						new Notice('Active file is not a markdown note.', 3000);
						return;
					}
					if (this.plugin.settings.properties.filter(p => p.enabled).length === 0) {
						new Notice('No enabled properties to apply.', 3000);
						return;
					}
					await this.plugin.applyPropertiesToFile(file);
				}));
	}

	private renderPropertiesList(container: HTMLElement) {
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

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
