const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API endpoints (optional fallback/utility)
app.get('/api/state', async (req, res) => {
  try {
    const state = await db.getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Store active users: key is WebSocket instance, value is user details
const activeUsers = new Map();

// Helper to broadcast message to all connected clients
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Get lists of active user names
function getActiveUsersList() {
  const users = [];
  activeUsers.forEach(user => {
    if (user.username) {
      users.push({
        username: user.username,
        color: user.color || '#4385f4'
      });
    }
  });
  return users;
}

// WebSocket communication handler
wss.on('connection', async (ws) => {
  console.log('新隊友連線進入');
  
  // Set default temp user info
  activeUsers.set(ws, { username: '', color: '#e1e1e1' });

  try {
    // Send initial state to the newly connected client
    const state = await db.getState();
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      data: {
        totalChannels: state.totalChannels,
        channels: state.channels,
        logs: state.logs,
        onlineCount: wss.clients.size,
        onlineUsers: getActiveUsersList()
      }
    }));

    // Broadcast updated online count
    broadcast({
      type: 'ONLINE_COUNT_UPDATE',
      data: {
        onlineCount: wss.clients.size,
        onlineUsers: getActiveUsersList()
      }
    });
  } catch (err) {
    console.error('初始化連線狀態錯誤:', err);
  }

  // Handle messages from client
  ws.on('message', async (messageStr) => {
    try {
      const message = JSON.parse(messageStr);
      console.log('收到訊息:', message.type, message.data);

      switch (message.type) {
        case 'JOIN': {
          const { username, color } = message.data;
          const oldInfo = activeUsers.get(ws);
          
          activeUsers.set(ws, { username, color });
          
          // Log join event if it's their first time sending a nickname
          if (!oldInfo.username && username) {
            await db.addLog(username, `加入了房間`, 'join');
            const state = await db.getState();
            broadcast({
              type: 'STATE_UPDATE',
              data: {
                totalChannels: state.totalChannels,
                channels: state.channels,
                logs: state.logs
              }
            });
          }

          // Broadcast updated user list
          broadcast({
            type: 'ONLINE_USERS_UPDATE',
            data: {
              onlineUsers: getActiveUsersList()
            }
          });
          break;
        }

        case 'UPDATE_CHANNEL': {
          const { channelId, status, username } = message.data;
          
          // Update DB state
          const updatedChannel = await db.updateChannel(channelId, status, username);
          const state = await db.getState();
          
          // Broadcast update to everyone
          broadcast({
            type: 'CHANNEL_UPDATED',
            data: {
              channel: updatedChannel,
              logs: state.logs
            }
          });
          break;
        }

        case 'RESET_ALL': {
          const { username } = message.data;
          
          // Reset DB state
          await db.resetAllChannels(username);
          const state = await db.getState();
          
          // Broadcast reset
          broadcast({
            type: 'STATE_UPDATE',
            data: {
              totalChannels: state.totalChannels,
              channels: state.channels,
              logs: state.logs
            }
          });
          break;
        }

        case 'CHAT': {
          const { username, text } = message.data;
          if (!username || !text.trim()) return;

          await db.addLog(username, `說：${text}`, 'chat');
          const state = await db.getState();

          broadcast({
            type: 'STATE_UPDATE',
            data: {
              totalChannels: state.totalChannels,
              channels: state.channels,
              logs: state.logs
            }
          });
          break;
        }

        case 'SET_CHANNEL_COUNT': {
          const { count, username } = message.data;
          await db.setTotalChannels(count, username);
          const state = await db.getState();

          broadcast({
            type: 'STATE_UPDATE',
            data: {
              totalChannels: state.totalChannels,
              channels: state.channels,
              logs: state.logs
            }
          });
          break;
        }

        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;

        default:
          console.warn('未知的訊息類型:', message.type);
      }
    } catch (err) {
      console.error('處理 WebSocket 訊息錯誤:', err);
    }
  });

  // Handle client disconnection
  ws.on('close', async () => {
    console.log('隊友中斷連線');
    const userInfo = activeUsers.get(ws);
    activeUsers.delete(ws);

    if (userInfo && userInfo.username) {
      // Optional: Add log when someone leaves
      // await db.addLog(userInfo.username, `離開了房間`, 'leave');
    }

    const state = await db.getState();
    // Broadcast updated counts
    broadcast({
      type: 'ONLINE_COUNT_UPDATE',
      data: {
        onlineCount: wss.clients.size,
        onlineUsers: getActiveUsersList(),
        logs: state.logs // if we had added a log
      }
    });
  });
});

// Helper to get local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Start Server
async function start() {
  await db.init();
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🍁 楓之谷頻道巡邏追蹤器伺服器已成功啟動！`);
    console.log(`------------------------------------------------------`);
    console.log(`本機網址 (Host): http://localhost:${PORT}`);
    
    const localIps = getLocalIpAddresses();
    if (localIps.length > 0) {
      console.log(`隊友連線網址 (LAN IP):`);
      localIps.forEach(ip => {
        console.log(`   👉 http://${ip}:${PORT}`);
      });
      console.log(`\n提示：請確保您的隊友與您在同一個 WiFi/區域網路下，`);
      console.log(`並在瀏覽器輸入上述 LAN IP 網址即可一同同步巡邏！`);
    } else {
      console.log(`無法偵測到區域網路 IP。若要與隊友連線，請檢查網路設定。`);
    }
    console.log(`======================================================\n`);
  });
}

start();
