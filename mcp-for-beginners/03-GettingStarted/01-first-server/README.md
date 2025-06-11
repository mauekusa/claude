# 01 - 最初のMCPサーバー

## 📖 概要

この節では、最初のModel Context Protocol (MCP) サーバーを作成します。基本的なサーバー構造を理解し、シンプルなツールを実装し、サーバーの起動とテストを行います。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- MCPサーバーの基本構造を理解できる
- シンプルなツールを実装できる
- サーバーとクライアント間の相互作用を理解できる
- 基本的なテストを実行できる

## 🛠️ 前提条件

- Node.js (v18以降) がインストールされていること
- npm または yarn がインストールされていること
- TypeScript の基本的な知識

## 📁 プロジェクトの設定

### 1. プロジェクトディレクトリの作成

```bash
mkdir first-mcp-server
cd first-mcp-server

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
mkdir -p src/{tools,resources,utils}
touch src/server.ts
touch src/tools/index.ts
touch src/resources/index.ts
```

最終的なプロジェクト構造：

```
first-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts
│   ├── tools/
│   │   └── index.ts
│   ├── resources/
│   │   └── index.ts
│   └── utils/
└── README.md
```

## 🚀 基本的なサーバーの実装

### 1. メインサーバーファイルの作成

```typescript
// src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

// サーバーの作成
const server = new Server(
  {
    name: "first-mcp-server",
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

// ツール一覧の提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "指定されたメッセージをエコーバックします",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "エコーするメッセージ"
            }
          },
          required: ["message"]
        }
      },
      {
        name: "add",
        description: "2つの数値を加算します",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "最初の数値"
            },
            b: {
              type: "number", 
              description: "2番目の数値"
            }
          },
          required: ["a", "b"]
        }
      },
      {
        name: "current_time",
        description: "現在の時刻を取得します",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]
  };
});

// ツール実行の処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "echo":
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${args.message}`
          }
        ]
      };
      
    case "add":
      const sum = args.a + args.b;
      return {
        content: [
          {
            type: "text",
            text: `${args.a} + ${args.b} = ${sum}`
          }
        ]
      };
      
    case "current_time":
      const now = new Date();
      return {
        content: [
          {
            type: "text",
            text: `現在の時刻: ${now.toLocaleString('ja-JP')}`
          }
        ]
      };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// リソース一覧の提供
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "memory://server-info",
        name: "Server Information",
        description: "このMCPサーバーに関する基本情報",
        mimeType: "application/json"
      }
    ]
  };
});

