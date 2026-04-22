const STORAGE_KEY = 'jfl-ttd-dashboard-state-v2';
const ARCHIVE_KEY = 'jfl-ttd-dashboard-archive-v2';

const defaultData = {
  version: '3.9',
  lastUpdated: '2026-04-22T11:32:00-04:00',
  zones: []
};

const state = {
  data: null,
  archive: []
};

const els = {
  grid: document.getElementById('dashboard-grid'),
  archive: document.getElementById('archive-list'),
  versionPill: document.getElementById('version-pill'),
  updatedPill: document.getElementById('updated-pill'),
  storagePill: document.getElementById('storage-pill'),
  openCount: document.getElementById('open-count'),
  urgentCount: document.getElementById('urgent-count'),
  doneCount: document.getElementById('done-count'),
  blockedCount: document.getElementById('blocked-count'),
  zoneSelect: document.getElementById('new-item-zone'),
  newItemText: document.getElementById('new-item-text'),
  newItemPriority: document.getElementById('new-item-priority'),
  addButton: document.getElementById('add-item-btn'),
  backupButton: document.getElementById('backup-btn'),
  restoreButton: document.getElementById('restore-btn'),
  backupFileInput: document.getElementById('backup-file-input'),
  clearDoneButton: document.getElementById('clear-done-btn')
};

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadStoredState() {
  const stored = safeJsonParse(localStorage.getItem(STORAGE_KEY), null);
  const archive = safeJsonParse(localStorage.getItem(ARCHIVE_KEY), []);
  return { stored, archive };
}

