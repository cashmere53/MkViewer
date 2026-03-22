# AGENTS.md — MkViewer

AI エージェント・コーディングアシスタント向けのガイドライン。
このリポジトリでコードを変更する前に必ず読むこと。

---

## プロジェクト概要

**MkViewer** は Tauri v2 + React 18 + TypeScript で構築したローカル専用の Markdown ビューアデスクトップアプリです。
ファイルを開くとリアルタイムで変更を検知し、レンダリング結果を即時更新します。

---

## リポジトリ構成

```
/
├── src/                    # フロントエンド (React / TypeScript)
│   ├── App.tsx             # ルートコンポーネント
│   ├── main.tsx            # エントリポイント
│   ├── components/         # UI コンポーネント
│   │   ├── MarkdownRenderer.tsx
│   │   ├── MermaidBlock.tsx
│   │   ├── StatusBar.tsx
│   │   └── ThemeToggle.tsx
│   ├── hooks/
│   │   ├── useFileWatcher.ts   # Tauri イベントリスナー
│   │   └── useTheme.ts         # テーマ状態管理
│   ├── lib/
│   │   └── markdownPipeline.tsx  # remark/rehype プラグイン設定
│   └── styles/
│       ├── app.css
│       ├── markdown.css
│       └── themes/{dark,light}.css
├── src-tauri/              # Rust バックエンド (Tauri v2)
│   ├── src/
│   │   ├── main.rs         # Tauri ビルダー、AppState 初期化
│   │   ├── commands.rs     # Tauri コマンド定義
│   │   ├── watcher.rs      # notify ファイル監視、イベント送信
│   │   └── cli.rs          # CLI 引数パース
│   ├── Cargo.toml
│   └── tauri.conf.json
├── justfile                # タスクランナー (just)
├── package.json
└── README.md
```

---

## 開発環境・コマンド

> pnpm はこのマシンでは `corepack pnpm` 経由で実行する必要がある (`pnpm` 直接呼び出しは volta 依存で失敗する場合がある)。
> just レシピはすべて内部で `corepack pnpm` を使用しているので、基本的に `just <recipe>` を使えばよい。

| コマンド | 説明 |
|---|---|
| `just install` | Node 依存パッケージのインストール |
| `just dev` | Tauri dev モード起動（推奨） |
| `just fe-dev` | Vite devサーバーのみ起動 |
| `just build` | リリースビルド／インストーラー生成 |
| `just fe-build` | フロントエンドのみビルド |
| `just rust-build` | Rust バックエンドのみ debug ビルド |
| `just check` | TypeScript 型チェック |

---

## Tauri コマンド (Rust ↔ JS)

| コマンド名 | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `open_and_watch` | `path: String` | `FilePayload` | パス指定でファイルを開き監視開始 |
| `open_file_dialog_and_watch` | なし | `FilePayload` | ネイティブファイルダイアログで選択し監視開始 |
| `read_file` | `path: String` | `FilePayload` | ファイル読み込みのみ（監視なし） |

### FilePayload 型

```typescript
type FilePayload = {
  path: string;
  content: string;
  updated_at: number; // Unix タイムスタンプ (ms)
};
```

---

## Tauri イベント (Rust → JS)

| イベント名 | ペイロード型 | 発火タイミング |
|---|---|---|
| `file-changed` | `FilePayload` | 監視中ファイルの変更検知時 (300 ms デバウンス後) |
| `file-missing` | `FileMissingPayload` | 監視中ファイルが削除/移動された時 |
| `cli-open-file` | `{ path: string }` | CLI 引数からファイルパスを受け取った時 |

### FileMissingPayload 型

```typescript
type FileMissingPayload = {
  path: string;
  message: string;
  updated_at: number;
};
```

---

## ファイル制約（watcher.rs で検証）

- 対応拡張子: `.md`, `.markdown`, `.txt`
- 最大ファイルサイズ: 10 MB
- エンコーディング: UTF-8 (UTF-8 BOM は自動除去)

---

## フロントエンド設計方針

- `App.tsx` がすべてのファイル操作・イベント購読の起点
- `useFileWatcher` は `file-changed` / `file-missing` イベントをリッスンし、コールバック経由で状態を更新する
- `MarkdownRenderer` は pure コンポーネント（`content: string` を受け取るだけ）
- `MermaidBlock` は `mermaid.render()` を非同期で呼び出し、SVG を直接 DOM に注入する（`dangerouslySetInnerHTML` 使用、ただし Mermaid の `securityLevel: "strict"` で保護済み）
- テーマは `data-theme` 属性を `.app-shell` に付与する方式で CSS 変数を切り替える

---

## Rust バックエンド設計方針

- `AppState` が `Mutex<Option<WatchHandle>>` でウォッチャーの排他制御を行う
- ファイルを新たに開くたびに既存のウォッチャーを停止してから新しいものを開始する
- notify の `RecommendedWatcher` を使用し、専用スレッドでイベントを受信して Tauri の `AppHandle::emit` で JS 側に送信する
- デバウンスは watch スレッド内で 300 ms スリープで実現

---

## コード変更時の注意事項

1. **Rust コマンドを追加した場合**は `src-tauri/src/main.rs` の `invoke_handler` に登録すること。
2. **新しい Tauri イベントを追加した場合**は `src-tauri/capabilities/default.json` のパーミッション設定も確認すること。
3. **npm パッケージを追加する場合**は `corepack pnpm add <pkg>` を使用すること。
4. **Rust クレートを追加する場合**は `src-tauri/Cargo.toml` を編集すること。
5. `pnpm` を直接呼び出さず、`corepack pnpm` または `just` レシピを使うこと。
6. ビルド時は `src-tauri/icons/icon.ico` が必要なため、アイコンを削除しないこと。

---

## よくあるトラブル

| 症状 | 原因 | 対処 |
|---|---|---|
| `pnpm: command not found` または volta 関連エラー | volta が未セットアップ | `corepack pnpm <cmd>` を使う |
| `icons/icon.ico not found` ビルドエラー | アイコンファイル欠如 | `src-tauri/icons/icon.ico` を復元する |
| `app.emit` でコンパイルエラー | ペイロード型が `Serialize + Clone` を実装していない | 対象の struct に `#[derive(Clone, Serialize)]` を付与する |
