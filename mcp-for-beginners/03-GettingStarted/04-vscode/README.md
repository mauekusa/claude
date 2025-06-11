# 04 - Visual Studio Code でのMCP利用

## 📖 概要

この節では、Visual Studio Code でModel Context Protocol (MCP) サーバーを利用する方法を学習します。VS Code拡張機能の設定、開発ワークフローの効率化、デバッグとトラブルシューティングについて学びます。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- VS CodeでMCPサーバーを設定・利用できる
- 開発中にMCPツールを効率的に活用できる
- VS Code拡張機能としてMCPクライアントを作成できる
- デバッグとトラブルシューティングができる
- チーム開発でMCP設定を共有できる

## 🛠️ 前提条件

- Visual Studio Code がインストールされていること
- [01-first-server](../01-first-server/) が完了していること
- Node.js と npm がインストールされていること

## 📁 プロジェクトの設定

### 1. VS Code拡張機能の開発環境

```bash
mkdir vscode-mcp-extension
cd vscode-mcp-extension

# VS Code拡張機能のスキャフォールド
npm install -g yo generator-code
yo code

# 拡張機能の種類を選択
# > New Extension (TypeScript)
# 名前: mcp-helper
# 識別子: mcp-helper  
# 説明: MCP Server Helper for VS Code
# 発行者: your-name
```

### 2. 必要なパッケージのインストール

```bash
# MCP SDK のインストール
npm install @modelcontextprotocol/sdk

# VS Code API の型定義（既にインストール済み）
# npm install -D @types/vscode

# その他の依存関係
npm install tree-kill
```

## 🚀 VS Code拡張機能の実装

### 1. 拡張機能のメインファイル

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { MCPServerManager } from './mcpServerManager';
import { MCPViewProvider } from './mcpViewProvider';

let mcpServerManager: MCPServerManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('MCP Helper拡張機能が有効化されました');

    // MCPサーバーマネージャーの初期化
    mcpServerManager = new MCPServerManager();

    // MCPビュープロバイダーの登録
    const provider = new MCPViewProvider(context.extensionUri, mcpServerManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MCPViewProvider.viewType, provider)
    );

    // コマンドの登録
    context.subscriptions.push(
        vscode.commands.registerCommand('mcp-helper.startServer', () => {
            startMCPServer();
        }),

        vscode.commands.registerCommand('mcp-helper.stopServer', () => {
            stopMCPServer();
        }),

        vscode.commands.registerCommand('mcp-helper.executeToolQuick', () => {
            executeToolQuick();
        }),

        vscode.commands.registerCommand('mcp-helper.showServerInfo', () => {
            showServerInfo();
        }),

        vscode.commands.registerCommand('mcp-helper.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'mcp-helper');
        })
    );

    // ワークスペース設定の変更を監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mcp-helper')) {
                reloadMCPConfiguration();
            }
        })
    );

    // 拡張機能の自動起動
    autoStartIfConfigured();
}

export function deactivate() {
    if (mcpServerManager) {
        mcpServerManager.dispose();
    }
}

async function startMCPServer() {
    try {
        const config = vscode.workspace.getConfiguration('mcp-helper');
        const serverCommand = config.get<string>('serverCommand');
        const serverArgs = config.get<string[]>('serverArgs') || [];

        if (!serverCommand) {
            vscode.window.showErrorMessage('MCPサーバーコマンドが設定されていません。設定を確認してください。');
            return;
        }

        await mcpServerManager.start(serverCommand, serverArgs);
        vscode.window.showInformationMessage('MCPサーバーが開始されました');

    } catch (error) {
        vscode.window.showErrorMessage(`MCPサーバーの開始に失敗しました: ${error}`);
    }
}

async function stopMCPServer() {
    try {
        await mcpServerManager.stop();
        vscode.window.showInformationMessage('MCPサーバーが停止されました');
    } catch (error) {
        vscode.window.showErrorMessage(`MCPサーバーの停止に失敗しました: ${error}`);
    }
}

