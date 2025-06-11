# 🧠 MCP 基本概念

Model Context Protocol (MCP) の核となる概念を理解しましょう。

## 🏗 アーキテクチャ概要

MCPは **クライアント・サーバー** アーキテクチャを採用しています：

```
┌─────────────────┐                    ┌─────────────────┐
│   MCPクライアント  │                    │   MCPサーバー    │
│                 │                    │                 │
│  • Claude       │     JSON-RPC      │  • ツール        │
│  • その他のLLM   │ ◄──────────────── │  • リソース      │
│  • カスタムアプリ │                    │  • プロンプト    │
└─────────────────┘                    └─────────────────┘
```

## 🔧 コア機能

### 1. ツール (Tools)

**定義**: LLMが実行できる関数やアクション

**特徴**:
- 動的な操作を可能にする
- 引数を受け取り、結果を返す
- 外部システムとの相互作用

**例**:
```javascript
{
  name: "calculate",
  description: "数学的計算を実行",
  inputSchema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "計算式（例: 2 + 2）"
      }
    }
  }
}
```

### 2. リソース (Resources)

**定義**: アクセス可能なデータソース

**特徴**:
- 静的または動的なコンテンツ
- ファイル、データベース、API応答など
- 読み取り専用または読み書き対応

**例**:
```javascript
{
  uri: "file:///docs/readme.txt",
  name: "プロジェクト README",
  description: "プロジェクトの説明文書",
  mimeType: "text/plain"
}
```

### 3. プロンプト (Prompts)

**定義**: 再利用可能なメッセージテンプレート

**特徴**:
- 標準化されたLLMインタラクション
- パラメータ化されたテンプレート
- 一貫した応答品質

**例**:
```javascript
{
  name: "code-review",
  description: "コードレビュープロンプト",
  arguments: [
    {
      name: "code",
      description: "レビューするコード",
      required: true
    }
  ]
}
```

## 🔄 通信プロトコル

### JSON-RPC 2.0

MCPは **JSON-RPC 2.0** を使用して通信します：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "hello",
    "arguments": {
      "name": "世界"
    }
  }
}
```

### 主要なメソッド

| メソッド | 説明 | 例 |
|---------|------|---|
| `tools/list` | 利用可能なツール一覧を取得 | ツール発見 |
| `tools/call` | 特定のツールを実行 | 計算実行 |
| `resources/list` | 利用可能なリソース一覧を取得 | ファイル一覧 |
| `resources/read` | リソースの内容を読み取り | ファイル読み込み |
| `prompts/list` | 利用可能なプロンプト一覧を取得 | テンプレート発見 |
| `prompts/get` | プロンプトテンプレートを取得 | テンプレート使用 |

## 🚛 トランスポート方式

### 1. Stdio トランスポート

**用途**: ローカル開発、シンプルな統合
**接続**: 標準入力/出力
**利点**: セットアップが簡単

```javascript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 2. HTTP トランスポート

**用途**: Web アプリケーション、リモートサーバー
**接続**: HTTP/HTTPS
**利点**: 広範囲な互換性

```javascript
import { HTTPServerTransport } from '@modelcontextprotocol/sdk/server/http.js';

const transport = new HTTPServerTransport({
  port: 3000
});
```

### 3. WebSocket トランスポート

**用途**: リアルタイム通信
**接続**: WebSocket
**利点**: 双方向通信、低遅延

## 🔒 セキュリティ考慮事項

### 権限管理

- **最小権限の原則**: 必要最小限のアクセス権限のみ付与
- **入力検証**: すべての入力パラメータを検証
- **出力サニタイゼーション**: 機密情報の漏洩を防止

### 認証と認可

```javascript
// 基本的な認証例
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // 認証チェック
  if (!isAuthorized(request)) {
    throw new Error('認証が必要です');
  }
  
  // ツール実行
  return executetool(request.params);
});
```

## 📊 データ型

### スキーマ定義

MCPは **JSON Schema** を使用してデータ型を定義：

```javascript
{
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "ユーザー名",
      minLength: 1
    },
    age: {
      type: "integer",
      minimum: 0,
      maximum: 150
    },
    email: {
      type: "string",
      format: "email"
    }
  },
  required: ["name", "email"]
}
```

### よく使用されるデータ型

- **string**: 文字列
- **integer**: 整数
- **number**: 数値
- **boolean**: 真偽値
- **array**: 配列
- **object**: オブジェクト

## 🎯 ベストプラクティス

### 『ツール設計』

1. **単一責任**: 1つのツールは1つの責任のみ
2. **明確な命名**: ツール名と説明を明確に
3. **エラーハンドリング**: 適切なエラーメッセージ
4. **型安全性**: 厳密な入力スキーマ

### 『リソース管理』

1. **効率的なアクセス**: 必要なデータのみ取得
2. **キャッシュ活用**: 頻繁にアクセスされるデータのキャッシュ
3. **更新通知**: データ変更時の通知機能

### 『プロンプト設計』

1. **再利用性**: 汎用的なテンプレート作成
2. **パラメータ化**: 柔軟性のある設計
3. **明確な指示**: 曖昧さのない指示文

## 🔍 実装例

### シンプルなファイルサーバー

```javascript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file:///docs/readme.md",
        name: "README",
        description: "プロジェクト説明",
        mimeType: "text/markdown"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === "file:///docs/readme.md") {
    const content = await fs.readFile('./docs/readme.md', 'utf8');
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    };
  }
  
  throw new Error(`リソースが見つかりません: ${uri}`);
});
```

これらの概念を理解することで、効果的なMCPサーバーを構築できます。