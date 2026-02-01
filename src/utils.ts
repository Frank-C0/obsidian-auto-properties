/**
 * DEPRECATED
 * 
 * Logic has been moved to:
 * - src/frontmatter.ts: Property merging and appending logic
 * - src/helpers.ts: Property value processing and tag cleaning
 * 
 * This file is kept temporarily to avoid build errors during transition and will be removed in future updates.
 */

// Re-export for backward compatibility if needed, though main.ts uses new locations.
export * from './frontmatter';
export * from './helpers';