async function executeToolQuick() {
    if (!mcpServerManager.isRunning()) {
        vscode.window.showWarningMessage('MCPサーバーが起動していません');
        return;
    }

    try {
        const tools = await mcpServerManager.getAvailableTools();
        
        if (tools.length === 0) {
            vscode.window.showInformationMessage('利用可能なツールがありません');
            return;
        }

        // ツール選択のクイックピック
        const toolItems = tools.map(tool => ({
            label: tool.name,
            description: tool.description,
            tool: tool
        }));

        const selectedTool = await vscode.window.showQuickPick(toolItems, {
            placeHolder: '実行するツールを選択してください'
        });

        if (!selectedTool) {
            return;
        }

        // 引数の入力
        const args = await getToolArguments(selectedTool.tool);
        if (args === undefined) {
            return; // ユーザーがキャンセル
        }

        // ツールの実行
        const result = await mcpServerManager.executeTool(selectedTool.tool.name, args);
        
        // 結果の表示
        showToolResult(selectedTool.tool.name, result);

    } catch (error) {
        vscode.window.showErrorMessage(`ツール実行エラー: ${error}`);
    }
}

async function getToolArguments(tool: any): Promise<any | undefined> {
    const schema = tool.inputSchema;
    
    if (!schema.properties || Object.keys(schema.properties).length === 0) {
        return {};
    }

    const args: any = {};

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(propName);
        const description = (propSchema as any).description || '';
        
        const value = await vscode.window.showInputBox({
            prompt: `${propName}${isRequired ? ' (必須)' : ''} - ${description}`,
            placeHolder: `${propName}の値を入力してください`
        });

        if (value === undefined) {
            return undefined; // ユーザーがキャンセル
        }

        if (value || isRequired) {
            args[propName] = convertValue(value, (propSchema as any).type);
        }
    }

    return args;
}

function convertValue(value: string, type: string): any {
    if (!value) return undefined;

    switch (type) {
        case 'number':
            return parseFloat(value);
        case 'integer':
            return parseInt(value, 10);
        case 'boolean':
            return value.toLowerCase() === 'true';
        default:
            return value;
    }
}

function showToolResult(toolName: string, result: any) {
    if (result.success) {
        const content = result.content?.map((c: any) => c.text).join('\n') || '';
        vscode.window.showInformationMessage(`ツール "${toolName}" 実行成功`, '詳細を表示').then(selection => {
            if (selection === '詳細を表示') {
                const panel = vscode.window.createWebviewPanel(
                    'mcpToolResult',
                    `MCP Tool Result: ${toolName}`,
                    vscode.ViewColumn.Beside,
                    { enableScripts: true }
                );

                panel.webview.html = getToolResultWebviewContent(toolName, content);
            }
        });
    } else {
        vscode.window.showErrorMessage(`ツール "${toolName}" 実行失敗: ${result.error}`);
    }
}

function getToolResultWebviewContent(toolName: string, content: string): string {
    return `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MCP Tool Result</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .content {
                    white-space: pre-wrap;
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 15px;
                    border-radius: 5px;
                    font-family: 'Courier New', monospace;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🔧 ${toolName} の実行結果</h1>
            </div>
            <div class="content">${content}</div>
        </body>
        </html>
    `;
}

