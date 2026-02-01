# Attributions and Acknowledgements

This plugin, **Obsidian Auto Properties**, was developed by studying and adapting code from the following excellent open-source projects. We are grateful to their authors for their work.

## Projects Referenced

### [Obsidian Auto Note Mover](https://github.com/farux/obsidian-auto-note-mover)
- **Author**: [farux](https://github.com/farux)
- **License**: [MIT](https://github.com/farux/obsidian-auto-note-mover/blob/main/LICENSE)
- **Usage**:
  - The plugin structure and event handling logic (`handleFileEvent`, `createPropertyHeaders` UI concepts) were inspired by this plugin.
  - The tag exclusion logic and settings UI patterns were adapted from this codebase.

### [Obsidian Multi Properties](https://github.com/technohiker/obsidian-multi-properties)
- **Author**: [technohiker](https://github.com/technohiker)
- **License**: [MIT](https://github.com/technohiker/obsidian-multi-properties/blob/master/LICENSE)
- **Usage**:
  - The core property manipulation logic in `src/frontmatter.ts` (`canBeAppended`, `mergeIntoArrays`) is based on this plugin's implementation.
  - The `src/helpers.ts` utilities for cleaning tags are adapted from this project (which in turn credits `obsidian-quick-tagger`).

### [Obsidian Quick Tagger](https://github.com/Gorkycreator/obsidian-quick-tagger)
- **Author**: [Gorkycreator](https://github.com/Gorkycreator)
- **Usage**:
  - The `cleanTags` function logic originated here.

## License

This project is licensed under the MIT License.
