# 🎯 基本的なMCPサーバー

このディレクトリには、MCPの基本的なサーバー実装例が含まれています。

## 📋 含まれる内容

- **server.js** - Node.js による基本的なMCPサーバー
- **server.py** - Python による基本的なMCPサーバー
- **package.json** - Node.js の依存関係設定
- **requirements.txt** - Python の依存関係設定

## 🚀 クイックスタート

### Node.js 版

```bash
# 依存関係をインストール
npm install

# サーバーを起動
node server.js
```

### Python 版

```bash
# 依存関係をインストール
pip install -r requirements.txt

# サーバーを起動
python server.py
```

## 🔧 提供される機能

### ツール

1. **hello** - 挨拶メッセージを返す
2. **calculate** - 基本的な数学計算を実行
3. **current_time** - 現在時刻を取得

### リソース

1. **welcome.txt** - ウェルカムメッセージ
2. **server_info.json** - サーバー情報

### プロンプト

1. **greeting** - 挨拶用プロンプトテンプレート

## 📝 使用例

### ツールの呼び出し

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "expression": "10 + 5 * 2"
    }
  }
}
```

### リソースの読み取り

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "text://welcome"
  }
}
```

## 🎓 学習のポイント

このサンプルを通じて以下を学べます：

- MCPサーバーの基本構造
- ツールの実装方法
- リソースの提供方法
- プロンプトテンプレートの作成
- エラーハンドリング