// リソース読み取りの処理
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === "memory://server-info") {
    const serverInfo = {
      name: "first-mcp-server",
      version: "1.0.0",
      description: "初心者向けMCPサーバーの例",
      capabilities: ["tools", "resources"],
      tools: ["echo", "add", "current_time"],
      startTime: new Date().toISOString()
    };
    
    return {
      contents: [
        {
          uri: uri,
          mimeType: "application/json",
          text: JSON.stringify(serverInfo, null, 2)
        }
      ]
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// エラーハンドリング
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// サーバーの起動
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Server started and listening on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// サーバーの実行
if (require.main === module) {
  main().catch(console.error);
}

export { server };
```

### 2. package.json の更新

```json
{
  "name": "first-mcp-server",
  "version": "1.0.0",
  "description": "最初のMCPサーバーの例",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "test": "echo \"テスト未実装\" && exit 1"
  },
  "keywords": ["mcp", "tutorial", "example"],
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

### 3. TypeScript設定の調整

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 🧪 サーバーのテスト

### 1. サーバーの起動

```bash
# 開発モードでの起動
npm run dev

# または、ビルドしてから起動
npm run build
npm start
```

### 2. 手動テスト用のスクリプト

```typescript
// test/manual-test.ts
import { spawn } from 'child_process';

async function testServer() {
  // サーバーのプロセスを起動
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // テストメッセージの送信
  const tests = [
    // ツール一覧の取得
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    },
    // echoツールのテスト
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "echo",
        arguments: {
          message: "Hello, MCP!"
        }
      }
    },
    // addツールのテスト
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "add",
        arguments: {
          a: 10,
          b: 25
        }
      }
    },
    // 現在時刻ツールのテスト
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "current_time",
        arguments: {}
      }
    }
  ];

  // 各テストの実行
  for (const test of tests) {
    console.log('送信:', JSON.stringify(test));
    
    serverProcess.stdin.write(JSON.stringify(test) + '\n');
    
    // レスポンスの待機（簡易実装）
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // レスポンスの表示
  serverProcess.stdout.on('data', (data) => {
    console.log('受信:', data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('エラー:', data.toString());
  });

  // プロセスの終了
  setTimeout(() => {
    serverProcess.kill('SIGTERM');
  }, 1000);
}

testServer().catch(console.error);
```

### 3. シンプルなテスト実行

```bash
# 基本的なテスト
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev

# echoツールのテスト
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello World!"}}}' | npm run dev
```

## 🔍 コードの解説

### 1. サーバーの初期化

```typescript
const server = new Server(
  {
    name: "first-mcp-server",    // サーバー名
    version: "1.0.0"             // バージョン
  },
  {
    capabilities: {
      tools: {},                 // ツール機能を有効化
      resources: {},             // リソース機能を有効化
      prompts: {}                // プロンプト機能を有効化
    }
  }
);
```

### 2. ツールの定義と実装

ツールは、MCPサーバーが提供する機能です：

- **名前**: ツールを識別するユニークな文字列
- **説明**: ツールの目的と動作の説明
- **入力スキーマ**: JSONスキーマ形式での入力パラメータ定義

### 3. リソースの提供

リソースは、サーバーが提供するデータです：

- **URI**: リソースを識別するユニークなアドレス
- **名前**: 人間が読める名前
- **説明**: リソースの内容説明
- **MIMEタイプ**: データの形式

### 4. 通信方式

この例では、`StdioServerTransport`を使用：
- 標準入力(stdin)でリクエストを受信
- 標準出力(stdout)でレスポンスを送信
- 標準エラー出力(stderr)でログを出力

## 🚨 よくある問題と解決方法

### 1. モジュールインポートエラー

```bash
# エラー例
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '@modelcontextprotocol/sdk'

# 解決方法
npm install @modelcontextprotocol/sdk
```

### 2. TypeScriptコンパイルエラー

```bash
# エラー例
error TS2307: Cannot find module '@modelcontextprotocol/sdk/server/index.js'

# package.jsonの修正
{
  "type": "module",
  "compilerOptions": {
    "moduleResolution": "node"
  }
}
```

### 3. JSONパースエラー

```bash
# エラー例
SyntaxError: Unexpected token in JSON

# 解決方法：正しいJSON形式を使用
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run dev
```

## 📊 実行結果の例

### ツール一覧の取得

**リクエスト:**
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "指定されたメッセージをエコーバックします",
        "inputSchema": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "エコーするメッセージ"
            }
          },
          "required": ["message"]
        }
      }
    ]
  }
}
```

### ツール実行の例

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "add",
    "arguments": {
      "a": 15,
      "b": 27
    }
  }
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "15 + 27 = 42"
      }
    ]
  }
}
```

## 🎯 演習課題

### 初級課題

1. **新しいツールの追加**: `multiply`（掛け算）ツールを追加してください
2. **時間フォーマット**: `current_time`ツールに時間フォーマットオプションを追加してください
3. **エラーハンドリング**: 無効な入力に対する適切なエラーメッセージを実装してください

### 中級課題

1. **ファイル操作ツール**: テキストファイルを読み書きするツールを追加してください
2. **設定リソース**: サーバー設定を表示するリソースを実装してください
3. **ログ機能**: 各ツール呼び出しをログに記録する機能を追加してください

## 🎉 まとめ

この節では、基本的なMCPサーバーの作成方法を学習しました：

### 学習した内容

1. **サーバー初期化**: 基本的なサーバー構造とcapabilities設定
2. **ツール実装**: シンプルなツールの定義と実行ロジック
3. **リソース提供**: 静的データの提供方法
4. **通信処理**: JSON-RPC 2.0 プロトコルを使用した通信

### 次のステップ

基本的なサーバーが動作することを確認したら、**[02-client](../02-client/)** に進んでクライアント側の実装を学習しましょう。

## 📚 参考資料

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

*実際にコードを書いて動かすことで、MCPサーバーの基本的な動作を理解できます。エラーが発生した場合は、ログを確認して段階的にデバッグしてください。*