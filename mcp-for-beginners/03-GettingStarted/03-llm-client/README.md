# 03 - LLMとの統合クライアント

## 📖 概要

この節では、Large Language Model (LLM) とModel Context Protocol (MCP) を統合したクライアントを作成します。OpenAI API や Claude API と連携し、自然言語でMCPツールを操作できる会話フローを実装します。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- LLMとMCPサーバーを統合したクライアントを作成できる
- 自然言語でツール実行を指示できる
- LLMがツール結果を解釈して応答を生成できる
- 会話の文脈を保持した対話システムを構築できる
- 複数のLLMプロバイダーに対応できる

## 🛠️ 前提条件

- [02-client](../02-client/) が完了していること
- OpenAI API キーまたは Anthropic API キーを取得していること
- Node.js (v18以降) がインストールされていること

## 📁 プロジェクトの設定

### 1. プロジェクトディレクトリの作成

```bash
mkdir mcp-llm-client
cd mcp-llm-client

# package.jsonの初期化
npm init -y
```

### 2. 必要なパッケージのインストール

```bash
# MCP SDK のインストール
npm install @modelcontextprotocol/sdk

# LLM API クライアントのインストール
npm install openai @anthropic-ai/sdk

# その他の依存関係
npm install dotenv

# 開発用依存関係のインストール
npm install -D typescript @types/node tsx

# TypeScript設定ファイルの作成
npx tsc --init
```

### 3. 環境変数の設定

```bash
# .env ファイルの作成
touch .env
```

```env
# .env
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API設定  
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# デフォルトLLMプロバイダー (openai | anthropic)
DEFAULT_LLM_PROVIDER=openai

# MCPサーバー設定
MCP_SERVER_COMMAND=node
MCP_SERVER_ARGS=../first-mcp-server/dist/server.js

# デバッグモード
DEBUG_MODE=true
```

## 🚀 LLM統合クライアントの実装

### 1. LLMプロバイダーの抽象化

```typescript
// src/llm/base-provider.ts
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export abstract class LLMProvider {
  abstract generateResponse(
    messages: LLMMessage[],
    availableTools?: any[]
  ): Promise<LLMResponse>;

  abstract parseToolCalls(content: string): ToolCall[];

  protected formatToolsForLLM(tools: any[]): string {
    return tools.map(tool => {
      const params = Object.entries(tool.inputSchema.properties || {})
        .map(([name, schema]: [string, any]) => {
          const required = tool.inputSchema.required?.includes(name) ? ' (必須)' : '';
          return `  - ${name}${required}: ${schema.description || 'No description'}`;
        })
        .join('\n');

      return `**${tool.name}**: ${tool.description}\nパラメータ:\n${params}`;
    }).join('\n\n');
  }
}
```

### 2. OpenAI プロバイダーの実装

```typescript
// src/llm/openai-provider.ts
import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse, ToolCall } from './base-provider.js';

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(
    messages: LLMMessage[],
    availableTools?: any[]
  ): Promise<LLMResponse> {
    try {
      // システムメッセージにツール情報を追加
      const systemMessage = this.buildSystemMessage(availableTools);
      const chatMessages = [systemMessage, ...messages];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        max_tokens: 1000
      });

      const choice = response.choices[0];
      if (!choice.message.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // ツール呼び出しパターンの検出
    const toolCallPattern = /```tool:(\w+)\s*(.*?)```/gs;
    let match;

    while ((match = toolCallPattern.exec(content)) !== null) {
      const toolName = match[1];
      const argsText = match[2].trim();

      try {
        const args = argsText ? JSON.parse(argsText) : {};
        toolCalls.push({
          name: toolName,
          arguments: args
        });
      } catch (error) {
        console.warn(`Failed to parse tool arguments: ${argsText}`);
      }
    }

    return toolCalls;
  }

  private buildSystemMessage(availableTools?: any[]): LLMMessage {
    let systemContent = `あなたは、MCPツールを使用できるAIアシスタントです。

ユーザーの要求に応じて、以下の形式でツールを呼び出すことができます：

