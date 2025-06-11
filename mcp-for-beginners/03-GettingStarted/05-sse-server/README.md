# 05 - SSEサーバーの作成

## 📖 概要

この節では、Server-Sent Events (SSE) を使用したModel Context Protocol (MCP) サーバーを作成します。SSEの基本概念、Webベースのクライアントとの連携、リアルタイム通信の実装について学習します。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- SSE（Server-Sent Events）の基本概念を理解できる
- SSEを使用したMCPサーバーを作成できる
- Webブラウザベースのクライアントを実装できる
- リアルタイム通信を活用したアプリケーションを構築できる
- クロスオリジンリクエスト（CORS）を適切に処理できる

## 🛠️ 前提条件

- [01-first-server](../01-first-server/) が完了していること
- HTTP とWebの基本的な知識
- Node.js と Express.js の基本的な知識

## 📁 プロジェクトの設定

### 1. プロジェクトディレクトリの作成

```bash
mkdir mcp-sse-server
cd mcp-sse-server

# package.jsonの初期化
npm init -y
```

### 2. 必要なパッケージのインストール

```bash
# MCP SDK のインストール
npm install @modelcontextprotocol/sdk

# Web サーバー用のパッケージ
npm install express cors

# 開発用依存関係のインストール
npm install -D typescript @types/node @types/express @types/cors tsx nodemon

# TypeScript設定ファイルの作成
npx tsc --init
```

### 3. プロジェクト構造の作成

```bash
mkdir -p src/{server,client,tools,public}
touch src/server/sse-server.ts
touch src/client/web-client.html
touch src/tools/enhanced-tools.ts
```

最終的なプロジェクト構造：

```
mcp-sse-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── server/
│   │   └── sse-server.ts
│   ├── client/
│   │   └── web-client.html
│   ├── tools/
│   │   └── enhanced-tools.ts
│   └── public/
│       ├── index.html
│       ├── client.js
│       └── style.css
└── README.md
```

## 🚀 SSE MCPサーバーの実装

### 1. メインサーバーファイルの作成