async function loadData() {
  const fallback = defaultDataFromTemplate();
  if (location.protocol === 'file:') {
    return mergeStoredData(fallback);
  }

  try {
    const response = await fetch('./data/ttd-items.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return mergeStoredData(data, fallback);
  } catch {
    return mergeStoredData(fallback);
  }
}

function defaultDataFromTemplate() {
  // Fallback data — keep in sync with data/ttd-items.json
  return { version: '4.0', lastUpdated: '2026-04-22T14:45:00-04:00', zones: [] };
}

function mergeStoredData(data, fallback = defaultDataFromTemplate()) {
  const { stored } = loadStoredState();
  const base = clone(data || fallback);

  if (!stored) return base;

  const merged = clone(base);
  merged.version = stored.version || merged.version;
  merged.lastUpdated = stored.lastUpdated || merged.lastUpdated;

  const storedZones = Array.isArray(stored.zones) ? stored.zones : [];
  const mergedZones = merged.zones.map(defaultZone => {
    const storedZone = storedZones.find(zone => zone.id === defaultZone.id);
    if (!storedZone) return defaultZone;

    const storedItems = Array.isArray(storedZone.items) ? storedZone.items : [];
    const defaultItems = Array.isArray(defaultZone.items) ? defaultZone.items : [];
    const items = defaultItems.map(defaultItem => {
      const storedItem = storedItems.find(item => item.id === defaultItem.id);
      return storedItem ? { ...defaultItem, ...storedItem } : defaultItem;
    });

    storedItems.forEach(storedItem => {
      if (!items.some(item => item.id === storedItem.id)) items.push(storedItem);
    });

    return { ...defaultZone, ...storedZone, items };
  });

  storedZones.forEach(storedZone => {
    if (!mergedZones.some(zone => zone.id === storedZone.id)) mergedZones.push(storedZone);
  });

  merged.zones = mergedZones;
  return merged;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatUpdated(iso) {
  if (!iso) return 'Updated —';
  const date = new Date(iso);
  return `Updated ${date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}

function bumpVersion(version) {
  const parts = String(version).split('.').map(Number);
  if (parts.length >= 2 && parts.every(n => Number.isFinite(n))) {
    parts[parts.length - 1] += 1;
    return parts.join('.');
  }
  return `${version}.1`;
}

function priorityBadge(item) {
  if (item.priority === 'urgent') return '<span class="badge badge-urgent">Urgent</span>';
  if (item.priority === 'waiting') return '<span class="badge badge-waiting">Waiting</span>';
  return '<span class="badge">Pending</span>';
}

function render() {
  const zones = state.data.zones || [];
  els.grid.innerHTML = '';
  zones.forEach(zone => {
    const card = document.createElement('section');
    card.className = 'zone-card';
    card.innerHTML = `
      <div class="zone-header">
        <div>
          <div class="zone-emoji">${zone.emoji || ''}</div>
          <h2 class="zone-title">${zone.title}</h2>
        </div>
        <div class="zone-count">${zone.items.filter(item => item.status !== 'done').length} open</div>
      </div>
      <ul class="item-list"></ul>
    `;
    const list = card.querySelector('.item-list');
    zone.items.forEach(item => list.appendChild(renderItem(zone.id, item)));
    els.grid.appendChild(card);
  });

  renderArchive();
  renderStats();
  renderMeta();
  populateZoneSelect();
}

function renderItem(zoneId, item) {
  const li = document.createElement('li');
  li.className = `item ${item.status === 'done' ? 'done' : ''}`;

  const metaBits = [];
  if (item.priority === 'urgent') metaBits.push('Urgent');
  if (item.priority === 'waiting') metaBits.push('Waiting');
  if (item.completedAt) metaBits.push(`Done ${new Date(item.completedAt).toLocaleDateString()}`);

  li.innerHTML = `
    <button class="check" aria-label="Mark done">${item.status === 'done' ? '↺' : '☐'}</button>
    <div>
      <div class="item-text">${escapeHtml(item.text)}</div>
      <div class="item-meta">${priorityBadge(item)}${metaBits.map(bit => `<span class="badge">${escapeHtml(bit)}</span>`).join('')}</div>
    </div>
    <div class="item-actions">
      <button class="small-button edit-btn" type="button">✏️</button>
      <button class="small-button" type="button">Move</button>
      <button class="small-button delete-btn" type="button">✕</button>
    </div>
  `;

  const buttons = li.querySelectorAll('button');
  const [checkButton, editButton, moveButton, deleteButton] = buttons;
  checkButton.addEventListener('click', () => toggleItem(zoneId, item.id));
  if (editButton) editButton.addEventListener('click', () => editItem(zoneId, item.id, li));
  if (moveButton) moveButton.addEventListener('click', (e) => cycleZone(zoneId, item.id, e));
  if (deleteButton) deleteButton.addEventListener('click', () => deleteItem(zoneId, item.id));
  return li;
}

function renderArchive() {
  const doneItems = state.archive.slice().sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  if (!doneItems.length) {
    els.archive.innerHTML = '<div class="archive-empty">No completed items yet. Finish something and it lands here.</div>';
    return;
  }

  els.archive.innerHTML = '';
  doneItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'item done';
    li.innerHTML = `
      <button class="check" aria-label="Completed">✓</button>
      <div>
        <div class="item-text">${escapeHtml(item.text)}</div>
        <div class="item-meta"><span class="badge badge-done">Done</span><span class="badge">${new Date(item.completedAt).toLocaleString()}</span></div>
      </div>
      <div></div>
    `;
    els.archive.appendChild(li);
  });
}

function renderStats() {
  const allItems = state.data.zones.flatMap(zone => zone.items);
  const open = allItems.filter(item => item.status !== 'done').length;
  const urgent = allItems.filter(item => item.status !== 'done' && item.priority === 'urgent').length;
  const blocked = allItems.filter(item => item.status !== 'done' && item.priority === 'waiting').length;
  const done = state.archive.length;
  els.openCount.textContent = String(open);
  els.urgentCount.textContent = String(urgent);
  els.blockedCount.textContent = String(blocked);
  els.doneCount.textContent = String(done);
}

function renderMeta() {
  els.versionPill.textContent = `v${state.data.version}`;
  els.updatedPill.textContent = formatUpdated(state.data.lastUpdated);
  els.storagePill.textContent = 'Saved locally';
}

function populateZoneSelect() {
  const current = els.zoneSelect.value;
  const options = state.data.zones.map(zone => `<option value="${zone.id}">${zone.title}</option>`).join('');
  els.zoneSelect.innerHTML = options;
  if ([...els.zoneSelect.options].some(option => option.value === current)) els.zoneSelect.value = current;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(state.archive));
}

function touchState() {
  state.data.version = bumpVersion(state.data.version);
  state.data.lastUpdated = new Date().toISOString();
  saveState();
  render();
}

function findItem(zoneId, itemId) {
  const zone = state.data.zones.find(z => z.id === zoneId);
  const item = zone?.items.find(i => i.id === itemId);
  return { zone, item };
}

function toggleItem(zoneId, itemId) {
  const { item } = findItem(zoneId, itemId);
  if (!item) return;
  if (item.status === 'done') {
    item.status = 'open';
    item.completedAt = null;
    state.archive = state.archive.filter(entry => entry.id !== item.id);
  } else {
    item.status = 'done';
    item.completedAt = new Date().toISOString();
    state.archive.unshift({ id: item.id, text: item.text, completedAt: item.completedAt });
  }
  touchState();
}

function cycleZone(zoneId, itemId, event) {
  const zones = state.data.zones;
  const currentIndex = zones.findIndex(z => z.id === zoneId);
  const itemZone = zones[currentIndex];
  const itemIndex = itemZone.items.findIndex(i => i.id === itemId);
  if (itemIndex < 0) return;

  // Build a mini dropdown menu at the button position
  const existing = document.querySelector('.move-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'move-menu';
  zones.forEach((zone, idx) => {
    if (idx === currentIndex) return;
    const btn = document.createElement('button');
    btn.textContent = `${zone.emoji} ${zone.title}`;
    btn.addEventListener('click', () => {
      const [item] = itemZone.items.splice(itemIndex, 1);
      zone.items.push(item);
      menu.remove();
      touchState();
    });
    menu.appendChild(btn);
  });

  // Position near the clicked button
  if (event?.target) {
    const rect = event.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
  }
  document.body.appendChild(menu);

  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeHandler); }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
}

function addItem() {
  const text = els.newItemText.value.trim();
  if (!text) return;
  const zoneId = els.zoneSelect.value;
  const priority = els.newItemPriority.value;
  const zone = state.data.zones.find(z => z.id === zoneId) || state.data.zones[0];
  const newItem = {
    id: `item-${Date.now()}`,
    text,
    priority,
    status: 'open'
  };
  zone.items.unshift(newItem);
  els.newItemText.value = '';
  els.newItemPriority.value = 'pending';
  touchState();
}

function editItem(zoneId, itemId, li) {
  const { item } = findItem(zoneId, itemId);
  if (!item) return;
  const textEl = li.querySelector('.item-text');
  if (!textEl) return;

  // Replace text with an input field
  const currentText = item.text;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.maxLength = 180;
  input.className = 'edit-input';
  textEl.replaceWith(input);
  input.focus();
  input.select();

  // Also add a priority selector
  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'edit-priority';
  ['pending', 'urgent', 'waiting'].forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    if (p === item.priority) opt.selected = true;
    prioritySelect.appendChild(opt);
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'small-button save-edit-btn';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'small-button';

  const editRow = document.createElement('div');
  editRow.className = 'edit-row';
  editRow.appendChild(prioritySelect);
  editRow.appendChild(saveBtn);
  editRow.appendChild(cancelBtn);
  input.parentNode.insertBefore(editRow, input.nextSibling);

  function save() {
    const newText = input.value.trim();
    if (newText) {
      item.text = newText;
      item.priority = prioritySelect.value;
      touchState();
    } else {
      render();
    }
  }

  function cancel() {
    render();
  }

  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  });
}

function deleteItem(zoneId, itemId) {
  if (!confirm('Delete this item?')) return;
  const zone = state.data.zones.find(z => z.id === zoneId);
  if (!zone) return;
  zone.items = zone.items.filter(i => i.id !== itemId);
  touchState();
}

function clearArchive() {
  if (!confirm('Clear all completed items from the archive?')) return;
  state.archive = [];
  saveState();
  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function exportBackup() {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: state.data.version,
    data: state.data,
    archive: state.archive
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `jfl-ttd-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup() {
  document.getElementById('import-file').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.data || !backup.data.zones) {
        alert('Invalid backup file — missing TTD data.');
        return;
      }
      if (!confirm(`Restore backup from ${backup.exportedAt || 'unknown date'}? This will replace your current dashboard.`)) return;
      state.data = backup.data;
      state.archive = Array.isArray(backup.archive) ? backup.archive : [];
      saveState();
      render();
      alert('Backup restored successfully!');
    } catch {
      alert('Could not read backup file. Make sure it\'s a valid TTD backup JSON.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function wireEvents() {
  els.addButton.addEventListener('click', addItem);
  els.newItemText.addEventListener('keydown', event => {
    if (event.key === 'Enter') addItem();
  });
  els.clearDoneButton.addEventListener('click', clearArchive);
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-btn').addEventListener('click', importBackup);
  document.getElementById('import-file').addEventListener('change', handleImport);
}

async function init() {
  const { stored, archive } = loadStoredState();
  state.archive = Array.isArray(archive) ? archive : [];
  state.data = stored || await loadData();
  if (!stored) {
    saveState();
  }
  wireEvents();
  render();
  registerServiceWorker();
}

function registerServiceWorker() {
  // Service worker disabled — was causing aggressive caching issues
  // Unregister any existing one to clear stale cache
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  }
}

init();
