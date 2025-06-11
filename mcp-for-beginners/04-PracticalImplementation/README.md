# 実装実践 - Practical Implementation

> 各種言語でのSDK活用、デバッグ・テスト技法、再利用可能なプロンプトテンプレートとワークフロー構築

## 📋 概要

MCPの基本概念を理解した後、実際のプロジェクトで活用するための実践的な実装手法を学習します。各種プログラミング言語でのSDK活用、効果的なデバッグ手法、包括的なテスト戦略について詳しく解説します。

## 🎯 学習目標

- 各種プログラミング言語でのMCP SDK活用方法を習得する
- 効果的なデバッグ手法とトラブルシューティング技術を身につける
- 包括的なテスト戦略と自動化手法を理解する
- 再利用可能なプロンプトテンプレートとワークフローを設計・実装する
- MCPプロジェクトのベストプラクティスを学ぶ

## 🛠️ マルチ言語でのSDK活用

### 1. TypeScript/JavaScript実装

#### 基本的なサーバー実装

```typescript
// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from "@modelcontextprotocol/sdk/types.js";

interface CalculatorArgs {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

class CalculatorMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "calculator-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools(): void {
    // ツール一覧の処理
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "calculate",
          description: "四則演算を実行します",
          inputSchema: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: ["add", "subtract", "multiply", "divide"],
                description: "実行する演算の種類"
              },
              a: {
                type: "number",
                description: "第一オペランド"
              },
              b: {
                type: "number",
                description: "第二オペランド"
              }
            },
            required: ["operation", "a", "b"]
          }
        }
      ]
    }));

    // ツール実行の処理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "calculate") {
        return this.handleCalculate(args as CalculatorArgs);
      }

      throw new Error(`未知のツール: ${name}`);
    });
  }

  private async handleCalculate(args: CalculatorArgs) {
    const { operation, a, b } = args;
    let result: number;

    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          throw new Error("ゼロで割ることはできません");
        }
        result = a / b;
        break;
      default:
        throw new Error(`サポートされていない演算: ${operation}`);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `計算結果: ${a} ${this.getOperationSymbol(operation)} ${b} = ${result}`
        }
      ]
    };
  }

  private getOperationSymbol(operation: string): string {
    const symbols = {
      'add': '+',
      'subtract': '-',
      'multiply': '×',
      'divide': '÷'
    };
    return symbols[operation as keyof typeof symbols] || operation;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Calculator MCP Server が開始されました");
  }
}

// サーバー起動
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CalculatorMCPServer();
  server.start().catch(console.error);
}
```

#### 高度なクライアント実装

```typescript
// src/client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class MCPClientManager {
  private clients: Map<string, Client> = new Map();

  async connectToServer(serverName: string, command: string, args: string[]): Promise<void> {
    const transport = new StdioClientTransport({
      command,
      args
    });

    const client = new Client(
      {
        name: "mcp-client-manager",
        version: "1.0.0",
      },
      {
        capabilities: {
          sampling: {}
        }
      }
    );

    try {
      await client.connect(transport);
      this.clients.set(serverName, client);
      console.log(`${serverName} に接続しました`);
    } catch (error) {
      console.error(`${serverName} への接続に失敗しました:`, error);
      throw error;
    }
  }

  async listAvailableTools(serverName: string): Promise<any[]> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`サーバー ${serverName} が見つかりません`);
    }

    const response = await client.listTools();
    return response.tools;
  }

  async executeToolWithRetry(
    serverName: string, 
    toolName: string, 
    args: any, 
    maxRetries: number = 3
  ): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`サーバー ${serverName} が見つかりません`);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await client.callTool({
          name: toolName,
          arguments: args
        });
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`${maxRetries}回の試行後に失敗: ${error}`);
        }
        console.warn(`試行 ${attempt} 失敗、再試行中...`);
        await this.delay(Math.pow(2, attempt) * 1000); // 指数バックオフ
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map(
      client => client.close()
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }
}
```

### 2. Python実装

#### 基本的なサーバー実装

