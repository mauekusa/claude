# MCP基本概念

Model Context Protocol (MCP) の核となる概念を理解することは、効果的なMCPアプリケーションを構築するために不可欠です。

## MCPの基本アーキテクチャ

MCPは、クライアント-サーバーアーキテクチャに基づいています：

```
[AIクライアント] ←→ [MCPサーバー] ←→ [外部リソース/ツール]
```

- **クライアント**: AIアシスタント（Claude、ChatGPTなど）
- **サーバー**: ツールとリソースを提供するMCPサーバー
- **リソース**: データ、API、ファイルシステムなど

## 核となる概念

### 1. ツール (Tools)

ツールは、MCPサーバーがクライアントに提供する機能です。

#### ツールの特徴
- **名前**: ツールの一意の識別子
- **説明**: ツールの目的と使用方法
- **入力スキーマ**: 受け入れる引数の形式
- **実行ハンドラー**: 実際の処理を行う関数

#### ツールの例
```javascript
// ファイル読み取りツール
{
  name: 'read_file',
  description: 'ファイルの内容を読み取ります',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'ファイルパス' }
    },
    required: ['path']
  }
}
```

### 2. リソース (Resources)

リソースは、MCPサーバーが管理するデータや情報源です。

#### リソースの種類
- **静的リソース**: 固定されたデータ（設定ファイル、ドキュメントなど）
- **動的リソース**: 変更可能なデータ（データベース、APIレスポンスなど）
- **ストリーミングリソース**: リアルタイムデータ（ログ、イベントストリームなど）

#### リソースの例
```javascript
// データベーステーブルリソース
{
  uri: 'database://users/table',
  name: 'ユーザーテーブル',
  description: 'システム内の全ユーザー情報',
  mimeType: 'application/json'
}
```

### 3. プロンプト (Prompts)

プロンプトは、特定のタスクやコンテキストに適した事前定義されたテンプレートです。

#### プロンプトの構成要素
- **名前**: プロンプトの識別子
- **説明**: プロンプトの目的
- **引数**: プロンプトをカスタマイズするためのパラメータ
- **テンプレート**: 実際のプロンプトテキスト

#### プロンプトの例
```javascript
// コードレビュープロンプト
{
  name: 'code_review',
  description: 'コードの品質をレビューします',
  arguments: {
    code: 'string',
    language: 'string'
  },
  template: `
    以下の${language}コードをレビューしてください：
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    改善点と推奨事項を提供してください。
  `
}
```

## 通信プロトコル

### リクエスト-レスポンス パターン

MCPは JSON-RPC 2.0 プロトコルを使用します：

```json
// リクエスト
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

// レスポンス
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "こんにちは、世界さん！"
      }
    ]
  }
}
```

### 主要なメソッド

- **tools/list**: 利用可能なツールの一覧取得
- **tools/call**: ツールの実行
- **resources/list**: 利用可能なリソースの一覧取得
- **resources/read**: リソースの内容取得
- **prompts/list**: 利用可能なプロンプトの一覧取得
- **prompts/get**: プロンプトの取得

## セキュリティ考慮事項

### 認証と認可

```javascript
// トークンベース認証の例
server.setRequestHandler('auth', async (request) => {
  const token = request.params.token;
  if (!isValidToken(token)) {
    throw new Error('無効な認証トークンです');
  }
});
```

### 入力検証

```javascript
// 入力データの検証
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  // 入力値の検証
  if (!validateInput(name, args)) {
    throw new Error('無効な入力パラメータです');
  }
  
  // 処理の実行
  return await executeTool(name, args);
});
```

## ベストプラクティス

### 1. エラーハンドリング

```javascript
server.setRequestHandler('tools/call', async (request) => {
  try {
    return await processTool(request);
  } catch (error) {
    return {
      error: {
        code: -32000,
        message: 'ツールの実行に失敗しました',
        data: error.message
      }
    };
  }
});
```

### 2. パフォーマンス最適化

- **キャッシュ**: 頻繁にアクセスされるデータをキャッシュ
- **非同期処理**: 重い処理は非同期で実行
- **レート制限**: APIアクセスの制限実装

### 3. ログとモニタリング

```javascript
server.setRequestHandler('tools/call', async (request) => {
  console.log(`ツール実行: ${request.params.name}`);
  
  const startTime = Date.now();
  const result = await processTool(request);
  const duration = Date.now() - startTime;
  
  console.log(`実行完了: ${duration}ms`);
  return result;
});
```

## 次のステップ

基本概念を理解したら、以下に進んでください：

1. [実用例](../examples/) - 実際のコード例で学習
2. [APIリファレンス](api-reference.md) - 詳細な技術仕様
3. 自分のMCPサーバーを構築してみる

## 参考資料

- [MCP公式仕様](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0仕様](https://www.jsonrpc.org/specification)
- [ベストプラクティスガイド](https://docs.modelcontextprotocol.io/)