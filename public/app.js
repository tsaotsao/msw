import * as sync from './sync.js';

// Programmatic Retro Sound Effects Synthesizer (Nostalgic MapleStory Vibe)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('此瀏覽器不支援 Web Audio API:', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playCleared() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playNote = (freq, start, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.05, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Play a happy major triad (C5 -> E5 -> G5)
    playNote(523.25, now, 0.15);       // C5
    playNote(659.25, now + 0.08, 0.15);  // E5
    playNote(783.99, now + 0.16, 0.25);  // G5
  }

  playBossAlert() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const playTone = (freq, start, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      // Frequency vibrato
      osc.frequency.linearRampToValueAtTime(freq * 1.05, start + duration * 0.5);
      osc.frequency.linearRampToValueAtTime(freq * 0.95, start + duration);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Urgent retro alarm sound (Alternating notes)
    playTone(880.00, now, 0.15);        // A5
    playTone(698.46, now + 0.12, 0.15);  // F5
    playTone(880.00, now + 0.24, 0.15);  // A5
    playTone(698.46, now + 0.36, 0.40);  // F5 (longer)
  }

  playLevelUp() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 to C6
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + (idx * 0.07);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }
}

const sfx = new SoundFX();

// Original MapleStory channel capacities from the screenshot
const ORIGINAL_CAPACITIES = [
  "58 / 65", "55 / 65", "50 / 65", "42 / 65", "41 / 65",
  "45 / 65", "50 / 65", "47 / 65", "54 / 65", "35 / 65",
  "34 / 65", "40 / 65", "29 / 65", "43 / 65", "44 / 65",
  "32 / 65", "36 / 65", "33 / 65", "47 / 65", "34 / 65",
  "31 / 65", "36 / 65", "42 / 65", "29 / 65", "38 / 65",
  "32 / 65", "39 / 65", "32 / 65", "34 / 65", "40 / 65",
  "25 / 65", "36 / 65", "42 / 65", "33 / 65", "36 / 65",
  "31 / 65", "33 / 65", "32 / 65", "28 / 65", "36 / 65",
  "52 / 65", "28 / 65", "42 / 65", "23 / 65", "33 / 65",
  "36 / 65", "41 / 65", "43 / 65", "45 / 65", "34 / 65"
];

// Helper to generate a deterministic capacity for channels above 50
function generateRandomCapacity(chId) {
  const hash = (chId * 17) % 41 + 15; // 15 to 55
  return `${hash} / 65`;
}

// Helper to generate the MapleStory segmented block capacity bar HTML
function getSegmentedBarHTML(chId, status) {
  const capStr = ORIGINAL_CAPACITIES[chId - 1] || generateRandomCapacity(chId);
  const parts = capStr.split(' / ');
  const current = parseInt(parts[0]);
  const max = parseInt(parts[1]);
  const activeCount = Math.round((current / max) * 10);
  
  let html = '';
  
  if (status === 'unchecked') {
    for (let j = 0; j < 10; j++) {
      if (j < activeCount) {
        if (j === 0) {
          html += '<div class="ch-segment active-blue"></div>';
        } else if (j >= 1 && j <= 7) {
          html += '<div class="ch-segment active-green"></div>';
        } else {
          html += '<div class="ch-segment active-orange"></div>';
        }
      } else {
        html += '<div class="ch-segment"></div>';
      }
    }
  } else if (status === 'checking') {
    for (let j = 0; j < 10; j++) {
      html += `<div class="ch-segment active-yellow pulsing" style="animation-delay: ${j * 0.08}s"></div>`;
    }
  } else if (status === 'cleared') {
    for (let j = 0; j < 10; j++) {
      if (j < 2) {
        html += '<div class="ch-segment active-green cleared-dim"></div>';
      } else {
        html += '<div class="ch-segment cleared-dim"></div>';
      }
    }
  } else if (status === 'boss') {
    for (let j = 0; j < 10; j++) {
      html += '<div class="ch-segment active-red flashing"></div>';
    }
  }
  
  return html;
}

