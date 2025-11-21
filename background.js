// Background service worker for Search Shortcuts extension

importScripts('storage.js');

// Detect OS platform
function getPlatform() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) {
    return 'mac';
  }
  return 'windows'; // Default to Windows/Linux
}

const platform = getPlatform();
const isMac = platform === 'mac';

// Get selected text from active tab
async function getSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return '';
    
    // Skip chrome:// and chrome-extension:// URLs (like options page)
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      return '';
    }
    
    // Try to get selected text via content script message
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
      return response?.text || '';
    } catch (error) {
      // Fallback to scripting API if content script isn't ready
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            return window.getSelection().toString().trim();
          }
        });
        return results[0]?.result || '';
      } catch (scriptError) {
        // Can't access this page (e.g., chrome:// pages)
        return '';
      }
    }
  } catch (error) {
    // Silently fail - not all pages are accessible
    return '';
  }
}

// Open search URL
async function openSearchUrl(url, query) {
  const searchUrl = url.replace('%s', encodeURIComponent(query));
  const settings = await getGlobalSettings();
  
  if (settings.openInNewTab) {
    await chrome.tabs.create({ url: searchUrl });
  } else {
    await chrome.windows.create({ url: searchUrl });
  }
}

// Build context menu from search engines
let isBuildingContextMenu = false;

// Helper to create context menu item with promise
function createContextMenuItem(options) {
  return new Promise((resolve) => {
    chrome.contextMenus.create(options, () => {
      if (chrome.runtime.lastError) {
        // Ignore duplicate ID errors
        if (chrome.runtime.lastError.message.includes('duplicate id')) {
          // Silently ignore - item already exists
        } else {
          console.error('Error creating context menu item:', chrome.runtime.lastError);
        }
      }
      resolve();
    });
  });
}

async function buildContextMenu() {
  // Prevent concurrent builds
  if (isBuildingContextMenu) {
    return;
  }
  
  isBuildingContextMenu = true;
  
  try {
    // Remove all existing context menu items
    await chrome.contextMenus.removeAll();
    
    // Small delay to ensure removal completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const searchEngines = await getSearchEngines();
    const sortedItems = searchEngines
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Filter visible items (engines with showInContextMenu=true, or separators which are always visible)
    const visibleItems = sortedItems.filter(item => {
      // Separators are always visible
      if (item.type === 'separator') {
        return true;
      }
      // Regular search engines need showInContextMenu to be true
      return item.showInContextMenu !== false;
    });
    
    if (visibleItems.length === 0) {
      isBuildingContextMenu = false;
      return;
    }
    
    // Create parent menu
    await createContextMenuItem({
      id: 'search-shortcuts-parent',
      title: 'Search with...',
      contexts: ['selection']
    });
    
    // Add each item (engine or separator)
    for (const item of visibleItems) {
      if (item.type === 'separator') {
        // Create separator in context menu
        try {
          await createContextMenuItem({
            id: `separator-${item.id}`,
            parentId: 'search-shortcuts-parent',
            type: 'separator',
            contexts: ['selection']
          });
        } catch (error) {
          console.error('Error creating separator:', error);
        }
      } else {
        await createContextMenuItem({
          id: `search-engine-${item.id}`,
          parentId: 'search-shortcuts-parent',
          title: item.name,
          contexts: ['selection']
        });
      }
    }
    
    // Add separator before options
    await createContextMenuItem({
      id: 'search-shortcuts-separator',
      parentId: 'search-shortcuts-parent',
      type: 'separator',
      contexts: ['selection']
    });
    
    // Add options link
    await createContextMenuItem({
      id: 'search-shortcuts-options',
      parentId: 'search-shortcuts-parent',
      title: 'Options...',
      contexts: ['selection']
    });
  } finally {
    isBuildingContextMenu = false;
  }
}

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('search-engine-')) {
    const engineId = info.menuItemId.replace('search-engine-', '');
    const searchEngines = await getSearchEngines();
    const engine = searchEngines.find(e => e.id === engineId);
    
    if (engine && info.selectionText) {
      await openSearchUrl(engine.url, info.selectionText);
    }
  } else if (info.menuItemId === 'search-shortcuts-options') {
    // Open options page
    chrome.runtime.openOptionsPage();
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command.startsWith('search-')) {
    const index = parseInt(command.replace('search-', '')) - 1;
    const searchEngines = await getSearchEngines();
    // Filter out separators and sort
    const sortedEngines = searchEngines
      .filter(e => e.type !== 'separator')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const engine = sortedEngines[index];
    
    if (engine) {
      const selectedText = await getSelectedText();
      if (selectedText) {
        await openSearchUrl(engine.url, selectedText);
      }
    }
  }
});

// Note: Chrome commands are fixed in manifest.json
// The shortcuts Alt+Shift+1 through Alt+Shift+4 are mapped to the first 4 search engines
// Users can customize these in chrome://extensions/shortcuts

// Listen for storage changes to rebuild context menu
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.searchEngines) {
    await buildContextMenu();
  }
});

// Initialize on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaults();
  await buildContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  await buildContextMenu();
});

// Initial setup when service worker starts (if extension already installed)
(async () => {
  // Check if we have existing data (extension already installed)
  const result = await chrome.storage.local.get('searchEngines');
  if (result.searchEngines && result.searchEngines.length > 0) {
    // Extension already installed, just rebuild menus
    await buildContextMenu();
  } else {
    // First time install - will be handled by onInstalled
    await initializeDefaults();
    await buildContextMenu();
  }
})();
