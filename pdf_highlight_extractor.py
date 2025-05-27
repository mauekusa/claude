#!/usr/bin/env python3
"""
PDFハイライト抽出プログラム

PDFファイルからハイライト（注釈）部分のテキストを抽出し、
コンソールに表示して、テキストファイルに保存するプログラムです。

必要なライブラリ:
pip install PyMuPDF

使用方法:
python pdf_highlight_extractor.py
"""

import fitz  # PyMuPDF
import os
import sys
from typing import List, Tuple


def extract_highlights_from_pdf(pdf_path: str) -> List[Tuple[str, int]]:
    """
    PDFファイルからハイライト部分のテキストを抽出する
    
    Args:
        pdf_path (str): PDFファイルのパス
        
    Returns:
        List[Tuple[str, int]]: (ハイライトテキスト, ページ番号) のリスト
    """
    highlights = []
    
    try:
        # PDFファイルを開く
        doc = fitz.open(pdf_path)
        
        # 各ページを処理
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # ページ内の注釈（アノテーション）を取得
            annotations = page.annots()
            
            for annot in annotations:
                # ハイライト注釈の場合
                if annot.type[1] == 'Highlight':
                    # ハイライトされたテキストを抽出
                    highlight_text = ""
                    
                    # ハイライト領域のテキストを取得
                    rect = annot.rect
                    words = page.get_text("words")
                    
                    for word in words:
                        word_rect = fitz.Rect(word[:4])
                        # ハイライト領域と重複する単語を抽出
                        if rect.intersects(word_rect):
                            highlight_text += word[4] + " "
                    
                    if highlight_text.strip():
                        highlights.append((highlight_text.strip(), page_num + 1))
        
        doc.close()
        
    except Exception as e:
        print(f"PDFの処理中にエラーが発生しました: {e}")
        return []
    
    return highlights


def display_highlights(highlights: List[Tuple[str, int]]) -> None:
    """
    抽出したハイライトを表示する
    
    Args:
        highlights (List[Tuple[str, int]]): (ハイライトテキスト, ページ番号) のリスト
    """
    if not highlights:
        print("ハイライトが見つかりませんでした。")
        return
    
    print("\n" + "="*50)
    print("抽出されたハイライト一覧")
    print("="*50)
    
    for i, (text, page_num) in enumerate(highlights, 1):
        print(f"\n【{i}】ページ {page_num}:")
        print(f"{text}")
        print("-" * 30)


def save_highlights_to_file(highlights: List[Tuple[str, int]], output_file: str = "PDFハイライト出力.txt") -> None:
    """
    抽出したハイライトをテキストファイルに保存する
    
    Args:
        highlights (List[Tuple[str, int]]): (ハイライトテキスト, ページ番号) のリスト
        output_file (str): 出力ファイル名
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("PDFハイライト抽出結果\n")
            f.write("="*50 + "\n\n")
            
            if not highlights:
                f.write("ハイライトが見つかりませんでした。\n")
                return
            
            for i, (text, page_num) in enumerate(highlights, 1):
                f.write(f"【{i}】ページ {page_num}:\n")
                f.write(f"{text}\n")
                f.write("-" * 30 + "\n\n")
        
        print(f"\nハイライトテキストを '{output_file}' に保存しました。")
        
    except Exception as e:
        print(f"ファイル保存中にエラーが発生しました: {e}")


def get_pdf_file_path() -> str:
    """
    ユーザーからPDFファイルのパスを取得する
    
    Returns:
        str: PDFファイルのパス
    """
    while True:
        pdf_path = input("\nPDFファイルのパスを入力してください: ").strip()
        
        if not pdf_path:
            print("ファイルパスを入力してください。")
            continue
        
        if not os.path.exists(pdf_path):
            print(f"ファイルが見つかりません: {pdf_path}")
            continue
        
        if not pdf_path.lower().endswith('.pdf'):
            print("PDFファイルを指定してください。")
            continue
        
        return pdf_path


def main():
    """
    メイン関数
    """
    print("PDFハイライト抽出プログラム")
    print("="*30)
    
    # PDFファイルのパスを取得
    pdf_path = get_pdf_file_path()
    
    print(f"\nPDFファイルを処理中: {pdf_path}")
    
    # ハイライトを抽出
    highlights = extract_highlights_from_pdf(pdf_path)
    
    # 結果を表示
    display_highlights(highlights)
    
    # ファイルに保存
    save_highlights_to_file(highlights)
    
    print(f"\n処理完了: {len(highlights)}個のハイライトを抽出しました。")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nプログラムが中断されました。")
    except Exception as e:
        print(f"\n予期しないエラーが発生しました: {e}")
        sys.exit(1)