```python
# server.py
import asyncio
import logging
from typing import Any, Dict, List, Optional

from mcp.server.models import InitializeResult
from mcp.server.session import ServerSession
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest, 
    CallToolResult, 
    ListToolsRequest, 
    ListToolsResult,
    Tool,
    TextContent
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("calculator-server")

class CalculatorServer:
    def __init__(self):
        self.name = "calculator-server"
        self.version = "1.0.0"
        
    async def list_tools(self, request: ListToolsRequest) -> ListToolsResult:
        """利用可能なツールの一覧を返す"""
        tools = [
            Tool(
                name="calculate",
                description="四則演算を実行します",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["add", "subtract", "multiply", "divide"],
                            "description": "実行する演算の種類"
                        },
                        "a": {"type": "number", "description": "第一オペランド"},
                        "b": {"type": "number", "description": "第二オペランド"}
                    },
                    "required": ["operation", "a", "b"]
                }
            )
        ]
        return ListToolsResult(tools=tools)
    
    async def call_tool(self, request: CallToolRequest) -> CallToolResult:
        """ツールを実行する"""
        tool_name = request.params.name
        args = request.params.arguments or {}
        
        if tool_name == "calculate":
            return await self._handle_calculate(args)
        else:
            raise ValueError(f"未知のツール: {tool_name}")
    
    async def _handle_calculate(self, args: Dict[str, Any]) -> CallToolResult:
        """計算ツールの処理"""
        try:
            operation = args["operation"]
            a = float(args["a"])
            b = float(args["b"])
            
            operations = {
                "add": lambda x, y: x + y,
                "subtract": lambda x, y: x - y,
                "multiply": lambda x, y: x * y,
                "divide": lambda x, y: x / y if y != 0 else None
            }
            
            if operation not in operations:
                raise ValueError(f"サポートされていない演算: {operation}")
            
            if operation == "divide" and b == 0:
                raise ValueError("ゼロで割ることはできません")
            
            result = operations[operation](a, b)
            symbols = {"add": "+", "subtract": "-", "multiply": "×", "divide": "÷"}
            symbol = symbols.get(operation, operation)
            
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"計算結果: {a} {symbol} {b} = {result}"
                    )
                ]
            )
            
        except KeyError as e:
            raise ValueError(f"必須パラメータが不足しています: {e}")
        except (ValueError, TypeError) as e:
            raise ValueError(f"無効な引数: {e}")

async def main():
    """サーバーのメイン処理"""
    server = CalculatorServer()
    
    async with stdio_server() as (read_stream, write_stream):
        session = ServerSession(read_stream, write_stream)
        
        # ハンドラーの登録
        session.set_list_tools_handler(server.list_tools)
        session.set_call_tool_handler(server.call_tool)
        
        logger.info("Calculator MCP Server が開始されました")
        await session.run()

if __name__ == "__main__":
    asyncio.run(main())
```

#### Pythonクライアント実装

```python
# client.py
import asyncio
import logging
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client

logger = logging.getLogger("mcp-client")

class MCPClientManager:
    def __init__(self):
        self.clients: Dict[str, ClientSession] = {}
    
    @asynccontextmanager
    async def connect_server(self, server_name: str, command: str, args: List[str]):
        """サーバーに接続するコンテキストマネージャー"""
        try:
            async with stdio_client(command, args) as (read, write):
                session = ClientSession(read, write)
                await session.initialize()
                self.clients[server_name] = session
                yield session
        finally:
            if server_name in self.clients:
                del self.clients[server_name]
    
    async def list_tools(self, server_name: str) -> List[Dict[str, Any]]:
        """指定したサーバーのツール一覧を取得"""
        if server_name not in self.clients:
            raise ValueError(f"サーバー {server_name} が接続されていません")
        
        session = self.clients[server_name]
        result = await session.list_tools()
        return [tool.dict() for tool in result.tools]
    
    async def call_tool_with_validation(
        self, 
        server_name: str, 
        tool_name: str, 
        arguments: Dict[str, Any]
    ) -> Any:
        """ツールを実行（引数検証付き）"""
        if server_name not in self.clients:
            raise ValueError(f"サーバー {server_name} が接続されていません")
        
        session = self.clients[server_name]
        
        # ツール情報を取得して引数を検証
        tools = await self.list_tools(server_name)
        tool_info = next((t for t in tools if t["name"] == tool_name), None)
        
        if not tool_info:
            raise ValueError(f"ツール {tool_name} が見つかりません")
        
        # 簡単な引数検証
        schema = tool_info.get("inputSchema", {})
        required_fields = schema.get("required", [])
        
        for field in required_fields:
            if field not in arguments:
                raise ValueError(f"必須引数 {field} が不足しています")
        
        # ツール実行
        result = await session.call_tool(tool_name, arguments)
        return result

# 使用例
async def example_usage():
    client_manager = MCPClientManager()
    
    async with client_manager.connect_server(
        "calculator", 
        "python", 
        ["server.py"]
    ) as session:
        
        # ツール一覧を取得
        tools = await client_manager.list_tools("calculator")
        print("利用可能なツール:", [t["name"] for t in tools])
        
        # 計算を実行
        result = await client_manager.call_tool_with_validation(
            "calculator",
            "calculate",
            {"operation": "add", "a": 10, "b": 5}
        )
        print("計算結果:", result.content[0].text)

if __name__ == "__main__":
    asyncio.run(example_usage())
```

