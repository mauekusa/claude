# 02 - 基本的なMCPクライアント

## 📖 概要

この節では、基本的なModel Context Protocol (MCP) クライアントを実装します。クライアント・サーバー間の通信、ツールの呼び出し、エラーハンドリングについて学習します。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- MCPクライアントの基本構造を理解できる
- サーバーとの接続を確立できる
- ツールを呼び出してレスポンスを処理できる
- リソースにアクセスしてデータを取得できる
- 適切なエラーハンドリングを実装できる

## 🛠️ 前提条件

- [01-first-server](../01-first-server/) が完了していること
- Node.js (v18以降) がインストールされていること
- TypeScript の基本的な知識

## 📁 プロジェクトの設定

### 1. プロジェクトディレクトリの作成

```bash
mkdir mcp-client-demo
cd mcp-client-demo

# package.jsonの初期化
npm init -y
```

### 2. 必要なパッケージのインストール

```bash
# MCP SDK のインストール
npm install @modelcontextprotocol/sdk

# 開発用依存関係のインストール
npm install -D typescript @types/node tsx

# TypeScript設定ファイルの作成
npx tsc --init
```

### 3. プロジェクト構造の作成

```bash
mkdir -p src/{client,utils,types}
touch src/client.ts
touch src/utils/logger.ts
touch src/types/index.ts
```

## 🚀 基本的なクライアントの実装

### 1. 型定義の作成

```typescript
// src/types/index.ts
export interface ServerInfo {
  name: string;
  version: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface ToolResult {
  success: boolean;
  content?: Array<{
    type: string;
    text: string;
  }>;
  error?: string;
}

export interface ClientConfig {
  serverCommand: string;
  serverArgs?: string[];
  timeout?: number;
  debug?: boolean;
}
```

### 2. ログユーティリティの作成

```typescript
// src/utils/logger.ts
export class Logger {
  private static instance: Logger;
  private debugMode: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  debug(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
```

### 3. メインクライアントの実装

