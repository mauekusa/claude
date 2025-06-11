# 04 - 実践的な実装

## 📖 概要

この章では、MCPプロトコルのより実践的で高度な実装技術について学習します。マルチ言語対応のSDK活用、効果的なデバッグ手法、包括的なテスト戦略、そして再利用可能なプロンプトテンプレートとワークフローの作成方法を習得します。

## 🎯 学習目標

この章を完了すると、以下のことができるようになります：

- 複数のプログラミング言語でMCPを実装できる
- 効果的なデバッグとトラブルシューティングができる
- 包括的なテスト戦略を立案・実行できる
- 再利用可能なプロンプトテンプレートを作成できる
- 複雑なワークフローを設計・実装できる
- パフォーマンス最適化を実施できる

## 🔧 マルチ言語SDK実装

### TypeScript/JavaScript実装

#### 高度なサーバー実装

```typescript
// src/advanced-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  tools: Map<string, ToolHandler>;
  prompts: Map<string, PromptHandler>;
  resources: Map<string, ResourceHandler>;
}

interface ToolHandler {
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

interface PromptHandler {
  description: string;
  argumentSchema?: any;
  handler: (args: any) => Promise<string>;
}

export class AdvancedMCPServer {
  private server: Server;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        }
      }
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // ツール一覧の取得
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.config.tools.entries()).map(([name, handler]) => ({
        name,
        description: handler.description,
        inputSchema: handler.inputSchema
      }))
    }));
    
    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const toolHandler = this.config.tools.get(name);
      
      if (!toolHandler) {
        throw new Error(`Tool not found: ${name}`);
      }
      
      try {
        const result = await toolHandler.handler(args);
        return {
          content: [
            {
              type: "text",
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      }
    });
    
    // プロンプト一覧の取得
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: Array.from(this.config.prompts.entries()).map(([name, handler]) => ({
        name,
        description: handler.description,
        arguments: handler.argumentSchema || []
      }))
    }));
    
    // プロンプト取得
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const promptHandler = this.config.prompts.get(name);
      
      if (!promptHandler) {
        throw new Error(`Prompt not found: ${name}`);
      }
      
      const promptText = await promptHandler.handler(args || {});
      return {
        description: promptHandler.description,
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    });
  }
  
  public registerTool(name: string, handler: ToolHandler): void {
    this.config.tools.set(name, handler);
  }
  
  public registerPrompt(name: string, handler: PromptHandler): void {
    this.config.prompts.set(name, handler);
  }
  
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// 使用例
const server = new AdvancedMCPServer({
  name: "advanced-server",
  version: "1.0.0",
  description: "Advanced MCP server with dynamic capabilities",
  tools: new Map(),
  prompts: new Map(),
  resources: new Map()
});

// 動的なツール登録
server.registerTool("data-processor", {
  description: "Process and analyze data",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "array" },
      operation: { type: "string", enum: ["sum", "average", "max", "min"] }
    },
    required: ["data", "operation"]
  },
  handler: async (args) => {
    const { data, operation } = args;
    const numbers = data.filter(item => typeof item === 'number');
    
    switch (operation) {
      case "sum":
        return numbers.reduce((a, b) => a + b, 0);
      case "average":
        return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
      case "max":
        return Math.max(...numbers);
      case "min":
        return Math.min(...numbers);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
});
```

### Python実装

#### 高度なPythonサーバー

