# 基本MCPサーバー

この例では、最も基本的なMCPサーバーの実装を紹介します。Node.jsとPython両方のバージョンを提供しています。

## 概要

この基本サーバーは以下の機能を提供します：

- **echo**: 入力されたメッセージをそのまま返すシンプルなツール
- **add**: 2つの数値を加算するツール
- **current_time**: 現在の時刻を返すツール

## 使用方法

### Node.js版

#### セットアップ
```bash
cd examples/basic-server
npm install
```

#### サーバー実行
```bash
npm start
# または
node server.js
```

### Python版

#### セットアップ
```bash
cd examples/basic-server
pip install -r requirements.txt
```

#### サーバー実行
```bash
python server.py
```

## 実装されているツール

### 1. echo
入力されたメッセージをそのまま返します。

**パラメータ:**
- `message` (string): 返すメッセージ

**使用例:**
```json
{
  "name": "echo",
  "arguments": {
    "message": "こんにちは！"
  }
}
```

**結果:**
```
こんにちは！
```

### 2. add
2つの数値を加算します。

**パラメータ:**
- `a` (number): 第1の数値
- `b` (number): 第2の数値

**使用例:**
```json
{
  "name": "add",
  "arguments": {
    "a": 5,
    "b": 3
  }
}
```

**結果:**
```
5 + 3 = 8
```

### 3. current_time
現在の時刻を返します。

**パラメータ:** なし

**使用例:**
```json
{
  "name": "current_time",
  "arguments": {}
}
```

**結果:**
```
現在の時刻: 2024-01-15 14:30:25
```

## ファイル構成

```
basic-server/
├── README.md          # このファイル
├── server.js          # Node.js版サーバー
├── server.py          # Python版サーバー
├── package.json       # Node.js依存関係
└── requirements.txt   # Python依存関係
```

## カスタマイズ

### 新しいツールの追加

#### Node.js版
```javascript
// server.js

// ツールの定義
server.addTool({
  name: 'multiply',
  description: '2つの数値を掛け算します',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'number', description: '第1の数値' },
      b: { type: 'number', description: '第2の数値' }
    },
    required: ['a', 'b']
  }
});

// ハンドラーの追加
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'multiply') {
    const result = args.a * args.b;
    return {
      content: [{
        type: 'text',
        text: `${args.a} × ${args.b} = ${result}`
      }]
    };
  }
  
  // 既存のツールハンドラー
  // ...
});
```

#### Python版
```python
# server.py

@server.tool(
    name="multiply",
    description="2つの数値を掛け算します"
)
async def multiply(a: float, b: float) -> str:
    result = a * b
    return f"{a} × {b} = {result}"
```

## トラブルシューティング

### よくある問題

**問題:** サーバーが起動しない
**解決策:** 依存関係が正しくインストールされているか確認してください。

**問題:** ツールが認識されない
**解決策:** ツールの定義とハンドラーが正しく設定されているか確認してください。

**問題:** 数値の計算結果が正しくない
**解決策:** 入力パラメータが正しい型（数値）であることを確認してください。

## 次のステップ

基本サーバーを理解したら、以下に進んでください：

1. [高度なサーバー](../advanced-server/) - より複雑な機能を持つサーバー
2. [APIリファレンス](../../docs/api-reference.md) - 詳細なAPI仕様
3. 独自のツールを追加してカスタマイズ

## サポート

問題や質問がある場合は、GitHubのIssuesページでお気軽にお問い合わせください。