```typescript
// src/server/sse-server.ts
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { enhancedTools } from '../tools/enhanced-tools.js';
import path from 'path';

class MCPSSEServer {
  private app: express.Application;
  private mcpServer: Server;
  private connectedClients: Set<string> = new Set();

  constructor() {
    this.app = express();
    this.setupExpress();
    this.setupMCPServer();
  }

  private setupExpress(): void {
    // CORS設定
    this.app.use(cors({
      origin: true, // 開発環境では全てのオリジンを許可
      credentials: true
    }));

    // JSON パーサー
    this.app.use(express.json());

    // 静的ファイルの提供
    this.app.use(express.static(path.join(__dirname, '../../public')));

    // ログ記録ミドルウェア
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupMCPServer(): void {
    // MCPサーバーの初期化
    this.mcpServer = new Server(
      {
        name: "mcp-sse-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers(): void {
    // ツール一覧の提供
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "weather",
            description: "指定された都市の天気情報を取得",
            inputSchema: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "都市名"
                },
                country: {
                  type: "string",
                  description: "国名（オプション）"
                }
              },
              required: ["city"]
            }
          },
          {
            name: "calculator",
            description: "数式を計算",
            inputSchema: {
              type: "object",
              properties: {
                expression: {
                  type: "string",
                  description: "計算する数式（例: 2 + 3 * 4）"
                }
              },
              required: ["expression"]
            }
          },
          {
            name: "uuid_generator",
            description: "UUIDを生成",
            inputSchema: {
              type: "object",
              properties: {
                version: {
                  type: "number",
                  description: "UUIDのバージョン（デフォルト: 4）",
                  default: 4
                },
                count: {
                  type: "number",
                  description: "生成する個数（デフォルト: 1）",
                  default: 1
                }
              }
            }
          },
          {
            name: "qr_generator",
            description: "QRコードを生成",
            inputSchema: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "QRコードに埋め込むテキスト"
                },
                size: {
                  type: "number",
                  description: "QRコードのサイズ（デフォルト: 200）",
                  default: 200
                }
              },
              required: ["text"]
            }
          },
          {
            name: "current_time",
            description: "現在時刻を様々な形式で取得",
            inputSchema: {
              type: "object",
              properties: {
                timezone: {
                  type: "string",
                  description: "タイムゾーン（例: Asia/Tokyo）"
                },
                format: {
                  type: "string",
                  description: "時刻フォーマット（iso, local, unix）",
                  default: "local"
                }
              }
            }
          }
        ]
      };
    });

    // ツール実行の処理
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        console.log(`ツール実行: ${name}`, args);
        const result = await enhancedTools.executeTool(name, args);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`ツール実行エラー [${name}]:`, error);
        throw new Error(`Tool execution failed: ${error}`);
      }
    });
  }

  private setupResourceHandlers(): void {
    // リソース一覧の提供
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "sse://server-stats",
            name: "Server Statistics",
            description: "サーバーの統計情報",
            mimeType: "application/json"
          },
          {
            uri: "sse://connected-clients",
            name: "Connected Clients",
            description: "接続中のクライアント一覧",
            mimeType: "application/json"
          },
          {
            uri: "sse://server-info",
            name: "Server Information",
            description: "サーバーの詳細情報",
            mimeType: "application/json"
          }
        ]
      };
    });

    // リソース読み取りの処理
    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      let data: any;
      
      switch (uri) {
        case "sse://server-stats":
          data = {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            connectedClients: this.connectedClients.size,
            timestamp: new Date().toISOString()
          };
          break;
          
        case "sse://connected-clients":
          data = {
            clients: Array.from(this.connectedClients),
            count: this.connectedClients.size,
            timestamp: new Date().toISOString()
          };
          break;
          
        case "sse://server-info":
          data = {
            name: "MCP SSE Server",
            version: "1.0.0",
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            startTime: new Date().toISOString()
          };
          break;
          
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
      
      return {
        contents: [
          {
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    });
  }

  private setupSSEEndpoint(): void {
    // SSE エンドポイント
    this.app.get('/mcp', (req, res) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`新しいSSE接続: ${clientId}`);
      this.connectedClients.add(clientId);

      // SSE ヘッダーの設定
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // MCP Transport の作成
      const transport = new SSEServerTransport('/mcp', res);
      
      // MCP サーバーと接続
      this.mcpServer.connect(transport).catch(error => {
        console.error('MCP接続エラー:', error);
      });

      // 接続終了の処理
      req.on('close', () => {
        console.log(`SSE接続終了: ${clientId}`);
        this.connectedClients.delete(clientId);
      });

      req.on('error', (error) => {
        console.error(`SSE接続エラー [${clientId}]:`, error);
        this.connectedClients.delete(clientId);
      });
    });
  }

  private setupAPIEndpoints(): void {
    // ヘルスチェック
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        connectedClients: this.connectedClients.size,
        timestamp: new Date().toISOString()
      });
    });

    // サーバー情報
    this.app.get('/api/info', (req, res) => {
      res.json({
        name: 'MCP SSE Server',
        version: '1.0.0',
        mcpVersion: '2024-11-05',
        connectedClients: this.connectedClients.size,
        uptime: process.uptime()
      });
    });

    // 接続中のクライアント一覧
    this.app.get('/api/clients', (req, res) => {
      res.json({
        clients: Array.from(this.connectedClients),
        count: this.connectedClients.size
      });
    });
  }

  public start(port: number = 3000): void {
    this.setupSSEEndpoint();
    this.setupAPIEndpoints();

    this.app.listen(port, () => {
      console.log(`🚀 MCP SSE Server started on port ${port}`);
      console.log(`📡 SSE endpoint: http://localhost:${port}/mcp`);
      console.log(`🌐 Web client: http://localhost:${port}`);
      console.log(`💚 Health check: http://localhost:${port}/health`);
    });

    // グレースフル終了の処理
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      process.exit(0);
    });
  }
}

