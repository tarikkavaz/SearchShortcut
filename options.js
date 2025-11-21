// Options page logic for Search Shortcuts extension

// Detect OS platform
function getPlatform() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) {
    return 'mac';
  }
  return 'windows';
}

const platform = getPlatform();
const isMac = platform === 'mac';

// Get modifier key names for display
function getModifierNames() {
  return {
    shift: 'Shift',
    alt: isMac ? 'Option' : 'Alt',
    ctrl: isMac ? 'Command' : 'Ctrl',
    meta: isMac ? 'Command' : 'Ctrl'
  };
}

// State
let searchEngines = [];
let editingEngineId = null;
let draggedElement = null;

// DOM elements
const enginesList = document.getElementById('enginesList');
const addEngineBtn = document.getElementById('addEngineBtn');
const engineModal = document.getElementById('engineModal');
const modalTitle = document.getElementById('modalTitle');
const engineForm = document.getElementById('engineForm');
const modalClose = document.getElementById('modalClose');
const cancelBtn = document.getElementById('cancelBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const openInTab = document.getElementById('openInTab');
const openInWindow = document.getElementById('openInWindow');

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Dark mode toggle
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;
  
  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    html.classList.add('dark');
    updateThemeIcon(true);
  } else {
    html.classList.remove('dark');
    updateThemeIcon(false);
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        html.classList.add('dark');
        updateThemeIcon(true);
      } else {
        html.classList.remove('dark');
        updateThemeIcon(false);
      }
    }
  });
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeIcon(isDark);
    });
  }
}

function updateThemeIcon(isDark) {
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (isDark) {
      // Moon icon (dark mode active, show sun)
      themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    } else {
      // Sun icon (light mode active, show moon)
      themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    }
  }
}

// Load and render search engines
async function loadSearchEngines() {
  searchEngines = await getSearchEngines();
  searchEngines.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderEngines();
}

// Render search engines list
function renderEngines() {
  if (searchEngines.length === 0) {
    enginesList.innerHTML = '<div class="empty-state"><p>No search engines configured. Click "Add Search Engine" to get started.</p></div>';
    return;
  }

  // Sort items by order for display
  const sortedItems = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
  const mods = getModifierNames();
  
  // Count non-separator items for shortcut badges
  let engineIndex = 0;

  enginesList.innerHTML = sortedItems.map((item) => {
    if (item.type === 'separator') {
      return `
        <div class="engine-item separator-item" data-id="${item.id}" draggable="true">
          <div class="drag-handle">☰</div>
          <div class="engine-info">
            <div class="engine-name separator-name">━━━ Separator ━━━</div>
          </div>
          <div class="engine-actions">
            <button class="btn btn-danger delete-engine-btn" data-engine-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    } else {
      const shortcutBadge = engineIndex < 4 ? ` <span class="shortcut-badge">${mods.alt}+Shift+${engineIndex + 1}</span>` : ' <span class="no-shortcut-label">(no shortcut)</span>';
      engineIndex++;
      return `
        <div class="engine-item" data-id="${item.id}" draggable="true">
          <div class="drag-handle">☰</div>
          <div class="engine-info">
            <div class="engine-name">${escapeHtml(item.name)}${shortcutBadge}</div>
            <div class="engine-url">${escapeHtml(item.url)}</div>
          </div>
          <div class="engine-actions">
            <label>
              <input type="checkbox" class="context-menu-toggle checkbox-input" data-engine-id="${item.id}" ${item.showInContextMenu !== false ? 'checked' : ''}>
              <span>Show in menu</span>
            </label>
            <button class="btn btn-edit edit-engine-btn" data-engine-id="${item.id}">Edit</button>
            <button class="btn btn-danger delete-engine-btn" data-engine-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }
  }).join('');

  // Attach drag and drop handlers
  attachDragAndDrop();
  
  // Attach event listeners for buttons and checkboxes
  attachEngineEventListeners();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach drag and drop functionality
function attachDragAndDrop() {
  const items = enginesList.querySelectorAll('.engine-item');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
  });
}

let insertionPosition = null; // 'above' or 'below'

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
  insertionPosition = null;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  const items = enginesList.querySelectorAll('.engine-item');
  items.forEach(item => {
    item.classList.remove('drag-over-top', 'drag-over-bottom');
  });
  insertionPosition = null;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  if (this !== draggedElement) {
    const rect = this.getBoundingClientRect();
    const mouseY = e.clientY;
    const itemCenterY = rect.top + rect.height / 2;
    
    // Determine if insertion should be above or below based on mouse position
    const shouldInsertAbove = mouseY < itemCenterY;
    
    // Remove all drag-over classes first
    const items = enginesList.querySelectorAll('.engine-item');
    items.forEach(item => {
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    // Add the appropriate class
    if (shouldInsertAbove) {
      this.classList.add('drag-over-top');
      insertionPosition = 'above';
      this.dataset.insertPosition = 'above';
    } else {
      this.classList.add('drag-over-bottom');
      insertionPosition = 'below';
      this.dataset.insertPosition = 'below';
    }
  }
  
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    // Don't add classes here, let dragover handle it
  }
}