```python
# src/advanced_server.py
import asyncio
import json
from typing import Dict, Any, Callable, Optional, List
from dataclasses import dataclass
from abc import ABC, abstractmethod

import mcp.types as types
from mcp.server import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio

@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: Dict[str, Any]
    handler: Callable[[Dict[str, Any]], Any]

@dataclass 
class PromptDefinition:
    name: str
    description: str
    arguments: Optional[List[Dict[str, Any]]]
    handler: Callable[[Dict[str, Any]], str]

class AdvancedMCPServer:
    def __init__(self, name: str, version: str):
        self.name = name
        self.version = version
        self.tools: Dict[str, ToolDefinition] = {}
        self.prompts: Dict[str, PromptDefinition] = {}
        
        self.server = Server(name)
        self._setup_handlers()
    
    def _setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> List[types.Tool]:
            return [
                types.Tool(
                    name=tool.name,
                    description=tool.description,
                    inputSchema=tool.input_schema
                )
                for tool in self.tools.values()
            ]
        
        @self.server.call_tool()
        async def handle_call_tool(
            name: str, arguments: Dict[str, Any]
        ) -> List[types.TextContent]:
            if name not in self.tools:
                raise ValueError(f"Tool not found: {name}")
            
            tool = self.tools[name]
            try:
                result = await self._execute_tool(tool, arguments)
                return [
                    types.TextContent(
                        type="text",
                        text=str(result) if not isinstance(result, str) else result
                    )
                ]
            except Exception as e:
                raise ValueError(f"Tool execution failed: {str(e)}")
        
        @self.server.list_prompts()
        async def handle_list_prompts() -> List[types.Prompt]:
            return [
                types.Prompt(
                    name=prompt.name,
                    description=prompt.description,
                    arguments=prompt.arguments or []
                )
                for prompt in self.prompts.values()
            ]
        
        @self.server.get_prompt()
        async def handle_get_prompt(
            name: str, arguments: Optional[Dict[str, Any]] = None
        ) -> types.GetPromptResult:
            if name not in self.prompts:
                raise ValueError(f"Prompt not found: {name}")
            
            prompt = self.prompts[name]
            prompt_text = await self._execute_prompt(prompt, arguments or {})
            
            return types.GetPromptResult(
                description=prompt.description,
                messages=[
                    types.PromptMessage(
                        role="user",
                        content=types.TextContent(type="text", text=prompt_text)
                    )
                ]
            )
    
    async def _execute_tool(self, tool: ToolDefinition, arguments: Dict[str, Any]) -> Any:
        if asyncio.iscoroutinefunction(tool.handler):
            return await tool.handler(arguments)
        else:
            return tool.handler(arguments)
    
    async def _execute_prompt(self, prompt: PromptDefinition, arguments: Dict[str, Any]) -> str:
        if asyncio.iscoroutinefunction(prompt.handler):
            return await prompt.handler(arguments)
        else:
            return prompt.handler(arguments)
    
    def register_tool(self, tool: ToolDefinition):
        self.tools[tool.name] = tool
    
    def register_prompt(self, prompt: PromptDefinition):
        self.prompts[prompt.name] = prompt
    
    async def run(self):
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name=self.name,
                    server_version=self.version,
                    capabilities=self.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={}
                    )
                )
            )

# データ分析ツールの実装例
class DataAnalyzer:
    @staticmethod
    def statistical_analysis(data: List[float]) -> Dict[str, float]:
        if not data:
            return {"error": "No data provided"}
        
        return {
            "count": len(data),
            "sum": sum(data),
            "mean": sum(data) / len(data),
            "min": min(data),
            "max": max(data),
            "range": max(data) - min(data)
        }

# 使用例
async def main():
    server = AdvancedMCPServer("advanced-python-server", "1.0.0")
    
    # ツールの登録
    server.register_tool(ToolDefinition(
        name="analyze_data",
        description="Perform statistical analysis on numerical data",
        input_schema={
            "type": "object",
            "properties": {
                "data": {
                    "type": "array",
                    "items": {"type": "number"}
                }
            },
            "required": ["data"]
        },
        handler=lambda args: DataAnalyzer.statistical_analysis(args["data"])
    ))
    
    # プロンプトの登録
    server.register_prompt(PromptDefinition(
        name="code_review",
        description="Generate a code review prompt",
        arguments=[
            {"name": "language", "description": "Programming language", "required": True},
            {"name": "focus", "description": "Review focus area", "required": False}
        ],
        handler=lambda args: f"""
Please review the following {args.get('language', 'code')} code for:
- Code quality and best practices
- Potential bugs and issues
- Performance considerations
{f"- {args['focus']}" if args.get('focus') else ""}

Provide specific suggestions for improvement.
"""
    ))
    
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())
```

### Go実装

