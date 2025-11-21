# Search Shortcuts Chrome Extension

A Chrome extension that allows you to quickly search selected text using keyboard shortcuts or context menu.

## Features

- **Keyboard Shortcuts**: Select text and press a customizable shortcut to search with your preferred engine
- **Context Menu**: Right-click on selected text and choose a search engine from the menu
- **Customizable Search Engines**: Add, edit, and remove search engines with custom URLs
- **Drag & Drop Reordering**: Reorder search engines for the context menu
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
2. Press your configured keyboard shortcut (e.g., `Shift+Alt+1` for the first search engine)
3. A new tab/window will open with the search results

### Context Menu

1. Select text on any webpage
2. Right-click to open the context menu
3. Choose "Search with..." and select your preferred search engine

### Settings

1. Right-click the extension icon and select "Options"
2. Or navigate to `chrome://extensions/`, find "Search Shortcuts", and click "Options"

#### Managing Search Engines

- **Add**: Click "Add Search Engine" and fill in the name, URL (with `%s` placeholder), and optional shortcut
- **Edit**: Click "Edit" on any search engine
- **Delete**: Click "Delete" on any search engine
- **Reorder**: Drag and drop search engines to reorder them
- **Context Menu**: Toggle "Show in menu" to control which engines appear in the context menu

#### Keyboard Shortcuts

- Shortcuts use the format: `Modifier+Modifier+Key`
- Modifiers: `Shift`, `Alt` (Option on Mac), `Ctrl` (Command on Mac)
- Keys: Numbers (1-9) or letters
- Example: `Shift+Alt+1` or `Shift+Option+1` (Mac)

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
- Supports up to 4 keyboard shortcuts (Chrome limitation - only first 4 search engines can have shortcuts)
- Unlimited search engines via context menu
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