function handleDragLeave(e) {
  // Only remove if we're actually leaving the element
  // Check if relatedTarget is not a child of this element
  if (!this.contains(e.relatedTarget)) {
    this.classList.remove('drag-over-top', 'drag-over-bottom');
  }
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedElement !== this) {
    const draggedId = draggedElement.dataset.id;
    const targetId = this.dataset.id;
    
    const draggedIndex = searchEngines.findIndex(e => e.id === draggedId);
    const targetIndex = searchEngines.findIndex(e => e.id === targetId);
    
    // Determine insertion position
    const insertAbove = insertionPosition === 'above' || this.dataset.insertPosition === 'above';
    
    // Remove dragged item first to simplify index calculations
    const [removed] = searchEngines.splice(draggedIndex, 1);
    
    // Calculate insertion index in the modified array (after removal)
    let insertIndex;
    if (draggedIndex < targetIndex) {
      // Dragged item was before target, so target index decreased by 1
      const newTargetIndex = targetIndex - 1;
      insertIndex = insertAbove ? newTargetIndex : newTargetIndex + 1;
    } else {
      // Dragged item was after target, target index unchanged
      insertIndex = insertAbove ? targetIndex : targetIndex + 1;
    }
    
    // Clamp to valid array bounds
    insertIndex = Math.max(0, Math.min(insertIndex, searchEngines.length));
    
    // Ensure insertIndex is within bounds
    insertIndex = Math.max(0, Math.min(insertIndex, searchEngines.length));
    
    // Insert at calculated position
    searchEngines.splice(insertIndex, 0, removed);
    
    // Update order values
    searchEngines.forEach((engine, index) => {
      engine.order = index;
    });
    
    // Save and re-render
    saveEngines();
  }

  // Clean up
  const items = enginesList.querySelectorAll('.engine-item');
  items.forEach(item => {
    item.classList.remove('drag-over-top', 'drag-over-bottom');
    delete item.dataset.insertPosition;
  });
  insertionPosition = null;
  
  return false;
}

// Attach event listeners to engine items
function attachEngineEventListeners() {
  // Context menu toggles
  enginesList.querySelectorAll('.context-menu-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const engineId = e.target.dataset.engineId;
      const show = e.target.checked;
      await toggleContextMenu(engineId, show);
    });
  });
  
  // Edit buttons
  enginesList.querySelectorAll('.edit-engine-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const engineId = e.target.dataset.engineId;
      editEngine(engineId);
    });
  });
  
  // Delete buttons
  enginesList.querySelectorAll('.delete-engine-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const engineId = e.target.dataset.engineId;
      deleteEngine(engineId);
    });
  });
}

// Toggle context menu visibility
async function toggleContextMenu(engineId, show) {
  const engine = searchEngines.find(e => e.id === engineId);
  if (engine && engine.type !== 'separator') {
    engine.showInContextMenu = show;
    await saveEngines();
  }
}

// Get shortcut mapping for an engine
function getShortcutMapping(engineId) {
  const sortedItems = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
  // Filter out separators to get engine index
  const enginesOnly = sortedItems.filter(e => e.type !== 'separator');
  const index = enginesOnly.findIndex(e => e.id === engineId);
  
  if (index >= 0 && index < 4) {
    const mods = getModifierNames();
    return `${mods.alt}+Shift+${index + 1}`;
  }
  return null;
}

// Update shortcut mapping display
function updateShortcutMapping(engineId) {
  const shortcutMapping = document.querySelector('.shortcut-mapping');
  const shortcutInfo = document.getElementById('shortcutInfo');
  
  if (!engineId) {
    // New engine - check if it will be in first 4
    const sortedItems = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
    const enginesOnly = sortedItems.filter(e => e.type !== 'separator');
    if (enginesOnly.length < 4) {
      const mods = getModifierNames();
      const nextIndex = enginesOnly.length;
      if (shortcutMapping) {
        shortcutMapping.textContent = `Will be mapped to: ${mods.alt}+Shift+${nextIndex + 1}`;
      }
      if (shortcutInfo) {
        shortcutInfo.style.display = 'block';
      }
    } else {
      if (shortcutMapping) {
        shortcutMapping.textContent = 'No keyboard shortcut (only first 4 engines have shortcuts)';
      }
      if (shortcutInfo) {
        shortcutInfo.style.display = 'block';
      }
    }
  } else {
    const mapping = getShortcutMapping(engineId);
    if (mapping) {
      if (shortcutMapping) {
        shortcutMapping.textContent = `Mapped to: ${mapping}`;
      }
      if (shortcutInfo) {
        shortcutInfo.style.display = 'block';
      }
    } else {
      if (shortcutMapping) {
        shortcutMapping.textContent = 'No keyboard shortcut (only first 4 engines have shortcuts)';
      }
      if (shortcutInfo) {
        shortcutInfo.style.display = 'block';
      }
    }
  }
}