async function showServerInfo() {
    if (!mcpServerManager.isRunning()) {
        vscode.window.showWarningMessage('MCPサーバーが起動していません');
        return;
    }

    try {
        const info = await mcpServerManager.getServerInfo();
        const tools = await mcpServerManager.getAvailableTools();
        const resources = await mcpServerManager.getAvailableResources();

        const infoText = [
            `📋 サーバー情報`,
            `名前: ${info.name}`,
            `バージョン: ${info.version}`,
            `ツール数: ${tools.length}`,
            `リソース数: ${resources.length}`,
            ``,
            `🔧 利用可能なツール:`,
            ...tools.map(t => `  • ${t.name} - ${t.description}`),
            ``,
            `📁 利用可能なリソース:`,
            ...resources.map(r => `  • ${r.name} (${r.uri})`)
        ].join('\n');

        vscode.window.showInformationMessage('サーバー情報を表示', '詳細を表示').then(selection => {
            if (selection === '詳細を表示') {
                const panel = vscode.window.createWebviewPanel(
                    'mcpServerInfo',
                    'MCP Server Information',
                    vscode.ViewColumn.Beside,
                    {}
                );

                panel.webview.html = getServerInfoWebviewContent(infoText);
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`サーバー情報の取得に失敗しました: ${error}`);
    }
}

function getServerInfoWebviewContent(info: string): string {
    return `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MCP Server Info</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .info {
                    white-space: pre-line;
                    line-height: 1.6;
                }
            </style>
        </head>
        <body>
            <div class="info">${info}</div>
        </body>
        </html>
    `;
}

async function reloadMCPConfiguration() {
    if (mcpServerManager.isRunning()) {
        await stopMCPServer();
        await startMCPServer();
    }
}

async function autoStartIfConfigured() {
    const config = vscode.workspace.getConfiguration('mcp-helper');
    const autoStart = config.get<boolean>('autoStart');
    
    if (autoStart) {
        await startMCPServer();
    }
}
```

### 2. MCPサーバーマネージャーの実装

```typescript
// src/mcpServerManager.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import * as kill from 'tree-kill';

export class MCPServerManager {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private serverProcess: ChildProcess | null = null;
    private isConnected: boolean = false;

    constructor() {
        this.client = new Client(
            {
                name: "vscode-mcp-client",
                version: "1.0.0"
            },
            {
                capabilities: {
                    roots: {
                        listChanged: true
                    }
                }
            }
        );
    }

    async start(command: string, args: string[]): Promise<void> {
        if (this.isConnected) {
            throw new Error('サーバーは既に起動しています');
        }

        try {
            // サーバープロセスの起動
            this.serverProcess = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // エラーハンドリング
            this.serverProcess.on('error', (error) => {
                console.error('MCPサーバープロセスエラー:', error);
            });

            this.serverProcess.on('exit', (code, signal) => {
                console.log(`MCPサーバープロセスが終了: code=${code}, signal=${signal}`);
                this.isConnected = false;
            });

            // Transportの作成と接続
            this.transport = new StdioClientTransport({
                stdin: this.serverProcess.stdin!,
                stdout: this.serverProcess.stdout!
            });

            await this.client!.connect(this.transport);
            this.isConnected = true;

        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        this.cleanup();
    }

    private cleanup(): void {
        this.isConnected = false;

        if (this.transport) {
            this.transport.close();
            this.transport = null;
        }

        if (this.serverProcess) {
            // プロセスツリー全体を終了
            if (this.serverProcess.pid) {
                kill(this.serverProcess.pid, 'SIGTERM');
            }
            this.serverProcess = null;
        }
    }

    isRunning(): boolean {
        return this.isConnected;
    }

    async getServerInfo(): Promise<any> {
        if (!this.isConnected || !this.client) {
            throw new Error('サーバーに接続されていません');
        }

        // 初期化情報から取得
        return {
            name: 'MCP Server',
            version: '1.0.0'
        };
    }

    async getAvailableTools(): Promise<any[]> {
        if (!this.isConnected || !this.client) {
            throw new Error('サーバーに接続されていません');
        }

        const result = await this.client.request(
            { method: "tools/list" },
            { timeout: 5000 }
        );

        return result.tools || [];
    }

    async getAvailableResources(): Promise<any[]> {
        if (!this.isConnected || !this.client) {
            throw new Error('サーバーに接続されていません');
        }

        try {
            const result = await this.client.request(
                { method: "resources/list" },
                { timeout: 5000 }
            );

            return result.resources || [];
        } catch (error) {
            // リソース機能がない場合は空配列を返す
            return [];
        }
    }

    async executeTool(name: string, args: any): Promise<any> {
        if (!this.isConnected || !this.client) {
            throw new Error('サーバーに接続されていません');
        }

        try {
            const result = await this.client.request(
                {
                    method: "tools/call",
                    params: {
                        name: name,
                        arguments: args
                    }
                },
                { timeout: 10000 }
            );

            return {
                success: true,
                content: result.content
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    dispose(): void {
        this.cleanup();
    }
}
```

### 3. Webviewプロバイダーの実装

```typescript
// src/mcpViewProvider.ts
import * as vscode from 'vscode';
import { MCPServerManager } from './mcpServerManager';

export class MCPViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'mcp-helper.mcpView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _mcpServerManager: MCPServerManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'startServer':
                    vscode.commands.executeCommand('mcp-helper.startServer');
                    break;
                case 'stopServer':
                    vscode.commands.executeCommand('mcp-helper.stopServer');
                    break;
                case 'executeToolQuick':
                    vscode.commands.executeCommand('mcp-helper.executeToolQuick');
                    break;
                case 'showServerInfo':
                    vscode.commands.executeCommand('mcp-helper.showServerInfo');
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('mcp-helper.openSettings');
                    break;
            }
        });

        // サーバー状態の定期更新
        setInterval(() => {
            this.updateServerStatus();
        }, 2000);
    }

    private updateServerStatus() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateStatus',
                isRunning: this._mcpServerManager.isRunning()
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MCP Helper</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                        padding: 10px;
                        margin: 0;
                    }
                    .status {
                        padding: 8px;
                        border-radius: 4px;
                        margin-bottom: 10px;
                        text-align: center;
                        font-weight: bold;
                    }
                    .status.running {
                        background-color: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                    .status.stopped {
                        background-color: var(--vscode-testing-iconFailed);
                        color: white;
                    }
                    button {
                        width: 100%;
                        padding: 8px;
                        margin: 4px 0;
                        border: none;
                        border-radius: 4px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        cursor: pointer;
                        font-size: 13px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .section {
                        margin-bottom: 15px;
                    }
                    .section-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: var(--vscode-sideBarSectionHeader-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="section">
                    <div class="section-title">🔧 MCP Server Status</div>
                    <div id="status" class="status stopped">停止中</div>
                </div>

                <div class="section">
                    <div class="section-title">⚡ Quick Actions</div>
                    <button id="startServer">サーバー開始</button>
                    <button id="stopServer" disabled>サーバー停止</button>
                    <button id="executeToolQuick" disabled>ツール実行</button>
                    <button id="showServerInfo" disabled>サーバー情報</button>
                </div>

                <div class="section">
                    <div class="section-title">⚙️ Settings</div>
                    <button id="openSettings">設定を開く</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    const statusEl = document.getElementById('status');
                    const startBtn = document.getElementById('startServer');
                    const stopBtn = document.getElementById('stopServer');
                    const executeBtn = document.getElementById('executeToolQuick');
                    const infoBtn = document.getElementById('showServerInfo');
                    const settingsBtn = document.getElementById('openSettings');

                    startBtn.onclick = () => vscode.postMessage({ type: 'startServer' });
                    stopBtn.onclick = () => vscode.postMessage({ type: 'stopServer' });
                    executeBtn.onclick = () => vscode.postMessage({ type: 'executeToolQuick' });
                    infoBtn.onclick = () => vscode.postMessage({ type: 'showServerInfo' });
                    settingsBtn.onclick = () => vscode.postMessage({ type: 'openSettings' });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'updateStatus') {
                            updateStatus(message.isRunning);
                        }
                    });

                    function updateStatus(isRunning) {
                        if (isRunning) {
                            statusEl.textContent = '実行中';
                            statusEl.className = 'status running';
                            startBtn.disabled = true;
                            stopBtn.disabled = false;
                            executeBtn.disabled = false;
                            infoBtn.disabled = false;
                        } else {
                            statusEl.textContent = '停止中';
                            statusEl.className = 'status stopped';
                            startBtn.disabled = false;
                            stopBtn.disabled = true;
                            executeBtn.disabled = true;
                            infoBtn.disabled = true;
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }
}
```

### 4. 拡張機能の設定ファイル

```json
// package.json
{
  "name": "mcp-helper",
  "displayName": "MCP Helper",
  "description": "Model Context Protocol Helper for VS Code",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "mcp-helper.startServer",
        "title": "Start MCP Server",
        "category": "MCP"
      },
      {
        "command": "mcp-helper.stopServer", 
        "title": "Stop MCP Server",
        "category": "MCP"
      },
      {
        "command": "mcp-helper.executeToolQuick",
        "title": "Execute Tool (Quick)",
        "category": "MCP"
      },
      {
        "command": "mcp-helper.showServerInfo",
        "title": "Show Server Info",
        "category": "MCP"
      },
      {
        "command": "mcp-helper.openSettings",
        "title": "Open Settings",
        "category": "MCP"
      }
    ],
    "views": {
      "explorer": [
        {
          "type": "webview",
          "id": "mcp-helper.mcpView",
          "name": "MCP Helper",
          "when": "true"
        }
      ]
    },
    "configuration": {
      "title": "MCP Helper",
      "properties": {
        "mcp-helper.serverCommand": {
          "type": "string",
          "default": "node",
          "description": "MCPサーバーを起動するコマンド"
        },
        "mcp-helper.serverArgs": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "default": [],
          "description": "MCPサーバーコマンドの引数"
        },
        "mcp-helper.autoStart": {
          "type": "boolean",
          "default": false,
          "description": "VS Code起動時に自動的にMCPサーバーを開始する"
        },
        "mcp-helper.timeout": {
          "type": "number",
          "default": 10000,
          "description": "ツール実行のタイムアウト時間（ミリ秒）"
        }
      }
    },
    "menus": {
      "commandPalette": [
        {
          "command": "mcp-helper.startServer"
        },
        {
          "command": "mcp-helper.stopServer"
        },
        {
          "command": "mcp-helper.executeToolQuick"
        },
        {
          "command": "mcp-helper.showServerInfo"
        }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "16.x",
    "typescript": "^4.9.4"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "tree-kill": "^1.2.2"
  }
}
```

### 5. ワークスペース設定の例

```json
// .vscode/settings.json
{
  "mcp-helper.serverCommand": "node",
  "mcp-helper.serverArgs": ["../first-mcp-server/dist/server.js"],
  "mcp-helper.autoStart": true,
  "mcp-helper.timeout": 15000
}
```

## 🧪 拡張機能のテストと使用

### 1. 拡張機能のビルドとテスト

```bash
# TypeScriptのコンパイル
npm run compile

