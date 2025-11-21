// Storage utility functions for managing search engines and settings

const DEFAULT_SEARCH_ENGINES = [
  {
    id: 'youtube',
    type: 'search',
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=%s',
    shortcut: '',
    showInContextMenu: true,
    order: 0
  },
  {
    id: 'google',
    type: 'search',
    name: 'Google',
    url: 'https://www.google.com/search?q=%s',
    shortcut: '',
    showInContextMenu: true,
    order: 1
  },
  {
    id: 'imdb',
    type: 'search',
    name: 'IMDb',
    url: 'http://www.imdb.com/find?s=all&q=%s',
    shortcut: '',
    showInContextMenu: true,
    order: 2
  },
  {
    id: 'wikipedia',
    type: 'search',
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Special:Search?search=%s',
    shortcut: '',
    showInContextMenu: true,
    order: 3
  },
  {
    id: 'duckduckgo',
    type: 'search',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=%s',
    shortcut: '',
    showInContextMenu: true,
    order: 4
  }
];

const DEFAULT_SETTINGS = {
  searchEngines: DEFAULT_SEARCH_ENGINES,
  globalSettings: {
    openInNewTab: true
  }
};

// Initialize default settings if not present
async function initializeDefaults() {
  const result = await chrome.storage.local.get(['searchEngines', 'globalSettings']);
  
  if (!result.searchEngines || result.searchEngines.length === 0) {
    await chrome.storage.local.set({
      searchEngines: DEFAULT_SEARCH_ENGINES,
      globalSettings: result.globalSettings || DEFAULT_SETTINGS.globalSettings
    });
  } else if (!result.globalSettings) {
    await chrome.storage.local.set({
      globalSettings: DEFAULT_SETTINGS.globalSettings
    });
  }
}

// Get all search engines
async function getSearchEngines() {
  await initializeDefaults();
  const result = await chrome.storage.local.get('searchEngines');
  return result.searchEngines || [];
}

// Save search engines
async function saveSearchEngines(searchEngines) {
  await chrome.storage.local.set({ searchEngines });
}

// Get global settings
async function getGlobalSettings() {
  await initializeDefaults();
  const result = await chrome.storage.local.get('globalSettings');
  return result.globalSettings || DEFAULT_SETTINGS.globalSettings;
}

// Save global settings
async function saveGlobalSettings(settings) {
  await chrome.storage.local.set({ globalSettings: settings });
}

// Get all settings (for export)
async function getAllSettings() {
  await initializeDefaults();
  const result = await chrome.storage.local.get(['searchEngines', 'globalSettings']);
  return {
    searchEngines: result.searchEngines || [],
    globalSettings: result.globalSettings || DEFAULT_SETTINGS.globalSettings
  };
}

// Import settings (for import)
async function importSettings(settings) {
  if (settings.searchEngines && Array.isArray(settings.searchEngines)) {
    // Ensure all items have a type field for backward compatibility
    const normalizedEngines = settings.searchEngines.map(engine => {
      if (!engine.type) {
        // If no type, assume it's a search engine (old format)
        engine.type = 'search';
      }
      return engine;
    });
    
    await chrome.storage.local.set({
      searchEngines: normalizedEngines,
      globalSettings: settings.globalSettings || DEFAULT_SETTINGS.globalSettings
    });
  }
}

// Generate unique ID for new search engine
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
