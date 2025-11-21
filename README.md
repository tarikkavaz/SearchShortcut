# Search Shortcuts Chrome Extension

A Chrome extension that allows you to quickly search selected text using keyboard shortcuts or context menu.

## Features

- **Keyboard Shortcuts**: Select text and press a fixed shortcut (Alt+Shift+1-4) to search with your preferred engine
- **Context Menu**: Right-click on selected text and choose a search engine from the menu
- **Customizable Search Engines**: Add, edit, and remove search engines with custom URLs
- **Separators**: Add visual separators in the context menu to organize your search engines
- **Drag & Drop Reordering**: Reorder search engines with visual insertion indicators showing where items will land
- **Dark Mode**: Automatic dark/light mode that respects your system preferences, with manual toggle
- **Import/Export Settings**: Backup and restore your configuration
- **Cross-Platform**: Automatically adapts keyboard shortcuts for Mac and Windows/Linux

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `SearchShortcut` directory

## Usage

### Keyboard Shortcuts

1. Select text on any webpage
2. Press `Alt+Shift+1` through `Alt+Shift+4` to search with the first 4 search engines (based on their order)
3. A new tab/window will open with the search results
4. The shortcuts map to the first 4 non-separator search engines by their order in the list

### Context Menu

1. Select text on any webpage
2. Right-click to open the context menu
3. Choose "Search with..." and select your preferred search engine

### Settings

1. Right-click the extension icon and select "Options"
2. Or navigate to `chrome://extensions/`, find "Search Shortcuts", and click "Options"

#### Managing Search Engines

- **Add**: Click "Add Search Engine" and fill in the name, URL (with `%s` placeholder)
- **Add Separator**: Click "Add Separator" to add a visual separator in the context menu
- **Edit**: Click "Edit" on any search engine (separators cannot be edited)
- **Delete**: Click "Delete" on any search engine or separator
- **Reorder**: Drag and drop search engines to reorder them - a blue line shows where the item will be inserted
- **Context Menu**: Toggle "Show in menu" to control which engines appear in the context menu (separators are always visible)

#### Keyboard Shortcuts

- Shortcuts are fixed: `Alt+Shift+1`, `Alt+Shift+2`, `Alt+Shift+3`, `Alt+Shift+4`
- These map to the first 4 search engines (excluding separators) based on their order
- Reorder engines to change which engine each shortcut triggers
- Only the first 4 engines have shortcuts (Chrome extension limitation)
- To customize shortcuts beyond reordering, go to `chrome://extensions/shortcuts`

#### Import/Export

- **Export**: Click "Export Settings" to download a JSON file with your configuration
- **Import**: Click "Import Settings" and select a previously exported JSON file

## Default Search Engines

The extension comes with these default search engines (all editable and removable):

- YouTube
- Google
- IMDb
- Wikipedia
- DuckDuckGo

## Technical Details

- Built with Chrome Extension Manifest V3
- Uses Chrome Storage API for persistence
- Supports up to 4 keyboard shortcuts (Chrome limitation - only first 4 non-separator search engines can have shortcuts)
- Unlimited search engines via context menu
- Dark mode support with system preference detection
- Cross-platform modifier key detection

## File Structure

```
SearchShortcut/
├── manifest.json       # Extension manifest
├── background.js       # Service worker for shortcuts and context menu
├── content.js          # Content script for selected text
├── storage.js          # Storage utility functions
├── options.html        # Settings page HTML
├── options.js          # Settings page logic
├── options.css         # Settings page styles
├── icons/              # Extension icons
└── README.md           # This file
```

## License

MIT