\`\`\`tool:ツール名
{
  "パラメータ名": "値"
}
\`\`\`

例：
\`\`\`tool:echo
{
  "message": "Hello World"
}
\`\`\``;

    if (availableTools && availableTools.length > 0) {
      systemContent += '\n\n利用可能なツール:\n\n' + this.formatToolsForLLM(availableTools);
    }

    systemContent += '\n\nツールを使用する際は、必ず上記の形式に従ってください。ツール実行後、その結果を踏まえて適切な回答を生成してください。';

    return {
      role: 'system',
      content: systemContent
    };
  }
}
```

### 3. Anthropic プロバイダーの実装

```typescript
// src/llm/anthropic-provider.ts
import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMResponse, ToolCall } from './base-provider.js';

export class AnthropicProvider extends LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(
    messages: LLMMessage[],
    availableTools?: any[]
  ): Promise<LLMResponse> {
    try {
      // システムメッセージとユーザーメッセージを分離
      const systemMessage = this.buildSystemMessage(availableTools);
      const userMessages = messages.filter(m => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        system: systemMessage.content,
        messages: userMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }))
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Non-text response from Claude');
      }

      return {
        content: content.text,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };

    } catch (error) {
      throw new Error(`Anthropic API error: ${error}`);
    }
  }

  parseToolCalls(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    
    // ツール呼び出しパターンの検出
    const toolCallPattern = /<tool:(\w+)>(.*?)<\/tool:\1>/gs;
    let match;

    while ((match = toolCallPattern.exec(content)) !== null) {
      const toolName = match[1];
      const argsText = match[2].trim();

      try {
        const args = argsText ? JSON.parse(argsText) : {};
        toolCalls.push({
          name: toolName,
          arguments: args
        });
      } catch (error) {
        console.warn(`Failed to parse tool arguments: ${argsText}`);
      }
    }

    return toolCalls;
  }

  private buildSystemMessage(availableTools?: any[]): LLMMessage {
    let systemContent = `あなたは、MCPツールを使用できるAIアシスタントです。

ユーザーの要求に応じて、以下の形式でツールを呼び出すことができます：

<tool:ツール名>
{
  "パラメータ名": "値"
}
</tool:ツール名>

例：
<tool:echo>
{
  "message": "Hello World"
}
</tool:echo>`;

    if (availableTools && availableTools.length > 0) {
      systemContent += '\n\n利用可能なツール:\n\n' + this.formatToolsForLLM(availableTools);
    }

    systemContent += '\n\nツールを使用する際は、必ず上記の形式に従ってください。ツール実行後、その結果を踏まえて適切な回答を生成してください。';

    return {
      role: 'system',
      content: systemContent
    };
  }
}
```

### 4. メイン統合クライアントの実装

```typescript
// src/llm-client.ts
import { MCPClient } from '../02-client/src/client.js';
import { LLMProvider, LLMMessage } from './llm/base-provider.js';
import { OpenAIProvider } from './llm/openai-provider.js';
import { AnthropicProvider } from './llm/anthropic-provider.js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface LLMClientConfig {
  mcpServerCommand: string;
  mcpServerArgs?: string[];
  llmProvider: 'openai' | 'anthropic';
  llmModel?: string;
  debug?: boolean;
}

export class LLMMCPClient {
  private mcpClient: MCPClient;
  private llmProvider: LLMProvider;
  private conversationHistory: LLMMessage[] = [];
  private availableTools: any[] = [];
  private config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = config;

    // MCP クライアントの初期化
    this.mcpClient = new MCPClient({
      serverCommand: config.mcpServerCommand,
      serverArgs: config.mcpServerArgs,
      debug: config.debug
    });

