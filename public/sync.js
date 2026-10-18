// Firebase Realtime Database sync layer (replaces the old WebSocket server)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getDatabase, ref, child, get, push, set, update, onValue, onDisconnect,
  query, limitToLast, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

export const DEFAULT_TOTAL_CHANNELS = 1000;
const MAX_LOGS = 150;

let db = null;
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

function getDb() {
  if (!db) db = getDatabase(initializeApp(firebaseConfig));
  return db;
}

// PBKDF2 so the password can't be cheaply brute-forced from the public verifier
async function derive(purpose, roomId, password) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`msw-${purpose}:${roomId}`), iterations: 150000 },
    baseKey, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

// Room data lives at rooms/<key>, where key is derived from room ID + password,
// so it can't be found without the password. lobby/<roomId> only holds a separate
// verifier so we can tell "wrong password" apart from "room doesn't exist".
export async function createRoom(roomId, password) {
  const lobbyRef = ref(getDb(), `lobby/${roomId}`);
  if ((await get(lobbyRef)).exists()) throw new Error('exists');

  const [verifier, roomKey] = await Promise.all([
    derive('verify', roomId, password),
    derive('room', roomId, password)
  ]);
  try {
    await set(lobbyRef, { verifier, createdAt: serverTimestamp() });
  } catch (err) {
    // Rules make lobby entries write-once, so losing a creation race lands here
    if (String(err.message).includes('PERMISSION_DENIED')) throw new Error('exists');
    throw err;
  }
  await set(ref(getDb(), `rooms/${roomKey}/meta/totalChannels`), DEFAULT_TOTAL_CHANNELS);
  return roomKey;
}

export async function joinRoom(roomId, password) {
  const snap = await get(ref(getDb(), `lobby/${roomId}`));
  if (!snap.exists()) throw new Error('notfound');
  const verifier = await derive('verify', roomId, password);
  if (snap.val().verifier !== verifier) throw new Error('badpassword');
  return derive('room', roomId, password);
}

// handlers: { onConnection(bool), onMeta(totalChannels), onChannels(sparseMap), onLogs(array), onPresence(array) }
export function connect(roomKey, user, handlers) {
  const db = getDb();
  roomRef = ref(db, `rooms/${roomKey}`);
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