// Main App State
const state = {
  channels: {},
  logs: [],
  onlineCount: 1,
  onlineUsers: [],
  currentUser: {
    username: '冒險者',
    color: '#4385f4'
  },
  selectedChId: null,
  roomId: '',
  totalChannels: sync.DEFAULT_TOTAL_CHANNELS,
  drag: {
    isMouseDown: false,
    isTouchDown: false,
    hasDragged: false,
    startChId: null
  }
};

// DOM Elements
const channelGrid = document.getElementById('channel-grid');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const currentChDisplay = document.getElementById('current-ch-display');
const onlineCountDisplay = document.getElementById('online-count');
const onlineListContainer = document.getElementById('online-list');
const logContainer = document.getElementById('log-container');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const usernameInput = document.getElementById('username-input');
const resetAllBtn = document.getElementById('reset-all-btn');
const progressPercentage = document.getElementById('progress-percentage');
const progressBarFill = document.getElementById('progress-bar-fill');
const channelCountInput = document.getElementById('channel-count-input');
const channelCountValue = document.getElementById('channel-count-value');
const totalChDisplay = document.getElementById('total-ch-display');
const muteBtn = document.getElementById('mute-btn');
const appContainer = document.querySelector('.app-container');
const roomCodeDisplay = document.getElementById('room-code-display');
const leaveRoomBtn = document.getElementById('leave-room-btn');

// Lobby elements
const lobbyModal = document.getElementById('lobby-modal');
const lobbyForm = document.getElementById('lobby-form');
const lobbyRoomInput = document.getElementById('lobby-room-input');
const lobbyPasswordInput = document.getElementById('lobby-password-input');
const lobbyNameInput = document.getElementById('lobby-name-input');
const lobbyError = document.getElementById('lobby-error');
const lobbySubmitBtn = document.getElementById('lobby-submit-btn');
const copyInviteBtn = document.getElementById('copy-invite-btn');

// Popover menu elements
const popover = document.getElementById('channel-menu-popover');
const popoverChNum = document.getElementById('popover-ch-num');

// Stats elements
const statUnchecked = document.getElementById('stat-unchecked');
const statChecking = document.getElementById('stat-checking');
const statCleared = document.getElementById('stat-cleared');
const statBoss = document.getElementById('stat-boss');

// Modal Help elements
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');
const closeHelpConfirmBtn = document.getElementById('close-help-confirm-btn');

