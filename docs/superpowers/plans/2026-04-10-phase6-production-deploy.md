# Phase 6: 実用化・デプロイ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** MycoNote を Vercel にデプロイし、友人にURLを共有してPWAとして使える状態にする

**Architecture:** GitHub リポジトリ → Vercel 連携による自動デプロイ。Next.js の `output: "export"` による静的サイト生成。Service Worker により PWA としてオフラインで動作。

**Tech Stack:** Next.js 16, GitHub, Vercel, PWA (next-pwa)

---

## 前提条件

- GitHub CLI 認証済み (ennead2)
- Vercel アカウント未確認（必要に応じてユーザーに依頼）
- 静的エクスポート構成済み (`output: "export"`)
- PWA manifest / Service Worker 設定済み

---

## ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 変更 | `.gitignore` | screenshots/ を除外追加 |
| 変更 | `package.json` | version を 1.0.0 に更新 |
| 変更 | `src/app/settings/page.tsx` | バージョン表記を 1.0.0 に |
| 変更 | `docs/progress.md` | Phase 6 追記 |

---

### Task 1: リリース準備

- [ ] **Step 1: バージョンを 1.0.0 に更新**
  - `package.json` の version を `"1.0.0"` に
  - 設定画面のバージョン表記が package.json を参照しているか確認し、必要なら更新

- [ ] **Step 2: .gitignore にスクリーンショット除外を追加**
  - `screenshots/` を .gitignore に追加

- [ ] **Step 3: 不要ファイルの確認**
  - `.playwright-mcp/` がコミットされていないことを確認
  - `docs/user-only-manageable/` は読み取り専用だがリポジトリには含める

### Task 2: GitHub リポジトリ作成・プッシュ

- [ ] **Step 1: リポジトリを作成**
  - `gh repo create MycoNote --public --source=. --push`
  - public リポジトリ（友人と共有するため）

- [ ] **Step 2: プッシュ確認**
  - main ブランチがリモートに反映されていることを確認
  - feature/phase1-mvp ブランチもプッシュ（履歴保持）

### Task 3: Vercel 連携・デプロイ

- [ ] **Step 1: Vercel プロジェクト設定**
  - ユーザーに Vercel アカウントでの GitHub 連携を依頼
  - Framework Preset: Next.js
  - Build Command: `next build`（デフォルト）
  - Output Directory: Vercel が自動検出
  - Node.js Version: 20.x

- [ ] **Step 2: 初回デプロイ確認**
  - Vercel ダッシュボードでビルドログ確認
  - デプロイされた URL にアクセスして動作確認

- [ ] **Step 3: PWA 動作確認**
  - HTTPS 環境で Service Worker が登録されるか
  - manifest.json が正しく読み込まれるか
  - 「ホーム画面に追加」が表示されるか

### Task 4: 進捗更新

- [ ] **Step 1: progress.md に Phase 6 を追記**
- [ ] **Step 2: メモリファイルにデプロイ URL を記録**

---

## デプロイ後の確認チェックリスト

- [ ] 図鑑一覧ページが100種表示される
- [ ] 図鑑詳細ページが全種で表示される
- [ ] 検索・フィルターが動作する
- [ ] シーズンカレンダーが表示される
- [ ] 簡易識別が動作する
- [ ] 記録の新規作成が動作する（IndexedDB）
- [ ] 設定画面が表示される
- [ ] PWA としてインストールできる
- [ ] オフラインで基本機能が動作する
