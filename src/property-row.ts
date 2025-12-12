import { Setting } from 'obsidian';
import type { GlobalProperty, PropertyType } from './types';
import { PROPERTY_TYPES } from './constants';

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
	const propertyEl = container.createDiv('property-item');
	propertyEl.style.display = 'flex';
	propertyEl.style.alignItems = 'center';
	propertyEl.style.gap = '8px';
	propertyEl.style.marginBottom = '10px';
	propertyEl.style.padding = '10px';
	propertyEl.style.border = '1px solid var(--background-modifier-border)';
	propertyEl.style.borderRadius = '5px';
	propertyEl.style.backgroundColor = 'var(--background-primary)';

	// Enabled checkbox
	const enabledToggle = createEl('input', { type: 'checkbox' });
	enabledToggle.checked = property.enabled;
	enabledToggle.title = 'Enable/Disable';
	enabledToggle.style.cursor = 'pointer';
	enabledToggle.addEventListener('change', async () => {
		await callbacks.onEnabledChange(enabledToggle.checked);
		updateRowVisualState(propertyEl, enabledToggle.checked);
	});

	// Name input
	const nameInput = createEl('input', { 
		type: 'text', 
		placeholder: 'Property name',
		cls: 'modal-input'
	});
	nameInput.value = property.name;
	nameInput.style.flex = '2';
	nameInput.style.minWidth = '120px';
	nameInput.addEventListener('blur', async () => {
		const trimmed = nameInput.value.trim();
		if (trimmed !== property.name) {
			nameInput.value = trimmed;
			await callbacks.onNameChange(trimmed);
		}
		if (!trimmed) {
			nameInput.style.borderColor = 'var(--text-error)';
		} else {
			nameInput.style.borderColor = '';
		}
	});

	// Type select
	const typeSelect = createEl('select', { cls: 'dropdown' });
	PROPERTY_TYPES.forEach(type => {
		const option = createEl('option', { value: type, text: type });
		typeSelect.appendChild(option);
	});
	typeSelect.value = property.type;
	typeSelect.style.flex = '1';
	typeSelect.style.minWidth = '100px';
	typeSelect.addEventListener('change', async () => {
		await callbacks.onTypeChange(typeSelect.value);
	});

	// Value input
	const valueInput = createEl('input', { 
		type: 'text', 
		placeholder: getPlaceholderForType(property.type),
		cls: 'modal-input'
	});
	valueInput.value = property.value?.toString() || '';
	valueInput.style.flex = '2';
	valueInput.style.minWidth = '120px';
	valueInput.addEventListener('blur', async () => {
		const trimmed = valueInput.value.trim();
		if (trimmed !== property.value?.toString()) {
			valueInput.value = trimmed;
			await callbacks.onValueChange(trimmed);
		}
	});

	// Overwrite checkbox
	const overwriteToggle = createEl('input', { type: 'checkbox' });
	overwriteToggle.checked = property.overwrite;
	overwriteToggle.title = 'Overwrite if exists';
	overwriteToggle.style.cursor = 'pointer';
	overwriteToggle.addEventListener('change', async () => {
		await callbacks.onOverwriteChange(overwriteToggle.checked);
	});

	// Actions container
	const actionsDiv = createEl('div');
	actionsDiv.style.display = 'flex';
	actionsDiv.style.gap = '4px';
	actionsDiv.style.alignItems = 'center';
	actionsDiv.style.minWidth = '100px';

	// Move up button
	const upButton = createEl('button', { 
		text: '↑',
		cls: 'clickable-icon'
	});
	upButton.title = 'Move up';
	upButton.style.padding = '4px 8px';
	upButton.disabled = !options.canMoveUp;
	if (!options.canMoveUp) {
		upButton.style.opacity = '0.3';
		upButton.style.cursor = 'not-allowed';
	}
	upButton.addEventListener('click', async () => {
		if (options.canMoveUp) {
			await callbacks.onMoveUp();
		}
	});

	// Move down button
	const downButton = createEl('button', { 
		text: '↓',
		cls: 'clickable-icon'
	});
	downButton.title = 'Move down';
	downButton.style.padding = '4px 8px';
	downButton.disabled = !options.canMoveDown;
	if (!options.canMoveDown) {
		downButton.style.opacity = '0.3';
		downButton.style.cursor = 'not-allowed';
	}
	downButton.addEventListener('click', async () => {
		if (options.canMoveDown) {
			await callbacks.onMoveDown();
		}
	});

	// Delete button
	const deleteButton = createEl('button', { 
		text: '×',
		cls: 'clickable-icon'
	});
	deleteButton.title = 'Delete';
	deleteButton.style.padding = '4px 8px';
	deleteButton.style.color = 'var(--text-error)';
	deleteButton.style.fontWeight = 'bold';
	deleteButton.addEventListener('click', async () => {
		await callbacks.onDelete();
	});

	// Append all elements
	actionsDiv.appendChild(upButton);
	actionsDiv.appendChild(downButton);
	actionsDiv.appendChild(deleteButton);

	propertyEl.appendChild(enabledToggle);
	propertyEl.appendChild(nameInput);
	propertyEl.appendChild(typeSelect);
	propertyEl.appendChild(valueInput);
	propertyEl.appendChild(overwriteToggle);
	propertyEl.appendChild(actionsDiv);

	// Apply initial visual state
	updateRowVisualState(propertyEl, property.enabled);
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
 * Crea los encabezados de columna para la lista de propiedades
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
	enabledHeader.style.width = '20px';
	enabledHeader.style.textAlign = 'center';
	enabledHeader.title = 'Enabled';

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
	overwriteHeader.style.width = '20px';
	overwriteHeader.style.textAlign = 'center';
	overwriteHeader.title = 'Overwrite';

	const actionsHeader = headersDiv.createEl('span', { text: 'Actions' });
	actionsHeader.style.minWidth = '100px';
	actionsHeader.style.textAlign = 'center';
}