// Initialize settings from LocalStorage
function initUserSettings() {
  const storedName = localStorage.getItem('msw_boss_username');
  const storedColor = localStorage.getItem('msw_boss_color');

  if (storedName) {
    usernameInput.value = storedName;
    state.currentUser.username = storedName;
  } else {
    // Generate a random beginner adventure name
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const defaultName = `冒險者${randomNum}`;
    usernameInput.value = defaultName;
    state.currentUser.username = defaultName;
    localStorage.setItem('msw_boss_username', defaultName);
  }

  // Auto-assigned color for the online list and chat names
  if (storedColor) {
    state.currentUser.color = storedColor;
  } else {
    const colors = ['#4385f4', '#34a853', '#9b59b6', '#e67e22'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    state.currentUser.color = randomColor;
    localStorage.setItem('msw_boss_color', randomColor);
  }

  // Load mute setting from localStorage
  const storedMuted = localStorage.getItem('msw_boss_muted');
  if (storedMuted === 'true') {
    sfx.muted = true;
    if (muteBtn) {
      muteBtn.textContent = '🔇';
      muteBtn.title = '取消靜音';
    }
  }
}

// Wire up the room link copy button and leave button
function initRoomUI() {
  copyInviteBtn.addEventListener('click', async () => {
    sfx.playClick();
    // The link only carries the room ID; teammates still need the password
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(state.roomId)}`;
    try {
      await navigator.clipboard.writeText(url);
      copyInviteBtn.textContent = '✅ 已複製';
    } catch (err) {
      window.prompt('複製這個房間連結給隊友（密碼請另外告訴隊友）：', url);
    }
    setTimeout(() => { copyInviteBtn.textContent = '📋 複製房間連結'; }, 1500);
  });

  leaveRoomBtn.addEventListener('click', () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
    // Reloading drops the Firebase connection, which removes our presence entry
    window.location.href = `${window.location.pathname}?room=${encodeURIComponent(state.roomId)}`;
  });
}

const SESSION_KEY = 'msw_boss_session';

function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session && session.roomId && /^[a-f0-9]{64}$/.test(session.roomKey)) return session;
  } catch (err) { /* ignore */ }
  return null;
}

// Enter a room after the lobby (or a saved session) resolved its key
function enterRoom(roomId, roomKey) {
  state.roomId = roomId;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, roomKey })); } catch (err) { /* ignore */ }
  history.replaceState(null, '', `${window.location.pathname}?room=${encodeURIComponent(roomId)}`);
  roomCodeDisplay.textContent = roomId;
  lobbyModal.style.display = 'none';
  connectSync(roomKey);
}

const LOBBY_ERRORS = {
  exists: '這個房間號碼已經有人用了，請換一個，或改用「加入房間」。',
  notfound: '找不到這個房間，請確認房間號碼，或改用「建立房間」。',
  badpassword: '密碼錯誤。'
};

function showLobby(prefillRoom) {
  let mode = 'join';
  lobbyRoomInput.value = prefillRoom || '';
  lobbyNameInput.value = state.currentUser.username;
  lobbyModal.style.display = 'flex';
  (prefillRoom ? lobbyPasswordInput : lobbyRoomInput).focus();

  lobbyModal.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      lobbyModal.querySelectorAll('.tab-btn').forEach(t => t.classList.toggle('active', t === tab));
      lobbySubmitBtn.textContent = mode === 'create' ? '建立並進入房間' : '進入房間';
      lobbyError.textContent = '';
    });
  });

  lobbyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = lobbyRoomInput.value.trim();
    const password = lobbyPasswordInput.value;
    const name = lobbyNameInput.value.trim();

    if (!/^[A-Za-z0-9_-]{3,20}$/.test(roomId)) {
      lobbyError.textContent = '房間號碼要 3-20 個字，只能用英文、數字、- 或 _。';
      return;
    }
    if (mode === 'create' && password.length < 4) {
      lobbyError.textContent = '密碼至少要 4 個字。';
      return;
    }
    if (!sync.isConfigured()) {
      lobbyError.textContent = '尚未設定 Firebase (firebase-config.js)';
      return;
    }

    if (name) {
      state.currentUser.username = name;
      usernameInput.value = name;
      localStorage.setItem('msw_boss_username', name);
    }

    lobbySubmitBtn.disabled = true;
    lobbyError.textContent = '';
    try {
      const roomKey = mode === 'create'
        ? await sync.createRoom(roomId, password)
        : await sync.joinRoom(roomId, password);
      enterRoom(roomId, roomKey);
    } catch (err) {
      console.error('進入房間失敗:', err);
      lobbyError.textContent = LOBBY_ERRORS[err.message] || '連線失敗，請稍後再試。';
    } finally {
      lobbySubmitBtn.disabled = false;
    }
  });
}

// Escape user-provided text before inserting into innerHTML
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Helper to compute elapsed time string
function getElapsedTimeText(updatedAt) {
  if (!updatedAt) return '-';
  const elapsedMs = Date.now() - updatedAt;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  if (elapsedSec < 60) {
    return `${elapsedSec}秒前`;
  } else {
    const elapsedMin = Math.floor(elapsedSec / 60);
    return `${elapsedMin}分前`;
  }
}

// Mark a channel card as cleared (No Boss) on drag-over
function markChannelAsCleared(chId) {
  const ch = state.channels[chId];
  if (ch && ch.status !== 'cleared') {
    sync.updateChannel(chId, 'cleared', state.currentUser.username);
    
    sfx.playClick(); // play click to give short feedback
    
    ch.status = 'cleared';
    ch.updatedBy = state.currentUser.username;
    ch.updatedAt = Date.now();
    renderChannel(ch);
    updateStats();
  }
}

// Bind mouse and touch drag-to-mark events to a channel card
function bindDragEvents(card, chId) {
  card.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left button
    e.preventDefault();
    state.drag.isMouseDown = true;
    state.drag.hasDragged = false;
    state.drag.startChId = chId;
  });

  card.addEventListener('mouseenter', () => {
    if (state.drag.isMouseDown) {
      if (!state.drag.hasDragged) {
        state.drag.hasDragged = true;
        markChannelAsCleared(state.drag.startChId);
      }
      markChannelAsCleared(chId);
    }
  });

  card.addEventListener('touchstart', (e) => {
    state.drag.isTouchDown = true;
    state.drag.hasDragged = false;
    state.drag.startChId = chId;
  }, { passive: true });
}

// Generate channels in the HTML grid dynamically
function generateGrid(count) {
  const channelCount = count || state.totalChannels || sync.DEFAULT_TOTAL_CHANNELS;
  channelGrid.innerHTML = '';
  
  const isCompact = channelCount > 100;
  
  // Dynamic Split Screen logic: cols = 1, 2, or 3
  let numCols = 1;
  if (isCompact) {
    if (channelCount > 1000 && channelCount <= 2000) numCols = 2;
    else if (channelCount > 2000) numCols = 3;
  }
  
  // Dynamically scale the entire app container width (Requirement)
  if (appContainer) {
    appContainer.classList.remove('splits-1', 'splits-2', 'splits-3');
    appContainer.classList.add(`splits-${numCols}`);
  }
  
  if (isCompact) {
    channelGrid.classList.add('compact-mode');
    
    // Create columns subgrids
    const subgrids = [];
    for (let c = 0; c < numCols; c++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'channel-subgrid';
      channelGrid.appendChild(colDiv);
      subgrids.push(colDiv);
    }
    
    const channelsPerCol = Math.ceil(channelCount / numCols);
    
    for (let i = 1; i <= channelCount; i++) {
      const card = document.createElement('div');
      card.className = 'channel-card state-unchecked';
      card.id = `ch-card-${i}`;
      card.setAttribute('data-ch', i);
      
      const capText = ORIGINAL_CAPACITIES[i - 1] || generateRandomCapacity(i);
      
      // Compact innerHTML
      card.innerHTML = `
        <div class="ch-card-header">
          <span class="ch-name">${i}</span>
          <!-- Hidden elements needed for renderChannel querySelector lookups -->
          <span class="ch-capacity" id="ch-capacity-${i}" style="display:none;">[${capText}]</span>
        </div>
        <div class="ch-segmented-bar" id="ch-bar-${i}" style="display:none;"></div>
        <div class="ch-card-footer" style="display:none;">
          <span class="ch-updater" id="ch-updater-${i}">-</span>
          <span class="ch-timer" id="ch-timer-${i}">-</span>
        </div>
      `;
      
      card.title = `頻道 ${i} [${capText}]\n狀態: 未檢查\n標記人: -\n時間: -`;

      bindDragEvents(card, i);

      // Distribute to subgrid
      const colIndex = Math.floor((i - 1) / channelsPerCol);
      const targetSubgrid = subgrids[colIndex] || subgrids[subgrids.length - 1];
      targetSubgrid.appendChild(card);
    }
  } else {
    // Standard Normal View (<= 100 channels)
    channelGrid.classList.remove('compact-mode');
    
    for (let i = 1; i <= channelCount; i++) {
      const card = document.createElement('div');
      card.className = 'channel-card state-unchecked';
      card.id = `ch-card-${i}`;
      card.setAttribute('data-ch', i);
      
      const capText = ORIGINAL_CAPACITIES[i - 1] || generateRandomCapacity(i);
      const barHTML = getSegmentedBarHTML(i, 'unchecked');
      
      card.innerHTML = `
        <div class="ch-card-header">
          <span class="ch-name">頻道 ${i}</span>
          <span class="ch-capacity" id="ch-capacity-${i}">[${capText}]</span>
        </div>
        <div class="ch-segmented-bar" id="ch-bar-${i}">
          ${barHTML}
        </div>
        <div class="ch-card-footer">
          <span class="ch-updater" id="ch-updater-${i}">-</span>
          <span class="ch-timer" id="ch-timer-${i}">-</span>
        </div>
      `;

      bindDragEvents(card, i);

      channelGrid.appendChild(card);
    }
  }
}

// Direct state cycling handler (Unchecked -> Cleared -> Boss -> Unchecked)
function cycleChannelState(chId) {
  const currentStatus = state.channels[chId]?.status || 'unchecked';
  let nextStatus = 'cleared'; // default fallback
  
  if (currentStatus === 'unchecked' || currentStatus === 'checking') {
    nextStatus = 'cleared';
  } else if (currentStatus === 'cleared') {
    nextStatus = 'boss';
  } else if (currentStatus === 'boss') {
    nextStatus = 'unchecked';
  }
  
  sync.updateChannel(chId, nextStatus, state.currentUser.username);
  
  // Play retro sounds
  if (nextStatus === 'cleared') {
    sfx.playCleared();
  } else if (nextStatus === 'boss') {
    sfx.playBossAlert();
  } else {
    sfx.playClick();
  }
  
  // Optimistic UI update
  const ch = state.channels[chId];
  if (ch) {
    ch.status = nextStatus;
    ch.updatedBy = state.currentUser.username;
    ch.updatedAt = Date.now();
    renderChannel(ch);
    updateStats();
  }
}

// Show action popover relative to clicked card
function showPopover(chId, cardElement) {
  state.selectedChId = chId;
  popoverChNum.textContent = `頻道 ${chId}`;
  
  // Display popover
  popover.style.display = 'block';
  
  const rect = cardElement.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Calculate position: center-aligned below the card
  let top = rect.bottom + scrollTop + 6;
  let left = rect.left + scrollLeft + (rect.width / 2) - (popover.offsetWidth / 2);
  
  // Boundary check: ensure it doesn't overflow screen right
  if (left + popover.offsetWidth > window.innerWidth) {
    left = window.innerWidth - popover.offsetWidth - 12;
  }
  if (left < 0) left = 12;

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function hidePopover() {
  popover.style.display = 'none';
  state.selectedChId = null;
}

// Expand the sparse channel map from Firebase into the full 1..N list
function buildChannels(total, sparse) {
  const channels = {};
  for (let i = 1; i <= total; i++) {
    const ch = sparse[i];
    channels[i] = ch
      ? { id: i, status: ch.status, updatedBy: ch.updatedBy || '', updatedAt: ch.updatedAt || null }
      : { id: i, status: 'unchecked', updatedBy: '', updatedAt: null };
  }
  return channels;
}

// Firebase realtime connection setup
function connectSync(roomKey) {
  if (!sync.isConfigured()) {
    connectionDot.className = 'status-dot disconnected';
    connectionText.textContent = '尚未設定 Firebase (firebase-config.js)';
    return;
  }

  connectionDot.className = 'status-dot connecting';
  connectionText.textContent = '正在連線...';

  let sparseChannels = {};
  let channelsLoaded = false;
  let logsLoaded = false;

  sync.connect(roomKey, state.currentUser, {
    onConnection(connected) {
      connectionDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
      connectionText.textContent = connected ? '已同步' : '未同步 (嘗試重連)';
    },

    onMeta(total) {
      if (total === state.totalChannels) return;
      state.totalChannels = total;
      channelCountInput.value = total;
      channelCountValue.textContent = total;
      if (totalChDisplay) {
        totalChDisplay.textContent = `${total} 個`;
      }
      state.channels = buildChannels(total, sparseChannels);
      generateGrid(total);
      renderAllChannels();
      updateStats();
    },

    onChannels(sparse) {
      sparseChannels = sparse;
      const total = state.totalChannels || sync.DEFAULT_TOTAL_CHANNELS;
      const next = buildChannels(total, sparse);
      const myName = state.currentUser.username;

      Object.values(next).forEach(ch => {
        const prev = state.channels[ch.id];
        if (prev && prev.status === ch.status && prev.updatedBy === ch.updatedBy && prev.updatedAt === ch.updatedAt) {
          return;
        }
        renderChannel(ch);

        // Play sounds for teammates' updates (own clicks already played locally)
        if (channelsLoaded && prev && prev.status !== ch.status && ch.updatedBy !== myName) {
          if (ch.status === 'boss') sfx.playBossAlert();
          else if (ch.status === 'cleared') sfx.playCleared();
        }
      });

      state.channels = next;
      channelsLoaded = true;
      updateStats();
    },

    onLogs(logs) {
      const prevLast = state.logs[state.logs.length - 1];
      state.logs = logs;
      renderLogs();

      // Play a happy chime if a global reset just happened
      const last = logs[logs.length - 1];
      if (logsLoaded && last && last !== prevLast && last.type === 'reset-all') {
        sfx.playLevelUp();
      }
      logsLoaded = true;
    },

    onPresence(users) {
      state.onlineUsers = users;
      state.onlineCount = users.length;
      updateOnlineStatus();
    }
  });
}

// Render all channel components in grid
function renderAllChannels() {
  Object.values(state.channels).forEach(channel => {
    renderChannel(channel);
  });
}

// Render individual channel element
function renderChannel(channel) {
  const card = document.getElementById(`ch-card-${channel.id}`);
  const capacityLabel = document.getElementById(`ch-capacity-${channel.id}`);
  const barContainer = document.getElementById(`ch-bar-${channel.id}`);
  const updater = document.getElementById(`ch-updater-${channel.id}`);
  
  if (!card || !capacityLabel || !barContainer || !updater) return;

  // Reset classes
  card.className = `channel-card state-${channel.status}`;
  
  // Set capacity label and bar HTML based on status
  let capText = '';
  if (channel.status === 'unchecked') {
    capText = `[${ORIGINAL_CAPACITIES[channel.id - 1] || generateRandomCapacity(channel.id)}]`;
  } else if (channel.status === 'checking') {
    capText = '[巡邏中...]';
  } else if (channel.status === 'cleared') {
    capText = '[無王]';
  } else if (channel.status === 'boss') {
    capText = '[有王！]';
  }
  
  capacityLabel.textContent = capText;
  barContainer.innerHTML = getSegmentedBarHTML(channel.id, channel.status);
  
  // Set updater name
  updater.textContent = channel.updatedBy ? channel.updatedBy : '-';
  
  // Update timer label
  updateChannelTimer(channel);

  // Update tooltip title if in compact mode
  const isCompact = (state.totalChannels || sync.DEFAULT_TOTAL_CHANNELS) > 100;
  if (isCompact) {
    let statusText = '未檢查';
    if (channel.status === 'checking') statusText = '巡邏中';
    if (channel.status === 'cleared') statusText = '無王';
    if (channel.status === 'boss') statusText = '有王！';
    
    const cap = ORIGINAL_CAPACITIES[channel.id - 1] || generateRandomCapacity(channel.id);
    const updaterName = channel.updatedBy || '-';
    const timeStr = channel.updatedAt ? getElapsedTimeText(channel.updatedAt) : '-';
    
    card.title = `頻道 ${channel.id} [${cap}]\n狀態: ${statusText}\n標記人: ${updaterName}\n時間: ${timeStr}`;
  } else {
    card.removeAttribute('title');
  }
}

// Compute relative time string (e.g. 5m ago, 22s ago)
function updateChannelTimer(channel) {
  const timerLabel = document.getElementById(`ch-timer-${channel.id}`);
  if (!timerLabel) return;

  if (!channel.updatedAt || channel.status === 'unchecked' || channel.status === 'checking') {
    timerLabel.textContent = '-';
    return;
  }

  timerLabel.textContent = getElapsedTimeText(channel.updatedAt);
}

// Update all timers on tick
function tickTimers() {
  Object.values(state.channels).forEach(channel => {
    updateChannelTimer(channel);
  });
}

// Update statistics counters and bottom progress bar
function updateStats() {
  let unchecked = 0;
  let checking = 0;
  let cleared = 0;
  let boss = 0;

  Object.values(state.channels).forEach(ch => {
    if (ch.status === 'unchecked') unchecked++;
    if (ch.status === 'checking') checking++;
    if (ch.status === 'cleared') cleared++;
    if (ch.status === 'boss') boss++;
  });

  statUnchecked.textContent = unchecked;
  statChecking.textContent = checking;
  statCleared.textContent = cleared;
  statBoss.textContent = boss;

  // Progress is channels checked out of the total count
  const total = state.totalChannels || sync.DEFAULT_TOTAL_CHANNELS;
  const checked = cleared + boss;
  const percentage = Math.round((checked / total) * 100);
  
  progressPercentage.textContent = `${percentage}%`;
  progressBarFill.style.width = `${percentage}%`;
  
  // If progress is 100%, add a gold glow to bar
  if (percentage === 100) {
    progressBarFill.style.background = 'linear-gradient(to bottom, #f1c40f, #f39c12)';
  } else {
    progressBarFill.style.background = 'linear-gradient(to bottom, #2ecc71, #27ae60)';
  }
}

// Render online users list
function updateOnlineStatus() {
  onlineCountDisplay.textContent = state.onlineCount;
  onlineListContainer.innerHTML = '';
  
  if (state.onlineUsers.length === 0) {
    onlineListContainer.innerHTML = '<div class="teammate-tag system-user">只有你</div>';
    return;
  }

  state.onlineUsers.forEach(user => {
    const tag = document.createElement('div');
    tag.className = 'teammate-tag';
    tag.style.setProperty('--user-color', user.color);
    tag.textContent = user.username;
    onlineListContainer.appendChild(tag);
  });
}

// Render log entries
function renderLogs() {
  logContainer.innerHTML = '';
  chatMessages.innerHTML = '';

  state.logs.forEach(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString('zh-TW', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Create log item
    const logItem = document.createElement('div');
    logItem.className = `log-entry log-${log.type}`;
    logItem.innerHTML = `
      <span class="log-time">[${timeStr}]</span>
      <span class="log-user">${escapeHtml(log.user)}</span>
      <span class="log-text">${escapeHtml(log.text)}</span>
    `;
    logContainer.appendChild(logItem);

    // If chat type, add to chat window as well
    if (log.type === 'chat') {
      const chatItem = document.createElement('div');
      chatItem.className = 'chat-msg';
      chatItem.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="chat-msg-user" style="--user-color: ${/^#[0-9a-fA-F]{6}$/.test(log.color) ? log.color : '#333'}">${escapeHtml(log.user)}：</span>
        <span>${escapeHtml(log.text.replace('說：', ''))}</span>
      `;
      chatMessages.appendChild(chatItem);
    }
  });

  // Auto-scroll logs and chat to bottom
  logContainer.scrollTop = logContainer.scrollHeight;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Trigger browser click to start Audio Context (Chrome security requirement)