## 🔍 デバッグとトラブルシューティング

### 1. ログ戦略

```typescript
// src/utils/logger.ts
import winston from 'winston';

export class MCPLogger {
  private logger: winston.Logger;

  constructor(serviceName: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            service: serviceName,
            message,
            ...(stack && { stack }),
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `logs/${serviceName}-error.log`, 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: `logs/${serviceName}-combined.log` 
        })
      ]
    });
  }

  logToolCall(toolName: string, args: any, startTime: number): void {
    const duration = Date.now() - startTime;
    this.logger.info('Tool executed', {
      tool: toolName,
      arguments: args,
      duration_ms: duration,
      type: 'tool_execution'
    });
  }

  logError(error: Error, context: any = {}): void {
    this.logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      context,
      type: 'error'
    });
  }

  logPerformance(operation: string, duration: number, metadata: any = {}): void {
    this.logger.info('Performance metric', {
      operation,
      duration_ms: duration,
      ...metadata,
      type: 'performance'
    });
  }
}
```

### 2. デバッグ用ミドルウェア

```typescript
// src/middleware/debug.ts
import { Request, Response, NextFunction } from 'express';
import { MCPLogger } from '../utils/logger';

const logger = new MCPLogger('debug-middleware');

export const debugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // リクエストをログ
  logger.logPerformance('request_start', 0, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  // レスポンスをインターセプト
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    logger.logPerformance('request_complete', duration, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      response_size: Buffer.byteLength(data)
    });

    return originalSend.call(this, data);
  };

  next();
};
```

### 3. エラートラッキング

```typescript
// src/utils/errorTracker.ts
import * as Sentry from '@sentry/node';

export class ErrorTracker {
  constructor() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        beforeSend(event) {
          // 機密情報をフィルタリング
          if (event.request?.data) {
            event.request.data = this.sanitizeData(event.request.data);
          }
          return event;
        }
      });
    }
  }

  captureException(error: Error, context?: any): void {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('mcp_context', context);
        }
        Sentry.captureException(error);
      });
    }
    
    // ローカルログも出力
    console.error('Exception captured:', error, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, level);
    }
  }

  private sanitizeData(data: any): any {
    // API キーやパスワードなどの機密情報を除去
    const sensitiveKeys = ['password', 'token', 'key', 'secret'];
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
      return sanitized;
    }
    
    return data;
  }
}

export const errorTracker = new ErrorTracker();
```

## 🧪 包括的テスト戦略

### 1. 単体テスト用ヘルパー

```typescript
// tests/helpers/mcpTestHelper.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export class MCPTestHelper {
  static createMockTransport(): [Transport, Transport] {
    const messages: any[] = [];
    
    const serverTransport: Transport = {
      async send(message: any) {
        messages.push({ direction: 'server->client', message });
      },
      onMessage: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
      close: jest.fn()
    };

    const clientTransport: Transport = {
      async send(message: any) {
        messages.push({ direction: 'client->server', message });
      },
      onMessage: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
      close: jest.fn()
    };

    return [serverTransport, clientTransport];
  }

  static async createTestServerClient(server: Server): Promise<[Server, Client]> {
    const [serverTransport, clientTransport] = this.createMockTransport();
    
    await server.connect(serverTransport);
    
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );
    
    await client.connect(clientTransport);
    
    return [server, client];
  }

  static expectToolResult(result: any, expectedText: string): void {
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain(expectedText);
  }
}
```

### 2. 統合テストスイート

