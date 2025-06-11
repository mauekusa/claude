# 06 - AI Toolkit の活用

## 📖 概要

この節では、AI Toolkit を活用してModel Context Protocol (MCP) ワークフローを管理する方法を学習します。AI Toolkitの基本操作、ワークフローの自動化、統合開発環境の構築について学びます。

## 🎯 学習目標

この節を完了すると、以下のことができるようになります：

- AI Toolkit の基本操作を理解できる
- MCPサーバーとAI Toolkitを統合できる
- ワークフローの自動化を実装できる
- 開発プロセスを効率化できる
- チーム開発でのAI活用ベストプラクティスを理解できる

## 🛠️ 前提条件

- Visual Studio Code がインストールされていること
- [04-vscode](../04-vscode/) が完了していること
- AI Toolkit 拡張機能がインストールされていること

## 📁 AI Toolkit のセットアップ

### 1. AI Toolkit 拡張機能のインストール

```bash
# VS Code で AI Toolkit 拡張機能をインストール
# または、コマンドラインから
code --install-extension ms-windows-ai-studio.windows-ai-studio
```

### 2. プロジェクトディレクトリの作成

```bash
mkdir mcp-aitk-integration
cd mcp-aitk-integration

# AI Toolkit プロジェクトの初期化
npm init -y
```

### 3. 必要なパッケージのインストール

```bash
# MCP SDK のインストール
npm install @modelcontextprotocol/sdk

# AI開発用パッケージ
npm install @azure/openai openai

# ワークフロー管理用パッケージ
npm install yaml js-yaml

# 開発用依存関係
npm install -D typescript @types/node tsx
```

## 🚀 AI Toolkit との統合実装

### 1. AI Toolkit 設定ファイル

```yaml
# ai-toolkit.yaml
name: "MCP AI Workflow"
version: "1.0.0"
description: "AI-powered MCP development workflow"

models:
  - name: "gpt-4"
    provider: "openai"
    endpoint: "https://api.openai.com/v1"
    
  - name: "gpt-3.5-turbo"
    provider: "openai"
    endpoint: "https://api.openai.com/v1"

workflows:
  - name: "mcp-development"
    description: "MCP server development assistance"
    steps:
      - name: "analyze-requirements"
        type: "prompt"
        model: "gpt-4"
        
      - name: "generate-code"
        type: "code-generation"
        model: "gpt-4"
        
      - name: "test-generation"
        type: "test-generation"
        model: "gpt-3.5-turbo"
        
      - name: "documentation"
        type: "documentation"
        model: "gpt-3.5-turbo"

tools:
  - name: "mcp-server-generator"
    description: "Generate MCP server boilerplate"
    
  - name: "mcp-tool-creator"
    description: "Create new MCP tools"
    
  - name: "mcp-test-generator"
    description: "Generate tests for MCP components"

prompts:
  code-review:
    template: |
      以下のMCPサーバーコードをレビューしてください：
      
      ```typescript
      {code}
      ```
      
      以下の観点で評価してください：
      1. セキュリティ
      2. パフォーマンス
      3. 可読性
      4. MCP仕様への準拠
      
  tool-generation:
    template: |
      以下の要件に基づいてMCPツールを生成してください：
      
      要件：{requirements}
      
      以下を含めてください：
      1. ツールの定義
      2. 実装コード
      3. エラーハンドリング
      4. テストケース
```

### 2. AI Toolkit 統合クラス

