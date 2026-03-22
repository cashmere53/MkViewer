# Markdown専用ビューワー 設計構想書

**バージョン:** 1.0  
**作成日:** 2026-03-21  
**ステータス:** 確定

---

## 1. プロジェクト概要

Markdownファイルの閲覧に特化したクロスプラットフォーム対応デスクトップアプリケーション。エディター機能は持たず、ビューワーとしての完成度を最大化する。チーム内への配布を前提とし、軽量・高速・インストール容易であることを重視する。

---

## 2. 確定要件一覧

| カテゴリ | 要件 |
|---|---|
| プラットフォーム | Windows / macOS / Linux (クロスプラットフォーム) |
| アプリ種別 | デスクトップアプリ（ネイティブウィンドウ） |
| ファイルオープン | CLIパス指定 / ファイルダイアログ / ドラッグ＆ドロップ（3方式併用） |
| ライブローディング | ファイル保存検知による自動更新 |
| 対応構文 | CommonMark + GFM + Mermaid + LaTeX数式 |
| シンタックスHL | highlight.js 全言語対応（~190言語） |
| テーマ | ダーク / ライト 切替 |
| 配布形態 | チーム内配布（インストーラー形式） |
| エディター機能 | **搭載しない** |

---

## 3. 技術スタック

### 3.1 採用スタック

| レイヤー | 技術 | バージョン目安 | 採用理由 |
|---|---|---|---|
| デスクトップフレームワーク | **Tauri v2** | 2.x | 軽量バイナリ・配布容易・セキュア |
| バックエンド言語 | **Rust** | 1.75+ | Tauri標準・ファイル監視の安定性 |
| フロントエンド | **React + TypeScript** | React 18 / TS 5.x | コンポーネント設計・型安全性 |
| ビルドツール | **Vite** | 5.x | 高速HMR・Tauriとの相性 |
| Markdownパーサー | **unified + remark** | remark 15 | プラグインエコシステムの豊富さ |
| HTML変換 | **rehype** | rehype 13 | remarkと同エコシステム |
| GFM拡張 | **remark-gfm** | 4.x | テーブル・チェックボックス・取り消し線等 |
| 数式 | **remark-math + rehype-katex** | — | KaTeXはMathJaxより高速レンダリング |
| Mermaid | **mermaid.js** | 10.x | 公式ライブラリ・豊富な図形対応 |
| シンタックスHL | **rehype-highlight + highlight.js** | hljs 11.x | 全言語対応（~190言語） |
| ファイル監視 | **notify crate (Rust)** | 6.x | クロスプラットフォーム対応・保存イベント検知 |

### 3.2 フレームワーク比較（選定根拠）

| | Tauri v2 ✅ | Electron | Wails |
|---|---|---|---|
| バイナリサイズ | ~10MB | ~150MB+ | ~15MB |
| メモリ使用量 | 少 | 多 | 少 |
| チーム配布 | ◎ インストーラー軽量 | ○ | △ 知名度低 |
| ファイル監視 | notify crate | chokidar | fsnotify |
| ビルド複雑度 | Rust要 | 低い | Go要 |
| セキュリティ | ◎ CSP標準搭載 | 要設定 | △ |

Tauri v2 を採用。チームへの配布コストが最も低く、セキュリティモデルも堅牢。

---

## 4. アーキテクチャ

### 4.1 全体構成

```
┌────────────────────────────────────────────────────┐
│                   Tauri v2 App                      │
│                                                     │
│  ┌──────────────────┐     ┌───────────────────────┐ │
│  │   Rust Core      │     │   React Frontend      │ │
│  │                  │     │                       │ │
│  │  ┌─────────────┐ │ IPC │  ┌─────────────────┐  │ │
│  │  │ FileWatcher │─┼────▶│  │ MarkdownRenderer│  │ │
│  │  │  (notify)   │ │emit │  │  unified/remark │  │ │
│  │  └─────────────┘ │     │  │  rehype-katex   │  │ │
│  │                  │     │  │  mermaid.js     │  │ │
│  │  ┌─────────────┐ │     │  │  highlight.js   │  │ │
│  │  │ FileReader  │─┼────▶│  └─────────────────┘  │ │
│  │  │  (fs API)   │ │     │                       │ │
│  │  └─────────────┘ │     │  ┌─────────────────┐  │ │
│  │                  │     │  │   ThemeManager  │  │ │
│  │  ┌─────────────┐ │     │  │  Dark / Light   │  │ │
│  │  │  CLI Args   │─┼────▶│  └─────────────────┘  │ │
│  │  │  Handler    │ │     │                       │ │
│  │  └─────────────┘ │     └───────────────────────┘ │
│  └──────────────────┘                               │
└────────────────────────────────────────────────────┘
       ▲              ▲                ▲
  CLI引数         ダイアログ      ドラッグ＆ドロップ
```

