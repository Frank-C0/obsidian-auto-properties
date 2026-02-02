import { Setting } from 'obsidian';

/**
 * Add move up/down buttons to a setting
 */
export function addMoveButtons(
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
                if (canMoveUp) await onMoveUp();
            });
        if (!canMoveUp) button.extraSettingsEl.style.opacity = '0.5';
    });

    setting.addExtraButton(button => {
        button
            .setIcon('down-chevron-glyph')
            .setTooltip('Move down')
            .setDisabled(!canMoveDown)
            .onClick(async () => {
                if (canMoveDown) await onMoveDown();
            });
        if (!canMoveDown) button.extraSettingsEl.style.opacity = '0.5';
    });
}

/**
 * Updates the visual state of a row based on whether it is enabled
 */
export function updateRowVisualState(rowElement: HTMLElement, enabled: boolean): void {
    if (!enabled) {
        rowElement.style.opacity = '0.5';
    } else {
        rowElement.style.opacity = '1';
    }
}
