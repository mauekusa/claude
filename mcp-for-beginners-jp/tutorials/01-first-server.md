# 🎯 チュートリアル 1: 初めてのMCPサーバー

このチュートリアルでは、最初のMCPサーバーを一から作成していきます。

## 📚 学習目標

このチュートリアルを完了すると、以下ができるようになります：

- [ ] 基本的なMCPサーバープロジェクトのセットアップ
- [ ] シンプルなツールの実装
- [ ] サーバーのテストと実行
- [ ] エラーハンドリングの基本

## 🛠 準備

### 必要なツール

- Node.js (18以上) または Python (3.8以上) 
- テキストエディタ（VS Code推奨）
- ターミナル/コマンドプロンプト

### プロジェクトディレクトリの作成

```bash
mkdir my-first-mcp-server
cd my-first-mcp-server
```

## 📝 Step 1: プロジェクトの初期化

### Node.js の場合

```bash
npm init -y
npm install @modelcontextprotocol/sdk
```

### Python の場合

```bash
# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# MCPライブラリのインストール
pip install mcp
```

## 🔧 Step 2: 基本的なサーバーファイルの作成

### server.js (Node.js版)

```javascript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// サーバーを作成
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

// ツール一覧を定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: '入力されたメッセージをそのまま返します',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'エコーするメッセージ',
            },
          },
          required: ['message'],
        },
      },
    ],
  };
});

// ツールの実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'echo') {
    const { message } = args;
    return {
      content: [
        {
          type: 'text',
          text: `エコー: ${message}`,
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
  console.error('MCPサーバーが起動しました！');
}

main().catch(console.error);
```

### server.py (Python版)

```python
#!/usr/bin/env python3

import asyncio
import sys
from typing import Any, Sequence

import mcp.types as types
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server

# サーバーを作成
server = Server("my-first-mcp-server")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """利用可能なツール一覧を返す"""
    return [
        types.Tool(
            name="echo",
            description="入力されたメッセージをそのまま返します",
            inputSchema={
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "エコーするメッセージ",
                    }
                },
                "required": ["message"],
            },
        ),
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    """ツールの実行を処理"""
    if name == "echo":
        message = arguments.get("message", "") if arguments else ""
        return [
            types.TextContent(
                type="text",
                text=f"エコー: {message}",
            )
        ]
    
    raise ValueError(f"不明なツール: {name}")

async def main():
    """サーバーを起動"""
    async with stdio_server() as (read_stream, write_stream):
        print("MCPサーバーが起動しました！", file=sys.stderr)
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="my-first-mcp-server",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
```

## 🚀 Step 3: サーバーの実行

### 実行権限の付与（Unix系の場合）

```bash
chmod +x server.js  # または server.py
```

### サーバーの起動

```bash
# Node.js版
node server.js

# Python版  
python server.py
```

## 🧪 Step 4: サーバーのテスト

### 手動テスト

サーバーが起動したら、以下のJSONメッセージを入力してテストできます：

#### ツール一覧の取得

```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
```

#### ツールの実行

```json
{
  "jsonrpc": "2.0", 
  "id": 2, 
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "message": "Hello, MCP!"
    }
  }
}
```

### 期待される応答

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "エコー: Hello, MCP!"
      }
    ]
  }
}
```

## 🔍 Step 5: デバッグとトラブルシューティング

### よくある問題

1. **サーバーが起動しない**
   - Node.js/Pythonのバージョンを確認
   - 依存関係が正しくインストールされているか確認

2. **ツールが認識されない**
   - JSON形式が正しいか確認
   - `tools/list`が正常に動作するか確認

3. **権限エラー**
   - ファイルに実行権限があるか確認（`chmod +x`）

### デバッグのヒント

```javascript
// Node.js版でのデバッグ出力
console.error('デバッグ: ツールが呼び出されました', name, args);
```

```python
# Python版でのデバッグ出力
print(f"デバッグ: ツールが呼び出されました {name} {arguments}", file=sys.stderr)
```

## 🎓 まとめ

おめでとうございます！初めてのMCPサーバーが完成しました。

### 学んだこと

- ✅ MCPサーバーの基本構造
- ✅ ツールの定義と実装
- ✅ JSON-RPC通信の基本
- ✅ エラーハンドリング

### 次のステップ

- **[チュートリアル 2: リソースの追加](./02-adding-resources.md)**
- **[チュートリアル 3: 実用的なツールの作成](./03-practical-tools.md)**

## 💡 課題

以下の課題に挑戦してみてください：

1. **計算機ツール**: 基本的な算術計算を行うツールを追加
2. **時刻ツール**: 現在時刻を返すツールを追加
3. **大文字変換ツール**: テキストを大文字に変換するツールを追加

### ヒント

新しいツールを追加するには：
1. `ListToolsRequestSchema`のハンドラーに新しいツールを追加
2. `CallToolRequestSchema`のハンドラーに実装を追加
3. 適切なエラーハンドリングを含める