// サーバーの起動
if (require.main === module) {
  const server = new MCPSSEServer();
  const port = parseInt(process.env.PORT || '3000');
  server.start(port);
}

export { MCPSSEServer };
```

### 2. 拡張ツールの実装

```typescript
// src/tools/enhanced-tools.ts
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface WeatherData {
  city: string;
  country?: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
}

export class EnhancedTools {
  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'weather':
        return this.getWeather(args.city, args.country);
      case 'calculator':
        return this.calculate(args.expression);
      case 'uuid_generator':
        return this.generateUUID(args.version, args.count);
      case 'qr_generator':
        return this.generateQR(args.text, args.size);
      case 'current_time':
        return this.getCurrentTime(args.timezone, args.format);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getWeather(city: string, country?: string): Promise<WeatherData> {
    // 模擬的な天気データを生成（実際のAPIを使用する場合は、ここでAPIコールを行う）
    const temperatures = [-5, 0, 5, 10, 15, 20, 25, 30, 35];
    const descriptions = ['晴れ', '曇り', '雨', '雪', '霧', '雷雨'];
    
    const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
    const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // 実際のAPIを使用する場合の例（OpenWeatherMap）
    /*
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ja`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    };
    */

    return {
      city: city,
      country: country || 'JP',
      temperature: randomTemp,
      description: randomDesc,
      humidity: Math.floor(Math.random() * 100),
      windSpeed: Math.floor(Math.random() * 20)
    };
  }