```typescript
// src/ai-toolkit-integration.ts
import { OpenAI } from 'openai';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import { MCPServerManager } from './mcp-server-manager.js';

interface AIToolkitConfig {
  name: string;
  version: string;
  description: string;
  models: Array<{
    name: string;
    provider: string;
    endpoint: string;
  }>;
  workflows: Array<{
    name: string;
    description: string;
    steps: Array<{
      name: string;
      type: string;
      model: string;
    }>;
  }>;
  tools: Array<{
    name: string;
    description: string;
  }>;
  prompts: Record<string, {
    template: string;
  }>;
}

interface WorkflowContext {
  requirements?: string;
  code?: string;
  testResults?: any;
  documentation?: string;
}

export class AIToolkitIntegration {
  private config: AIToolkitConfig;
  private openaiClient: OpenAI;
  private mcpManager: MCPServerManager;

  constructor(configPath: string, mcpManager: MCPServerManager) {
    this.mcpManager = mcpManager;
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async initialize(configPath: string): Promise<void> {
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = yaml.load(configContent) as AIToolkitConfig;
      console.log(`AI Toolkit initialized: ${this.config.name}`);
    } catch (error) {
      throw new Error(`Failed to load AI Toolkit config: ${error}`);
    }
  }

  /**
   * ワークフローの実行
   */
  async executeWorkflow(workflowName: string, context: WorkflowContext): Promise<any> {
    const workflow = this.config.workflows.find(w => w.name === workflowName);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowName}`);
    }

    console.log(`Executing workflow: ${workflow.name}`);
    let result: any = {};

    for (const step of workflow.steps) {
      console.log(`Executing step: ${step.name}`);
      
      try {
        const stepResult = await this.executeWorkflowStep(step, context);
        result[step.name] = stepResult;
        
        // 次のステップのためにコンテキストを更新
        this.updateContext(context, step.name, stepResult);
        
      } catch (error) {
        console.error(`Step failed: ${step.name}`, error);
        throw error;
      }
    }

    return result;
  }

  private async executeWorkflowStep(step: any, context: WorkflowContext): Promise<any> {
    switch (step.type) {
      case 'prompt':
        return this.executePromptStep(step, context);
      case 'code-generation':
        return this.executeCodeGenerationStep(step, context);
      case 'test-generation':
        return this.executeTestGenerationStep(step, context);
      case 'documentation':
        return this.executeDocumentationStep(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executePromptStep(step: any, context: WorkflowContext): Promise<string> {
    const prompt = this.buildPrompt(step.name, context);
    
    const response = await this.openaiClient.chat.completions.create({
      model: step.model,
      messages: [
        {
          role: 'system',
          content: 'あなたはMCPの専門家です。詳細で実用的なアドバイスを提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || '';
  }

  private async executeCodeGenerationStep(step: any, context: WorkflowContext): Promise<string> {
    const prompt = `
以下の要件に基づいてMCPサーバーのコードを生成してください：

要件：
${context.requirements || 'No specific requirements provided'}

以下を含むTypeScriptコードを生成してください：
1. 適切なインポート文
2. サーバーの初期化
3. ツールの実装
4. エラーハンドリング
5. 型定義

コードは実際に動作し、MCP仕様に準拠している必要があります。
`;

    const response = await this.openaiClient.chat.completions.create({
      model: step.model,
      messages: [
        {
          role: 'system',
          content: 'あなたはMCP TypeScript開発の専門家です。実際に動作する高品質なコードを生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });

    return response.choices[0].message.content || '';
  }

  private async executeTestGenerationStep(step: any, context: WorkflowContext): Promise<string> {
    const prompt = `
以下のMCPサーバーコードに対するテストを生成してください：

\`\`\`typescript
${context.code || 'No code provided'}
\`\`\`

以下を含むJestテストコードを生成してください：
1. ユニットテスト
2. 統合テスト
3. エラーケースのテスト
4. モックの適切な使用
5. テストのセットアップとクリーンアップ

テストは包括的で実際に実行可能である必要があります。
`;

    const response = await this.openaiClient.chat.completions.create({
      model: step.model,
      messages: [
        {
          role: 'system',
          content: 'あなたはテスト駆動開発の専門家です。包括的で実行可能なテストコードを生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    });

    return response.choices[0].message.content || '';
  }

  private async executeDocumentationStep(step: any, context: WorkflowContext): Promise<string> {
    const prompt = `
以下のMCPサーバーコードに対するドキュメントを生成してください：

\`\`\`typescript
${context.code || 'No code provided'}
\`\`\`

以下を含むMarkdownドキュメントを生成してください：
1. 概要と目的
2. インストール手順
3. 使用方法
4. APIリファレンス
5. 設定オプション
6. トラブルシューティング
7. 例とユースケース

ドキュメントは初心者にも理解しやすく、実用的である必要があります。
`;

    const response = await this.openaiClient.chat.completions.create({
      model: step.model,
      messages: [
        {
          role: 'system',
          content: 'あなたは技術文書作成の専門家です。明確で実用的なドキュメントを作成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || '';
  }

  private buildPrompt(stepName: string, context: WorkflowContext): string {
    switch (stepName) {
      case 'analyze-requirements':
        return `
以下の要件を分析して、MCPサーバーの設計アドバイスを提供してください：

要件：
${context.requirements || 'No specific requirements provided'}

以下の観点で分析してください：
1. 技術的実現可能性
2. セキュリティ考慮事項
3. パフォーマンス要件
4. 推奨アーキテクチャ
5. 潜在的な課題と解決策
`;

      default:
        return context.requirements || 'Please provide analysis for this MCP project.';
    }
  }

  private updateContext(context: WorkflowContext, stepName: string, result: any): void {
    switch (stepName) {
      case 'analyze-requirements':
        context.requirements = result;
        break;
      case 'generate-code':
        context.code = result;
        break;
      case 'test-generation':
        context.testResults = result;
        break;
      case 'documentation':
        context.documentation = result;
        break;
    }
  }

  /**
   * MCPツールの自動生成
   */
  async generateMCPTool(toolSpec: any): Promise<string> {
    const prompt = this.config.prompts['tool-generation'].template
      .replace('{requirements}', JSON.stringify(toolSpec, null, 2));

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはMCPツール開発の専門家です。仕様に基づいて完全なツール実装を生成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });

    return response.choices[0].message.content || '';
  }

  /**
   * コードレビューの実行
   */
  async reviewCode(code: string): Promise<string> {
    const prompt = this.config.prompts['code-review'].template
      .replace('{code}', code);

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはシニアソフトウェアエンジニアです。詳細で建設的なコードレビューを提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    });

    return response.choices[0].message.content || '';
  }

  /**
   * ワークフロー最適化の提案
   */
  async optimizeWorkflow(currentWorkflow: any): Promise<string> {
    const prompt = `
以下の現在のMCP開発ワークフローを分析し、改善提案を行ってください：

現在のワークフロー：
${JSON.stringify(currentWorkflow, null, 2)}

以下の観点で改善提案してください：
1. 効率性の向上
2. 品質保証の強化
3. 自動化の可能性
4. チーム協働の改善
5. 継続的インテグレーション/デプロイメント

具体的で実装可能な提案を提供してください。
`;

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはDevOpsとソフトウェア開発プロセスの専門家です。実践的な改善提案を提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || '';
  }
}
```

### 3. AI ワークフロー管理システム

```typescript
// src/ai-workflow-manager.ts
import { AIToolkitIntegration } from './ai-toolkit-integration.js';
import { MCPServerManager } from './mcp-server-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ProjectContext {
  projectName: string;
  requirements: string;
  codeFiles: Map<string, string>;
  testFiles: Map<string, string>;
  documentation: Map<string, string>;
  aiInsights: Array<{
    timestamp: Date;
    type: string;
    content: string;
  }>;
}

export class AIWorkflowManager {
  private aiToolkit: AIToolkitIntegration;
  private mcpManager: MCPServerManager;
  private projects: Map<string, ProjectContext> = new Map();

  constructor(mcpManager: MCPServerManager) {
    this.mcpManager = mcpManager;
    this.aiToolkit = new AIToolkitIntegration('ai-toolkit.yaml', mcpManager);
  }

  async initialize(): Promise<void> {
    await this.aiToolkit.initialize('ai-toolkit.yaml');
    console.log('AI Workflow Manager initialized');
  }

  /**
   * 新しいMCPプロジェクトの作成
   */
  async createMCPProject(projectName: string, requirements: string): Promise<void> {
    console.log(`Creating MCP project: ${projectName}`);

    const context: ProjectContext = {
      projectName,
      requirements,
      codeFiles: new Map(),
      testFiles: new Map(),
      documentation: new Map(),
      aiInsights: []
    };

    // AI ワークフローの実行
    const workflowResult = await this.aiToolkit.executeWorkflow('mcp-development', {
      requirements
    });

    // 結果をプロジェクトコンテキストに保存
    this.updateProjectContext(context, workflowResult);
    
    // ファイルの生成
    await this.generateProjectFiles(context);
    
    this.projects.set(projectName, context);
    console.log(`Project created successfully: ${projectName}`);
  }

  private updateProjectContext(context: ProjectContext, workflowResult: any): void {
    if (workflowResult['generate-code']) {
      context.codeFiles.set('server.ts', workflowResult['generate-code']);
    }

    if (workflowResult['test-generation']) {
      context.testFiles.set('server.test.ts', workflowResult['test-generation']);
    }

    if (workflowResult['documentation']) {
      context.documentation.set('README.md', workflowResult['documentation']);
    }

    // AI インサイトの追加
    Object.entries(workflowResult).forEach(([step, result]) => {
      context.aiInsights.push({
        timestamp: new Date(),
        type: step,
        content: result as string
      });
    });
  }

  private async generateProjectFiles(context: ProjectContext): Promise<void> {
    const projectDir = path.join(process.cwd(), 'projects', context.projectName);
    
    // プロジェクトディレクトリの作成
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'tests'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'docs'), { recursive: true });

    // コードファイルの生成
    for (const [filename, content] of context.codeFiles) {
      await fs.writeFile(path.join(projectDir, 'src', filename), content);
    }

    // テストファイルの生成
    for (const [filename, content] of context.testFiles) {
      await fs.writeFile(path.join(projectDir, 'tests', filename), content);
    }

    // ドキュメントファイルの生成
    for (const [filename, content] of context.documentation) {
      await fs.writeFile(path.join(projectDir, filename), content);
    }

    // package.json の生成
    const packageJson = {
      name: context.projectName,
      version: "1.0.0",
      description: "AI-generated MCP server",
      main: "dist/server.js",
      type: "module",
      scripts: {
        "build": "tsc",
        "start": "node dist/server.js",
        "dev": "tsx src/server.ts",
        "test": "jest"
      },
      dependencies: {
        "@modelcontextprotocol/sdk": "^0.4.0"
      },
      devDependencies: {
        "typescript": "^5.0.0",
        "@types/node": "^20.0.0",
        "tsx": "^4.0.0",
        "jest": "^29.0.0"
      }
    };

    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // TypeScript設定の生成
    const tsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "node",
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"]
    };

    await fs.writeFile(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );
  }

  /**
   * プロジェクトの継続的改善
   */
  async improveProject(projectName: string): Promise<void> {
    const context = this.projects.get(projectName);
    if (!context) {
      throw new Error(`Project not found: ${projectName}`);
    }

    console.log(`Improving project: ${projectName}`);

    // 現在のコードをレビュー
    for (const [filename, code] of context.codeFiles) {
      console.log(`Reviewing ${filename}...`);
      const review = await this.aiToolkit.reviewCode(code);
      
      context.aiInsights.push({
        timestamp: new Date(),
        type: 'code-review',
        content: `Review for ${filename}:\n${review}`
      });
    }

    // 改善提案の生成
    const workflowOptimization = await this.aiToolkit.optimizeWorkflow({
      project: projectName,
      currentFiles: Array.from(context.codeFiles.keys()),
      insights: context.aiInsights.slice(-5) // 最新の5つのインサイト
    });

    context.aiInsights.push({
      timestamp: new Date(),
      type: 'workflow-optimization',
      content: workflowOptimization
    });

    console.log(`Project improvement completed: ${projectName}`);
  }

  /**
   * 新しいツールの追加
   */
  async addToolToProject(projectName: string, toolSpec: any): Promise<void> {
    const context = this.projects.get(projectName);
    if (!context) {
      throw new Error(`Project not found: ${projectName}`);
    }

    console.log(`Adding tool to project: ${projectName}`);

    // AI を使用してツールコードを生成
    const toolCode = await this.aiToolkit.generateMCPTool(toolSpec);
    
    // 既存のサーバーコードに統合
    const serverCode = context.codeFiles.get('server.ts') || '';
    const updatedServerCode = this.integrateToolCode(serverCode, toolCode, toolSpec.name);
    
    context.codeFiles.set('server.ts', updatedServerCode);

    // ファイルを更新
    const projectDir = path.join(process.cwd(), 'projects', projectName);
    await fs.writeFile(path.join(projectDir, 'src', 'server.ts'), updatedServerCode);

    // インサイトを追加
    context.aiInsights.push({
      timestamp: new Date(),
      type: 'tool-addition',
      content: `Added tool: ${toolSpec.name}\n${toolCode}`
    });

    console.log(`Tool added successfully: ${toolSpec.name}`);
  }

  private integrateToolCode(serverCode: string, toolCode: string, toolName: string): string {
    // 簡単な統合実装（実際にはより洗練された方法が必要）
    
    // ツール一覧に追加
    const toolListPattern = /tools:\s*\[([^\]]*)\]/;
    const toolListMatch = serverCode.match(toolListPattern);
    
    if (toolListMatch) {
      const existingTools = toolListMatch[1];
      const newToolsList = existingTools ? 
        `${existingTools.trim()},\n        ${this.extractToolDefinition(toolCode)}` :
        this.extractToolDefinition(toolCode);
      
      serverCode = serverCode.replace(
        toolListPattern,
        `tools: [${newToolsList}]`
      );
    }

    // ツール実行ハンドラーに追加
    const handlerPattern = /(switch\s*\(\s*name\s*\)\s*{[^}]*)(default:)/;
    const handlerMatch = serverCode.match(handlerPattern);
    
    if (handlerMatch) {
      const newCase = `\n      case "${toolName}":\n        ${this.extractToolHandler(toolCode)}\n        break;\n      `;
      serverCode = serverCode.replace(handlerPattern, `${handlerMatch[1]}${newCase}${handlerMatch[2]}`);
    }

    return serverCode;
  }

  private extractToolDefinition(toolCode: string): string {
    // AIが生成したコードからツール定義を抽出
    const definitionMatch = toolCode.match(/{\s*name:\s*"[^"]+",[\s\S]*?}/);
    return definitionMatch ? definitionMatch[0] : '// Tool definition extraction failed';
  }

  private extractToolHandler(toolCode: string): string {
    // AIが生成したコードからツールハンドラーを抽出
    const handlerMatch = toolCode.match(/return\s+{[\s\S]*?};/);
    return handlerMatch ? handlerMatch[0] : '// Tool handler extraction failed';
  }

  /**
   * プロジェクトレポートの生成
   */
  async generateProjectReport(projectName: string): Promise<string> {
    const context = this.projects.get(projectName);
    if (!context) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const report = `
# AI Development Report: ${projectName}

## プロジェクト概要
- **プロジェクト名**: ${context.projectName}
- **作成日**: ${context.aiInsights[0]?.timestamp.toLocaleDateString()}
- **ファイル数**: ${context.codeFiles.size + context.testFiles.size + context.documentation.size}

## 要件
${context.requirements}

## 生成されたファイル

### コードファイル
${Array.from(context.codeFiles.keys()).map(f => `- ${f}`).join('\n')}

### テストファイル
${Array.from(context.testFiles.keys()).map(f => `- ${f}`).join('\n')}

### ドキュメント
${Array.from(context.documentation.keys()).map(f => `- ${f}`).join('\n')}

## AI インサイト履歴
${context.aiInsights.map(insight => `
### ${insight.type} (${insight.timestamp.toLocaleString()})
${insight.content.substring(0, 500)}...
`).join('\n')}

## 推奨する次のステップ
1. 生成されたコードの詳細レビュー
2. ユニットテストの実行
3. セキュリティ監査
4. パフォーマンステスト
5. デプロイメント準備
`;

    return report;
  }

  /**
   * プロジェクト一覧の取得
   */
  getProjects(): string[] {
    return Array.from(this.projects.keys());
  }

  /**
   * プロジェクト詳細の取得
   */
  getProjectDetails(projectName: string): ProjectContext | undefined {
    return this.projects.get(projectName);
  }
}
```

### 4. VS Code コマンドの統合

```typescript
// src/vscode-ai-commands.ts
import * as vscode from 'vscode';
import { AIWorkflowManager } from './ai-workflow-manager.js';
import { MCPServerManager } from './mcp-server-manager.js';

export class VSCodeAICommands {
  private workflowManager: AIWorkflowManager;

  constructor() {
    const mcpManager = new MCPServerManager();
    this.workflowManager = new AIWorkflowManager(mcpManager);
  }

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    await this.workflowManager.initialize();
    this.registerCommands(context);
  }

  private registerCommands(context: vscode.ExtensionContext): void {
    // MCP プロジェクト作成コマンド
    const createProjectCommand = vscode.commands.registerCommand(
      'mcp-aitk.createProject',
      async () => {
        await this.createMCPProject();
      }
    );

    // プロジェクト改善コマンド
    const improveProjectCommand = vscode.commands.registerCommand(
      'mcp-aitk.improveProject',
      async () => {
        await this.improveProject();
      }
    );

    // ツール追加コマンド
    const addToolCommand = vscode.commands.registerCommand(
      'mcp-aitk.addTool',
      async () => {
        await this.addTool();
      }
    );

    // レポート生成コマンド
    const generateReportCommand = vscode.commands.registerCommand(
      'mcp-aitk.generateReport',
      async () => {
        await this.generateReport();
      }
    );

    context.subscriptions.push(
      createProjectCommand,
      improveProjectCommand,
      addToolCommand,
      generateReportCommand
    );
  }

  private async createMCPProject(): Promise<void> {
    try {
      // プロジェクト名の入力
      const projectName = await vscode.window.showInputBox({
        prompt: 'プロジェクト名を入力してください',
        placeHolder: 'my-mcp-server'
      });

      if (!projectName) return;

      // 要件の入力
      const requirements = await vscode.window.showInputBox({
        prompt: 'プロジェクトの要件を入力してください',
        placeHolder: 'ファイル管理とデータ処理のためのMCPサーバー'
      });

      if (!requirements) return;

      // プロジェクト作成の実行
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "MCPプロジェクトを作成中...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "AI分析中..." });
        
        await this.workflowManager.createMCPProject(projectName, requirements);
        
        progress.report({ increment: 100, message: "完了" });
      });

      vscode.window.showInformationMessage(
        `MCPプロジェクト "${projectName}" が作成されました`,
        'フォルダを開く'
      ).then(selection => {
        if (selection === 'フォルダを開く') {
          const projectPath = vscode.Uri.file(`${process.cwd()}/projects/${projectName}`);
          vscode.commands.executeCommand('vscode.openFolder', projectPath);
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`プロジェクト作成エラー: ${error}`);
    }
  }

  private async improveProject(): Promise<void> {
    try {
      const projects = this.workflowManager.getProjects();
      
      if (projects.length === 0) {
        vscode.window.showInformationMessage('改善可能なプロジェクトがありません');
        return;
      }

      const selectedProject = await vscode.window.showQuickPick(projects, {
        placeHolder: '改善するプロジェクトを選択してください'
      });

      if (!selectedProject) return;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "プロジェクトを改善中...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "コードレビュー中..." });
        
        await this.workflowManager.improveProject(selectedProject);
        
        progress.report({ increment: 100, message: "完了" });
      });

      vscode.window.showInformationMessage(`プロジェクト "${selectedProject}" の改善が完了しました`);

    } catch (error) {
      vscode.window.showErrorMessage(`プロジェクト改善エラー: ${error}`);
    }
  }

  private async addTool(): Promise<void> {
    try {
      const projects = this.workflowManager.getProjects();
      
      if (projects.length === 0) {
        vscode.window.showInformationMessage('ツールを追加できるプロジェクトがありません');
        return;
      }

      const selectedProject = await vscode.window.showQuickPick(projects, {
        placeHolder: 'ツールを追加するプロジェクトを選択してください'
      });

      if (!selectedProject) return;

      const toolName = await vscode.window.showInputBox({
        prompt: 'ツール名を入力してください',
        placeHolder: 'file_processor'
      });

      if (!toolName) return;

      const toolDescription = await vscode.window.showInputBox({
        prompt: 'ツールの説明を入力してください',
        placeHolder: 'ファイルを処理して結果を返すツール'
      });

      if (!toolDescription) return;

      const toolSpec = {
        name: toolName,
        description: toolDescription,
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "処理する入力データ"
            }
          },
          required: ["input"]
        }
      };

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "ツールを追加中...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "AI生成中..." });
        
        await this.workflowManager.addToolToProject(selectedProject, toolSpec);
        
        progress.report({ increment: 100, message: "完了" });
      });

      vscode.window.showInformationMessage(`ツール "${toolName}" が追加されました`);

    } catch (error) {
      vscode.window.showErrorMessage(`ツール追加エラー: ${error}`);
    }
  }

  private async generateReport(): Promise<void> {
    try {
      const projects = this.workflowManager.getProjects();
      
      if (projects.length === 0) {
        vscode.window.showInformationMessage('レポート生成可能なプロジェクトがありません');
        return;
      }

      const selectedProject = await vscode.window.showQuickPick(projects, {
        placeHolder: 'レポートを生成するプロジェクトを選択してください'
      });

      if (!selectedProject) return;

      const report = await this.workflowManager.generateProjectReport(selectedProject);

      // 新しいエディタでレポートを表示
      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });
      
      await vscode.window.showTextDocument(doc);

    } catch (error) {
      vscode.window.showErrorMessage(`レポート生成エラー: ${error}`);
    }
  }
}
```

### 5. package.json の設定

```json
{
  "name": "mcp-aitk-integration",
  "version": "1.0.0",
  "description": "MCP with AI Toolkit Integration",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "keywords": ["mcp", "ai-toolkit", "automation"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "@azure/openai": "^1.0.0",
    "openai": "^4.0.0",
    "yaml": "^2.3.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 🧪 AI Toolkit ワークフローの実行

### 1. 基本的な使用例

```typescript
// src/examples/basic-usage.ts
import { AIWorkflowManager } from '../ai-workflow-manager.js';
import { MCPServerManager } from '../mcp-server-manager.js';

async function basicUsageExample() {
  const mcpManager = new MCPServerManager();
  const workflowManager = new AIWorkflowManager(mcpManager);
  
  await workflowManager.initialize();

  // 新しいプロジェクトの作成
  await workflowManager.createMCPProject(
    'weather-server',
    '気象データを取得し、天気予報を提供するMCPサーバー。OpenWeatherMap APIと統合し、都市別の詳細な気象情報を提供する。'
  );

  // プロジェクトの改善
  await workflowManager.improveProject('weather-server');

  // 新しいツールの追加
  await workflowManager.addToolToProject('weather-server', {
    name: 'weather_alert',
    description: '悪天候アラートを生成',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: '場所' },
        alertType: { type: 'string', description: 'アラートタイプ' }
      },
      required: ['location', 'alertType']
    }
  });

  // レポートの生成
  const report = await workflowManager.generateProjectReport('weather-server');
  console.log(report);
}

basicUsageExample().catch(console.error);
```

## 🎯 演習課題

### 初級課題

1. **カスタムプロンプト**: 独自のプロンプトテンプレートを作成してください
2. **ワークフロー拡張**: 新しいワークフローステップを追加してください
3. **結果の可視化**: ワークフロー結果をグラフィカルに表示する機能を実装してください

### 中級課題

1. **継続的学習**: AIモデルのフィードバックループを実装してください
2. **品質メトリクス**: コード品質を定量的に評価するシステムを作成してください
3. **チーム協働**: 複数開発者間での AI 活用ワークフローを設計してください

## 🎉 まとめ

この節では、AI Toolkit を活用したMCP開発ワークフローについて学習しました：

### 学習した内容

1. **AI Toolkit 統合**: MCPサーバーとAI Toolkitの統合
2. **ワークフロー自動化**: AI支援による開発プロセスの自動化
3. **コード生成**: 要件に基づく自動コード生成
4. **継続的改善**: AIによるコードレビューと最適化提案
5. **VS Code 統合**: 開発環境での AI 活用

### 主要なメリット

- **開発効率向上**: AI支援による高速プロトタイピング
- **品質保証**: 自動コードレビューとテスト生成
- **知識共有**: AI インサイトによるベストプラクティス学習
- **一貫性確保**: 標準化されたコード生成パターン

## 🔗 次のステップ

AI Toolkit の活用方法を学んだので、より高度なMCPアプリケーションの開発に挑戦してみましょう。学習した全ての技術を組み合わせて、実用的なMCPソリューションを構築してください。

## 📚 参考資料

- [AI Toolkit Documentation](https://github.com/microsoft/ai-toolkit)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [VS Code Extension Development](https://code.visualstudio.com/api)

---

*AI Toolkit との統合により、MCP開発の生産性と品質が大幅に向上します。AI を活用して、より良いソフトウェア開発プロセスを構築してください。*