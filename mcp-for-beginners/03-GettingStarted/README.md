# 03 - MCPを始めよう

## 📖 概要

この章では、Model Context Protocol (MCP) の実践的な実装を学習します。環境設定から基本的なMCPサーバーとクライアントの作成、既存のアプリケーションとの統合まで、段階的に進めていきます。

## 🎯 学習目標

この章を完了すると、以下のことができるようになります：

- MCP開発環境を設定できる
- 基本的なMCPサーバーを作成できる
- MCPクライアントを実装できる
- LLMとMCPを統合できる
- Visual Studio Code でMCPサーバーを利用できる
- SSE（Server-Sent Events）を使用したMCPサーバーを作成できる
- AI Toolkitを活用してMCPワークフローを管理できる

## 🛠️ 前提条件

以下のツールがインストールされていることを確認してください：

- **Node.js** (v18以降)
- **npm** (v8以降)
- **Python** (3.8以降)
- **pip** (最新版)
- **Git**
- **Visual Studio Code** (推奨)

## 📚 学習の流れ

この章は以下の順序で進めることを推奨します：

### 1. 基本実装編

#### **[01-first-server](./01-first-server/)** 🚀
最初のMCPサーバーを作成します。
- 基本的なサーバー構造の理解
- シンプルなツールの実装
- サーバーの起動とテスト

#### **[02-client](./02-client/)** 🤝
基本的なMCPクライアントを実装します。
- クライアント・サーバー間の通信
- ツールの呼び出し
- エラーハンドリング

### 2. LLM統合編

#### **[03-llm-client](./03-llm-client/)** 🧠
LLMとMCPを統合したクライアントを作成します。
- OpenAI API との統合
- Claude API との統合
- 会話フローの実装

### 3. 開発環境統合編

#### **[04-vscode](./04-vscode/)** 💻
Visual Studio Code でMCPサーバーを利用します。
- VS Code拡張機能の設定
- 開発ワークフローの効率化
- デバッグとトラブルシューティング

### 4. 高度な実装編

#### **[05-sse-server](./05-sse-server/)** 🌐
Server-Sent Events を使用したMCPサーバーを作成します。
- SSEの基本概念
- Webベースのクライアントとの連携
- リアルタイム通信の実装

#### **[06-aitk](./06-aitk/)** 🛠️
AI Toolkit を活用してMCPワークフローを管理します。
- AI Toolkitの基本操作
- ワークフローの自動化
- 統合開発環境の構築

## 🔧 環境設定

### Node.js環境の準備

```bash
# Node.jsのバージョン確認
node --version  # v18以降

# npmのバージョン確認
npm --version   # v8以降

# プロジェクトディレクトリの作成
mkdir mcp-tutorial
cd mcp-tutorial

# package.jsonの初期化
npm init -y

# MCP SDKのインストール
npm install @modelcontextprotocol/sdk
```

### Python環境の準備

```bash
# Pythonのバージョン確認
python --version  # 3.8以降

# 仮想環境の作成（推奨）
python -m venv mcp-env

# 仮想環境の有効化
# Windows
mcp-env\Scripts\activate
# macOS/Linux
source mcp-env/bin/activate

# MCP Python SDKのインストール
pip install mcp
```

### 開発ツールの設定

```bash
# Visual Studio Code の拡張機能（推奨）
code --install-extension ms-vscode.node-debug2
code --install-extension ms-python.python
code --install-extension bradlc.vscode-tailwindcss

# TypeScript開発環境（オプション）
npm install -g typescript
npm install -D @types/node
```

## 📁 プロジェクト構造

推奨されるプロジェクト構造：

```
mcp-tutorial/
├── package.json
├── tsconfig.json
├── .env
├── src/
│   ├── server/
│   │   ├── index.ts
│   │   ├── tools/
│   │   └── resources/
│   ├── client/
│   │   └── index.ts
│   └── utils/
├── examples/
│   ├── basic-server/
│   ├── client-demo/
│   └── llm-integration/
├── tests/
└── docs/
```

## 🚀 クイックスタート

### 1. シンプルなMCPサーバーの作成

```typescript
// src/server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server(
  {
    name: "tutorial-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// 簡単なツールの実装
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "echo") {
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args.message || "Hello, MCP!"}`
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// サーバーの起動
const transport = new StdioServerTransport();
server.connect(transport);
```

### 2. サーバーの起動

```bash
# TypeScriptのコンパイル
npx tsc

# サーバーの起動
node dist/server/index.js
```

### 3. 基本的なテスト

```bash
# 別のターミナルでクライアントテスト
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server/index.js
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. Node.js バージョンエラー
```bash
# 現在のバージョン確認
node --version

# Node Version Managerの使用（推奨）
nvm install 18
nvm use 18
```

#### 2. パッケージインストールエラー
```bash
# キャッシュのクリア
npm cache clean --force

# node_modulesの再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScriptコンパイルエラー
```bash
# TypeScriptのグローバルインストール
npm install -g typescript

# tsconfig.jsonの確認
npx tsc --init
```

## 📊 学習進捗チェックリスト

各セクションを完了したら、以下をチェックしてください：

### 基本実装編
- [ ] **01-first-server**: 基本的なMCPサーバーが作成できる
- [ ] **02-client**: MCPクライアントが実装できる

### LLM統合編
- [ ] **03-llm-client**: LLMとMCPの統合ができる

### 開発環境統合編
- [ ] **04-vscode**: VS CodeでMCPサーバーが利用できる

### 高度な実装編
- [ ] **05-sse-server**: SSEサーバーが作成できる
- [ ] **06-aitk**: AI Toolkitが活用できる

## 🎉 まとめ

この章では、MCPの実践的な実装について学習します。各セクションは独立していますが、順序立てて進めることで理解が深まります。

### 次のステップ

準備ができたら、**[01-first-server](./01-first-server/)** から始めましょう！

## 📚 参考資料

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Visual Studio Code Documentation](https://code.visualstudio.com/docs)

---

*実践を通して学ぶことで、MCPの理解がより深まります。各例を実際に動かしながら進めてください。*