### 4.2 レイヤー責務

| レイヤー | 責務 |
|---|---|
| Rust Core | ファイルI/O、ファイル監視、CLIパース、IPCイベント発行 |
| IPC (Tauri Commands / Events) | RustとReact間の型安全な通信 |
| React Frontend | レンダリング、UI状態管理、テーマ切替 |

---

## 5. 機能設計

### 5.1 ファイルオープンフロー

```
アプリ起動
    │
    ├─ CLI引数あり ──▶ パス検証 ──▶ ファイル読込 ──▶ レンダリング ──▶ FileWatcher登録
    │
    └─ CLI引数なし ──▶ ウィンドウ表示（空状態）
                            │
                ┌───────────┴───────────┐
          ダイアログ[開く]         D&Dでファイルドロップ
                │                       │
                └──────────┬────────────┘
                           ▼
                      パス検証
                           │
                      ファイル読込 ──▶ レンダリング ──▶ FileWatcher登録
```

**バリデーション:**
- 拡張子チェック: `.md` / `.markdown` / `.txt` のみ受付
- ファイルサイズ上限: 10MB（大ファイルによるフリーズ防止）
- 存在確認: ファイル不在時はエラートースト表示

### 5.2 ライブローディングフロー

```
外部エディターでファイル保存
    │
    ▼
notify crate: Write イベント検知（Rust）
    │
    ▼
デバウンス処理: 300ms待機
（連続保存・一時ファイル書き込みによるチラつき防止）
    │
    ▼
Tauri emit: "file-changed" イベント
    │
    ▼
React: ファイル内容を再読込
    │
    ▼
Markdownパース → レンダリング
    │
    ▼
スクロール位置を保持したまま表示更新
```

**注意事項:**
- ファイル削除・リネームを検知した場合は「ファイルが見つかりません」のオーバーレイ表示
- ファイル復元・再配置で自動的に監視を再開

### 5.3 Markdownレンダリングパイプライン

```
Raw Markdown テキスト
        │
        ▼
remark-parse          ← CommonMark AST生成
        │
remark-gfm            ← テーブル・チェックボックス・取り消し線・自動リンク
        │
remark-math           ← $...$ / $$...$$ を数式ノードとして認識
        │
remark → rehype 変換
        │
rehype-katex          ← KaTeXで数式をHTMLへレンダリング
        │
rehype-highlight      ← highlight.js 全言語シンタックスHL
        │
rehype-react          ← ReactコンポーネントツリーへMaterialize
        │
        ▼
DOM描画
        │
post-process: Mermaidコードブロック検出 → mermaid.render() でSVG置換
```

**Mermaidの処理方針:**
- ` ```mermaid ` ブロックを初期レンダリング後にpost-processで検出
- `mermaid.render()` でSVGを非同期生成し、コードブロックをSVGに置換
- レンダリングエラー時はエラーメッセージをコードブロック内に表示（アプリクラッシュなし）

---

## 6. UI設計

### 6.1 画面レイアウト

```
┌──────────────────────────────────────────────────────┐
│  filename.md                    [🌙 ダーク] [📂 開く] │  ← カスタムタイトルバー
├──────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │                                              │   │
│   │   Markdownレンダリングエリア                  │   │
│   │                                              │   │
│   │   - スクロール可能                            │   │
│   │   - Mermaid図をインライン描画                 │   │
│   │   - KaTeXで数式レンダリング                   │   │
│   │   - シンタックスHL（全言語）                  │   │
│   │   - GFMテーブル・チェックボックス             │   │
│   │                                              │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  /path/to/filename.md  |  最終更新: 14:32:05  | 🟢   │  ← ステータスバー
└──────────────────────────────────────────────────────┘
```

### 6.2 ステータスバー仕様

| 表示要素 | 内容 |
|---|---|
| ファイルパス | 現在開いているファイルのフルパス |
| 最終更新時刻 | FileWatcherが最後に更新を検知した時刻 |
| 監視ステータス | 🟢 監視中 / 🔴 ファイル消失 / ⚪ ファイル未選択 |

### 6.3 テーマ

| トークン | ライトモード | ダークモード |
|---|---|---|
| 背景 | `#ffffff` | `#1e1e1e` |
| テキスト | `#24292e` | `#e6edf3` |
| コードブロック背景 | `#f6f8fa` | `#2d2d2d` |
| リンク | `#0366d6` | `#58a6ff` |
| テーブルボーダー | `#dfe2e5` | `#30363d` |

GitHub風のスタイルをベースとし、チームになじみやすいデザインとする。

---

