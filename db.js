const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const DEFAULT_TOTAL_CHANNELS = 50;

function createInitialState() {
  const channels = {};
  for (let i = 1; i <= DEFAULT_TOTAL_CHANNELS; i++) {
    channels[i] = {
      id: i,
      status: 'unchecked', // 'unchecked', 'checking', 'cleared', 'boss'
      updatedBy: '',
      updatedAt: null
    };
  }
  return {
    totalChannels: DEFAULT_TOTAL_CHANNELS,
    channels,
    logs: [
      {
        timestamp: Date.now(),
        user: '系統',
        text: '頻道巡邏追蹤器已啟動。',
        type: 'system'
      }
    ]
  };
}

class Database {
  constructor() {
    this.data = null;
  }

  async init() {
    try {
      await fs.access(DB_PATH);
      const content = await fs.readFile(DB_PATH, 'utf-8');
      this.data = JSON.parse(content);
      
      // Ensure totalChannels exists in data
      if (this.data && typeof this.data.totalChannels !== 'number') {
        this.data.totalChannels = Object.keys(this.data.channels || {}).length || DEFAULT_TOTAL_CHANNELS;
      }
      
      const total = this.data.totalChannels;
      // Ensure all channels matching totalChannels exist
      if (!this.data.channels || Object.keys(this.data.channels).length !== total) {
        const initial = createInitialState();
        this.data.channels = this.data.channels || {};
        for (let i = 1; i <= total; i++) {
          if (!this.data.channels[i]) {
            this.data.channels[i] = {
              id: i,
              status: 'unchecked',
              updatedBy: '',
              updatedAt: null
            };
          }
        }
        // Remove channels that are above the total limit if any
        Object.keys(this.data.channels).forEach(key => {
          if (Number(key) > total) {
            delete this.data.channels[key];
          }
        });
        
        if (!this.data.logs) this.data.logs = initial.logs;
        await this.save();
      }
    } catch (err) {
      // File doesn't exist or is invalid, create initial data
      this.data = createInitialState();
      await this.save();
    }
  }

  async save() {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('儲存資料庫時發生錯誤:', err);
    }
  }

  // Get current state
  async getState() {
    if (!this.data) await this.init();
    return this.data;
  }

  // Get specific channel
  async getChannel(chId) {
    if (!this.data) await this.init();
    return this.data.channels[chId] || null;
  }

  // Update a channel's status
  async updateChannel(chId, status, user) {
    if (!this.data) await this.init();
    
    const total = this.data.totalChannels;
    if (chId < 1 || chId > total) {
      throw new Error(`無效的頻道號碼: ${chId}`);
    }

    const validStatuses = ['unchecked', 'checking', 'cleared', 'boss'];
    if (!validStatuses.includes(status)) {
      throw new Error(`無效的頻道狀態: ${status}`);
    }

    const updatedAt = Date.now();

    this.data.channels[chId] = {
      id: Number(chId),
      status,
      updatedBy: user || '未知',
      updatedAt
    };

    // Generate log message based on changes
    let logText = '';
    let logType = status;
    const chName = `頻道 ${chId}`;

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

    await this.addLog(user, logText, logType);
    await this.save();

    return this.data.channels[chId];
  }

  // Set total channel count dynamically
  async setTotalChannels(count, user) {
    if (!this.data) await this.init();

    const newCount = Number(count);
    if (isNaN(newCount) || newCount < 1 || newCount > 3000) {
      throw new Error(`無效的頻道數量: ${count}`);
    }

    const oldCount = this.data.totalChannels;
    if (newCount === oldCount) return this.data;

    this.data.totalChannels = newCount;

    if (newCount > oldCount) {
      // Add extra channels
      for (let i = oldCount + 1; i <= newCount; i++) {
        this.data.channels[i] = {
          id: i,
          status: 'unchecked',
          updatedBy: '',
          updatedAt: null
        };
      }
    } else {
      // Delete extra channels
      for (let i = newCount + 1; i <= oldCount; i++) {
        delete this.data.channels[i];
      }
    }

    const logText = `將頻道數量從 ${oldCount} 調整為 ${newCount}`;
    await this.addLog(user, logText, 'system');
    await this.save();

    return this.data;
  }

  // Reset all channels
  async resetAllChannels(user) {
    if (!this.data) await this.init();

    const total = this.data.totalChannels;
    for (let i = 1; i <= total; i++) {
      this.data.channels[i] = {
        id: i,
        status: 'unchecked',
        updatedBy: '',
        updatedAt: null
      };
    }

    const logText = '重置了所有頻道的巡邏狀態';
    await this.addLog(user, logText, 'reset-all');
    await this.save();

    return this.data.channels;
  }

  // Add an activity log
  async addLog(user, text, type = 'info') {
    if (!this.data) await this.init();

    const newLog = {
      timestamp: Date.now(),
      user: user || '系統',
      text,
      type
    };

    this.data.logs.push(newLog);

    // Limit log size to last 150 entries to keep file clean
    if (this.data.logs.length > 150) {
      this.data.logs = this.data.logs.slice(-150);
    }
  }

  // Clear log history
  async clearLogs(user) {
    if (!this.data) await this.init();
    this.data.logs = [
      {
        timestamp: Date.now(),
        user: '系統',
        text: '日誌紀錄已被清空。',
        type: 'system'
      }
    ];
    await this.save();
  }
}

const db = new Database();
module.exports = db;