  private calculate(expression: string): any {
    try {
      // セキュリティのため、許可された文字のみを使用
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      
      if (sanitized !== expression) {
        throw new Error('Invalid characters in expression');
      }

      // eval の代替として Function を使用（より安全）
      const result = Function(`"use strict"; return (${sanitized})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result');
      }

      return {
        expression: expression,
        result: result,
        sanitized: sanitized
      };
    } catch (error) {
      throw new Error(`Calculation error: ${error}`);
    }
  }

  private generateUUID(version: number = 4, count: number = 1): any {
    const uuids: string[] = [];
    
    for (let i = 0; i < Math.min(count, 100); i++) { // 最大100個まで
      if (version === 4) {
        uuids.push(uuidv4());
      } else {
        // 他のバージョンのサポートを追加可能
        uuids.push(uuidv4());
      }
    }

    return {
      version: version,
      count: uuids.length,
      uuids: uuids
    };
  }

  private generateQR(text: string, size: number = 200): any {
    // QRコード生成の模擬実装
    // 実際には qrcode ライブラリなどを使用
    
    const maxSize = Math.min(size, 1000);
    const qrData = {
      text: text,
      size: maxSize,
      url: `https://api.qrserver.com/v1/create-qr-code/?size=${maxSize}x${maxSize}&data=${encodeURIComponent(text)}`,
      format: 'PNG'
    };

    return qrData;
  }

  private getCurrentTime(timezone?: string, format: string = 'local'): any {
    const now = new Date();
    
    let formattedTime: string;
    let timestamp: number = now.getTime();

    switch (format) {
      case 'iso':
        formattedTime = now.toISOString();
        break;
      case 'unix':
        formattedTime = Math.floor(timestamp / 1000).toString();
        break;
      case 'local':
      default:
        if (timezone) {
          formattedTime = now.toLocaleString('ja-JP', { timeZone: timezone });
        } else {
          formattedTime = now.toLocaleString('ja-JP');
        }
        break;
    }

    return {
      timestamp: timestamp,
      formatted: formattedTime,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      format: format,
      iso: now.toISOString()
    };
  }
}

export const enhancedTools = new EnhancedTools();
```

### 3. Webクライアントの実装

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP SSE Client</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🔗 MCP SSE Client</h1>
            <div class="status-bar">
                <span id="connection-status" class="status disconnected">未接続</span>
                <span id="server-info"></span>
            </div>
        </header>

        <main>
            <div class="panels">
                <!-- 接続パネル -->
                <div class="panel">
                    <h2>📡 接続</h2>
                    <div class="controls">
                        <button id="connect-btn" class="btn primary">接続</button>
                        <button id="disconnect-btn" class="btn secondary" disabled>切断</button>
                    </div>
                </div>

                <!-- ツールパネル -->
                <div class="panel">
                    <h2>🔧 利用可能なツール</h2>
                    <div id="tools-list" class="tools-grid">
                        <p class="placeholder">サーバーに接続してください</p>
                    </div>
                </div>

                <!-- 実行パネル -->
                <div class="panel">
                    <h2>⚡ ツール実行</h2>
                    <div id="tool-execution">
                        <select id="tool-select" disabled>
                            <option value="">ツールを選択...</option>
                        </select>
                        <div id="tool-params"></div>
                        <button id="execute-btn" class="btn primary" disabled>実行</button>
                    </div>
                </div>

                <!-- 結果パネル -->
                <div class="panel">
                    <h2>📋 実行結果</h2>
                    <div id="results" class="results-area">
                        <p class="placeholder">結果がここに表示されます</p>
                    </div>
                    <button id="clear-results" class="btn secondary">クリア</button>
                </div>
            </div>

            <!-- ログパネル -->
            <div class="panel full-width">
                <h2>📜 ログ</h2>
                <div id="log-area" class="log-area"></div>
                <button id="clear-log" class="btn secondary">ログクリア</button>
            </div>
        </main>
    </div>

    <script src="client.js"></script>
</body>
</html>
```

```css
/* public/style.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f5f5;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 30px;
}

header h1 {
    color: #2c3e50;
    margin-bottom: 10px;
}

.status-bar {
    display: flex;
    justify-content: center;
    gap: 20px;
    align-items: center;
}

.status {
    padding: 5px 15px;
    border-radius: 15px;
    font-size: 14px;
    font-weight: bold;
}

.status.connected {
    background-color: #27ae60;
    color: white;
}

.status.disconnected {
    background-color: #e74c3c;
    color: white;
}

.status.connecting {
    background-color: #f39c12;
    color: white;
}

.panels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.panel {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.panel.full-width {
    grid-column: 1 / -1;
}

.panel h2 {
    margin-bottom: 15px;
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 5px;
}

.controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

.btn.primary {
    background-color: #3498db;
    color: white;
}

.btn.primary:hover:not(:disabled) {
    background-color: #2980b9;
}

.btn.secondary {
    background-color: #95a5a6;
    color: white;
}

.btn.secondary:hover:not(:disabled) {
    background-color: #7f8c8d;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
}

.tool-card {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
    cursor: pointer;
    transition: background-color 0.3s;
}

.tool-card:hover {
    background-color: #e8f4f8;
}

.tool-card.selected {
    background-color: #3498db;
    color: white;
}

.tool-card h3 {
    margin-bottom: 5px;
    font-size: 16px;
}

.tool-card p {
    font-size: 12px;
    color: #666;
}

.tool-card.selected p {
    color: #ecf0f1;
}

#tool-execution {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

#tool-select {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 14px;
}

#tool-params {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.param-input {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.param-input label {
    font-weight: bold;
    color: #2c3e50;
}

.param-input input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 14px;
}

.results-area, .log-area {
    min-height: 200px;
    max-height: 400px;
    overflow-y: auto;
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 5px;
    border: 1px solid #e9ecef;
    font-family: 'Courier New', monospace;
    font-size: 13px;
}

.log-entry {
    margin-bottom: 10px;
    padding: 5px;
    border-left: 3px solid #3498db;
    background-color: white;
}

.log-entry.error {
    border-left-color: #e74c3c;
    background-color: #fdf2f2;
}

.log-entry.success {
    border-left-color: #27ae60;
    background-color: #f2fdf5;
}

.log-timestamp {
    color: #7f8c8d;
    font-size: 11px;
}

.placeholder {
    color: #7f8c8d;
    font-style: italic;
    text-align: center;
    padding: 20px;
}

@media (max-width: 768px) {
    .panels {
        grid-template-columns: 1fr;
    }
    
    .controls {
        justify-content: center;
    }
    
    .tools-grid {
        grid-template-columns: 1fr;
    }
}
```

```javascript
// public/client.js
class MCPSSEClient {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.availableTools = [];
        this.requestId = 0;
        this.pendingRequests = new Map();
        
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        this.elements = {
            connectBtn: document.getElementById('connect-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            connectionStatus: document.getElementById('connection-status'),
            serverInfo: document.getElementById('server-info'),
            toolsList: document.getElementById('tools-list'),
            toolSelect: document.getElementById('tool-select'),
            toolParams: document.getElementById('tool-params'),
            executeBtn: document.getElementById('execute-btn'),
            results: document.getElementById('results'),
            clearResults: document.getElementById('clear-results'),
            logArea: document.getElementById('log-area'),
            clearLog: document.getElementById('clear-log')
        };
    }

    bindEvents() {
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.toolSelect.addEventListener('change', (e) => this.onToolSelect(e.target.value));
        this.elements.executeBtn.addEventListener('click', () => this.executeTool());
        this.elements.clearResults.addEventListener('click', () => this.clearResults());
        this.elements.clearLog.addEventListener('click', () => this.clearLog());
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <div class="log-timestamp">[${timestamp}]</div>
            <div>${message}</div>
        `;
        
