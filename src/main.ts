import {
    Plugin,
    TFile,
    Notice,
    App,
    normalizePath,
    TAbstractFile,
    Menu,
    EventRef,
} from 'obsidian';
import type { Property, PropertyInfos, PropertyTypes } from './types/custom';
import type { GlobalProperty, PropertyType, AutoPropertiesSettings } from './types';
import { SettingsModal } from './settings-modal';
import { AutoPropertiesSettingTab } from './settings-tab';
import { DEFAULT_SETTINGS } from './constants';
import { canBeAppended, mergeIntoArrays, processPropertyValue } from './utils';

// Extend Obsidian types
declare module "obsidian" {
    interface Workspace {
        on(
            name: "search:results-menu",
            callback: (menu: Menu, leaf: any) => any,
            ctx?: any
        ): EventRef;
        on(
            name: "tab-group-menu",
            callback: (menu: Menu) => any,
            ctx?: any
        ): EventRef;
    }
    interface MetadataCache {
        getAllPropertyInfos(): PropertyInfos;
    }
}

export default class AutoPropertiesPlugin extends Plugin {
    settings: AutoPropertiesSettings;

    async onload() {
        await this.loadSettings();

        this.app.workspace.onLayoutReady(() => {
            // Add ribbon icon
            this.addRibbonIcon('settings', 'Auto Properties Settings', () => {
                new SettingsModal(this.app, this).open();
            });

            // Command: Open settings modal
            this.addCommand({
                id: 'open-settings-modal',
                name: 'Open settings modal',
                callback: () => {
                    new SettingsModal(this.app, this).open();
                }
            });

            // Command: Apply properties manually
            this.addCommand({
                id: 'apply-global-properties',
                name: 'Apply global properties to current note',
                checkCallback: (checking: boolean) => {
                    const file = this.app.workspace.getActiveFile();
                    if (file && file.extension === 'md') {
                        if (!checking) {
                            const enabledCount = this.settings.properties.filter(p => p.enabled).length;
                            if (enabledCount === 0) {
                                new Notice('No enabled properties to apply.', 3000);
                            } else {
                                this.applyPropertiesToFile(file);
                            }
                        }
                        return true;
                    }
                    return false;
                }
            });

            // Command: Toggle plugin
            this.addCommand({
                id: 'toggle-auto-properties',
                name: 'Toggle Auto Properties',
                callback: () => {
                    this.settings.enabled = !this.settings.enabled;
                    this.saveSettings();
                    new Notice(`Auto Properties ${this.settings.enabled ? 'enabled' : 'disabled'}`);
                }
            });

            // Event: File creation
            this.registerEvent(
                this.app.vault.on('create', (file) => {
                    this.handleFileEvent(file);
                })
            );

            // Event: File rename
            this.registerEvent(
                this.app.vault.on('rename', (file, oldPath) => {
                    // Only handle renames from templates/untitled
                    if (oldPath.includes('Untitled') || (file instanceof TFile && file.basename === 'Untitled')) {
                        this.handleFileEvent(file);
                    }
                })
            );

            // Settings tab
            this.addSettingTab(new AutoPropertiesSettingTab(this.app, this));
        });
    }

    onunload() { }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private handleFileEvent(file: TAbstractFile) {
        if (!this.settings.enabled || this.settings.properties.length === 0) return;
        if (!(file instanceof TFile) || file.extension !== 'md') return;

        setTimeout(async () => {
            await this.applyPropertiesToFile(file);
        }, this.settings.delayAfterCreate);
    }

    private isExcluded(file: TFile, cache: any): boolean {
        if (!cache || this.settings.exclusionRules.length === 0) return false;

        for (const rule of this.settings.exclusionRules) {
            const value = rule.value.trim();
            if (!value) continue;

            if (rule.type === 'tag') {
                // Normalize tag format
                const normalizedTag = value.startsWith('#') ? value.substring(1) : value;

                // Check inline tags
                const inlineTags = cache.tags?.map((t: any) => t.tag.replace('#', '')) || [];
                // Check frontmatter tags
                const frontmatterTags = cache.frontmatter?.tags || [];
                const allTags = [...inlineTags, ...frontmatterTags].map((t: string) =>
                    typeof t === 'string' ? t.replace('#', '') : t
                );

                if (allTags.some((tag: string) => tag === normalizedTag)) {
                    return true;
                }
            } else if (rule.type === 'property') {
                if (!cache.frontmatter) continue;

                // Check if it's key:value or just key
                const colonIndex = value.indexOf(':');

                if (colonIndex === -1) {
                    // Just key - check existence
                    if (cache.frontmatter[value] !== undefined) {
                        return true;
                    }
                } else {
                    // key:value - check value match
                    const propKey = value.substring(0, colonIndex).trim();
                    const propValue = value.substring(colonIndex + 1).trim();

                    if (!propKey) continue;

                    const fmValue = cache.frontmatter[propKey];
                    if (fmValue !== undefined) {
                        if (Array.isArray(fmValue)) {
                            if (fmValue.some(v => String(v) === propValue)) return true;
                        } else if (String(fmValue) === propValue) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    public async applyPropertiesToFile(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);

        // Check exclusion rules
        if (this.isExcluded(file, cache)) {
            return;
        }

        const enabledProperties = this.settings.properties.filter(p => p.enabled);
        if (enabledProperties.length === 0) return;

        const allPropertyInfos = this.app.metadataCache.getAllPropertyInfos?.() || {};
        let propertiesAdded = 0;

        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            for (const prop of enabledProperties) {
                const propName = prop.name.trim();
                if (!propName) continue;

                const systemType = allPropertyInfos[propName.toLowerCase()]?.widget as PropertyTypes;
                const processedValue = processPropertyValue(prop.value, prop.type);

                // Overwrite or doesn't exist
                if (!frontmatter[propName] || prop.overwrite) {
                    frontmatter[propName] = processedValue;
                    propertiesAdded++;
                    continue;
                }

                // Merge arrays if types allow it
                if (canBeAppended(prop.type, systemType) && processedValue) {
                    if (frontmatter[propName] !== processedValue) {
                        frontmatter[propName] = mergeIntoArrays(frontmatter[propName], processedValue);
                        propertiesAdded++;
                    }
                }
            }

            if (propertiesAdded > 0 && this.settings.showNotifications) {
                new Notice(`Added ${propertiesAdded} properties to "${file.basename}"`);
            }
        });
    }

    // Public methods for use in settings UI
    public async addProperty(property: GlobalProperty) {
        this.settings.properties.push(property);
        await this.saveSettings();
    }

    public async updateProperty(index: number, property: GlobalProperty) {
        this.settings.properties[index] = property;
        await this.saveSettings();
    }

    public async removeProperty(index: number) {
        this.settings.properties.splice(index, 1);
        await this.saveSettings();
    }

    public async moveProperty(fromIndex: number, toIndex: number) {
        if (toIndex < 0 || toIndex >= this.settings.properties.length) return;

        const [property] = this.settings.properties.splice(fromIndex, 1);
        this.settings.properties.splice(toIndex, 0, property);
        await this.saveSettings();
    }
}

export type { GlobalProperty, PropertyType, AutoPropertiesSettings };