    // LLM プロバイダーの初期化
    this.llmProvider = this.createLLMProvider(config);
  }

  private createLLMProvider(config: LLMClientConfig): LLMProvider {
    switch (config.llmProvider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required');
        }
        return new OpenAIProvider(process.env.OPENAI_API_KEY, config.llmModel);
      
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY is required');
        }
        return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, config.llmModel);
      
      default:
        throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
    }
  }

  /**
   * クライアントの初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 LLM-MCP Client を初期化中...');

      // MCPサーバーに接続
      await this.mcpClient.connect();
      console.log('✅ MCPサーバーに接続しました');

      // 利用可能なツールを取得
      this.availableTools = await this.mcpClient.listTools();
      console.log(`📋 ${this.availableTools.length} 個のツールが利用可能です`);

      if (this.config.debug) {
        console.log('利用可能なツール:', this.availableTools.map(t => t.name));
      }

    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * ユーザーメッセージの処理
   */
  async processMessage(userMessage: string): Promise<string> {
    try {
      // ユーザーメッセージを会話履歴に追加
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      console.log(`💬 ユーザー: ${userMessage}`);

      // LLMから応答を生成
      let response = await this.llmProvider.generateResponse(
        this.conversationHistory,
        this.availableTools
      );

      // ツール呼び出しがあるかチェック
      const toolCalls = this.llmProvider.parseToolCalls(response.content);

      if (toolCalls.length > 0) {
        console.log(`🔧 ${toolCalls.length} 個のツールを実行中...`);

        // ツールを順次実行
        for (const toolCall of toolCalls) {
          console.log(`  → ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`);
          
          const toolResult = await this.mcpClient.callTool(
            toolCall.name,
            toolCall.arguments
          );

          if (toolResult.success) {
            const resultText = toolResult.content?.map(c => c.text).join('\n') || '';
            console.log(`  ✅ 結果: ${resultText.substring(0, 100)}...`);

            // ツール結果を会話履歴に追加
            this.conversationHistory.push({
              role: 'assistant',
              content: `ツール "${toolCall.name}" を実行しました。結果: ${resultText}`
            });
          } else {
            console.log(`  ❌ エラー: ${toolResult.error}`);
            
            this.conversationHistory.push({
              role: 'assistant',
              content: `ツール "${toolCall.name}" の実行に失敗しました。エラー: ${toolResult.error}`
            });
          }
        }

        // ツール実行後に再度LLMから応答を生成
        response = await this.llmProvider.generateResponse(
          this.conversationHistory,
          this.availableTools
        );
      }

      // 最終的な応答を会話履歴に追加
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content
      });

      if (this.config.debug && response.usage) {
        console.log(`📊 トークン使用量: ${response.usage.total_tokens}`);
      }

      return response.content;

    } catch (error) {
      console.error('❌ メッセージ処理エラー:', error);
      return `エラーが発生しました: ${error}`;
    }
  }

  /**
   * 会話履歴の取得
   */
  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 会話履歴のクリア
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
    console.log('🗑️  会話履歴をクリアしました');
  }

  /**
   * クライアントの終了処理
   */
  async shutdown(): Promise<void> {
    try {
      await this.mcpClient.disconnect();
      console.log('👋 LLM-MCP Client を終了しました');
    } catch (error) {
      console.error('❌ 終了処理エラー:', error);
    }
  }
}
```

## 🧪 実際の使用例

### 1. シンプルな会話例

```typescript
// src/examples/simple-conversation.ts
import { LLMMCPClient } from '../llm-client.js';

async function simpleConversation() {
  const client = new LLMMCPClient({
    mcpServerCommand: process.env.MCP_SERVER_COMMAND || 'node',
    mcpServerArgs: [process.env.MCP_SERVER_ARGS || '../first-mcp-server/dist/server.js'],
    llmProvider: (process.env.DEFAULT_LLM_PROVIDER as 'openai' | 'anthropic') || 'openai',
    debug: true
  });

  try {
    await client.initialize();

    // 基本的な挨拶
    let response = await client.processMessage('こんにちは！何ができますか？');
    console.log('🤖 アシスタント:', response);

    // 計算の依頼
    response = await client.processMessage('15と27を足してください');
    console.log('🤖 アシスタント:', response);

    // 現在時刻の確認
    response = await client.processMessage('今何時ですか？');
    console.log('🤖 アシスタント:', response);

    // エコー機能のテスト
    response = await client.processMessage('「Hello, MCP World!」とエコーしてください');
    console.log('🤖 アシスタント:', response);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.shutdown();
  }
}

simpleConversation().catch(console.error);
```

### 2. インタラクティブな会話クライアント

```typescript
// src/examples/interactive-chat.ts
import { LLMMCPClient } from '../llm-client.js';
import * as readline from 'readline';

class InteractiveChat {
  private client: LLMMCPClient;
  private rl: readline.Interface;

