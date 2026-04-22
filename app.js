const STORAGE_KEY = 'jfl-ttd-dashboard-state-v1';
const ARCHIVE_KEY = 'jfl-ttd-dashboard-archive-v1';

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
    return mergeStoredData(fallback, fallback);
  }

  try {
    const response = await fetch('./data/ttd-items.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return mergeStoredData(data, fallback);
  } catch {
    return mergeStoredData(fallback, fallback);
  }
}

function defaultDataFromTemplate() {
  return {
    version: '3.9',
    lastUpdated: '2026-04-22T11:32:00-04:00',
    zones: [
      {
        id: 'fire',
        title: 'ON FIRE THIS WEEK',
        emoji: '🔥',
        items: [
          { id: 'april-30-portfolio-execution', text: 'April 30 portfolio execution (8 days)', priority: 'urgent', status: 'open' },
          { id: 'surfbox-social-launch', text: 'Surfbox social media launch (8 days)', priority: 'urgent', status: 'open' },
          { id: 'brad-architect-email', text: 'Brad architect email (Thursday)', priority: 'urgent', status: 'open' },
          { id: 'joey-young-spreadsheet', text: 'Joey Young spreadsheet [WAITING]', priority: 'waiting', status: 'open' }
        ]
      },
      {
        id: 'tlc-surfbox',
        title: 'TLC / SURFBOX',
        emoji: '🪵',
        items: [
          { id: 'surfbox-go-live-prep', text: 'Surfbox go-live prep', priority: 'pending', status: 'open' },
          { id: 'tariff-pricing-review', text: 'Tariff pricing review', priority: 'pending', status: 'open' },
          { id: 'joey-young-spreadsheet-2', text: 'Joey Young spreadsheet [WAITING]', priority: 'waiting', status: 'open' },
          { id: 'surf-city-audit', text: 'Surf City audit', priority: 'pending', status: 'open' },
          { id: 'neal-denise-prospecting', text: 'Neal/Denise prospecting check-in', priority: 'pending', status: 'open' }
        ]
      },
      {
        id: 'firehouse',
        title: 'FIREHOUSE — 18 NEW ST',
        emoji: '🏗️',
        items: [
          { id: 'mike-plumber-followup', text: 'Mike plumber follow-up', priority: 'pending', status: 'open' },
          { id: 'brad-architect-coordination', text: 'Brad architect coordination', priority: 'pending', status: 'open' },
          { id: 'certificate-of-compliance', text: 'Certificate of Compliance', priority: 'pending', status: 'open' },
          { id: 'matty-electrical-work', text: 'Matty electrical work', priority: 'pending', status: 'open' },
          { id: 'section-47-tax-credit', text: 'Section 47 tax credit research', priority: 'pending', status: 'open' }
        ]
      },
      {
        id: 'investing',
        title: 'INVESTING — JFL&KL FUND',
        emoji: '💰',
        items: [
          { id: 'april-30-execution', text: 'April 30 execution — 8 day countdown', priority: 'urgent', status: 'open' },
          { id: 'macarthur-w2-roth-401k', text: 'MacArthur W-2/Roth 401k discussion', priority: 'pending', status: 'open' },
          { id: 'sp-monitoring', text: 'S&P monitoring vs exit baseline (6,591.90)', priority: 'pending', status: 'open' }
        ]
      },
      {
        id: 'family',
        title: 'FAMILY / PERSONAL',
        emoji: '🏠',
        items: [
          { id: 'gio-225-check', text: 'Gio $225 check (TEXT TOMMY)', priority: 'pending', status: 'open' },
          { id: 'jersey-appliance', text: 'Jersey Appliance call 609-918-1830', priority: 'pending', status: 'open' },
          { id: 'truck-key-rings', text: 'Truck key rings [WAITING ON LJ]', priority: 'waiting', status: 'open' },
          { id: 'juliana-summer-job', text: 'Juliana summer job planning', priority: 'pending', status: 'open' },
          { id: 'bella-openclaw-setup', text: 'Bella OpenClaw setup', priority: 'pending', status: 'open' }
        ]
      },
      {
        id: 'projects',
        title: 'PROJECTS / VENTURES',
        emoji: '🚀',
        items: [
          { id: 'rebolt-renders', text: 'ReBolt renders', priority: 'pending', status: 'open' },
          { id: 'provisional-patent', text: 'Provisional patent', priority: 'pending', status: 'open' },
          { id: 'elevenlabs-voice', text: 'ElevenLabs voice setup', priority: 'pending', status: 'open' },
          { id: 'voice-clone', text: 'Voice clone (TALK TO RENEE FIRST)', priority: 'waiting', status: 'open' },
          { id: 'world-cup-pool', text: 'World Cup Pool — TeamStake $25 update', priority: 'pending', status: 'open' }
        ]
      }
    ]
  };
}

function mergeStoredData(data, fallback) {
  const storedPayload = loadStoredState().stored;
  const merged = clone(data || fallback || defaultDataFromTemplate());

  if (storedPayload?.version) merged.version = storedPayload.version;
  if (storedPayload?.lastUpdated) merged.lastUpdated = storedPayload.lastUpdated;
  if (Array.isArray(storedPayload?.zones) && storedPayload.zones.length) {
    merged.zones = storedPayload.zones;
  }

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
      <button class="small-button" type="button">Move</button>
      <button class="small-button delete-btn" type="button">✕</button>
    </div>
  `;

  const [checkButton, moveButton, deleteButton] = li.querySelectorAll('button');
  checkButton.addEventListener('click', () => toggleItem(zoneId, item.id));
  moveButton.addEventListener('click', (e) => cycleZone(zoneId, item.id, e));
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

function wireEvents() {
  els.addButton.addEventListener('click', addItem);
  els.newItemText.addEventListener('keydown', event => {
    if (event.key === 'Enter') addItem();
  });
  els.clearDoneButton.addEventListener('click', clearArchive);
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
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
