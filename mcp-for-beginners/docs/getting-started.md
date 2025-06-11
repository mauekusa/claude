# はじめに - MCP入門ガイド

このガイドでは、Model Context Protocol (MCP) を使い始めるために必要な基本設定と最初のステップを説明します。

## 前提条件

MCP開発を始める前に、以下がインストールされていることを確認してください：

### Node.js環境
```bash
# Node.jsのバージョン確認
node --version  # v18.0.0 以上

# npmのバージョン確認  
npm --version
```

### Python環境
```bash
# Pythonのバージョン確認
python --version  # 3.8 以上

# pipのバージョン確認
pip --version
```

## 環境のセットアップ

### 1. プロジェクトのクローン

```bash
git clone <repository-url>
cd mcp-for-beginners
```

### 2. 依存関係のインストール

#### Node.js版
```bash
npm install
```

#### Python版
```bash
pip install -r requirements.txt
```

## 最初のMCPサーバーを作成

### 基本的なサーバー構造

MCPサーバーは以下の基本コンポーネントから構成されます：

1. **サーバー初期化**: MCPサーバーインスタンスの作成
2. **ツールの定義**: サーバーが提供する機能の定義
3. **リクエストハンドラー**: クライアントからのリクエストの処理
4. **サーバー開始**: 通信を開始

### Node.js版の基本例

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'my-first-mcp-server',
  version: '1.0.0'
});

// ツールの定義
server.addTool({
  name: 'hello',
  description: '挨拶メッセージを返します',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '名前' }
    }
  }
});

// ツールの実行ハンドラー
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'hello') {
    const name = request.params.arguments?.name || '世界';
    return {
      content: [{
        type: 'text',
        text: `こんにちは、${name}さん！`
      }]
    };
  }
});

// サーバー開始
server.start();
```

### Python版の基本例

```python
from mcp import Server
import asyncio

server = Server("my-first-mcp-server")

@server.tool(
    name="hello",
    description="挨拶メッセージを返します"
)
async def hello(name: str = "世界") -> str:
    return f"こんにちは、{name}さん！"

async def main():
    await server.start()

if __name__ == "__main__":
    asyncio.run(main())
```

## サーバーの実行

### Node.js版
```bash
node server.js
```

### Python版
```bash
python server.py
```

## 次のステップ

基本的なサーバーが動作したら、以下を学習してください：

1. [基本概念](concepts.md) - MCPの核となる概念
2. [実用例](../examples/) - より複雑な実装例
3. [APIリファレンス](api-reference.md) - 詳細なAPI仕様

## トラブルシューティング

### よくある問題

**問題**: サーバーが起動しない
**解決策**: Node.jsまたはPythonのバージョンを確認し、必要な依存関係がインストールされていることを確認してください。

**問題**: ツールが認識されない
**解決策**: ツールの定義が正しく、適切なハンドラーが設定されていることを確認してください。

## サポート

問題が解決しない場合は、GitHubのIssuesページでお気軽にお問い合わせください。