# 🍁 楓之谷頻道巡邏追蹤器 - 協作版 (MapleStory Channel Boss Tracker)

本專案是一個為《楓之谷》（MapleStory/MSW）打王設計的**頻道巡邏狀態追蹤系統**。支援多人透過 TCP/IP 在區域網路內即時同步狀態，並基於 HTML5/CSS/JavaScript 實作，介面風格高度還原遊戲內經典的「選擇頻道」視窗。

---

## 📂 專案檔案結構與原始碼連結

點擊以下連結可以直接查看或編輯專案檔案：

- ⚙️ **後端伺服器**：[server.js](file:///Users/zheng/playground/msw_channel_boss_proj/server.js)
  - 基於 Node.js / Express 與 WebSocket (`ws` 套件) 建立，負責連線管理、廣播更新與區域網路 IP 偵測。
- 💾 **資料持久層**：[db.js](file:///Users/zheng/playground/msw_channel_boss_proj/db.js)
  - 封裝資料讀寫為 `async` 非同步方法，目前儲存於本機 `db.json`，已保留未來對接 SQL/NoSQL 資料庫的完整擴充性。
- 🧱 **前端入口**：[index.html](file:///Users/zheng/playground/msw_channel_boss_proj/public/index.html)
  - 定義經典頻道視窗、個人與房間設定面板、實時巡邏日誌與隊友聊天室。
- 🎨 **視覺樣式**：[style.css](file:///Users/zheng/playground/msw_channel_boss_proj/public/style.css)
  - 包含經典金屬邊框、浮空雲朵動畫，以及複刻分段容量格。同時包含針對大頻道數量的**動態分割畫面（獨立滾動）與極簡微縮卡片樣式**（X軸溢出修復，看板自動寬度縮放）。
- 🧠 **前端邏輯與音效**：[app.js](file:///Users/zheng/playground/msw_channel_boss_proj/public/app.js)
  - 實作無選單的**快速循環點擊**、**音效靜音切換**、**動態頻道分欄**、**懸停資訊提示 (Tooltip)**、**滑鼠/觸控拖曳快速標記** 與 **看板寬度自動響應式收縮/舒張**。
- 📦 **套件設定**：[package.json](file:///Users/zheng/playground/msw_channel_boss_proj/package.json)

---

## 🛠️ 新增核心功能與設計特點

### 1. 🖥️ 大頻道動態分割與看板寬度自適應 (Dynamic Layout Scaling)
當您調整頻道數量較多時，單一垂直列表會過於冗長。系統會自動偵測頻道總數，對頻道網格進行**動態分欄分割**，並同時**動態縮放整個看板的寬度**：
- **動態看板寬度 (splits-N)**：
  - **1 欄模式 (<=1000 頻道)**：看板自動收縮，主容器最大寬度設定為 **$1050\text{px}$**，緊湊精巧。
  - **2 欄分割 (1001-2000 頻道)**：看板自動拓寬，主容器最大寬度調整為 **$1380\text{px}$**，以容納 2 個獨立分欄。
  - **3 欄分割 (2001-3000 頻道)**：看板舒張到最大，主容器最大寬度調整為 **$1750\text{px}$**，輕鬆並排 3 個獨立分欄。
- **平滑過渡動畫 (Resizing Transition)**：當您在輸入框修改頻道數時，整個看板與視窗會以平滑的貝氏曲線動畫（`cubic-bezier(0.25, 0.8, 0.25, 1)`）在 $0.35$ 秒內向兩側舒張或收縮，體驗極具高級感與動態回饋。
- **獨立滾動軸 (Independent Column Scroll)**：每一欄都擁有獨立的垂直滾動條，您可以互不干擾地在不同分欄內滾動瀏覽。

### 2. 🔢 嚴格 10 行列對齊 (N*10 Alignment)
- **定位優勢**：取消自適應 `auto-fill`，強制作為 **每橫列正好 10 個頻道** 的網格（`repeat(10, 1fr)`）。第一直行永遠是尾數 1，第十直行永遠是尾數 0，如乘法表般一眼鎖定特定頻道。
- **X軸溢出修復**：卡片加入 `min-width: 0 !important`，字體設定 `clip`，保障三直欄完美塞入寬度中，**完全不需要橫向滑動X軸滑桿**即可完整展現 Ch 1-3000 的所有末尾方格。

### 3. 🔲 微縮卡片與懸停詳細資訊 (Compact Tiles & Tooltips)
- **微縮卡片**：卡片尺寸縮小為方塊，僅顯示頻道號碼數字，以**滿版背景色**代表狀態。
- **懸停詳細資訊 (Tooltip)**：將滑鼠游標懸停在微縮卡片上，會自動跳出詳細提示氣泡：顯示該頻道的完整名稱、精確容量比例（如 `[58/65]`）、狀態名稱、標記更新者以及精確的經過時間。

### 4. 🔄 快速循環點擊狀態 (Direct Click-Cycling) 與 🖱️ 拖曳快速標記 (Drag-to-Mark)
- 滑鼠按住拖曳或觸控拖曳滑過卡片，均能一筆將路徑上所有頻道漆綠標記為「無王」。

### 5. 🔊 獨立音效開關按鈕 (Mute Switch)
- **靜音切換 (🔊 / 🔇)**：位於右上角標題控制列，設定會自動存入 `localStorage` 記憶偏好。

---

## 🚀 啟動與多人協作連線指南

### 1. 啟動伺服器
請於本專案資料夾路徑下執行以下指令啟動伺服器：
```bash
npm start
```

伺服器啟動成功後，控制台會自動分析並輸出您的 **本機網址** 與 **區域網路 (LAN) IP 網址**（例如 `http://192.168.21.106:3000`）。請隊友在同一個 Wi-Fi 下連入此 LAN IP，即可即時同步所有標記與分欄。