        this.elements.logArea.appendChild(logEntry);
        this.elements.logArea.scrollTop = this.elements.logArea.scrollHeight;
    }

    updateConnectionStatus(status) {
        this.elements.connectionStatus.textContent = status;
        this.elements.connectionStatus.className = `status ${status.toLowerCase().replace(/[^a-z]/g, '')}`;
    }

    async connect() {
        if (this.isConnected) return;

        try {
            this.updateConnectionStatus('接続中');
            this.log('MCPサーバーに接続中...');

            // Server-Sent Events 接続の確立
            this.eventSource = new EventSource('/mcp');

            this.eventSource.onopen = () => {
                this.isConnected = true;
                this.updateConnectionStatus('接続済み');
                this.elements.connectBtn.disabled = true;
                this.elements.disconnectBtn.disabled = false;
                this.log('SSE接続が確立されました', 'success');
                
                // 初期化と機能発見を開始
                this.initializeConnection();
            };

            this.eventSource.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.eventSource.onerror = (error) => {
                this.log('SSE接続エラー: ' + error, 'error');
                this.disconnect();
            };

        } catch (error) {
            this.log('接続エラー: ' + error.message, 'error');
            this.updateConnectionStatus('未接続');
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.isConnected = false;
        this.updateConnectionStatus('未接続');
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
        this.elements.toolSelect.disabled = true;
        this.elements.executeBtn.disabled = true;
        
        this.availableTools = [];
        this.updateToolsList();
        
        this.log('接続を切断しました');
    }

    async initializeConnection() {
        try {
            // サーバー情報を取得
            const serverInfo = await fetch('/api/info').then(r => r.json());
            this.elements.serverInfo.textContent = `${serverInfo.name} v${serverInfo.version}`;
            
            // ツール一覧を取得
            await this.loadTools();
            
        } catch (error) {
            this.log('初期化エラー: ' + error.message, 'error');
        }
    }

    async loadTools() {
        const request = {
            jsonrpc: "2.0",
            id: ++this.requestId,
            method: "tools/list"
        };

        return this.sendRequest(request);
    }

    sendRequest(request) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('サーバーに接続されていません'));
                return;
            }

            this.pendingRequests.set(request.id, { resolve, reject });
            
            // SSEではPOSTリクエストを送信
            fetch('/mcp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            }).catch(error => {
                this.pendingRequests.delete(request.id);
                reject(error);
            });
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            if (message.id && this.pendingRequests.has(message.id)) {
                const { resolve, reject } = this.pendingRequests.get(message.id);
                this.pendingRequests.delete(message.id);
                
                if (message.error) {
                    reject(new Error(message.error.message));
                } else {
                    resolve(message.result);
                    this.handleRequestResult(message);
                }
            } else {
                // 通知メッセージの処理
                this.log(`通知: ${JSON.stringify(message)}`);
            }
            
        } catch (error) {
            this.log('メッセージ解析エラー: ' + error.message, 'error');
        }
    }

    handleRequestResult(message) {
        // レスポンスの種類に応じて処理
        if (message.result && message.result.tools) {
            this.availableTools = message.result.tools;
            this.updateToolsList();
            this.log(`${this.availableTools.length}個のツールが利用可能です`, 'success');
        }
    }

    updateToolsList() {
        if (this.availableTools.length === 0) {
            this.elements.toolsList.innerHTML = '<p class="placeholder">利用可能なツールがありません</p>';
            this.elements.toolSelect.innerHTML = '<option value="">ツールを選択...</option>';
            return;
        }

        // ツールカードの表示
        this.elements.toolsList.innerHTML = this.availableTools.map(tool => `
            <div class="tool-card" data-tool="${tool.name}">
                <h3>${tool.name}</h3>
                <p>${tool.description}</p>
            </div>
        `).join('');

        // ツール選択プルダウンの更新
        this.elements.toolSelect.innerHTML = [
            '<option value="">ツールを選択...</option>',
            ...this.availableTools.map(tool => 
                `<option value="${tool.name}">${tool.name}</option>`
            )
        ].join('');

        this.elements.toolSelect.disabled = false;

        // ツールカードのクリックイベント
        this.elements.toolsList.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const toolName = card.dataset.tool;
                this.elements.toolSelect.value = toolName;
                this.onToolSelect(toolName);
                
                // 選択状態の更新
                this.elements.toolsList.querySelectorAll('.tool-card').forEach(c => 
                    c.classList.remove('selected')
                );
                card.classList.add('selected');
            });
        });
    }

    onToolSelect(toolName) {
        if (!toolName) {
            this.elements.toolParams.innerHTML = '';
            this.elements.executeBtn.disabled = true;
            return;
        }

        const tool = this.availableTools.find(t => t.name === toolName);
        if (!tool) return;

        // パラメータ入力フォームの生成
        const schema = tool.inputSchema;
        const paramsHTML = Object.entries(schema.properties || {}).map(([paramName, paramSchema]) => {
            const isRequired = schema.required?.includes(paramName);
            const placeholder = paramSchema.default !== undefined ? 
                `デフォルト: ${paramSchema.default}` : '';

            return `
                <div class="param-input">
                    <label for="param-${paramName}">
                        ${paramName}${isRequired ? ' *' : ''}
                    </label>
                    <input 
                        type="${paramSchema.type === 'number' ? 'number' : 'text'}"
                        id="param-${paramName}"
                        placeholder="${placeholder}"
                        ${isRequired ? 'required' : ''}
                    />
                    <small>${paramSchema.description || ''}</small>
                </div>
            `;
        }).join('');

        this.elements.toolParams.innerHTML = paramsHTML || '<p>このツールにはパラメータがありません</p>';
        this.elements.executeBtn.disabled = false;
    }

    async executeTool() {
        const toolName = this.elements.toolSelect.value;
        if (!toolName) return;

        const tool = this.availableTools.find(t => t.name === toolName);
        if (!tool) return;

        try {
            // パラメータの収集
            const args = {};
            const paramInputs = this.elements.toolParams.querySelectorAll('input');
            
            paramInputs.forEach(input => {
                const paramName = input.id.replace('param-', '');
                const value = input.value.trim();
                
                if (value) {
                    const paramSchema = tool.inputSchema.properties[paramName];
                    if (paramSchema.type === 'number') {
                        args[paramName] = parseFloat(value);
                    } else {
                        args[paramName] = value;
                    }
                }
            });

            this.log(`ツール実行中: ${toolName}(${JSON.stringify(args)})`);

            // ツール実行リクエスト
            const request = {
                jsonrpc: "2.0",
                id: ++this.requestId,
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: args
                }
            };

            const result = await this.sendRequest(request);
            
            // 結果の表示
            this.displayResult(toolName, result, args);
            this.log(`ツール実行完了: ${toolName}`, 'success');

        } catch (error) {
            this.log(`ツール実行エラー: ${error.message}`, 'error');
            this.displayError(toolName, error.message);
        }
    }

    displayResult(toolName, result, args) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        resultDiv.innerHTML = `
            <h3>🔧 ${toolName}</h3>
            <div><strong>入力:</strong> ${JSON.stringify(args, null, 2)}</div>
            <div><strong>結果:</strong></div>
            <pre>${result.content?.map(c => c.text).join('\n') || JSON.stringify(result, null, 2)}</pre>
            <hr>
        `;
        
        this.elements.results.appendChild(resultDiv);
        this.elements.results.scrollTop = this.elements.results.scrollHeight;
    }

    displayError(toolName, error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'result-item error';
        errorDiv.innerHTML = `
            <h3>❌ ${toolName} (エラー)</h3>
            <div class="error-message">${error}</div>
            <hr>
        `;
        
        this.elements.results.appendChild(errorDiv);
        this.elements.results.scrollTop = this.elements.results.scrollHeight;
    }

    clearResults() {
        this.elements.results.innerHTML = '<p class="placeholder">結果がここに表示されます</p>';
    }

    clearLog() {
        this.elements.logArea.innerHTML = '';
    }
}