```go
// server.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"

    "github.com/modelcontextprotocol/go-sdk/mcp"
)

type AdvancedServer struct {
    server *mcp.Server
    tools  map[string]ToolHandler
    prompts map[string]PromptHandler
}

type ToolHandler struct {
    Description string
    InputSchema map[string]interface{}
    Handler     func(args map[string]interface{}) (interface{}, error)
}

type PromptHandler struct {
    Description string
    Arguments   []map[string]interface{}
    Handler     func(args map[string]interface{}) (string, error)
}

func NewAdvancedServer(name, version string) *AdvancedServer {
    server := mcp.NewServer(name, version)
    
    as := &AdvancedServer{
        server:  server,
        tools:   make(map[string]ToolHandler),
        prompts: make(map[string]PromptHandler),
    }
    
    as.setupHandlers()
    return as
}

func (as *AdvancedServer) setupHandlers() {
    as.server.HandleListTools(func(ctx context.Context) ([]mcp.Tool, error) {
        tools := make([]mcp.Tool, 0, len(as.tools))
        for name, handler := range as.tools {
            tools = append(tools, mcp.Tool{
                Name:        name,
                Description: handler.Description,
                InputSchema: handler.InputSchema,
            })
        }
        return tools, nil
    })
    
    as.server.HandleCallTool(func(ctx context.Context, name string, args map[string]interface{}) (*mcp.CallToolResult, error) {
        handler, exists := as.tools[name]
        if !exists {
            return nil, fmt.Errorf("tool not found: %s", name)
        }
        
        result, err := handler.Handler(args)
        if err != nil {
            return nil, fmt.Errorf("tool execution failed: %w", err)
        }
        
        var content string
        if str, ok := result.(string); ok {
            content = str
        } else {
            jsonBytes, _ := json.MarshalIndent(result, "", "  ")
            content = string(jsonBytes)
        }
        
        return &mcp.CallToolResult{
            Content: []mcp.Content{{
                Type: "text",
                Text: content,
            }},
        }, nil
    })
}

func (as *AdvancedServer) RegisterTool(name string, handler ToolHandler) {
    as.tools[name] = handler
}

func (as *AdvancedServer) Run() error {
    return as.server.Run(context.Background(), os.Stdin, os.Stdout)
}

// 数値計算ツールの例
func mathCalculator(args map[string]interface{}) (interface{}, error) {
    operation, ok := args["operation"].(string)
    if !ok {
        return nil, fmt.Errorf("operation is required")
    }
    
    numbers, ok := args["numbers"].([]interface{})
    if !ok {
        return nil, fmt.Errorf("numbers array is required")
    }
    
    var nums []float64
    for _, n := range numbers {
        if num, ok := n.(float64); ok {
            nums = append(nums, num)
        }
    }
    
    if len(nums) == 0 {
        return nil, fmt.Errorf("no valid numbers provided")
    }
    
    switch operation {
    case "sum":
        var sum float64
        for _, n := range nums {
            sum += n
        }
        return sum, nil
    case "product":
        product := nums[0]
        for i := 1; i < len(nums); i++ {
            product *= nums[i]
        }
        return product, nil
    default:
        return nil, fmt.Errorf("unknown operation: %s", operation)
    }
}

func main() {
    server := NewAdvancedServer("advanced-go-server", "1.0.0")
    
    server.RegisterTool("math_calculator", ToolHandler{
        Description: "Perform mathematical operations on numbers",
        InputSchema: map[string]interface{}{
            "type": "object",
            "properties": map[string]interface{}{
                "operation": map[string]interface{}{
                    "type": "string",
                    "enum": []string{"sum", "product"},
                },
                "numbers": map[string]interface{}{
                    "type": "array",
                    "items": map[string]interface{}{
                        "type": "number",
                    },
                },
            },
            "required": []string{"operation", "numbers"},
        },
        Handler: mathCalculator,
    })
    
    if err := server.Run(); err != nil {
        log.Fatal(err)
    }
}
```

## 🐛 デバッグとトラブルシューティング

### 包括的ログ戦略

