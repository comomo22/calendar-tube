# 🚀 Calendar Tube クイックセットアップガイド

こももさん向けの簡単セットアップ手順です。

## ✅ すでに完了していること

- ✅ 依存関係のインストール (npm packages)
- ✅ .envファイルの作成（秘密鍵は自動生成済み）
- ✅ データベーススキーマの準備

## 📝 こももさんがやること（2つだけ！）

### 1️⃣ Google Cloud Console の設定（5分）

1. **Google Cloud Console を開く**
   - https://console.cloud.google.com/ にアクセス
   - Googleアカウントでログイン

2. **新しいプロジェクトを作成**
   - 左上のプロジェクト選択 → 「新しいプロジェクト」
   - プロジェクト名: `calendar-tube` (任意)
   - 「作成」をクリック

3. **Google Calendar API を有効化**
   - 左メニュー「APIとサービス」→「ライブラリ」
   - 検索で「Google Calendar API」を探す
   - 「有効にする」をクリック

4. **OAuth 2.0 認証情報を作成**
   - 左メニュー「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「OAuth クライアント ID」
   - 同意画面の構成が必要な場合:
     - User Type: 外部
     - アプリ名: `calendar-tube`
     - サポートメール: あなたのメール
     - スコープ: デフォルトのまま
     - 「保存して次へ」

   - **OAuth クライアント ID の作成**:
     - アプリケーションの種類: **ウェブアプリケーション**
     - 名前: `calendar-tube-web`
     - 承認済みのリダイレクトURI:
       ```
       http://localhost:3000/api/auth/callback/google
       ```
     - 「作成」をクリック

   - **📋 出てくる値を .env にコピー**:
     - `クライアントID` → .env の `GOOGLE_CLIENT_ID`
     - `クライアントシークレット` → .env の `GOOGLE_CLIENT_SECRET`

---

### 2️⃣ Supabase プロジェクトの設定（5分）

1. **Supabase を開く**
   - https://supabase.com/ にアクセス
   - 「Start your project」→ GitHub でログイン

2. **新しいプロジェクトを作成**
   - 「New Project」をクリック
   - Project name: `calendar-tube`
   - Database Password: 強力なパスワード（保存しておく）
   - Region: Northeast Asia (Tokyo)
   - 「Create new project」（1〜2分待つ）

3. **SQL を実行してテーブルを作成**
   - 左メニュー「SQL Editor」をクリック
   - 「New query」をクリック
   - `supabase/migrations/001_initial_schema.sql` の内容を全てコピー＆ペースト
   - 「Run」をクリック（緑色のチェックマークが出ればOK）

4. **📋 API キーを .env にコピー**
   - 左メニュー「Settings」→「API」
   - 以下の値を .env にコピー:
     - `Project URL` → .env の `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` (公開キー) → .env の `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` (サービスキー) → .env の `SUPABASE_SERVICE_ROLE_KEY`
       ※ service_role は「Reveal」をクリックすると表示されます

---

## 🎉 セットアップ完了後

### .env ファイルの最終確認

全ての項目が埋まっているか確認してください:

```bash
cat .env
```

以下のような状態になっていればOK:
- ✅ `NEXTAUTH_SECRET`: 長いランダム文字列（自動生成済み）
- ✅ `GOOGLE_CLIENT_ID`: `xxxxx.apps.googleusercontent.com` 形式
- ✅ `GOOGLE_CLIENT_SECRET`: `GOCSPX-xxxxx` 形式
- ✅ `NEXT_PUBLIC_SUPABASE_URL`: `https://xxxxx.supabase.co` 形式
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJxxx...` 形式（長い文字列）
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: `eyJxxx...` 形式（長い文字列）
- ✅ `WEBHOOK_SECRET`: 長いランダム文字列（自動生成済み）

### 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてアプリを確認！

---

## 🆘 困ったら

私（AI）に「エラーが出た」「ここがわからない」とメッセージしてください。
一緒に解決します！
