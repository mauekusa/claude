# 🚀 MCP 入門ガイド

このガイドでは、Model Context Protocol (MCP) の基本的なセットアップと使用方法を説明します。

## 📋 前提条件

始める前に、以下がインストールされていることを確認してください：

- **Node.js** (バージョン 18 以上)
- **Python** (バージョン 3.8 以上) または他の対応言語
- **テキストエディタ** (VS Code推奨)

## 🛠 環境セットアップ

### 1. プロジェクト作成

```bash
# 新しいディレクトリを作成
mkdir my-first-mcp-server
cd my-first-mcp-server

# package.jsonを初期化（Node.jsの場合）
npm init -y

# 必要な依存関係をインストール
npm install @modelcontextprotocol/sdk
```

### 2. 基本的なMCPサーバーの作成

`server.js` ファイルを作成します：

```javascript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// サーバーインスタンスを作成
const server = new Server(
  {
    name: 'my-first-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ツールの一覧を提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hello',
        description: 'シンプルな挨拶メッセージを返すツール',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '挨拶する相手の名前',
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

// ツールの実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'hello') {
    const { name: personName } = args;
    return {
      content: [
        {
          type: 'text',
          text: `こんにちは、${personName}さん！MCPサーバーから挨拶しています。`,
        },
      ],
    };
  }
  
  throw new Error(`不明なツール: ${name}`);
});

// サーバーを起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP サーバーが起動しました');
}

main().catch((error) => {
  console.error('サーバーエラー:', error);
  process.exit(1);
});
```

### 3. サーバーの実行

```bash
# サーバーを実行可能にする
chmod +x server.js

# サーバーを起動
node server.js
```

## 🧪 サーバーのテスト

### 基本的なテスト

以下のJSONメッセージを使用してサーバーをテストできます：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

期待される応答：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "hello",
        "description": "シンプルな挨拶メッセージを返すツール",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "挨拶する相手の名前"
            }
          },
          "required": ["name"]
        }
      }
    ]
  }
}
```

### ツールの呼び出しテスト

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "hello",
    "arguments": {
      "name": "太郎"
    }
  }
}
```

## 🔧 クライアントでの使用

### Claudeでの使用

1. Claude Desktop または Claude CLI に MCP サーバーを設定
2. 設定ファイルにサーバー情報を追加
3. Claudeでツールを使用

設定例：

```json
{
  "mcpServers": {
    "my-first-server": {
      "command": "node",
      "args": ["/path/to/your/server.js"]
    }
  }
}
```

## 🎯 次のステップ

1. **[基本概念](./concepts.md)** を学習
2. **[チュートリアル](./tutorials/)** で実践練習
3. **[サンプル](./examples/)** を探索
4. 独自のツールやリソースを作成

## ❓ トラブルシューティング

### よくある問題

**問題**: サーバーが起動しない
**解決策**: Node.js のバージョンを確認し、依存関係が正しくインストールされているか確認

**問題**: ツールが認識されない
**解決策**: JSON-RPC メッセージの形式が正しいか確認

**問題**: 権限エラー
**解決策**: `chmod +x server.js` でファイルを実行可能にする

### デバッグのヒント

- `console.error()` を使用してデバッグ情報を出力
- JSON メッセージの形式を確認
- サーバーログを監視