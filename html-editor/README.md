# HTML エディター & プレビュー

Material-UIを活用したHTMLエディター・プレビューシステムです。タブ切り替えによってHTMLの編集とリアルタイムプレビューを行うことができます。

## 🎯 機能

### ✨ 主要機能
- **タブ切り替えインターフェース**: Material-UI Tabsコンポーネントを使用
- **HTMLエディター**: 行番号表示付きのコードエディター
- **リアルタイムプレビュー**: 入力したHTMLの即座プレビュー
- **レスポンシブデザイン**: PC・タブレット・スマートフォン対応

### 🛠 技術仕様
- **Material-UI**: タブ、ボタン、テキストフィールドなどのUIコンポーネント
- **React**: コンポーネントベースのUI構築
- **HTML5 + CSS3**: モダンなWeb標準技術
- **CDN方式**: 軽量で導入しやすい構成

## 📁 ファイル構成

```
html-editor/
├── html-editor.html        # メインのHTMLエディター・プレビューシステム
├── sample-templates.html   # HTMLテンプレート集
└── README.md              # このドキュメント
```

## 🚀 使い方

### 基本的な使用方法

1. **ファイルを開く**
   ```bash
   # ブラウザでhtml-editor.htmlを開く
   open html-editor/html-editor.html
   ```

2. **エディターでHTMLを編集**
   - 「HTMLエディター」タブを選択
   - 左側の行番号を参考にHTMLコードを入力・編集
   - リアルタイムで行番号が更新される

3. **プレビューで確認**
   - 「プレビュー」タブを選択
   - 編集したHTMLが即座にプレビューされる
   - インタラクティブな要素（ボタンなど）も動作する

### サンプルテンプレートの活用

1. `sample-templates.html`を開いて参考にする
2. 気に入ったテンプレートをコピー
3. HTMLエディターに貼り付けてカスタマイズ

## 🎨 インターフェース詳細

### Material-UI コンポーネント使用箇所

#### タブナビゲーション
```javascript
<Tabs value={tabValue} onChange={handleTabChange}>
    <Tab label="HTMLエディター" icon={<CodeIcon />} />
    <Tab label="プレビュー" icon={<PreviewIcon />} />
</Tabs>
```

#### エディター部分
- **行番号表示**: 自動的に行数をカウントして表示
- **シンタックスハイライト**: HTMLタグが視覚的に区別される
- **リサイズ対応**: ウィンドウサイズに応じて自動調整

#### プレビュー部分
- **iframe表示**: セキュアなHTMLプレビュー環境
- **サンドボックス機能**: 安全なスクリプト実行

## 📱 レスポンシブ対応

- **PC**: 横幅1200px以上でフル機能表示
- **タブレット**: 768px〜1199pxで最適化されたレイアウト
- **スマートフォン**: 767px以下でモバイル最適化

## 🎯 カスタマイズ方法

### テーマ変更
```javascript
const theme = createTheme({
    palette: {
        primary: {
            main: '#3f51b5', // メインカラーを指定
        },
        secondary: {
            main: '#f50057', // アクセントカラーを指定
        },
    },
});
```

### エディター機能拡張
```javascript
// 新しいタブを追加する場合
<Tab label="設定" icon={<SettingsIcon />} />
<TabPanel value={tabValue} index={2}>
    {/* 設定画面の内容 */}
</TabPanel>
```

## 🔧 技術的な特徴

### 使用技術スタック
- **React 18**: 最新のReactフック（useState, useEffect）を活用
- **Material-UI 5**: モダンなマテリアルデザインコンポーネント
- **Babel Standalone**: ブラウザ内でのJSX変換
- **CSS Grid/Flexbox**: レスポンシブレイアウト

### パフォーマンス最適化
- **CDN配信**: 高速なライブラリ読み込み
- **遅延読み込み**: 必要な時にのみコンポーネントを初期化
- **軽量実装**: 最小限のJavaScriptで最大限の機能

## 📊 ブラウザ対応

| ブラウザ | バージョン | サポート状況 |
|----------|------------|--------------|
| Chrome   | 80+        | ✅ 完全対応  |
| Firefox  | 75+        | ✅ 完全対応  |
| Safari   | 13+        | ✅ 完全対応  |
| Edge     | 80+        | ✅ 完全対応  |

## 🚀 応用例

### 教育現場での活用
- HTML/CSS学習のための実習環境
- 学生の作品制作・確認ツール
- プログラミング授業のデモンストレーション

### 開発現場での活用
- 簡単なHTMLプロトタイプ作成
- クライアントへのデザイン提案
- コードレビュー・共有ツール

### 個人利用
- Webデザインの練習
- HTMLテンプレートの作成・管理
- 学習記録の作成

## 🔗 参考リンク

- [Material-UI公式ドキュメント](https://mui.com/material-ui/)
- [React公式ドキュメント](https://react.dev/)
- [HTML MDN リファレンス](https://developer.mozilla.org/ja/docs/Web/HTML)
- [CSS MDN リファレンス](https://developer.mozilla.org/ja/docs/Web/CSS)

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。自由に使用・改変・配布が可能です。

## 🤝 コントリビューション

機能追加や改善提案がございましたら、以下の方法でお知らせください：

1. **Issue作成**: バグ報告や機能要望
2. **Pull Request**: コードの改善提案
3. **Discussion**: 使用方法の質問や提案

---

**作成日**: 2025年6月13日  
**更新**: Claude Code Actions によって自動生成  
**管理者**: [@mauekusa](https://github.com/mauekusa)