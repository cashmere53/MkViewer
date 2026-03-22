# MkViewer justfile
# PowerShell (pwsh) で実行

set windows-shell := ["pwsh", "-NoLogo", "-Command"]

# デフォルト: レシピ一覧を表示
default:
    @just --list

# ──────────────────────────────────────────
# 依存関係
# ──────────────────────────────────────────

# Node.js 依存パッケージをインストール
install:
    corepack pnpm install

# ──────────────────────────────────────────
# 開発
# ──────────────────────────────────────────

# Tauri dev モードで起動 (フロントエンド + Rust バックエンド)
dev:
    corepack pnpm tauri dev

# フロントエンド (Vite) のみ dev サーバーを起動
fe-dev:
    corepack pnpm dev

# ──────────────────────────────────────────
# ビルド
# ──────────────────────────────────────────

# アプリをリリースビルド (インストーラー生成)
build:
    corepack pnpm tauri build

# フロントエンドのみビルド (dist/ に出力)
fe-build:
    corepack pnpm build

# Vite プレビューサーバーを起動 (fe-build 後に使用)
preview:
    corepack pnpm preview

# Rust バックエンドのみ debug ビルド
rust-build:
    cargo build --manifest-path src-tauri/Cargo.toml

# Rust バックエンドのみ release ビルド
rust-build-release:
    cargo build --release --manifest-path src-tauri/Cargo.toml

# ──────────────────────────────────────────
# 型チェック・静的解析
# ──────────────────────────────────────────

# TypeScript 型チェック
check:
    corepack pnpm check

# Rust: cargo check
rust-check:
    cargo check --manifest-path src-tauri/Cargo.toml

# Rust: cargo clippy (警告をエラーとして扱う)
clippy:
    cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# フロントエンド + Rust の全チェックを実行
check-all: check rust-check clippy

# ──────────────────────────────────────────
# フォーマット
# ──────────────────────────────────────────

# Rust コードをフォーマット
fmt:
    cargo fmt --manifest-path src-tauri/Cargo.toml

# Rust フォーマットのチェックのみ (変更なし)
fmt-check:
    cargo fmt --manifest-path src-tauri/Cargo.toml -- --check

# ──────────────────────────────────────────
# テスト
# ──────────────────────────────────────────

# Rust テストを実行
test:
    cargo test --manifest-path src-tauri/Cargo.toml

# ──────────────────────────────────────────
# クリーンアップ
# ──────────────────────────────────────────

# ビルド成果物を削除 (node_modules は保持)
clean:
    cargo clean --manifest-path src-tauri/Cargo.toml
    if (Test-Path dist) { Remove-Item -Recurse -Force dist }
    if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }

# 完全クリーンアップ (node_modules も削除)
clean-all:
    cargo clean --manifest-path src-tauri/Cargo.toml
    if (Test-Path dist) { Remove-Item -Recurse -Force dist }
    if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