document.addEventListener('click', () => {
  sfx.resume();
}, { once: true });

// Event Listeners setup
function setupEventListeners() {
  // Mute button toggle event listener
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.muted = !sfx.muted;
      sfx.playClick();
      
      if (sfx.muted) {
        muteBtn.textContent = '🔇';
        muteBtn.title = '取消靜音';
      } else {
        muteBtn.textContent = '🔊';
        muteBtn.title = '切換靜音';
      }
      
      localStorage.setItem('msw_boss_muted', sfx.muted ? 'true' : 'false');
    });
  }
  // Channel count slider: show the value while dragging, sync on release
  channelCountInput.addEventListener('input', () => {
    channelCountValue.textContent = channelCountInput.value;
  });
  channelCountInput.addEventListener('change', () => {
    const count = Math.min(3000, Math.max(1, parseInt(channelCountInput.value, 10) || sync.DEFAULT_TOTAL_CHANNELS));
    sync.setChannelCount(count, state.currentUser.username);
  });

  // Username settings input change
  usernameInput.addEventListener('change', () => {
    let name = usernameInput.value.trim();
    if (!name) {
      name = '無名勇士';
      usernameInput.value = name;
    }
    state.currentUser.username = name;
    localStorage.setItem('msw_boss_username', name);
    
    sync.updatePresence(state.currentUser);
  });

  // Chat submit form handler
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    
    sync.chat(state.currentUser, text);
    
    chatInput.value = '';
    sfx.playClick();
  });

  // Reset All Channels click
  resetAllBtn.addEventListener('click', () => {
    sfx.playClick();
    const confirmReset = confirm('⚠️ 確定要重置所有頻道的巡邏狀態嗎？此動作將同步所有隊友畫面！');
    if (confirmReset) {
      sync.resetAll(state.currentUser.username);
    }
  });

  // Tab controls switching
  const tabs = document.querySelectorAll('.log-chat-card .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sfx.playClick();
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Activate selected
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      
      // Auto-scroll
      if (tabId === 'activity-tab') {
        logContainer.scrollTop = logContainer.scrollHeight;
      } else {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  });

  // Help Modal handlers
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.playClick();
    helpModal.style.display = 'flex';
  });

  const hideHelp = () => {
    sfx.playClick();
    helpModal.style.display = 'none';
  };

  closeHelpBtn.addEventListener('click', hideHelp);
  closeHelpConfirmBtn.addEventListener('click', hideHelp);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) hideHelp();
  });

  // Global mouse drag release listener (Requirement drag to mark)
  document.addEventListener('mouseup', () => {
    if (state.drag.isMouseDown) {
      if (!state.drag.hasDragged) {
        // Standard single click - cycle state
        cycleChannelState(state.drag.startChId);
      }
      state.drag.isMouseDown = false;
      state.drag.hasDragged = false;
      state.drag.startChId = null;
    }
  });

  // Global mobile touch drag listeners
  document.addEventListener('touchmove', (e) => {
    if (state.drag.isTouchDown) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      if (element) {
        const card = element.closest('.channel-card');
        if (card) {
          const chId = parseInt(card.getAttribute('data-ch'));
          if (chId) {
            if (chId !== state.drag.startChId) {
              state.drag.hasDragged = true;
              markChannelAsCleared(state.drag.startChId);
            }
            if (state.drag.hasDragged) {
              markChannelAsCleared(chId);
            }
          }
        }
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (state.drag.isTouchDown) {
      if (!state.drag.hasDragged) {
        cycleChannelState(state.drag.startChId);
      }
      state.drag.isTouchDown = false;
      state.drag.hasDragged = false;
      state.drag.startChId = null;
    }
  });
}

// Initialize Application
function init() {
  initUserSettings();
  initRoomUI();
  state.channels = buildChannels(state.totalChannels, {});
  generateGrid();
  renderAllChannels();
  updateStats();
  setupEventListeners();

  // Rejoin the saved room on refresh, unless the link points at a different room
  const urlRoom = (new URLSearchParams(window.location.search).get('room') || '').trim();
  const session = loadSession();
  if (session && (!urlRoom || urlRoom === session.roomId)) {
    enterRoom(session.roomId, session.roomKey);
  } else {
    showLobby(urlRoom);
  }
  
  // Start relative time ticker (ticks timers every 5 seconds)
  setInterval(tickTimers, 5000);
}

// Run init
window.addEventListener('DOMContentLoaded', init);