# 拡張機能のテスト実行
# F5キーを押すか、以下のコマンド
code --extensionDevelopmentPath=. --new-window
```

### 2. 拡張機能のパッケージング

```bash
# vsce（VS Code Extension Manager）のインストール
npm install -g vsce

# 拡張機能のパッケージング
vsce package

# .vsixファイルが生成される
# mcp-helper-1.0.0.vsix
```

### 3. 拡張機能のインストール

```bash
# VS Codeへのインストール
code --install-extension mcp-helper-1.0.0.vsix
```

## 🔧 実際の使用例

### 1. 開発ワークフローでの利用

```typescript
// .vscode/tasks.json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start MCP Server",
            "type": "shell",
            "command": "npm",
            "args": ["run", "dev"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "new"
            },
            "options": {
                "cwd": "${workspaceFolder}/first-mcp-server"
            },
            "problemMatcher": []
        }
    ]
}
```

### 2. プロジェクト固有の設定

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch MCP Server",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/first-mcp-server/dist/server.js",
            "console": "integratedTerminal",
            "skipFiles": [
                "<node_internals>/**"
            ]
        }
    ]
}
```

### 3. チーム設定の共有

```json
// .vscode/extensions.json
{
    "recommendations": [
        "your-publisher.mcp-helper"
    ]
}
```