## 7. ディレクトリ構成（案）

```
markdown-viewer/
├── src-tauri/                  # Rustバックエンド
│   ├── src/
│   │   ├── main.rs             # エントリーポイント
│   │   ├── commands.rs         # Tauri Commandsの定義
│   │   ├── watcher.rs          # FileWatcher実装 (notify)
│   │   └── cli.rs              # CLI引数パース
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                        # Reactフロントエンド
│   ├── components/
│   │   ├── MarkdownRenderer.tsx  # メインレンダラー
│   │   ├── MermaidBlock.tsx      # Mermaidポスト処理
│   │   ├── ThemeToggle.tsx       # ダーク/ライト切替
│   │   ├── FileDropZone.tsx      # D&D処理
│   │   └── StatusBar.tsx         # ステータスバー
│   ├── hooks/
│   │   ├── useFileWatcher.ts     # IPCイベントリスナー
│   │   └── useTheme.ts           # テーマ状態管理
│   ├── lib/
│   │   └── markdownPipeline.ts   # unifiedパイプライン定義
│   ├── styles/
│   │   ├── themes/
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── markdown.css          # Markdownレンダリングスタイル
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
└── vite.config.ts
```

---

## 8. 配布・CI/CD戦略

### 8.1 ビルド成果物

| OS | 成果物 | 備考 |
|---|---|---|
| Windows | `.msi` インストーラー | Windows Installer形式 |
| macOS | `.dmg` | Intel / Apple Silicon ユニバーサルバイナリ |
| Linux | `.AppImage` / `.deb` | AppImageは依存なし単体実行可 |

### 8.2 GitHub Actions を用いた自動ビルド

タグプッシュ（例: `v1.0.0`）をトリガーに `tauri-action` でマトリックスビルドを実行し、GitHub Releases にアップロード。チームメンバーはリリースページから対応OSのインストーラーをダウンロードする。

```
git tag v1.0.0 && git push origin v1.0.0
    │
    ▼
GitHub Actions 起動
    │
    ├─ Windows runner ──▶ .msi
    ├─ macOS runner   ──▶ .dmg (universal)
    └─ Ubuntu runner  ──▶ .AppImage / .deb
                │
                ▼
          GitHub Releases に自動アップロード
```

---

## 9. 非機能要件

| 項目 | 目標値 |
|---|---|
| 起動時間 | 2秒以内 |
| ファイル更新→画面反映 | 500ms以内（300msデバウンス + レンダリング） |
| 対応ファイルサイズ | 最大10MB |
| バイナリサイズ | 15MB以内 |
| メモリ使用量（通常利用） | 100MB以下 |

---

## 10. 今後の拡張候補（スコープ外）

以下は今回のスコープには含まないが、要望に応じて追加検討可能な項目。

- アウトライン（目次）パネルの表示
- 複数ファイルのタブ管理
- 印刷・PDF出力
- 画像の相対パス解決（Markdownファイル基準）
- フロントマター（YAML/TOML）のメタデータ表示
- 検索・ハイライト機能

---

## 11. 未解決事項・リスク

| 項目 | リスク | 対策案 |
|---|---|---|
| Mermaidのレンダリング遅延 | 大規模図形で数秒かかる可能性 | ローディングスピナー表示 + 非同期処理 |
| KaTeXの未対応数式 | 一部の高度なLaTeXコマンドは非対応 | エラー箇所をフォールバック表示し、アプリは継続動作 |
| macOS Gatekeeper | 署名なしバイナリはブロックされる | チーム配布時は `xattr -cr` 手順をREADMEに記載、または有償署名証明書取得を検討 |
| highlight.jsのバンドルサイズ | 全言語で約1MB増加 | 初回ロード時に非同期読込、必要に応じてcode-splitを検討 |

---

## 12. 設定機能仕様（v1.1追加）

### 12.1 設定パネル

ツールバーの歯車アイコンボタン、またはショートカットキー `Ctrl+,` で開閉できるサイドパネル。

```
┌──────────────────────┐
│  Settings          ✕ │
├──────────────────────┤
│  [Font]              │
│    Body font: ...    │
│    Mono font: ...    │
│    Font size: 16px   │
├──────────────────────┤
│  [Appearance (CSS)]  │
│    Select CSS file…  │
├──────────────────────┤
│  [File Watcher]      │
│    Debounce: 300 ms  │
├──────────────────────┤
│  [Zoom]              │
│    ──●────── 100%    │
│  (Ctrl+Scroll でも可) │
├──────────────────────┤
│  [Reset all]         │
└──────────────────────┘
```