// Open modal to add/edit engine
function openModal(engine = null) {
  // Don't open modal for separators
  if (engine && engine.type === 'separator') {
    return;
  }
  
  editingEngineId = engine ? engine.id : null;
  modalTitle.textContent = engine ? 'Edit Search Engine' : 'Add Search Engine';
  
  if (engine) {
    document.getElementById('engineName').value = engine.name;
    document.getElementById('engineUrl').value = engine.url || '';
    document.getElementById('showInContextMenu').checked = engine.showInContextMenu !== false;
  } else {
    engineForm.reset();
    document.getElementById('showInContextMenu').checked = true;
  }
  
  updateShortcutMapping(engine ? engine.id : null);
  engineModal.classList.remove('hidden');
  engineModal.classList.add('active');
  document.getElementById('engineName').focus();
}

// Close modal
function closeModal() {
  engineModal.classList.add('hidden');
  engineModal.classList.remove('active');
  editingEngineId = null;
  engineForm.reset();
}

// Save engine
async function saveEngine(engineData) {
  if (editingEngineId) {
    // Update existing
    const index = searchEngines.findIndex(e => e.id === editingEngineId);
    if (index !== -1) {
      searchEngines[index] = {
        ...searchEngines[index],
        ...engineData,
        type: 'search' // Ensure type is set
      };
    }
  } else {
    // Add new
    const sortedItems = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
    const maxOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.order || 0)) : -1;
    const newEngine = {
      id: generateId(),
      type: 'search',
      ...engineData,
      order: maxOrder + 1
    };
    searchEngines.push(newEngine);
  }
  
  await saveEngines();
  closeModal();
  showToast(editingEngineId ? 'Search engine updated' : 'Search engine added');
}

// Edit engine
function editEngine(engineId) {
  const engine = searchEngines.find(e => e.id === engineId);
  if (engine) {
    openModal(engine);
  }
}

// Delete engine
async function deleteEngine(engineId) {
  if (confirm('Are you sure you want to delete this search engine?')) {
    searchEngines = searchEngines.filter(e => e.id !== engineId);
    // Reorder remaining engines
    searchEngines.forEach((engine, index) => {
      engine.order = index;
    });
    await saveEngines();
    showToast('Search engine deleted');
  }
}

// Save engines to storage
async function saveEngines() {
  await saveSearchEngines(searchEngines);
  renderEngines();
}

// Export settings
async function exportSettings() {
  const settings = await getAllSettings();
  const dataStr = JSON.stringify(settings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'search-shortcuts-settings.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Settings exported');
}

// Import settings
function triggerImport() {
  importFile.click();
}

// Handle file import
async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      await importSettings(settings);
      await loadSearchEngines();
      await loadGlobalSettings();
      showToast('Settings imported successfully');
    } catch (error) {
      showToast('Error importing settings: Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
  
  // Reset file input
  event.target.value = '';
}

// Load global settings
async function loadGlobalSettings() {
  const settings = await getGlobalSettings();
  if (settings.openInNewTab) {
    openInTab.checked = true;
  } else {
    openInWindow.checked = true;
  }
}

// Save global settings
async function handleSaveGlobalSettings() {
  const settings = {
    openInNewTab: openInTab.checked
  };
  await saveGlobalSettings(settings);
  showToast('Global settings saved');
}

// Add separator
async function addSeparator() {
  const sortedItems = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
  const maxOrder = sortedItems.length > 0 ? Math.max(...sortedItems.map(i => i.order || 0)) : -1;
  
  const separator = {
    id: generateId(),
    type: 'separator',
    name: 'Separator',
    order: maxOrder + 1,
    showInContextMenu: true
  };
  
  searchEngines.push(separator);
  await saveEngines();
  showToast('Separator added');
}

// Event listeners
const addSeparatorBtn = document.getElementById('addSeparatorBtn');
if (addSeparatorBtn) {
  addSeparatorBtn.addEventListener('click', addSeparator);
}

addEngineBtn.addEventListener('click', () => openModal());
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

// Link to Chrome shortcuts page
const shortcutsLink = document.getElementById('shortcutsLink');
if (shortcutsLink) {
  shortcutsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}
engineForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('engineName').value.trim();
  const url = document.getElementById('engineUrl').value.trim();
  const showInContextMenu = document.getElementById('showInContextMenu').checked;
  
  if (!name || !url) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (!url.includes('%s')) {
    showToast('URL must contain %s placeholder for the search query', 'error');
    return;
  }
  
  const engineData = {
    name,
    url,
    shortcut: '', // Shortcuts are fixed in manifest, not stored per engine
    showInContextMenu
  };
  
  if (editingEngineId) {
    const existing = searchEngines.find(e => e.id === editingEngineId);
    if (existing) {
      engineData.order = existing.order;
      engineData.id = existing.id;
    }
  }
  
  await saveEngine(engineData);
});

openInTab.addEventListener('change', handleSaveGlobalSettings);
openInWindow.addEventListener('change', handleSaveGlobalSettings);
exportBtn.addEventListener('click', exportSettings);
importBtn.addEventListener('click', triggerImport);
importFile.addEventListener('change', handleFileImport);

// Close modal on outside click
engineModal.addEventListener('click', (e) => {
  if (e.target === engineModal) {
    closeModal();
  }
});

// Initialize
(async () => {
  initTheme();
  await loadSearchEngines();
  await loadGlobalSettings();
})();