## 🔍 デバッグとトラブルシューティング

### 1. ログ出力の追加

```typescript
// デバッグ用のログ出力チャンネル
const outputChannel = vscode.window.createOutputChannel('MCP Helper');

function logDebug(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[${timestamp}] ${message}`);
    if (data) {
        outputChannel.appendLine(JSON.stringify(data, null, 2));
    }
}

// 使用例
logDebug('MCPサーバー開始中...', { command, args });
```

### 2. エラー処理の改善

```typescript
async function executeToolWithRetry(name: string, args: any, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await mcpServerManager.executeTool(name, args);
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            logDebug(`ツール実行失敗 (試行 ${attempt}/${maxRetries}):`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
```

### 3. 接続状態の監視

```typescript
class ConnectionMonitor {
    private checkInterval: NodeJS.Timeout | null = null;

    start(mcpManager: MCPServerManager) {
        this.checkInterval = setInterval(() => {
            if (!mcpManager.isRunning()) {
                vscode.window.showWarningMessage(
                    'MCPサーバーとの接続が切断されました',
                    '再接続'
                ).then(selection => {
                    if (selection === '再接続') {
                        vscode.commands.executeCommand('mcp-helper.startServer');
                    }
                });
            }
        }, 5000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}
```

## 🎯 演習課題

### 初級課題

1. **キーバインド追加**: よく使うコマンドにキーボードショートカットを設定してください
2. **ステータスバー表示**: MCPサーバーの状態をステータスバーに表示する機能を追加してください
3. **ツール履歴**: 実行したツールの履歴を表示する機能を実装してください

### 中級課題

1. **設定UI**: 拡張機能の設定をグラフィカルに変更できるWebviewを作成してください
2. **ツールパレット**: 利用可能なツールを一覧表示するコマンドパレットを実装してください
3. **結果の永続化**: ツール実行結果をワークスペースに保存する機能を追加してください

## 🎉 まとめ

この節では、VS CodeでMCPを活用する方法を学習しました：

### 学習した内容

1. **VS Code拡張機能開発**: MCPを統合した拡張機能の作成
2. **ワークフロー統合**: 開発環境でのMCP活用
3. **ユーザーインターフェース**: Webviewを使ったインタラクティブなUI
4. **設定管理**: プロジェクト固有の設定とチーム共有
5. **デバッグ**: トラブルシューティングと監視機能

### 次のステップ

VS CodeでのMCP活用ができたら、**[05-sse-server](../05-sse-server/)** に進んでWeb環境でのMCP実装を学習しましょう。

## 📚 参考資料

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

---

*VS CodeとMCPの統合により、開発体験が大幅に向上します。チーム開発では設定を共有して、全員が同じ環境で作業できるようにしましょう。*