```typescript
// tests/integration/mcpIntegration.test.ts
import { spawn, ChildProcess } from 'child_process';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe('MCP Integration Tests', () => {
  let serverProcess: ChildProcess;
  let client: Client;

  beforeAll(async () => {
    // サーバープロセスを起動
    serverProcess = spawn('node', ['dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 短時間待機してサーバーが起動するのを待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // クライアントを初期化
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/server.js']
    });

    client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  describe('Tool Operations', () => {
    test('should list available tools', async () => {
      const response = await client.listTools();
      expect(response.tools).toBeDefined();
      expect(response.tools.length).toBeGreaterThan(0);
      
      const calculatorTool = response.tools.find(tool => tool.name === 'calculate');
      expect(calculatorTool).toBeDefined();
      expect(calculatorTool?.inputSchema).toBeDefined();
    });

    test('should execute basic calculation', async () => {
      const result = await client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'add',
          a: 5,
          b: 3
        }
      });

      expect(result.content[0].text).toContain('5 + 3 = 8');
    });

    test('should handle division by zero', async () => {
      await expect(client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'divide',
          a: 10,
          b: 0
        }
      })).rejects.toThrow('ゼロで割ることはできません');
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown tool', async () => {
      await expect(client.callTool({
        name: 'unknown-tool',
        arguments: {}
      })).rejects.toThrow('未知のツール');
    });

    test('should handle invalid arguments', async () => {
      await expect(client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'invalid',
          a: 5,
          b: 3
        }
      })).rejects.toThrow();
    });
  });
});
```

### 3. パフォーマンステスト

```typescript
// tests/performance/mcpPerformance.test.ts
import { performance } from 'perf_hooks';
import { MCPTestHelper } from '../helpers/mcpTestHelper';

describe('MCP Performance Tests', () => {
  test('should handle concurrent tool calls efficiently', async () => {
    const [server, client] = await MCPTestHelper.createTestServerClient(createTestServer());
    
    const concurrentCalls = 100;
    const promises: Promise<any>[] = [];
    
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentCalls; i++) {
      promises.push(client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'add',
          a: i,
          b: i + 1
        }
      }));
    }
    
    const results = await Promise.all(promises);
    const endTime = performance.now();
    
    expect(results).toHaveLength(concurrentCalls);
    expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
    
    console.log(`${concurrentCalls} concurrent calls completed in ${(endTime - startTime).toFixed(2)}ms`);
  });

  test('should maintain memory usage within limits', async () => {
    const initialMemory = process.memoryUsage();
    const [server, client] = await MCPTestHelper.createTestServerClient(createTestServer());
    
    // 大量のデータを処理
    for (let i = 0; i < 1000; i++) {
      await client.callTool({
        name: 'calculate',
        arguments: {
          operation: 'multiply',
          a: Math.random() * 1000,
          b: Math.random() * 1000
        }
      });
    }
    
    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // メモリ増加が50MB以内であることを確認
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## 📝 プロンプトテンプレートとワークフロー

### 1. 再利用可能なプロンプトテンプレート

```typescript
// src/templates/promptTemplates.ts
export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
  description: string;
}

export const promptTemplates: PromptTemplate[] = [
  {
    name: "code_review",
    template: `以下のコードをレビューしてください：

プログラミング言語: {{language}}
コードの目的: {{purpose}}

\`\`\`{{language}}
{{code}}
\`\`\`

以下の観点から評価してください：
1. コードの正確性
2. パフォーマンス
3. セキュリティ
4. 可読性
5. ベストプラクティスの遵守

改善提案があれば具体的に記載してください。`,
    variables: ["language", "purpose", "code"],
    description: "コードレビュー用のプロンプトテンプレート"
  },
  {
    name: "api_documentation",
    template: `以下のAPIエンドポイントのドキュメントを生成してください：

エンドポイント: {{method}} {{endpoint}}
説明: {{description}}

リクエストパラメータ:
{{parameters}}

期待するレスポンス形式で、OpenAPI 3.0形式のドキュメントを生成してください。`,
    variables: ["method", "endpoint", "description", "parameters"],
    description: "API ドキュメント生成用テンプレート"
  },
  {
    name: "bug_report_analysis",
    template: `以下のバグレポートを分析し、解決策を提案してください：

**バグの症状:**
{{symptoms}}

**再現手順:**
{{reproduction_steps}}

**期待される動作:**
{{expected_behavior}}

**実際の動作:**
{{actual_behavior}}

**環境情報:**
{{environment}}

**ログ・エラーメッセージ:**
{{logs}}

根本原因の分析と段階的な解決策を提供してください。`,
    variables: ["symptoms", "reproduction_steps", "expected_behavior", "actual_behavior", "environment", "logs"],
    description: "バグレポート分析用テンプレート"
  }
];

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    promptTemplates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  generatePrompt(templateName: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`テンプレート '${templateName}' が見つかりません`);
    }

    let prompt = template.template;
    
    // 変数の置換
    template.variables.forEach(variable => {
      const value = variables[variable] || '';
      const placeholder = `{{${variable}}}`;
      prompt = prompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    // 未置換の変数をチェック
    const unreplacedVariables = prompt.match(/\{\{[\w_]+\}\}/g);
    if (unreplacedVariables) {
      console.warn(`未置換の変数が見つかりました: ${unreplacedVariables.join(', ')}`);
    }

    return prompt;
  }

  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }
}
```

### 2. ワークフロー管理

```typescript
// src/workflows/workflowManager.ts
export interface WorkflowStep {
  id: string;
  name: string;
  tool: string;
  arguments: any;
  condition?: (context: any) => boolean;
  onSuccess?: (result: any, context: any) => any;
  onError?: (error: any, context: any) => any;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private mcpClient: any; // MCP Client instance

