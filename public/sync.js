// Firebase Realtime Database sync layer (replaces the old WebSocket server)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getDatabase, ref, child, push, set, update, onValue, onDisconnect,
  query, limitToLast, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

const DEFAULT_TOTAL_CHANNELS = 50;
const MAX_LOGS = 150;

let roomRef = null;
let presenceRef = null;
let totalChannels = DEFAULT_TOTAL_CHANNELS;

export function isConfigured() {
  return !String(firebaseConfig.apiKey || '').startsWith('YOUR_');
}

function addLog(user, text, type, extra = {}) {
  return push(child(roomRef, 'logs'), {
    timestamp: serverTimestamp(),
    user: user || '系統',
    text,
    type,
    ...extra
  });
}

// handlers: { onConnection(bool), onMeta(totalChannels), onChannels(sparseMap), onLogs(array), onPresence(array) }
export function connect(roomId, user, handlers) {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  roomRef = ref(db, `rooms/${roomId}`);
  presenceRef = push(child(roomRef, 'presence'));

  let joinedLogged = false;
  onValue(ref(db, '.info/connected'), (snap) => {
    const connected = snap.val() === true;
    handlers.onConnection(connected);
    if (!connected) return;

    // Re-register presence on every (re)connect
    onDisconnect(presenceRef).remove().then(() => {
      set(presenceRef, { username: user.username, color: user.color });
    });
    if (!joinedLogged) {
      joinedLogged = true;
      addLog(user.username, '加入了房間', 'join');
    }
  });

  onValue(child(roomRef, 'meta/totalChannels'), (snap) => {
    totalChannels = snap.exists() ? snap.val() : DEFAULT_TOTAL_CHANNELS;
    handlers.onMeta(totalChannels);
  });

  onValue(child(roomRef, 'channels'), (snap) => {
    handlers.onChannels(snap.val() || {});
  });

  onValue(query(child(roomRef, 'logs'), limitToLast(MAX_LOGS)), (snap) => {
    const logs = [];
    snap.forEach((s) => { logs.push(s.val()); });
    handlers.onLogs(logs);
  });

  onValue(child(roomRef, 'presence'), (snap) => {
    handlers.onPresence(Object.values(snap.val() || {}));
  });
}

export function updatePresence(user) {
  if (!presenceRef) return;
  set(presenceRef, { username: user.username, color: user.color });
}

export function updateChannel(chId, status, username) {
  if (!roomRef) return;
  const chRef = child(roomRef, `channels/${chId}`);
  // Unchecked channels are not stored (sparse map)
  if (status === 'unchecked') {
    set(chRef, null);
  } else {
    set(chRef, { status, updatedBy: username || '未知', updatedAt: serverTimestamp() });
  }

  const chName = `頻道 ${chId}`;
  let logText = '';
  let logType = status;
  if (status === 'unchecked') {
    logText = `重設了 ${chName} 的狀態`;
    logType = 'reset';
  } else if (status === 'checking') {
    logText = `開始巡邏 ${chName}`;
  } else if (status === 'cleared') {
    logText = `回報 ${chName} [無王]`;
  } else if (status === 'boss') {
    logText = `🚨 在 ${chName} 發現了王！`;
  }
  addLog(username, logText, logType);
}

export function resetAll(username) {
  if (!roomRef) return;
  set(child(roomRef, 'channels'), null);
  addLog(username, '重置了所有頻道的巡邏狀態', 'reset-all');
}

export function setChannelCount(count, username) {
  if (!roomRef) return;
  const oldCount = totalChannels;
  if (count === oldCount) return;

  const updates = { 'meta/totalChannels': count };
  // Drop marks for channels that no longer exist
  for (let i = count + 1; i <= oldCount; i++) {
    updates[`channels/${i}`] = null;
  }
  update(roomRef, updates);
  addLog(username, `將頻道數量從 ${oldCount} 調整為 ${count}`, 'system');
}

export function chat(user, text) {
  if (!roomRef) return;
  addLog(user.username, `說：${text}`, 'chat', { color: user.color });
}
