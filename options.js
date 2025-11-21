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

  // Sort engines by order for display
  const sortedEngines = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
  const mods = getModifierNames();

  enginesList.innerHTML = sortedEngines.map((engine, index) => {
    return `
      <div class="engine-item" data-id="${engine.id}" draggable="true">
        <div class="drag-handle">☰</div>
        <div class="engine-info">
          <div class="engine-name">${escapeHtml(engine.name)}${index < 4 ? ` <span class="shortcut-badge">${mods.alt}+Shift+${index + 1}</span>` : ' <span class="no-shortcut-label">(no shortcut)</span>'}</div>
          <div class="engine-url">${escapeHtml(engine.url)}</div>
        </div>
        <div class="engine-actions">
          <label>
            <input type="checkbox" class="context-menu-toggle" data-engine-id="${engine.id}" ${engine.showInContextMenu ? 'checked' : ''}>
            <span>Show in menu</span>
          </label>
          <button class="btn btn-secondary edit-engine-btn" data-engine-id="${engine.id}">Edit</button>
          <button class="btn btn-danger delete-engine-btn" data-engine-id="${engine.id}">Delete</button>
        </div>
      </div>
    `;
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

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  const items = enginesList.querySelectorAll('.engine-item');
  items.forEach(item => item.classList.remove('drag-over'));
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
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
    
    // Reorder array
    const [removed] = searchEngines.splice(draggedIndex, 1);
    searchEngines.splice(targetIndex, 0, removed);
    
    // Update order values
    searchEngines.forEach((engine, index) => {
      engine.order = index;
    });
    
    // Save and re-render
    saveEngines();
  }

  this.classList.remove('drag-over');
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
  if (engine) {
    engine.showInContextMenu = show;
    await saveEngines();
  }
}

// Get shortcut mapping for an engine
function getShortcutMapping(engineId) {
  const sortedEngines = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
  const index = sortedEngines.findIndex(e => e.id === engineId);
  
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
    const sortedEngines = [...searchEngines].sort((a, b) => (a.order || 0) - (b.order || 0));
    if (sortedEngines.length < 4) {
      const mods = getModifierNames();
      const nextIndex = sortedEngines.length;
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
  editingEngineId = engine ? engine.id : null;
  modalTitle.textContent = engine ? 'Edit Search Engine' : 'Add Search Engine';
  
  if (engine) {
    document.getElementById('engineName').value = engine.name;
    document.getElementById('engineUrl').value = engine.url;
    document.getElementById('showInContextMenu').checked = engine.showInContextMenu !== false;
  } else {
    engineForm.reset();
    document.getElementById('showInContextMenu').checked = true;
  }
  
  updateShortcutMapping(engine ? engine.id : null);
  engineModal.classList.add('active');
  document.getElementById('engineName').focus();
}

// Close modal
function closeModal() {
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
        ...engineData
      };
    }
  } else {
    // Add new
    const newEngine = {
      id: generateId(),
      ...engineData,
      order: searchEngines.length
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
async function saveGlobalSettings() {
  const settings = {
    openInNewTab: openInTab.checked
  };
  await saveGlobalSettings(settings);
  showToast('Global settings saved');
}

// Event listeners
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

openInTab.addEventListener('change', saveGlobalSettings);
openInWindow.addEventListener('change', saveGlobalSettings);
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
  await loadSearchEngines();
  await loadGlobalSettings();
})();
