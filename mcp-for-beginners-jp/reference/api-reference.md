# 📚 MCP API リファレンス

Model Context Protocol (MCP) の完全なAPIリファレンスです。

## 🌐 概要

MCPは **JSON-RPC 2.0** プロトコルを基盤とし、クライアントとサーバー間の通信を行います。

### 基本的なメッセージ形式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {
    // パラメータ
  }
}
```

## 🔧 ツール (Tools) API

### tools/list

利用可能なツール一覧を取得します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "tool_name",
        "description": "ツールの説明",
        "inputSchema": {
          "type": "object",
          "properties": {
            "param1": {
              "type": "string",
              "description": "パラメータの説明"
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

特定のツールを実行します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1"
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
        "text": "ツールの実行結果"
      }
    ],
    "isError": false
  }
}
```

## 📊 リソース (Resources) API

### resources/list

利用可能なリソース一覧を取得します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/list"
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resources": [
      {
        "uri": "file:///path/to/file.txt",
        "name": "ファイル名",
        "description": "リソースの説明",
        "mimeType": "text/plain"
      }
    ]
  }
}
```

### resources/read

特定のリソースの内容を読み取ります。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/read",
  "params": {
    "uri": "file:///path/to/file.txt"
  }
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "contents": [
      {
        "uri": "file:///path/to/file.txt",
        "mimeType": "text/plain",
        "text": "ファイルの内容"
      }
    ]
  }
}
```

### resources/subscribe

リソースの変更通知を購読します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///path/to/file.txt"
  }
}
```

### resources/unsubscribe

リソースの変更通知の購読を解除します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "resources/unsubscribe",
  "params": {
    "uri": "file:///path/to/file.txt"
  }
}
```

## 📝 プロンプト (Prompts) API

### prompts/list

利用可能なプロンプト一覧を取得します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "prompts/list"
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "prompts": [
      {
        "name": "prompt_name",
        "description": "プロンプトの説明",
        "arguments": [
          {
            "name": "arg1",
            "description": "引数の説明",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### prompts/get

特定のプロンプトを取得します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "prompts/get",
  "params": {
    "name": "prompt_name",
    "arguments": {
      "arg1": "value1"
    }
  }
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "description": "生成されたプロンプト",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "プロンプトのメッセージ"
        }
      }
    ]
  }
}
```

## 🔄 サーバー管理 API

### initialize

サーバーとの接続を初期化します。

**リクエスト:**
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  }
}
```

**レスポンス:**
```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "serverInfo": {
      "name": "server-name",
      "version": "1.0.0"
    }
  }
}
```

### notifications/initialized

初期化完了を通知します。

**通知:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

## 📋 データ型

### Tool

```typescript
interface Tool {
  name: string;              // ツール名
  description?: string;      // ツールの説明
  inputSchema: JsonSchema;   // 入力スキーマ
}
```

### Resource

```typescript
interface Resource {
  uri: string;              // リソースURI
  name: string;             // リソース名
  description?: string;     // リソースの説明
  mimeType?: string;        // MIMEタイプ
}
```

### Prompt

```typescript
interface Prompt {
  name: string;                    // プロンプト名
  description?: string;            // プロンプトの説明
  arguments?: PromptArgument[];    // 引数定義
}

interface PromptArgument {
  name: string;              // 引数名
  description?: string;      // 引数の説明
  required?: boolean;        // 必須フラグ
}
```

### Content

```typescript
type Content = TextContent | ImageContent | EmbeddedResource;

interface TextContent {
  type: "text";
  text: string;
}

interface ImageContent {
  type: "image";
  data: string;         // Base64エンコードされた画像データ
  mimeType: string;     // 画像のMIMEタイプ
}

interface EmbeddedResource {
  type: "resource";
  resource: {
    uri: string;
    text?: string;
    blob?: string;      // Base64エンコードされたバイナリデータ
  };
}
```

## ⚠️ エラーハンドリング

### エラーレスポンス形式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "エラーメッセージ",
    "data": {
      // 追加のエラー情報
    }
  }
}
```

### 標準エラーコード

| コード | 名前 | 説明 |
|--------|------|------|
| -32700 | Parse error | 無効なJSON |
| -32600 | Invalid Request | 無効なリクエスト |
| -32601 | Method not found | メソッドが見つからない |
| -32602 | Invalid params | 無効なパラメータ |
| -32603 | Internal error | 内部エラー |
| -32000 | Server error | サーバーエラー |

### カスタムエラーコード

| コード | 名前 | 説明 |
|--------|------|------|
| -32001 | Tool not found | ツールが見つからない |
| -32002 | Resource not found | リソースが見つからない |
| -32003 | Prompt not found | プロンプトが見つからない |
| -32004 | Permission denied | 権限が不足 |

## 🔐 セキュリティ考慮事項

### 入力検証

```javascript
function validateInput(schema, data) {
  // JSON Schemaによる検証
  if (!isValid(schema, data)) {
    throw new Error('無効な入力データ');
  }
}
```

### 権限チェック

```javascript
function checkPermission(resource, action) {
  // リソースへのアクセス権限確認
  if (!hasPermission(resource, action)) {
    throw new Error('アクセス権限がありません');
  }
}
```

### 出力サニタイゼーション

```javascript
function sanitizeOutput(text) {
  // 機密情報の除去
  return text.replace(/password|secret|key/gi, '[REDACTED]');
}
```

## 🌍 トランスポート

### Stdio トランスポート

```javascript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

### HTTP トランスポート

```javascript
import { HTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const transport = new HTTPServerTransport({
  port: 3000,
  hostname: 'localhost'
});
```

### WebSocket トランスポート

```javascript
import { WebSocketServerTransport } from '@modelcontextprotocol/sdk/server/websocket.js';

const transport = new WebSocketServerTransport({
  port: 8080
});
```

## 📊 パフォーマンス最適化

### ストリーミング応答

大きなデータの場合、ストリーミング応答を使用：

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return {
    content: [
      {
        type: "text",
        text: "大きなデータの開始...",
      }
    ],
    _meta: {
      progressToken: "progress-123"
    }
  };
});
```

### キャッシュ戦略

```javascript
const cache = new Map();

function getCachedResult(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = computeExpensiveOperation(key);
  cache.set(key, result);
  return result;
}
```

このリファレンスを参考に、効率的で安全なMCPサーバーを開発してください。