### 12.2 設定項目一覧

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `fontFamily` | string | `"Segoe UI", "Noto Sans JP", sans-serif` | 本文フォント |
| `monoFontFamily` | string | `"Cascadia Code", Consolas, monospace` | コード・等幅フォント |
| `fontSize` | number (px) | `16` | 基本フォントサイズ |
| `customCssPath` | string | `""` | 外部CSSファイルのパス |
| `customCssContent` | string | `""` | 読み込んだCSSの内容（localStorage保存） |
| `debounceMs` | number (ms) | `300` | ファイル変更検知デバウンス時間 |
| `zoom` | number | `1.0` | 表示倍率（0.5〜3.0） |

設定は `localStorage` に `mkviewer:settings` キーでJSON保存し、アプリ再起動後も保持する。

### 12.3 外部CSS読み込み

- ツールバーのボタンからネイティブダイアログで `.css` ファイルを選択
- Rust コマンド `open_css_dialog_and_read` がファイルを読み込み `{ path, content }` を返す
- コンテンツは `<style id="custom-css-override">` としてデフォルトスタイル後に注入（上書き可能）
- パスと内容を localStorage に保存し、次回起動時も自動適用

### 12.4 コードブロック内カラーコードスウォッチ

コードブロック（` ``` `）・インラインコード（`` ` ``）両方の `<code>` 要素内で、以下パターンのカラーコードの直前に小さな色付きブロックを表示する。

| 形式 | 例 |
|---|---|
| HEX | `#fff`, `#ffffff`, `#ffffffff` |
| RGB / RGBA | `rgb(255,255,255)`, `rgba(255,255,255,0.5)` |
| HSL / HSLA | `hsl(0,100%,50%)`, `hsla(0,100%,50%,0.5)` |

実装: `rehypeColorSwatch` rehype プラグイン。`<code>` ノードのテキスト子孫を再帰走査し、マッチ箇所の直前に `<span class="color-swatch" style="--swatch-color:COLOR">` を挿入する。シンタックスHL後に適用されるため `<span>` 内のテキストにも対応。

### 12.5 アラート記法 / コールアウト

`remarkCallout` remark プラグインで、GitHub Alerts と Obsidian Callouts を統合して処理する。

**GitHub Alerts（大文字、コンテンツ同一段落）:**
```markdown
> [!NOTE]
> ノートの内容
> [!WARNING]
> 警告の内容
```

**Obsidian Callouts（小文字、カスタムタイトル対応）:**
```markdown
> [!note] カスタムタイトル
> 内容
> [!tip]+
> 折りたたみ（表示用途のみ）
```

対応タイプ:

| カテゴリ | タイプ |
|---|---|
| GitHub Alerts | `note`, `tip`, `important`, `warning`, `caution` |
| 情報系 | `abstract`, `summary`, `tldr`, `info`, `todo` |
| 成功系 | `success`, `check`, `done`, `hint` |
| 質問系 | `question`, `help`, `faq` |
| 警告系 | `attention` |
| エラー系 | `failure`, `fail`, `missing`, `danger`, `error`, `bug` |
| その他 | `example`, `quote`, `cite` |

処理フロー:
1. remark プラグインで blockquote の先頭 `[!TYPE]` を検出
2. `hProperties` に `data-callout` / `data-callout-title` を付与
3. rehype 変換後、react-markdown の `blockquote` カスタムコンポーネントで `<div class="callout callout-TYPE">` にレンダリング

### 12.6 デバウンス時間の設定

- 設定パネルから変更可能（0ms〜5000ms、50msステップ）
- 変更時、JS から Tauri コマンド `set_debounce(ms)` を呼び出す
- Rust 側で現在のウォッチャーを停止し、新しいデバウンス値で再起動
- `AppState` に `debounce_ms: Mutex<u64>` を追加し、次回ファイルオープン時も引き継ぐ

### 12.7 表示の拡大縮小

- CSSの `zoom` プロパティをコンテンツルート要素に適用（layout に影響するため scroll も追随）
- Ctrl+Scroll で 0.05 刻みで変更（最小 0.5、最大 3.0）
- 設定パネルのスライダーからも変更・リセット可能
- 倍率は設定として localStorage に保存

### 12.8 `MkViewerについて` パネル

- ヘッダー部に `MkViewerについて` ボタンを配置し、クリックで右側サイドパネルを開閉する
- 表示形式は設定パネルと同じオーバーレイ型サイドパネル（右固定・背景クリックで閉じる）とする
- パネル内には以下を表示する

| 表示項目 | 内容 |
|---|---|
| アプリ名 | `MkViewer` |
| バージョン | `package.json` の `version` |
| ライセンス種別 | `package.json` の `license` |
| ライセンス本文 | `LICENSE` の全文（読み取り専用表示） |

- 設定パネルと同時表示しない（どちらか一方のみ開く）
