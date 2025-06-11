#!/usr/bin/env node

/**
 * 基本的なMCPサーバー実装 (Node.js版)
 * 
 * このサーバーは以下のツールを提供します：
 * - echo: メッセージをそのまま返す
 * - add: 2つの数値を加算
 * - current_time: 現在の時刻を取得
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// サーバーインスタンスの作成
const server = new Server({
  name: 'basic-mcp-server',
  version: '1.0.0',
  description: 'MCP初心者向けの基本的なサーバー実装'
});

// ツールの定義
const tools = [
  {
    name: 'echo',
    description: '入力されたメッセージをそのまま返します',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '返すメッセージ'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'add',
    description: '2つの数値を加算します',
    inputSchema: {
      type: 'object',
      properties: {
        a: {
          type: 'number',
          description: '第1の数値'
        },
        b: {
          type: 'number',
          description: '第2の数値'
        }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'current_time',
    description: '現在の時刻を返します',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

// ツールをサーバーに追加
tools.forEach(tool => {
  server.addTool(tool);
});

// ツール一覧リクエストのハンドラー
server.setRequestHandler('tools/list', async () => {
  return {
    tools: tools
  };
});

// ツール実行リクエストのハンドラー
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'echo':
        return {
          content: [{
            type: 'text',
            text: args.message
          }]
        };

      case 'add':
        const sum = args.a + args.b;
        return {
          content: [{
            type: 'text',
            text: `${args.a} + ${args.b} = ${sum}`
          }]
        };

      case 'current_time':
        const now = new Date();
        const timeString = now.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Tokyo'
        });
        return {
          content: [{
            type: 'text',
            text: `現在の時刻: ${timeString}`
          }]
        };

      default:
        throw new Error(`未知のツール: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `エラーが発生しました: ${error.message}`
      }],
      isError: true
    };
  }
});

// サーバー初期化
server.setRequestHandler('initialize', async (request) => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {
        listChanged: true
      }
    },
    serverInfo: {
      name: 'basic-mcp-server',
      version: '1.0.0'
    }
  };
});

// ログ出力関数
function log(message) {
  console.error(`[${new Date().toISOString()}] ${message}`);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  log(`未処理の例外: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`未処理のPromise拒否: ${reason}`);
  process.exit(1);
});

// サーバー開始
async function main() {
  try {
    // 標準入出力でトランスポート作成
    const transport = new StdioServerTransport();
    
    log('基本MCPサーバーを開始しています...');
    
    // サーバーと接続
    await server.connect(transport);
    
    log('サーバーが正常に開始されました');
  } catch (error) {
    log(`サーバー開始エラー: ${error.message}`);
    process.exit(1);
  }
}

// サーバー実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default server;