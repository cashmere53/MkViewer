# MkViewer

**Tauri v2 + React 18 + TypeScript** で構築したローカル専用の Markdown ビューアデスクトップアプリです。

## 機能

- ダイアログ・CLI 引数・ドラッグ＆ドロップでファイルを開く
- ライブリロード — Rust 側 notify ウォッチャーによる 300 ms デバウンス
- フル Markdown パイプライン: GFM テーブル/取り消し線、KaTeX 数式、highlight.js シンタックスハイライト、Mermaid ダイアグラムレンダリング
- ライト / ダークテーマ切り替え（localStorage に永続化）
- ステータスバーによる現在ファイルパスとウォッチャー状態 (watching / missing / idle) の表示
- ファイルサイズ制限: 10 MB 超、非 UTF-8 ファイルは拒否
- 対応拡張子: `.md`, `.markdown`, `.txt`

## 技術スタック

| レイヤー | ライブラリ / ツール |
|---|---|
| デスクトップシェル | Tauri v2 |
| フロントエンド | React 18, TypeScript 5, Vite 5 |
| Markdown | react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight |
| ダイアグラム | Mermaid |
| Rust クレート | notify, rfd, serde, tauri |
| タスクランナー | just (justfile) |
| パッケージマネージャー | pnpm (corepack 経由) |

## プロジェクト構成

```
src/
  App.tsx                  # ルートコンポーネント — ファイル操作・ドラッグドロップ・イベント配線
  main.tsx                 # React エントリポイント
  components/
    MarkdownRenderer.tsx   # react-markdown による Markdown レンダリング
    MermaidBlock.tsx       # mermaid コードブロックを SVG としてレンダリング
    StatusBar.tsx          # 下部ステータスバー
    ThemeToggle.tsx        # ライト/ダーク切り替えボタン
  hooks/
    useFileWatcher.ts      # file-changed / file-missing Tauri イベントのリスナー
    useTheme.ts            # テーマ状態 + localStorage 永続化
  lib/
    markdownPipeline.tsx   # remark/rehype プラグインとコンポーネントオーバーライドの設定
  styles/
    app.css                # アプリシェルレイアウト
    markdown.css           # Markdown 本文のタイポグラフィ
    themes/
      dark.css
      light.css
src-tauri/src/
  main.rs                  # Tauri ビルダー、CLI 起動、AppState 初期化
  commands.rs              # Tauri コマンド: open_and_watch, open_file_dialog_and_watch, read_file
  watcher.rs               # notify ウォッチャー、FilePayload、FileMissingPayload、イベント送信
  cli.rs                   # CLI 引数パース（第 1 位置引数 → ファイルパス）
```

## セットアップ

### 前提条件

- [Node.js](https://nodejs.org/)（corepack 有効化済み）
- [Rust ツールチェーン](https://rustup.rs/)
- お使いの OS 向け [Tauri の前提条件](https://v2.tauri.app/start/prerequisites/)

### 依存パッケージのインストール

```bash
just install
# または: corepack pnpm install
```

### 開発モード起動（Tauri ウィンドウ）

```bash
just dev
# または: corepack pnpm tauri dev
```

### フロントエンドのみ（Vite dev サーバー）

```bash
just fe-dev
# または: corepack pnpm dev
```

### リリースビルド

```bash
just build
# または: corepack pnpm tauri build
```

### 型チェック

```bash
just check
# または: corepack pnpm check
```

## 使い方

| 方法 | 操作 |
|---|---|
| ダイアログ | ツールバーの **Open** ボタンをクリック |
| CLI | `mkviewer path/to/file.md` |
| ドラッグ＆ドロップ | `.md` / `.markdown` / `.txt` ファイルをウィンドウにドロップ |

ファイルを開くと変更を監視し、レンダリング結果を自動更新します。

## Tauri イベント

| イベント名 | 方向 | ペイロード |
|---|---|---|
| `file-changed` | Rust → JS | `{ path, content, updated_at }` |
| `file-missing` | Rust → JS | `{ path, message, updated_at }` |
| `cli-open-file` | Rust → JS | `{ path }` |

## Tauri コマンド

| コマンド | 説明 |
|---|---|
| `open_and_watch(path)` | パス指定でファイルを開き監視を開始する |
| `open_file_dialog_and_watch()` | ネイティブファイルピッカーで選択し監視を開始する |
| `read_file(path)` | ウォッチャーなしでファイル内容を読み込む |