  constructor() {
    this.client = new LLMMCPClient({
      mcpServerCommand: process.env.MCP_SERVER_COMMAND || 'node',
      mcpServerArgs: [process.env.MCP_SERVER_ARGS || '../first-mcp-server/dist/server.js'],
      llmProvider: (process.env.DEFAULT_LLM_PROVIDER as 'openai' | 'anthropic') || 'openai',
      debug: false
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 LLM-MCP Interactive Chat を開始します...\n');
      
      await this.client.initialize();
      
      console.log('✅ 準備完了！何でも聞いてください。\n');
      console.log('💡 ヒント:');
      console.log('  - "計算して" や "時刻を教えて" など自然な言葉で話しかけてください');
      console.log('  - "/help" でヘルプを表示');
      console.log('  - "/clear" で会話履歴をクリア');
      console.log('  - "/quit" で終了\n');

      this.handleUserInput();

    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      process.exit(1);
    }
  }

  private handleUserInput(): void {
    this.rl.question('💬 あなた: ', async (input) => {
      const trimmedInput = input.trim();

      // コマンドの処理
      if (trimmedInput.startsWith('/')) {
        await this.handleCommand(trimmedInput);
        this.handleUserInput();
        return;
      }

      // 空入力のチェック
      if (!trimmedInput) {
        console.log('❓ 何か入力してください\n');
        this.handleUserInput();
        return;
      }

      try {
        // LLMに送信して応答を取得
        console.log('🤔 考え中...\n');
        const response = await this.client.processMessage(trimmedInput);
        console.log('🤖 アシスタント:', response);
        console.log();

      } catch (error) {
        console.error('❌ エラー:', error);
        console.log();
      }

      this.handleUserInput();
    });
  }

  private async handleCommand(command: string): Promise<void> {
    switch (command) {
      case '/help':
        this.showHelp();
        break;
      
      case '/clear':
        this.client.clearConversationHistory();
        console.log('✅ 会話履歴をクリアしました\n');
        break;
      
      case '/history':
        this.showHistory();
        break;
      
      case '/quit':
      case '/exit':
        await this.quit();
        return;
      
      default:
        console.log('❓ 不明なコマンドです。/help でヘルプを表示してください\n');
    }
  }

  private showHelp(): void {
    console.log('📖 利用可能なコマンド:');
    console.log('  /help    - このヘルプを表示');
    console.log('  /clear   - 会話履歴をクリア');
    console.log('  /history - 会話履歴を表示');
    console.log('  /quit    - チャットを終了');
    console.log();
    console.log('💡 使用例:');
    console.log('  - "10と20を足してください"');
    console.log('  - "現在の時刻を教えてください"');
    console.log('  - "Hello Worldとエコーしてください"');
    console.log();
  }

  private showHistory(): void {
    const history = this.client.getConversationHistory();
    
    if (history.length === 0) {
      console.log('📝 会話履歴はありません\n');
      return;
    }

    console.log('📝 会話履歴:');
    history.forEach((message, index) => {
      const speaker = message.role === 'user' ? '💬 あなた' : '🤖 アシスタント';
      const content = message.content.substring(0, 100);
      console.log(`  ${index + 1}. ${speaker}: ${content}${message.content.length > 100 ? '...' : ''}`);
    });
    console.log();
  }

  private async quit(): Promise<void> {
    console.log('\n👋 チャットを終了します...');
    await this.client.shutdown();
    this.rl.close();
    process.exit(0);
  }
}

// チャットの開始
const chat = new InteractiveChat();
chat.start().catch(console.error);

// Ctrl+C でのグレースフル終了
process.on('SIGINT', async () => {
  console.log('\n\n👋 チャットを終了します...');
  process.exit(0);
});
```

### 3. 複数LLMプロバイダーのベンチマーク

```typescript
// src/examples/llm-benchmark.ts
import { LLMMCPClient } from '../llm-client.js';

async function benchmarkLLMProviders() {
  const testQueries = [
    '15と27を足してください',
    '現在の時刻を教えてください',
    'Hello MCP Worldとエコーしてください',
    '100から25を引いた結果を教えてください'
  ];

  const providers: Array<'openai' | 'anthropic'> = ['openai', 'anthropic'];

  for (const provider of providers) {
    console.log(`\n🧪 ${provider.toUpperCase()} のテスト開始...\n`);

    const client = new LLMMCPClient({
      mcpServerCommand: process.env.MCP_SERVER_COMMAND || 'node',
      mcpServerArgs: [process.env.MCP_SERVER_ARGS || '../first-mcp-server/dist/server.js'],
      llmProvider: provider,
      debug: false
    });

    try {
      await client.initialize();

      for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`📝 クエリ ${i + 1}: ${query}`);
        
        const startTime = Date.now();
        const response = await client.processMessage(query);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️  実行時間: ${duration}ms`);
        console.log(`🤖 応答: ${response.substring(0, 200)}...\n`);
      }

    } catch (error) {
      console.error(`❌ ${provider} テストエラー:`, error);
    } finally {
      await client.shutdown();
    }
  }
}

benchmarkLLMProviders().catch(console.error);
```

### 4. package.json の更新

```json
{
  "name": "mcp-llm-client",
  "version": "1.0.0",
  "description": "MCP LLM Integration Client",
  "main": "dist/llm-client.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/examples/simple-conversation.ts",
    "chat": "tsx src/examples/interactive-chat.ts",
    "benchmark": "tsx src/examples/llm-benchmark.ts"
  },
  "keywords": ["mcp", "llm", "openai", "anthropic", "ai"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🧪 テストの実行

### 1. 環境変数の確認

```bash
# .envファイルが正しく設定されているか確認
cat .env

# 必要なAPIキーが設定されているか確認
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
```

### 2. 基本テストの実行

```bash
# ビルド
npm run build

# シンプルな会話テスト
npm run dev

# インタラクティブチャット
npm run chat

# LLMプロバイダーのベンチマーク
npm run benchmark
```

## 🔍 コードの解説

### 1. LLMプロバイダーの抽象化

```typescript
export abstract class LLMProvider {
  abstract generateResponse(messages: LLMMessage[], availableTools?: any[]): Promise<LLMResponse>;
  abstract parseToolCalls(content: string): ToolCall[];
}
```

この抽象化により、異なるLLMプロバイダーを統一的に扱えます。

### 2. ツール呼び出しの解析

```typescript
// OpenAI用のパターン
const toolCallPattern = /```tool:(\w+)\s*(.*?)```/gs;

// Anthropic用のパターン  
const toolCallPattern = /<tool:(\w+)>(.*?)<\/tool:\1>/gs;
```

各LLMプロバイダーに適したパターンでツール呼び出しを解析します。

### 3. 会話フローの管理

```typescript
// ユーザーメッセージ → LLM → ツール実行 → LLM → 最終回答
this.conversationHistory.push({ role: 'user', content: userMessage });
let response = await this.llmProvider.generateResponse(this.conversationHistory, this.availableTools);
const toolCalls = this.llmProvider.parseToolCalls(response.content);
// ツール実行...
response = await this.llmProvider.generateResponse(this.conversationHistory, this.availableTools);
```

## 🚨 よくある問題と解決方法

### 1. APIキーエラー

```bash
# エラー例
Error: OPENAI_API_KEY is required

# 解決方法
# .envファイルの確認と設定
echo "OPENAI_API_KEY=your_api_key_here" >> .env
```

### 2. ツール呼び出しの解析失敗

```typescript
// デバッグ用のログ追加
if (this.config.debug) {
  console.log('LLM Response:', response.content);
  console.log('Parsed Tool Calls:', toolCalls);
}
```

### 3. 会話履歴の肥大化

```typescript
// 会話履歴の制限
private limitConversationHistory(maxMessages: number = 20): void {
  if (this.conversationHistory.length > maxMessages) {
    this.conversationHistory = this.conversationHistory.slice(-maxMessages);
  }
}
```

## 🎯 演習課題

### 初級課題

1. **新しいLLMプロバイダー**: Google Gemini APIに対応したプロバイダーを追加してください
2. **応答時間計測**: 各LLMプロバイダーの応答時間を計測・表示する機能を追加してください
3. **設定可能なシステムプロンプト**: システムプロンプトを外部設定で変更できるようにしてください

### 中級課題

1. **コンテキスト管理**: 会話の長期記憶機能を実装してください
2. **マルチツール実行**: 複数のツールを並行して実行する機能を追加してください
3. **エラー回復**: ツール実行失敗時の自動回復機能を実装してください

## 🎉 まとめ

この節では、LLMとMCPの統合について学習しました：

### 学習した内容

1. **LLMプロバイダーの抽象化**: 複数のLLMを統一的に扱う設計
2. **自然言語でのツール操作**: ユーザーの自然な指示をツール呼び出しに変換
3. **会話フローの管理**: 文脈を保持した対話システムの構築
4. **エラーハンドリング**: 堅牢なエラー処理の実装

### 次のステップ

LLMとMCPの基本的な統合ができたら、**[04-vscode](../04-vscode/)** に進んで開発環境での活用を学習しましょう。

## 📚 参考資料

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [LangChain Documentation](https://js.langchain.com/docs/)

---

*LLMとMCPの組み合わせにより、自然言語でツールを操作できる強力なシステムが構築できます。様々な指示を試して、システムの可能性を探ってください。*