```typescript
// src/logger.ts
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  requestId: string;
  userId?: string;
  toolName?: string;
  operation?: string;
}

class MCPLogger {
  private logger: winston.Logger;
  private context: LogContext;
  
  constructor(context: Partial<LogContext> = {}) {
    this.context = {
      requestId: uuidv4(),
      ...context
    };
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            context: this.context,
            ...meta
          });
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ]
    });
  }
  
  child(additionalContext: Partial<LogContext>): MCPLogger {
    return new MCPLogger({ ...this.context, ...additionalContext });
  }
  
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }
  
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }
  
  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, { 
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...meta 
    });
  }
  
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
  
  // パフォーマンス測定
  startTimer(operation: string): () => void {
    const start = Date.now();
    const timer = this.logger.startTimer();
    
    return () => {
      const duration = Date.now() - start;
      this.logger.info(`Operation completed: ${operation}`, {
        operation,
        duration,
        performanceMarker: true
      });
    };
  }
}

// 使用例
const logger = new MCPLogger({ userId: "user123" });

export async function executeToolWithLogging(
  toolName: string, 
  args: any, 
  handler: (args: any) => Promise<any>
): Promise<any> {
  const toolLogger = logger.child({ toolName });
  const stopTimer = toolLogger.startTimer(`tool_execution:${toolName}`);
  
  try {
    toolLogger.info("Tool execution started", { args });
    
    const result = await handler(args);
    
    toolLogger.info("Tool execution completed successfully", { 
      result: typeof result === 'object' ? '[Object]' : result 
    });
    
    return result;
  } catch (error) {
    toolLogger.error("Tool execution failed", error, { args });
    throw error;
  } finally {
    stopTimer();
  }
}
```

### エラートラッキング

```typescript
// src/error-tracker.ts
import * as Sentry from '@sentry/node';

export interface ErrorContext {
  userId?: string;
  toolName?: string;
  requestId: string;
  sessionId?: string;
  userAgent?: string;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  
  private constructor() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
      ],
      tracesSampleRate: 0.1,
    });
  }
  
  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }
  
  captureError(error: Error, context: ErrorContext): void {
    Sentry.withScope((scope) => {
      scope.setUser({ id: context.userId });
      scope.setTag('tool', context.toolName);
      scope.setTag('requestId', context.requestId);
      scope.setContext('request', context);
      
      Sentry.captureException(error);
    });
  }
  
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setUser({ id: context.userId });
        scope.setContext('request', context);
      }
      
      Sentry.captureMessage(message, level);
    });
  }
  
  addBreadcrumb(message: string, category: string, data?: any): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

// ミドルウェア例
export function errorTrackingMiddleware(
  error: Error,
  req: any,
  res: any,
  next: any
): void {
  const tracker = ErrorTracker.getInstance();
  
  tracker.captureError(error, {
    requestId: req.id,
    userId: req.user?.id,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
}
```

### デバッグユーティリティ

