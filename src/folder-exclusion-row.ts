import { Setting } from 'obsidian';
import type { ExcludedFolder } from './types';
import { addMoveButtons } from './ui-utils';

export interface FolderExclusionCallbacks {
    onFolderChange: (value: string) => Promise<void>;
    onMoveUp: () => Promise<void>;
    onMoveDown: () => Promise<void>;
    onDelete: () => Promise<void>;
}

export interface FolderExclusionOptions {
    canMoveUp: boolean;
    canMoveDown: boolean;
}

/**
 * Creates an excluded folder row in the specified container
 */
export function createFolderExclusionRow(
    container: HTMLElement,
    excluded: ExcludedFolder,
    callbacks: FolderExclusionCallbacks,
    options: FolderExclusionOptions
): void {
    const setting = new Setting(container);
    setting.setClass('exclusion-item');
    setting.infoEl.remove();

    // Folder input
    setting.addSearch(cb => {
        cb.setPlaceholder('Folder path')
            .setValue(excluded.folder)
            .onChange(async (value) => {
                await callbacks.onFolderChange(value.trim());
            });

        cb.inputEl.style.flex = '1';
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
