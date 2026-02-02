# Auto Properties

Automatically add configured frontmatter properties to new notes in Obsidian. Define global properties once and apply them to all new notes, with flexible exclusion rules.

## Features

- ✨ **Automatic property addition** - Properties are added when creating or renaming notes
- 🎯 **Flexible exclusion rules** - Exclude notes by tags or frontmatter properties
- 🔧 **Multiple property types** - Support for text, multitext, number, checkbox, date, datetime, tags, and aliases
- 🎨 **Easy management** - Quick settings modal and full settings tab
- ⚡ **Smart merging** - Merge arrays for compatible property types without duplicates
- 🚀 **Manual application** - Apply properties on-demand via command palette
- 💾 **Configurable delay** - Adjust timing for template compatibility

## Installation

### From Obsidian Community Plugins

This plugin is not yet available in the Obsidian community plugins.

<!-- 1. Open **Settings** → **Community plugins**
2. Click **Browse** and search for "Auto Properties"
3. Click **Install** and then **Enable** -->


### Installing using BRAT

### Installing the plugin using Obsidian42-BRAT

1. Install **Obsidian42-BRAT** from **Settings → Community plugins**.  
2. Copy the plugin repository URL: https://github.com/Frank-C0/obsidian-auto-properties  
3. Open the command palette and run **BRAT: Add a beta plugin for testing**.  
4. Paste the URL into the modal and click **Add Plugin**. Wait for confirmation.  
5. Go to **Settings → Community plugins**, refresh the list, and enable **Auto Properties**.

Update: Use the command **Check for updates to all beta plugins** or enable automatic updates in the **Obsidian42-BRAT** tab in Settings.


### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Frank-C0/obsidian-auto-properties/releases)
2. Create a folder named `auto-properties` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Reload Obsidian
5. Enable the plugin in **Settings** → **Community plugins**

## Examples

### Example 1: Basic Note Metadata

Configure these properties:
```yaml
status: draft       (text)
author: Your Name   (text)
```

Every new note will automatically have:
```yaml
---
status: draft
author: Your Name
---
```

### Example 2: Tags and Organization

Configure:
```yaml
tags: note, unprocessed    (tags)
tags: project_1            tags)
tags: subproject_1         (tags)
topics: topic_A            (multitext)
topics: topic_B            (multitext)
type: standard             (text)
priority: 3                (number)
```

Result:
```yaml
---
tags:
  - note
  - unprocessed
  - project_1
  - subproject_1
topics:
  - topic_A
  - topic_B
type: standard
priority: 3
---
```

## Use Cases

- **Project Management**: Add status, priority, and project tags (even after a template is applied)
- **Zettelkasten**: Add creation date, ID, and knowledge type
- **Content Creation**: Add author, status, and publication metadata
- **Templates**: Works seamlessly with template plugins (adjust delay if needed)



## Usage

### Quick Start

1. Click the ribbon icon or use the command palette to open **Auto Properties Settings**
2. Click **+ Add Property** to create your first global property
3. Configure:
   - **Name**: Property key (e.g., `status`, `created`, `tags`)
   - **Type**: Property type (text, number, date, etc.)
   - **Value**: Default value to apply
   - **Enabled**: Toggle to enable/disable
   - **Overwrite**: Whether to replace existing values
4. Properties are automatically applied when creating new notes. They can also be applied manually with the _"Apply global properties to current note"_ command.

### Property Types

| Type | Description | Example Value |
|------|-------------|---------------|
| **text** | Single line text | `"draft"` |
| **multitext** | Multiple text values | `"value1, value2"` |
| **number** | Numeric value | `42` |
| **checkbox** | Boolean value | `true` or `false` |
| **date** | Date in YYYY-MM-DD format | `2024-01-15` or `"today"` |
| **datetime** | Date with time | `2024-01-15` or `"now"` |
| **tags** | List of tags | `"tag1, tag2"` |
| **aliases** | List of aliases | `"alias1, alias2"` |

### Exclusion Rules

Prevent auto-properties from being applied to specific notes:

#### By folder
Add an exclusion rule with a route of a **Folder**:
- `templates` - Excludes notes in the `templates` folder
- `daily` - Excludes notes in the `daily` folder

#### By Tag
Add an exclusion rule with type **Tag** and value:
- `#template` or `template` - Excludes notes with this tag

#### By Property
Add an exclusion rule with type **Property** and value:
- `status:archived` - Excludes notes where `status` equals `archived`
- `template` - Excludes notes that have a `template` property (any value)

### Commands

- **Open settings modal** - Quick access to property management
- **Apply global properties to current note** - Manually apply properties to active note
- **Toggle Auto Properties** - Enable/disable automatic application


## Tips

1. **Template Compatibility**: If properties aren't applying after template insertion, increase the delay in settings (try 300-1000ms)
2. **Array Merging**: For compatible types (text, multitext, tags, aliases), values are merged without duplicates
3. **Overwrite Option**: Enable to replace existing property values instead of merging
4. **Quick Toggle**: Disable a property temporarily without deleting it
5. **Manual Application**: Use the command to apply properties to existing notes

## Compatibility

- **Obsidian**: Requires v0.15.0 or higher
- **Mobile**: Supported on iOS and Android
- **Templates**: Compatible with core templates and community template plugins
- **Other Plugins**: Works alongside other property/frontmatter plugins. Note that plugins monitoring frontmatter at creation may cause redundant update triggers or multiple notifications, but internal collision management ensures the final data remains consistent.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Attributions

This plugin was developed by studying and adapting code from several excellent open-source projects:

- **[Obsidian Auto Note Mover](https://github.com/farux/obsidian-auto-note-mover)** by [farux](https://github.com/farux): Inspired the plugin structure, event handling, and exclusion logic.
- **[Obsidian Multi Properties](https://github.com/technohiker/obsidian-multi-properties)** by [technohiker](https://github.com/technohiker): Provided the core property manipulation and merging logic.
- **[Obsidian Quick Tagger](https://github.com/Gorkycreator/obsidian-quick-tagger)** by [Gorkycreator](https://github.com/Gorkycreator): Contributed the tag cleaning logic.

For more details, see [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

## License

MIT License - See [LICENSE](LICENSE) for details.