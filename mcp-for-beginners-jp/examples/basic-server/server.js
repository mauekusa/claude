#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// サーバーインスタンスを作成
const server = new Server(
  {
    name: 'basic-mcp-server-jp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// ツール一覧を提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'hello',
        description: 'シンプルな挨拶メッセージを返します',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '挨拶する相手の名前',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'calculate',
        description: '基本的な数学計算を実行します',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: '計算式（例: 2 + 2, 10 * 5）',
            },
          },
          required: ['expression'],
        },
      },
      {
        name: 'current_time',
        description: '現在の日時を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: '時刻の表示形式（ISO、日本語）',
              enum: ['iso', 'japanese'],
              default: 'iso',
            },
          },
        },
      },
    ],
  };
});

// ツールの実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'hello':
        const { name: personName } = args;
        return {
          content: [
            {
              type: 'text',
              text: `こんにちは、${personName}さん！MCPサーバーからご挨拶させていただきます。`,
            },
          ],
        };
      
      case 'calculate':
        const { expression } = args;
        // 安全な計算のため、基本的な演算のみ許可
        const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
        if (safeExpression !== expression) {
          throw new Error('計算式に無効な文字が含まれています');
        }
        
        const result = eval(safeExpression);
        return {
          content: [
            {
              type: 'text',
              text: `計算結果: ${expression} = ${result}`,
            },
          ],
        };
      
      case 'current_time':
        const { format = 'iso' } = args;
        const now = new Date();
        
        let timeString;
        if (format === 'japanese') {
          timeString = now.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
          });
        } else {
          timeString = now.toISOString();
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `現在時刻: ${timeString}`,
            },
          ],
        };
      
      default:
        throw new Error(`不明なツール: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `エラー: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// リソース一覧を提供
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'text://welcome',
        name: 'ウェルカムメッセージ',
        description: 'サーバーのウェルカムメッセージ',
        mimeType: 'text/plain',
      },
      {
        uri: 'json://server_info',
        name: 'サーバー情報',
        description: 'MCPサーバーの詳細情報',
        mimeType: 'application/json',
      },
    ],
  };
});

// リソースの読み取りを処理
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case 'text://welcome':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: 'MCPベーシックサーバーへようこそ！\n\nこのサーバーは学習目的で作成されており、以下の機能を提供します：\n- 挨拶ツール\n- 計算ツール\n- 時刻取得ツール\n\n詳細については、ツール一覧をご確認ください。',
          },
        ],
      };
    
    case 'json://server_info':
      const serverInfo = {
        name: 'Basic MCP Server (Japanese)',
        version: '1.0.0',
        description: 'MCP学習用の基本的なサーバー実装',
        author: 'MCP Learning Team',
        capabilities: ['tools', 'resources', 'prompts'],
        supported_languages: ['Japanese', 'English'],
        created_at: new Date().toISOString(),
      };
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(serverInfo, null, 2),
          },
        ],
      };
    
    default:
      throw new Error(`リソースが見つかりません: ${uri}`);
  }
});

// プロンプト一覧を提供
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'greeting',
        description: '適切な挨拶を生成するためのプロンプト',
        arguments: [
          {
            name: 'name',
            description: '挨拶する相手の名前',
            required: true,
          },
          {
            name: 'time_of_day',
            description: '時間帯（朝、昼、夜）',
            required: false,
          },
        ],
      },
    ],
  };
});

// プロンプトの取得を処理
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'greeting') {
    const { name: personName, time_of_day } = args;
    
    let greeting = '';
    if (time_of_day === '朝') {
      greeting = 'おはようございます';
    } else if (time_of_day === '夜') {
      greeting = 'こんばんは';
    } else {
      greeting = 'こんにちは';
    }
    
    return {
      description: '丁寧な挨拶プロンプト',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${greeting}、${personName}さん。本日はお忙しい中、お時間をいただきありがとうございます。何かお手伝いできることはございますでしょうか？`,
          },
        },
      ],
    };
  }
  
  throw new Error(`不明なプロンプト: ${name}`);
});

// サーバーを起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Basic MCP Server (日本語版) が起動しました');
}

main().catch((error) => {
  console.error('❌ サーバーエラー:', error);
  process.exit(1);
});