```typescript
// src/debug-utils.ts
export class MCPDebugger {
  private static enabled = process.env.MCP_DEBUG === 'true';
  
  static log(component: string, message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.log(`[MCP-DEBUG:${component}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  
  static traceMethodCalls(target: any, className: string): any {
    if (!this.enabled) return target;
    
    return new Proxy(target, {
      get(obj, prop) {
        const value = obj[prop];
        if (typeof value === 'function') {
          return function(...args: any[]) {
            MCPDebugger.log(className, `Calling ${prop.toString()}`, { args });
            const result = value.apply(this, args);
            
            if (result instanceof Promise) {
              return result
                .then((res) => {
                  MCPDebugger.log(className, `${prop.toString()} resolved`, { result: res });
                  return res;
                })
                .catch((err) => {
                  MCPDebugger.log(className, `${prop.toString()} rejected`, { error: err.message });
                  throw err;
                });
            } else {
              MCPDebugger.log(className, `${prop.toString()} returned`, { result });
              return result;
            }
          };
        }
        return value;
      }
    });
  }
  
  // メッセージの詳細ダンプ
  static dumpMessage(direction: 'in' | 'out', message: any): void {
    if (!this.enabled) return;
    
    console.log(`\n[MCP-${direction.toUpperCase()}] ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    console.log(JSON.stringify(message, null, 2));
    console.log('='.repeat(60));
  }
}

// 使用例デコレータ
export function debugMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    MCPDebugger.log(target.constructor.name, `Entering ${propertyName}`, { args });
    
    try {
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result
          .then((res) => {
            MCPDebugger.log(target.constructor.name, `Exiting ${propertyName}`, { result: res });
            return res;
          })
          .catch((err) => {
            MCPDebugger.log(target.constructor.name, `Error in ${propertyName}`, { error: err.message });
            throw err;
          });
      } else {
        MCPDebugger.log(target.constructor.name, `Exiting ${propertyName}`, { result });
        return result;
      }
    } catch (error) {
      MCPDebugger.log(target.constructor.name, `Error in ${propertyName}`, { error: error.message });
      throw error;
    }
  };
}
```

## 🧪 包括的テスト戦略

### テストユーティリティ

```typescript
// tests/utils/test-helpers.ts
import { AdvancedMCPServer } from '../../src/advanced-server';

export class TestMCPServer {
  private server: AdvancedMCPServer;
  private mockTransport: MockTransport;
  
  constructor() {
    this.mockTransport = new MockTransport();
    this.server = new AdvancedMCPServer({
      name: "test-server",
      version: "1.0.0",
      tools: new Map(),
      prompts: new Map(),
      resources: new Map()
    });
  }
  
  async sendRequest(request: any): Promise<any> {
    return this.mockTransport.sendRequest(request);
  }
  
  registerTestTool(name: string, handler: (args: any) => any): void {
    this.server.registerTool(name, {
      description: `Test tool: ${name}`,
      inputSchema: { type: "object" },
      handler: async (args) => handler(args)
    });
  }
  
  async start(): Promise<void> {
    // テスト用の起動ロジック
  }
  
  async stop(): Promise<void> {
    // クリーンアップ
  }
}

export class MockTransport {
  private messageQueue: any[] = [];
  private responseHandlers: Map<number, (response: any) => void> = new Map();
  
  async sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = request.id || Date.now();
      this.responseHandlers.set(id, resolve);
      
      // シミュレートされた非同期処理
      setTimeout(() => {
        const response = this.processRequest(request);
        resolve(response);
      }, 10);
    });
  }
  
  private processRequest(request: any): any {
    // テスト用のリクエスト処理ロジック
    switch (request.method) {
      case 'tools/list':
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: [] }
        };
      default:
        return {
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: "Method not found" }
        };
    }
  }
}

// データファクトリ
export class TestDataFactory {
  static createUser(overrides: Partial<any> = {}): any {
    return {
      id: Math.random().toString(36),
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
  
  static createToolRequest(toolName: string, args: any = {}): any {
    return {
      jsonrpc: "2.0",
      id: Math.random(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    };
  }
  
  static createPromptRequest(promptName: string, args: any = {}): any {
    return {
      jsonrpc: "2.0",
      id: Math.random(),
      method: "prompts/get",
      params: {
        name: promptName,
        arguments: args
      }
    };
  }
}
```

### インテグレーションテスト

```typescript
// tests/integration/server-integration.test.ts
import { TestMCPServer, TestDataFactory } from '../utils/test-helpers';

describe('MCP Server Integration Tests', () => {
  let testServer: TestMCPServer;
  
  beforeEach(async () => {
    testServer = new TestMCPServer();
    await testServer.start();
  });
  
  afterEach(async () => {
    await testServer.stop();
  });
  
  describe('Tool Execution Workflow', () => {
    it('should execute complex multi-step workflow', async () => {
      // Step 1: データ生成ツールを登録
      testServer.registerTestTool('generate_data', (args) => {
        const count = args.count || 10;
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          value: Math.random() * 100
        }));
      });
      
      // Step 2: データ分析ツールを登録
      testServer.registerTestTool('analyze_data', (args) => {
        const data = args.data || [];
        const values = data.map(item => item.value);
        
        return {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      });
      
      // Step 3: ワークフローの実行
      // データ生成
      const generateRequest = TestDataFactory.createToolRequest('generate_data', { count: 5 });
      const generateResponse = await testServer.sendRequest(generateRequest);
      
      expect(generateResponse.result).toBeDefined();
      const generatedData = JSON.parse(generateResponse.result.content[0].text);
      expect(generatedData).toHaveLength(5);
      
      // データ分析
      const analyzeRequest = TestDataFactory.createToolRequest('analyze_data', { data: generatedData });
      const analyzeResponse = await testServer.sendRequest(analyzeRequest);
      
      expect(analyzeResponse.result).toBeDefined();
      const analysis = JSON.parse(analyzeResponse.result.content[0].text);
      expect(analysis.count).toBe(5);
      expect(analysis.average).toBeGreaterThan(0);
    });
    
    it('should handle error propagation in workflow', async () => {
      testServer.registerTestTool('failing_tool', () => {
        throw new Error('Simulated failure');
      });
      
      const request = TestDataFactory.createToolRequest('failing_tool');
      const response = await testServer.sendRequest(request);
      
      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Simulated failure');
    });
  });
  
  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent tool calls', async () => {
      testServer.registerTestTool('slow_tool', async (args) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return `Processed: ${args.data}`;
      });
      
      const requests = Array.from({ length: 10 }, (_, i) =>
        testServer.sendRequest(TestDataFactory.createToolRequest('slow_tool', { data: i }))
      );
      
      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(10);
      responses.forEach((response, index) => {
        expect(response.result.content[0].text).toContain(`Processed: ${index}`);
      });
    });
  });
});
```

## 📝 プロンプトテンプレートとワークフロー

### 動的プロンプトテンプレート

```typescript
// src/prompt-templates.ts
interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

interface PromptTemplate {
  name: string;
  description: string;
  variables: TemplateVariable[];
  template: string;
  examples?: Array<{
    variables: Record<string, any>;
    expectedOutput: string;
  }>;
}

export class PromptTemplateEngine {
  private templates: Map<string, PromptTemplate> = new Map();
  
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }
  
  renderTemplate(name: string, variables: Record<string, any>): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    
    // 必須変数の検証
    const missingRequired = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);
    
    if (missingRequired.length > 0) {
      throw new Error(`Missing required variables: ${missingRequired.join(', ')}`);
    }
    
    // デフォルト値の適用
    const mergedVariables = { ...variables };
    for (const variable of template.variables) {
      if (!(variable.name in mergedVariables) && variable.default !== undefined) {
        mergedVariables[variable.name] = variable.default;
      }
    }
    
    // テンプレートの展開
    return this.interpolateTemplate(template.template, mergedVariables);
  }
  
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (match, varName, property) => {
      const value = variables[varName];
      
      if (value === undefined) {
        return match; // 変数が見つからない場合はそのまま
      }
      
      if (property && typeof value === 'object' && value !== null) {
        return String(value[property] || '');
      }
      
      return String(value);
    });
  }
  
  listTemplates(): Array<{name: string; description: string; variables: TemplateVariable[]}> {
    return Array.from(this.templates.values()).map(t => ({
      name: t.name,
      description: t.description,
      variables: t.variables
    }));
  }
  
  validateTemplate(name: string, variables: Record<string, any>): {valid: boolean; errors: string[]} {
    const template = this.templates.get(name);
    if (!template) {
      return { valid: false, errors: [`Template not found: ${name}`] };
    }
    
    const errors: string[] = [];
    
    for (const variable of template.variables) {
      const value = variables[variable.name];
      
      if (variable.required && value === undefined) {
        errors.push(`Missing required variable: ${variable.name}`);
        continue;
      }
      
      if (value !== undefined && !this.validateVariableType(value, variable.type)) {
        errors.push(`Invalid type for ${variable.name}: expected ${variable.type}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  private validateVariableType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

// プリセットテンプレートの定義
export const PRESET_TEMPLATES: PromptTemplate[] = [
  {
    name: "code_review",
    description: "コードレビュー用のプロンプトを生成",
    variables: [
      {
        name: "language",
        type: "string",
        description: "プログラミング言語",
        required: true
      },
      {
        name: "code",
        type: "string", 
        description: "レビュー対象のコード",
        required: true
      },
      {
        name: "focus_areas",
        type: "array",
        description: "重点的にチェックする項目",
        required: false,
        default: ["セキュリティ", "パフォーマンス", "可読性"]
      }
    ],
    template: `
以下の{{language}}コードをレビューしてください：

\`\`\`{{language}}
{{code}}
\`\`\`

以下の点に特に注意してレビューしてください：
{{#each focus_areas}}
- {{this}}
{{/each}}

具体的な改善提案と、その理由を含めて回答してください。
`,
    examples: [
      {
        variables: {
          language: "typescript",
          code: "function add(a, b) { return a + b; }",
          focus_areas: ["型安全性", "エラーハンドリング"]
        },
        expectedOutput: "TypeScriptコードのレビュープロンプト"
      }
    ]
  },
  
  {
    name: "documentation_generator",
    description: "API ドキュメント生成プロンプト",
    variables: [
      {
        name: "function_name",
        type: "string",
        description: "関数名",
        required: true
      },
      {
        name: "parameters",
        type: "array",
        description: "パラメータ一覧",
        required: true
      },
      {
        name: "return_type",
        type: "string",
        description: "戻り値の型",
        required: true
      },
      {
        name: "description",
        type: "string",
        description: "関数の説明",
        required: false,
        default: "関数の説明を記述してください"
      }
    ],
    template: `
# {{function_name}}

{{description}}

## パラメータ

{{#each parameters}}
- **{{name}}** ({{type}}): {{description}}
{{/each}}

## 戻り値

{{return_type}}

## 使用例

\`\`\`typescript
// 使用例を記述してください
const result = {{function_name}}({{#each parameters}}{{#unless @first}}, {{/unless}}{{example}}{{/each}});
\`\`\`
`
  }
];

// 使用例
const templateEngine = new PromptTemplateEngine();

// プリセットテンプレートの登録
PRESET_TEMPLATES.forEach(template => {
  templateEngine.registerTemplate(template);
});

// テンプレートの使用
const codeReviewPrompt = templateEngine.renderTemplate("code_review", {
  language: "typescript",
  code: "function calculateTotal(items: any[]): number { return items.reduce((sum, item) => sum + item.price, 0); }",
  focus_areas: ["型安全性", "エラーハンドリング", "パフォーマンス"]
});
```

### ワークフロー管理

```typescript
// src/workflow-engine.ts
interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool' | 'prompt' | 'condition' | 'transform';
  config: any;
  dependencies?: string[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: Record<string, any>;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep?: string;
  results: Map<string, any>;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private mcpServer: AdvancedMCPServer;
  
  constructor(mcpServer: AdvancedMCPServer) {
    this.mcpServer = mcpServer;
  }
  
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }
  
  async executeWorkflow(
    workflowId: string, 
    inputs: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      results: new Map(),
      startTime: new Date()
    };
    
    this.executions.set(executionId, execution);
    
    try {
      // 変数の初期化
      const variables = { ...workflow.variables, ...inputs };
      
      // ステップの実行順序を決定（依存関係グラフの解決）
      const executionOrder = this.resolveExecutionOrder(workflow.steps);
      
      for (const stepId of executionOrder) {
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) continue;
        
        execution.currentStep = stepId;
        
        // 依存関係の結果を取得
        const dependencyResults = this.getDependencyResults(step, execution.results);
        
        // ステップの実行
        const stepResult = await this.executeStep(step, variables, dependencyResults);
        execution.results.set(stepId, stepResult);
        
        // 変数の更新
        if (stepResult && typeof stepResult === 'object') {
          Object.assign(variables, stepResult);
        }
      }
      
      execution.status = 'completed';
      execution.endTime = new Date();
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
    }
    
    return execution;
  }
  
  private resolveExecutionOrder(steps: WorkflowStep[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (stepId: string) => {
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected: ${stepId}`);
      }
      if (visited.has(stepId)) {
        return;
      }
      
      visiting.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (step?.dependencies) {
        for (const dependency of step.dependencies) {
          visit(dependency);
        }
      }
      
      visiting.delete(stepId);
      visited.add(stepId);
      order.push(stepId);
    };
    
    for (const step of steps) {
      if (!visited.has(step.id)) {
        visit(step.id);
      }
    }
    
    return order;
  }
  
  private getDependencyResults(step: WorkflowStep, results: Map<string, any>): Record<string, any> {
    const dependencyResults: Record<string, any> = {};
    
    if (step.dependencies) {
      for (const dependency of step.dependencies) {
        dependencyResults[dependency] = results.get(dependency);
      }
    }
    
    return dependencyResults;
  }
  
  private async executeStep(
    step: WorkflowStep,
    variables: Record<string, any>,
    dependencyResults: Record<string, any>
  ): Promise<any> {
    const context = { ...variables, ...dependencyResults };
    
    switch (step.type) {
      case 'tool':
        return this.executeToolStep(step, context);
      
      case 'prompt':
        return this.executePromptStep(step, context);
      
      case 'condition':
        return this.executeConditionStep(step, context);
      
      case 'transform':
        return this.executeTransformStep(step, context);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }
  
  private async executeToolStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const { toolName, arguments: args } = step.config;
    
    // 引数にコンテキスト変数を展開
    const expandedArgs = this.expandVariables(args, context);
    
    // MCPツールの実行（仮想的な実装）
    // 実際の実装では mcpServer.callTool() などを使用
    return { result: `Tool ${toolName} executed with args: ${JSON.stringify(expandedArgs)}` };
  }
  
  private async executePromptStep(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    const { promptName, arguments: args } = step.config;
    
    const expandedArgs = this.expandVariables(args, context);
    
    // プロンプトの実行
    return { result: `Prompt ${promptName} executed with args: ${JSON.stringify(expandedArgs)}` };
  }
  
  private executeConditionStep(step: WorkflowStep, context: Record<string, any>): any {
    const { condition, trueValue, falseValue } = step.config;
    
    // 簡単な条件評価（実際にはより安全な実装が必要）
    const result = this.evaluateCondition(condition, context);
    
    return result ? trueValue : falseValue;
  }
  
  private executeTransformStep(step: WorkflowStep, context: Record<string, any>): any {
    const { transformation } = step.config;
    
    // データ変換ロジック
    return this.applyTransformation(transformation, context);
  }
  
  private expandVariables(obj: any, context: Record<string, any>): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return context[varName] !== undefined ? String(context[varName]) : match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.expandVariables(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.expandVariables(value, context);
      }
      return result;
    }
    
    return obj;
  }
  
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // 簡単な条件評価（セキュリティ上の理由で実際の実装では制限された構文を使用）
    try {
      const expandedCondition = this.expandVariables(condition, context);
      // 実際の実装では、より安全な条件評価エンジンを使用
      return Boolean(eval(expandedCondition));
    } catch {
      return false;
    }
  }
  
  private applyTransformation(transformation: any, context: Record<string, any>): any {
    // データ変換ロジックの実装
    return this.expandVariables(transformation, context);
  }
  
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
  
  listExecutions(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    return workflowId 
      ? executions.filter(e => e.workflowId === workflowId)
      : executions;
  }
}

// 使用例
export const SAMPLE_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "data_analysis_workflow",
    name: "データ分析ワークフロー",
    description: "データを生成、分析、レポート作成を行う",
    variables: {
      dataSize: 100,
      analysisType: "statistical"
    },
    steps: [
      {
        id: "generate_data",
        name: "データ生成",
        type: "tool",
        config: {
          toolName: "data_generator",
          arguments: {
            size: "{{dataSize}}",
            type: "random"
          }
        }
      },
      {
        id: "analyze_data", 
        name: "データ分析",
        type: "tool",
        config: {
          toolName: "data_analyzer",
          arguments: {
            data: "{{generate_data.result}}",
            type: "{{analysisType}}"
          }
        },
        dependencies: ["generate_data"]
      },
      {
        id: "generate_report",
        name: "レポート生成",
        type: "prompt",
        config: {
          promptName: "analysis_report",
          arguments: {
            analysis: "{{analyze_data.result}}",
            format: "markdown"
          }
        },
        dependencies: ["analyze_data"]
      }
    ]
  }
];
```

## 🎉 まとめ

この章では、MCPの実践的な実装技術について包括的に学習しました：

- **マルチ言語SDK**: TypeScript/JavaScript、Python、Goでの高度な実装
- **デバッグ**: 包括的なログ戦略とエラートラッキング
- **テスト**: 効果的なテスト戦略と自動化
- **プロンプトテンプレート**: 動的で再利用可能なテンプレートシステム
- **ワークフロー**: 複雑な処理フローの管理と自動化

これらの技術を組み合わせることで、堅牢で拡張性のあるMCPアプリケーションを構築できます。

### 次のステップ

**[05-AdvancedTopics](../05-AdvancedTopics/)** に進んで、さらに高度なMCPの活用方法を学習しましょう。

## 📚 参考資料

- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Python Async Programming](https://docs.python.org/3/library/asyncio.html)
- [Go Concurrency Patterns](https://blog.golang.org/concurrency-patterns)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Error Handling Strategies](https://blog.sentry.io/2019/09/26/error-handling-strategies/)

---

*実践的な実装スキルは、理論と経験の組み合わせから生まれます。様々な技術を試し、自分のプロジェクトに最適なアプローチを見つけてください。*