  constructor(mcpClient: any) {
    this.mcpClient = mcpClient;
  }

  addWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  async executeWorkflow(workflowId: string, initialContext: any = {}): Promise<any> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`ワークフロー '${workflowId}' が見つかりません`);
    }

    let context = { ...initialContext };
    const results: any[] = [];

    for (const step of workflow.steps) {
      try {
        // 条件チェック
        if (step.condition && !step.condition(context)) {
          console.log(`ステップ '${step.name}' をスキップしました（条件不一致）`);
          continue;
        }

        console.log(`ステップ '${step.name}' を実行中...`);

        // ツール実行
        const result = await this.mcpClient.callTool({
          name: step.tool,
          arguments: step.arguments
        });

        // 成功時の処理
        if (step.onSuccess) {
          context = step.onSuccess(result, context) || context;
        }

        results.push({
          stepId: step.id,
          stepName: step.name,
          result,
          success: true
        });

      } catch (error) {
        console.error(`ステップ '${step.name}' でエラーが発生しました:`, error);

        // エラー時の処理
        if (step.onError) {
          context = step.onError(error, context) || context;
        }

        results.push({
          stepId: step.id,
          stepName: step.name,
          error: error.message,
          success: false
        });

        // エラー時は処理を停止
        break;
      }
    }

    return {
      workflowId,
      workflowName: workflow.name,
      results,
      context,
      completed: results.length === workflow.steps.length,
      success: results.every(r => r.success)
    };
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
}

// 使用例: コードレビューワークフロー
export const codeReviewWorkflow: Workflow = {
  id: "code-review",
  name: "コードレビューワークフロー",
  description: "コードの品質チェックと改善提案を行うワークフロー",
  steps: [
    {
      id: "syntax-check",
      name: "構文チェック",
      tool: "syntax-analyzer",
      arguments: { language: "typescript", code: "{{code}}" },
      onSuccess: (result, context) => {
        context.syntaxValid = result.valid;
        return context;
      }
    },
    {
      id: "security-scan",
      name: "セキュリティスキャン",
      tool: "security-scanner",
      arguments: { code: "{{code}}" },
      condition: (context) => context.syntaxValid,
      onSuccess: (result, context) => {
        context.securityIssues = result.issues;
        return context;
      }
    },
    {
      id: "performance-analysis",
      name: "パフォーマンス分析",
      tool: "performance-analyzer",
      arguments: { code: "{{code}}" },
      condition: (context) => context.syntaxValid && context.securityIssues.length === 0,
      onSuccess: (result, context) => {
        context.performanceScore = result.score;
        return context;
      }
    },
    {
      id: "generate-report",
      name: "レポート生成",
      tool: "report-generator",
      arguments: { 
        template: "code-review-report",
        data: "{{context}}"
      }
    }
  ]
};
```

## 🎓 実習課題

### 課題1: マルチ言語SDK実装
- TypeScriptとPythonで同じ機能のMCPサーバーを実装する
- 相互運用性をテストする

### 課題2: 包括的テストスイート
- 単体テスト、統合テスト、パフォーマンステストを含むテストスイートを作成する
- カバレッジ90%以上を達成する

### 課題3: ワークフロー設計
- 複数のMCPツールを組み合わせたワークフローを設計・実装する
- エラーハンドリングと条件分岐を含む

## 📚 関連リソース

- [MCP SDK ドキュメント](https://modelcontextprotocol.io/docs)
- [Jest テストフレームワーク](https://jestjs.io/)
- [Winston ログライブラリ](https://github.com/winstonjs/winston)
- [Sentry エラートラッキング](https://sentry.io/)

## 🔗 次のステップ

実装実践を習得したら、[05-AdvancedTopics](../05-AdvancedTopics/README.md) でMCPの上級トピックについて学習しましょう。

---

*実践的な実装スキルの習得により、堅牢で保守可能なMCPアプリケーションを構築できるようになります。*