// クライアントの初期化
document.addEventListener('DOMContentLoaded', () => {
    window.mcpClient = new MCPSSEClient();
});
```

### 4. package.json の更新

```json
{
  "name": "mcp-sse-server",
  "version": "1.0.0",
  "description": "MCP Server with Server-Sent Events",
  "main": "dist/server/sse-server.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server/sse-server.js",
    "dev": "tsx src/server/sse-server.ts",
    "watch": "nodemon --exec tsx src/server/sse-server.ts"
  },
  "keywords": ["mcp", "sse", "server-sent-events", "web"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.0.0",
    "nodemon": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🧪 テストの実行

### 1. サーバーの起動

```bash
# 開発モードでの起動
npm run dev

# または、ビルドしてから起動
npm run build
npm start
```

### 2. Webクライアントのテスト

```bash
# ブラウザで以下にアクセス
http://localhost:3000

# APIエンドポイントの確認
curl http://localhost:3000/health
curl http://localhost:3000/api/info
```

## 🎯 演習課題

### 初級課題

1. **新しいツール追加**: 文字列の長さを計算するツールを追加してください
2. **ログレベル設定**: ログの重要度レベル（DEBUG, INFO, WARN, ERROR）を実装してください
3. **結果の保存**: ツール実行結果をローカルストレージに保存する機能を追加してください

### 中級課題

1. **認証機能**: APIキーベースの認証システムを実装してください
2. **バッチ実行**: 複数のツールを順次実行するバッチ機能を追加してください
3. **通知システム**: ツール実行完了時のブラウザ通知を実装してください

## 🎉 まとめ

この節では、SSEを使用したMCPサーバーの実装について学習しました：

### 学習した内容

1. **SSE（Server-Sent Events）**: リアルタイム通信の実装
2. **Webベースクライアント**: ブラウザから直接MCPサーバーを利用
3. **拡張ツール**: より実用的なツールの実装
4. **ユーザーインターフェース**: 直感的なWeb UIの構築
5. **エラーハンドリング**: Webアプリケーションでの堅牢なエラー処理

### 次のステップ

SSEサーバーの実装ができたら、**[06-aitk](../06-aitk/)** に進んでAI Toolkitを活用したワークフロー管理を学習しましょう。

## 📚 参考資料

- [Server-Sent Events Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Express.js Documentation](https://expressjs.com/)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

*SSEを使用することで、Webブラウザから直接MCPサーバーを利用できる強力なシステムが構築できます。リアルタイム性を活用して、より動的なアプリケーションを作成してください。*