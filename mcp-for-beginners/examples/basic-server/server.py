#!/usr/bin/env python3
"""
基本的なMCPサーバー実装 (Python版)

このサーバーは以下のツールを提供します：
- echo: メッセージをそのまま返す  
- add: 2つの数値を加算
- current_time: 現在の時刻を取得
"""

import asyncio
import sys
import logging
from datetime import datetime
from typing import Any, Dict, List
import json

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, CallToolResult

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger("basic-mcp-server")

# サーバーインスタンスの作成
server = Server("basic-mcp-server")

# ツール定義
TOOLS = [
    Tool(
        name="echo",
        description="入力されたメッセージをそのまま返します",
        inputSchema={
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "返すメッセージ"
                }
            },
            "required": ["message"]
        }
    ),
    Tool(
        name="add", 
        description="2つの数値を加算します",
        inputSchema={
            "type": "object",
            "properties": {
                "a": {
                    "type": "number",
                    "description": "第1の数値"
                },
                "b": {
                    "type": "number", 
                    "description": "第2の数値"
                }
            },
            "required": ["a", "b"]
        }
    ),
    Tool(
        name="current_time",
        description="現在の時刻を返します",
        inputSchema={
            "type": "object",
            "properties": {},
            "additionalProperties": False
        }
    )
]

@server.list_tools()
async def list_tools() -> List[Tool]:
    """利用可能なツールの一覧を返す"""
    return TOOLS

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
    """ツールを実行する"""
    try:
        if name == "echo":
            message = arguments.get("message", "")
            return CallToolResult(
                content=[TextContent(type="text", text=message)]
            )
        
        elif name == "add":
            a = float(arguments.get("a", 0))
            b = float(arguments.get("b", 0))
            result = a + b
            return CallToolResult(
                content=[TextContent(
                    type="text", 
                    text=f"{a} + {b} = {result}"
                )]
            )
        
        elif name == "current_time":
            now = datetime.now()
            time_string = now.strftime("%Y-%m-%d %H:%M:%S")
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"現在の時刻: {time_string}"
                )]
            )
        
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"未知のツール: {name}"
                )],
                isError=True
            )
    
    except Exception as e:
        logger.error(f"ツール実行エラー: {str(e)}")
        return CallToolResult(
            content=[TextContent(
                type="text",
                text=f"エラーが発生しました: {str(e)}"
            )],
            isError=True
        )

async def main():
    """メイン実行関数"""
    try:
        logger.info("基本MCPサーバーを開始しています...")
        
        # 標準入出力でサーバー開始
        async with stdio_server() as streams:
            await server.run(
                streams[0], streams[1],
                server.create_initialization_options()
            )
            
    except KeyboardInterrupt:
        logger.info("サーバーが中断されました")
    except Exception as e:
        logger.error(f"サーバーエラー: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    # Pythonバージョン確認
    if sys.version_info < (3, 8):
        print("Python 3.8以上が必要です", file=sys.stderr)
        sys.exit(1)
    
    # 非同期実行
    asyncio.run(main())