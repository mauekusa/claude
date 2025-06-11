# MCP API リファレンス

Model Context Protocol (MCP) の完全なAPIリファレンスです。

## プロトコル仕様

MCPは JSON-RPC 2.0 プロトコルを基盤としています。

### メッセージ形式

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "method-name",
  "params": {
    // メソッド固有のパラメータ
  }
}
```

#### レスポンス（成功）
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    // 結果データ
  }
}
```

#### レスポンス（エラー）
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32000,
    "message": "エラーメッセージ",
    "data": "追加のエラー情報"
  }
}
```

## ツール API

### tools/list

利用可能なツールの一覧を取得します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "tool-name",
        "description": "ツールの説明",
        "inputSchema": {
          "type": "object",
          "properties": {
            "param1": {
              "type": "string",
              "description": "パラメータ1の説明"
            }
          },
          "required": ["param1"]
        }
      }
    ]
  }
}
```

### tools/call

指定されたツールを実行します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "tool-name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "ツールの実行結果"
      }
    ],
    "isError": false
  }
}
```

## リソース API

### resources/list

利用可能なリソースの一覧を取得します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/list"
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resources": [
      {
        "uri": "resource://example/data",
        "name": "サンプルデータ",
        "description": "リソースの説明",
        "mimeType": "application/json"
      }
    ]
  }
}
```

### resources/read

指定されたリソースの内容を取得します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/read",
  "params": {
    "uri": "resource://example/data"
  }
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "contents": [
      {
        "uri": "resource://example/data",
        "mimeType": "application/json",
        "text": "{\"key\": \"value\"}"
      }
    ]
  }
}
```

### resources/subscribe

リソースの変更を監視します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/subscribe",
  "params": {
    "uri": "resource://example/data"
  }
}
```

#### 通知（リソース変更時）
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "resource://example/data"
  }
}
```

## プロンプト API

### prompts/list

利用可能なプロンプトの一覧を取得します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "prompts/list"
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "prompts": [
      {
        "name": "code-review",
        "description": "コードレビュー用プロンプト",
        "arguments": [
          {
            "name": "code",
            "description": "レビューするコード",
            "required": true
          },
          {
            "name": "language",
            "description": "プログラミング言語",
            "required": false
          }
        ]
      }
    ]
  }
}
```

### prompts/get

指定されたプロンプトを取得します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "prompts/get",
  "params": {
    "name": "code-review",
    "arguments": {
      "code": "function hello() { console.log('Hello'); }",
      "language": "javascript"
    }
  }
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "description": "コードレビュー用プロンプト",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "以下のJavaScriptコードをレビューしてください：\n\n```javascript\nfunction hello() { console.log('Hello'); }\n```"
        }
      }
    ]
  }
}
```

## 初期化 API

### initialize

サーバーとの接続を初期化します。

#### リクエスト
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.0.0"
    }
  }
}
```

#### レスポンス
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "prompts": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "version": "1.0.0"
    }
  }
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| -32700 | Parse error - 無効なJSON |
| -32600 | Invalid Request - 無効なリクエスト |
| -32601 | Method not found - メソッドが見つからない |
| -32602 | Invalid params - 無効なパラメータ |
| -32603 | Internal error - 内部エラー |
| -32000 | Server error - サーバーエラー |
| -32001 | Tool not found - ツールが見つからない |
| -32002 | Resource not found - リソースが見つからない |
| -32003 | Prompt not found - プロンプトが見つからない |

## データ型

### Content

コンテンツは様々な形式で表現できます：

```typescript
type Content = {
  type: 'text';
  text: string;
} | {
  type: 'image';
  data: string;  // base64エンコード
  mimeType: string;
} | {
  type: 'resource';
  resource: {
    uri: string;
    text?: string;
    blob?: string;  // base64エンコード
    mimeType?: string;
  };
};
```

### Tool

```typescript
type Tool = {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
};
```

### Resource

```typescript
type Resource = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};
```

### Prompt

```typescript
type Prompt = {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
};

type PromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};
```

## 実装例

### Node.js サーバー実装

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'example-server',
  version: '1.0.0'
});

// ツールの追加
server.addTool({
  name: 'echo',
  description: '入力をそのまま返します',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string' }
    },
    required: ['message']
  }
});

// ハンドラーの設定
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'echo') {
    return {
      content: [{
        type: 'text',
        text: args.message
      }]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

server.start();
```

### Python サーバー実装

```python
from mcp import Server
import asyncio

server = Server("example-server")

@server.tool(
    name="echo",
    description="入力をそのまま返します"
)
async def echo(message: str) -> str:
    return message

async def main():
    await server.start()

if __name__ == "__main__":
    asyncio.run(main())
```

## ベストプラクティス

### エラーハンドリング

```javascript
server.setRequestHandler('tools/call', async (request) => {
  try {
    // ツール実行
    return await executeTool(request);
  } catch (error) {
    return {
      error: {
        code: -32000,
        message: 'ツール実行エラー',
        data: error.message
      }
    };
  }
});
```

### 入力検証

```javascript
function validateToolInput(tool, args) {
  // JSONスキーマバリデーション
  const valid = ajv.validate(tool.inputSchema, args);
  if (!valid) {
    throw new Error('無効な入力パラメータ');
  }
}
```

### ログ記録

```javascript
server.setRequestHandler('tools/call', async (request) => {
  console.log(`ツール実行開始: ${request.params.name}`);
  
  const result = await executeTool(request);
  
  console.log(`ツール実行完了: ${request.params.name}`);
  return result;
});
```

## 参考リンク

- [MCP公式仕様](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0仕様](https://www.jsonrpc.org/specification)
- [JSON Schema仕様](https://json-schema.org/)