```typescript
// src/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { Logger } from './utils/logger.js';
import { ServerInfo, ToolResult, ClientConfig } from './types/index.js';

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private logger: Logger;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
    this.logger.setDebugMode(config.debug || false);

    // クライアントの初期化
    this.client = new Client(
      {
        name: "mcp-client-demo",
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

  /**
   * サーバーへの接続
   */
  async connect(): Promise<void> {
    try {
      this.logger.info('MCPサーバーに接続中...');

      // サーバープロセスの起動
      this.serverProcess = spawn(this.config.serverCommand, this.config.serverArgs || [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // エラーハンドリング
      this.serverProcess.stderr?.on('data', (data) => {
        this.logger.debug('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        this.logger.error('サーバープロセスエラー:', error);
      });

      this.serverProcess.on('exit', (code) => {
        this.logger.info(`サーバープロセスが終了しました (コード: ${code})`);
      });

      // transportの作成と接続
      this.transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin!,
        stdout: this.serverProcess.stdout!
      });

      await this.client.connect(this.transport);
      this.logger.info('サーバーに正常に接続しました');

    } catch (error) {
      this.logger.error('接続エラー:', error);
      throw error;
    }
  }

  /**
   * サーバー情報の取得
   */
  async getServerInfo(): Promise<ServerInfo> {
    try {
      this.logger.debug('サーバー情報を取得中...');

      // 初期化情報からサーバー情報を取得
      const initResult = await this.client.request(
        { method: "initialize", params: {} },
        { timeout: this.config.timeout || 5000 }
      );

      this.logger.debug('サーバー情報取得完了', initResult);

      return {
        name: initResult.serverInfo?.name || 'Unknown',
        version: initResult.serverInfo?.version || 'Unknown',
        capabilities: {
          tools: !!initResult.capabilities?.tools,
          resources: !!initResult.capabilities?.resources,
          prompts: !!initResult.capabilities?.prompts
        }
      };

    } catch (error) {
      this.logger.error('サーバー情報取得エラー:', error);
      throw error;
    }
  }

  /**
   * 利用可能なツール一覧の取得
   */
  async listTools(): Promise<any[]> {
    try {
      this.logger.debug('ツール一覧を取得中...');

      const result = await this.client.request(
        { method: "tools/list" },
        { timeout: this.config.timeout || 5000 }
      );

      this.logger.debug('ツール一覧取得完了', result);
      return result.tools || [];

    } catch (error) {
      this.logger.error('ツール一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * ツールの実行
   */
  async callTool(name: string, args: any = {}): Promise<ToolResult> {
    try {
      this.logger.debug(`ツール "${name}" を実行中...`, args);

      const result = await this.client.request(
        {
          method: "tools/call",
          params: {
            name: name,
            arguments: args
          }
        },
        { timeout: this.config.timeout || 10000 }
      );

      this.logger.debug(`ツール "${name}" 実行完了`, result);

      return {
        success: true,
        content: result.content
      };

    } catch (error) {
      this.logger.error(`ツール "${name}" 実行エラー:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 利用可能なリソース一覧の取得
   */
  async listResources(): Promise<any[]> {
    try {
      this.logger.debug('リソース一覧を取得中...');

      const result = await this.client.request(
        { method: "resources/list" },
        { timeout: this.config.timeout || 5000 }
      );

      this.logger.debug('リソース一覧取得完了', result);
      return result.resources || [];

    } catch (error) {
      this.logger.error('リソース一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * リソースの読み取り
   */
  async readResource(uri: string): Promise<any> {
    try {
      this.logger.debug(`リソース "${uri}" を読み取り中...`);

      const result = await this.client.request(
        {
          method: "resources/read",
          params: { uri }
        },
        { timeout: this.config.timeout || 10000 }
      );

      this.logger.debug(`リソース "${uri}" 読み取り完了`, result);
      return result.contents;

    } catch (error) {
      this.logger.error(`リソース "${uri}" 読み取りエラー:`, error);
      throw error;
    }
  }

  /**
   * 接続の切断
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.info('サーバーから切断中...');

      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
      }

      this.logger.info('切断完了');

    } catch (error) {
      this.logger.error('切断エラー:', error);
      throw error;
    }
  }
}
```

## 🧪 実際の使用例

### 1. シンプルな使用例

```typescript
// src/examples/simple-usage.ts
import { MCPClient } from '../client.js';

async function simpleExample() {
  const client = new MCPClient({
    serverCommand: 'node',
    serverArgs: ['../first-mcp-server/dist/server.js'],
    debug: true
  });

  try {
    // サーバーに接続
    await client.connect();

    // サーバー情報の表示
    const serverInfo = await client.getServerInfo();
    console.log('サーバー情報:', serverInfo);

    // 利用可能なツールの表示
    const tools = await client.listTools();
    console.log('利用可能なツール:', tools.map(t => t.name));

    // echoツールの実行
    const echoResult = await client.callTool('echo', {
      message: 'Hello from client!'
    });
    console.log('Echo結果:', echoResult);

    // 計算ツールの実行
    const addResult = await client.callTool('add', {
      a: 15,
      b: 27
    });
    console.log('加算結果:', addResult);

    // 現在時刻の取得
    const timeResult = await client.callTool('current_time');
    console.log('現在時刻:', timeResult);

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    // 接続を切断
    await client.disconnect();
  }
}

simpleExample().catch(console.error);
```

### 2. インタラクティブなCLIクライアント

```typescript
// src/examples/interactive-cli.ts
import { MCPClient } from '../client.js';
import * as readline from 'readline';

class InteractiveCLI {
  private client: MCPClient;
  private rl: readline.Interface;
  private tools: any[] = [];

  constructor() {
    this.client = new MCPClient({
      serverCommand: 'node',
      serverArgs: ['../first-mcp-server/dist/server.js'],
      debug: false
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 MCP Interactive Client を開始します...\n');

      // サーバーに接続
      await this.client.connect();
      console.log('✅ サーバーに接続しました\n');

      // 利用可能なツールを取得
      this.tools = await this.client.listTools();
      this.showMenu();
      this.handleUserInput();

    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      process.exit(1);
    }
  }

  private showMenu(): void {
    console.log('=== MCP Client Menu ===');
    console.log('1. ツール一覧を表示');
    console.log('2. ツールを実行');
    console.log('3. リソース一覧を表示');
    console.log('4. リソースを読み取り');
    console.log('5. 終了');
    console.log('=======================\n');
  }

  private handleUserInput(): void {
    this.rl.question('選択してください (1-5): ', async (choice) => {
      try {
        switch (choice.trim()) {
          case '1':
            await this.showTools();
            break;
          case '2':
            await this.executeTool();
            break;
          case '3':
            await this.showResources();
            break;
          case '4':
            await this.readResource();
            break;
          case '5':
            await this.exit();
            return;
          default:
            console.log('❌ 無効な選択です\n');
        }
      } catch (error) {
        console.error('❌ エラー:', error);
      }

      this.showMenu();
      this.handleUserInput();
    });
  }

  private async showTools(): Promise<void> {
    console.log('\n📋 利用可能なツール:');
    this.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log();
  }

  private async executeTool(): Promise<void> {
    if (this.tools.length === 0) {
      console.log('❌ 利用可能なツールがありません\n');
      return;
    }

    return new Promise((resolve) => {
      this.rl.question('実行するツール名を入力: ', async (toolName) => {
        const tool = this.tools.find(t => t.name === toolName.trim());
        
        if (!tool) {
          console.log('❌ 指定されたツールが見つかりません\n');
          resolve();
          return;
        }

        try {
          const args = await this.getToolArguments(tool);
          const result = await this.client.callTool(toolName.trim(), args);

          if (result.success) {
            console.log('\n✅ 実行結果:');
            result.content?.forEach(content => {
              console.log(`  ${content.text}`);
            });
          } else {
            console.log(`❌ エラー: ${result.error}`);
          }
          console.log();

        } catch (error) {
          console.error('❌ 実行エラー:', error);
        }
        
        resolve();
      });
    });
  }

  private async getToolArguments(tool: any): Promise<any> {
    const args: any = {};
    const schema = tool.inputSchema;

    if (!schema.properties || Object.keys(schema.properties).length === 0) {
      return args;
    }

    console.log('\n📝 引数を入力してください:');

    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const isRequired = schema.required?.includes(propName);
      const description = (propSchema as any).description || '';
      
      const value = await this.promptForValue(
        `  ${propName}${isRequired ? ' (必須)' : ''} - ${description}: `
      );

      if (value || isRequired) {
        args[propName] = this.convertValue(value, (propSchema as any).type);
      }
    }

    return args;
  }

  private async promptForValue(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private convertValue(value: string, type: string): any {
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

  private async showResources(): Promise<void> {
    try {
      const resources = await this.client.listResources();
      console.log('\n📁 利用可能なリソース:');
      resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.name} (${resource.uri})`);
        console.log(`     ${resource.description || 'No description'}`);
      });
      console.log();
    } catch (error) {
      console.error('❌ リソース一覧取得エラー:', error);
    }
  }

  private async readResource(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question('読み取るリソースのURIを入力: ', async (uri) => {
        try {
          const contents = await this.client.readResource(uri.trim());
          console.log('\n📄 リソース内容:');
          contents.forEach((content: any) => {
            console.log(content.text || JSON.stringify(content, null, 2));
          });
          console.log();
        } catch (error) {
          console.error('❌ リソース読み取りエラー:', error);
        }
        resolve();
      });
    });
  }

  private async exit(): Promise<void> {
    console.log('\n👋 クライアントを終了します...');
    await this.client.disconnect();
    this.rl.close();
    process.exit(0);
  }
}

// CLIの起動
const cli = new InteractiveCLI();
cli.start().catch(console.error);
```

### 3. package.json の更新

```json
{
  "name": "mcp-client-demo",
  "version": "1.0.0",
  "description": "MCP Client Demo",
  "main": "dist/client.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/examples/simple-usage.ts",
    "cli": "tsx src/examples/interactive-cli.ts",
    "test": "echo \"テスト未実装\" && exit 1"
  },
  "keywords": ["mcp", "client", "demo"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🧪 テストの実行

### 1. 基本的なテスト

```bash
# サーバーが起動していることを確認
cd ../first-mcp-server
npm run dev &

# 新しいターミナルでクライアントを実行
cd ../mcp-client-demo
npm run build
npm run dev
```

### 2. インタラクティブCLIのテスト

```bash
npm run cli
```

## 🔍 コードの解説

### 1. クライアントの初期化

```typescript
this.client = new Client(
  {
    name: "mcp-client-demo",
    version: "1.0.0"
  },
  {
    capabilities: {
      roots: {
        listChanged: true  // ルートディレクトリの変更通知を受け取る
      }
    }
  }
);
```

### 2. サーバープロセスの管理

```typescript
// サーバープロセスの起動
this.serverProcess = spawn(this.config.serverCommand, this.config.serverArgs || [], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Transportの作成
this.transport = new StdioClientTransport({
  stdin: this.serverProcess.stdin!,
  stdout: this.serverProcess.stdout!
});
```

### 3. エラーハンドリング

```typescript
try {
  const result = await this.client.request(
    { method: "tools/call", params: { name, arguments: args } },
    { timeout: this.config.timeout || 10000 }
  );
  return { success: true, content: result.content };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
```

## 🚨 よくある問題と解決方法

### 1. 接続エラー

```bash
# エラー例
Error: Failed to connect to server

# 解決方法
1. サーバーが起動しているか確認
2. コマンドパスが正しいか確認
3. ポートが使用可能か確認
```

### 2. タイムアウトエラー

```typescript
// タイムアウト時間の調整
const client = new MCPClient({
  serverCommand: 'node',
  serverArgs: ['server.js'],
  timeout: 30000  // 30秒に増加
});
```

### 3. JSON-RPC エラー

```typescript
// エラーの詳細情報を取得
catch (error) {
  if (error.code) {
    console.error(`JSON-RPC Error ${error.code}: ${error.message}`);
  } else {
    console.error('General Error:', error);
  }
}
```

## 🎯 演習課題

### 初級課題

1. **バッチ処理**: 複数のツールを順次実行するバッチ処理機能を実装してください
2. **結果保存**: ツール実行結果をファイルに保存する機能を追加してください
3. **設定ファイル**: クライアント設定をJSONファイルから読み込めるようにしてください

### 中級課題

1. **非同期処理**: 複数のツールを並行して実行する機能を実装してください
2. **再試行機能**: 失敗したリクエストを自動的に再試行する機能を追加してください
3. **キャッシュ機能**: リソースの読み取り結果をキャッシュする機能を実装してください

## 🎉 まとめ

この節では、基本的なMCPクライアントの実装方法を学習しました：

### 学習した内容

1. **クライアント初期化**: 基本的なクライアント構造と設定
2. **サーバー通信**: JSON-RPC プロトコルを使用した通信処理
3. **ツール実行**: 動的なツール呼び出しとレスポンス処理
4. **エラーハンドリング**: 堅牢なエラー処理の実装
5. **インタラクティブUI**: ユーザーフレンドリーなCLIの作成

### 次のステップ

基本的なクライアントが動作することを確認したら、**[03-llm-client](../03-llm-client/)** に進んでLLMとの統合を学習しましょう。

## 📚 参考資料

- [MCP Client SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Child Process Documentation](https://nodejs.org/api/child_process.html)
- [Readline Documentation](https://nodejs.org/api/readline.html)

---

*クライアント実装を通して、MCPエコシステムの全体像を理解できます。実際に動かしながら、通信フローを確認してください。*