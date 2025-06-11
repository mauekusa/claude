#!/usr/bin/env python3
"""
Basic MCP Server (Japanese Version)
MCP学習用の基本的なサーバー実装（Python版）
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Any, Sequence

import mcp.types as types
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server


# サーバーインスタンスを作成
server = Server("basic-mcp-server-jp")


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """利用可能なツール一覧を返す"""
    return [
        types.Tool(
            name="hello",
            description="シンプルな挨拶メッセージを返します",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "挨拶する相手の名前",
                    }
                },
                "required": ["name"],
            },
        ),
        types.Tool(
            name="calculate",
            description="基本的な数学計算を実行します",
            inputSchema={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "計算式（例: 2 + 2, 10 * 5）",
                    }
                },
                "required": ["expression"],
            },
        ),
        types.Tool(
            name="current_time",
            description="現在の日時を取得します",
            inputSchema={
                "type": "object",
                "properties": {
                    "format": {
                        "type": "string",
                        "description": "時刻の表示形式",
                        "enum": ["iso", "japanese"],
                        "default": "iso",
                    }
                },
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    """ツールの実行を処理"""
    try:
        if name == "hello":
            person_name = arguments.get("name", "名無し") if arguments else "名無し"
            return [
                types.TextContent(
                    type="text",
                    text=f"こんにちは、{person_name}さん！MCPサーバー（Python版）からご挨拶させていただきます。",
                )
            ]
        
        elif name == "calculate":
            if not arguments or "expression" not in arguments:
                raise ValueError("計算式が指定されていません")
            
            expression = arguments["expression"]
            
            # 安全な計算のため、基本的な演算のみ許可
            allowed_chars = set("0123456789+-*/().")
            if not all(c in allowed_chars or c.isspace() for c in expression):
                raise ValueError("計算式に無効な文字が含まれています")
            
            try:
                result = eval(expression)
                return [
                    types.TextContent(
                        type="text",
                        text=f"計算結果: {expression} = {result}"
                    )
                ]
            except Exception as e:
                raise ValueError(f"計算エラー: {str(e)}")
        
        elif name == "current_time":
            format_type = "iso"
            if arguments and "format" in arguments:
                format_type = arguments["format"]
            
            now = datetime.now()
            
            if format_type == "japanese":
                time_string = now.strftime("%Y年%m月%d日 %H時%M分%S秒 (%A)")
                # 曜日を日本語に変換
                weekdays = {
                    "Monday": "月曜日",
                    "Tuesday": "火曜日", 
                    "Wednesday": "水曜日",
                    "Thursday": "木曜日",
                    "Friday": "金曜日",
                    "Saturday": "土曜日",
                    "Sunday": "日曜日"
                }
                for eng, jpn in weekdays.items():
                    time_string = time_string.replace(eng, jpn)
            else:
                time_string = now.isoformat()
            
            return [
                types.TextContent(
                    type="text",
                    text=f"現在時刻: {time_string}"
                )
            ]
        
        else:
            raise ValueError(f"不明なツール: {name}")
    
    except Exception as e:
        return [
            types.TextContent(
                type="text",
                text=f"エラー: {str(e)}"
            )
        ]


@server.list_resources()
async def handle_list_resources() -> list[types.Resource]:
    """利用可能なリソース一覧を返す"""
    return [
        types.Resource(
            uri="text://welcome",
            name="ウェルカムメッセージ",
            description="サーバーのウェルカムメッセージ",
            mimeType="text/plain",
        ),
        types.Resource(
            uri="json://server_info", 
            name="サーバー情報",
            description="MCPサーバーの詳細情報",
            mimeType="application/json",
        ),
    ]


@server.read_resource()
async def handle_read_resource(uri: str) -> str:
    """リソースの読み取りを処理"""
    if uri == "text://welcome":
        return """MCPベーシックサーバー（Python版）へようこそ！

このサーバーは学習目的で作成されており、以下の機能を提供します：
- 挨拶ツール
- 計算ツール  
- 時刻取得ツール

詳細については、ツール一覧をご確認ください。

Python版の特徴：
- asyncio を使用した非同期処理
- 型ヒント対応
- Pythonic なコード構造"""
    
    elif uri == "json://server_info":
        server_info = {
            "name": "Basic MCP Server (Japanese - Python)",
            "version": "1.0.0",
            "description": "MCP学習用の基本的なサーバー実装（Python版）",
            "author": "MCP Learning Team",
            "language": "Python",
            "capabilities": ["tools", "resources", "prompts"],
            "supported_languages": ["Japanese", "English"],
            "created_at": datetime.now().isoformat(),
            "python_version": sys.version,
        }
        return json.dumps(server_info, ensure_ascii=False, indent=2)
    
    else:
        raise ValueError(f"リソースが見つかりません: {uri}")


@server.list_prompts()
async def handle_list_prompts() -> list[types.Prompt]:
    """利用可能なプロンプト一覧を返す"""
    return [
        types.Prompt(
            name="greeting",
            description="適切な挨拶を生成するためのプロンプト",
            arguments=[
                types.PromptArgument(
                    name="name",
                    description="挨拶する相手の名前",
                    required=True,
                ),
                types.PromptArgument(
                    name="time_of_day",
                    description="時間帯（朝、昼、夜）",
                    required=False,
                ),
            ],
        )
    ]


@server.get_prompt()
async def handle_get_prompt(name: str, arguments: dict | None) -> types.GetPromptResult:
    """プロンプトの取得を処理"""
    if name == "greeting":
        person_name = arguments.get("name", "お客様") if arguments else "お客様"
        time_of_day = arguments.get("time_of_day") if arguments else None
        
        if time_of_day == "朝":
            greeting = "おはようございます"
        elif time_of_day == "夜":
            greeting = "こんばんは"
        else:
            greeting = "こんにちは"
        
        return types.GetPromptResult(
            description="丁寧な挨拶プロンプト（Python版）",
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=f"{greeting}、{person_name}さん。本日はお忙しい中、お時間をいただきありがとうございます。Python版のMCPサーバーをご利用いただき、誠にありがとうございます。何かお手伝いできることはございますでしょうか？"
                    ),
                )
            ],
        )
    
    raise ValueError(f"不明なプロンプト: {name}")


async def main():
    """メイン関数 - サーバーを起動"""
    # 初期化オプション
    init_options = InitializationOptions(
        server_name="basic-mcp-server-jp",
        server_version="1.0.0",
        capabilities=server.get_capabilities(
            notification_options=NotificationOptions(),
            experimental_capabilities={},
        ),
    )
    
    async with stdio_server() as (read_stream, write_stream):
        print("🚀 Basic MCP Server (日本語版 - Python) が起動しました", file=sys.stderr)
        await server.run(
            read_stream,
            write_stream,
            init_options,
        )


if __name__ == "__main__":
    asyncio.run(main())