# Calendar Tube セットアップガイド

このガイドに従って、Calendar Tubeを動作させるための完全なセットアップを行います。

## 所要時間

約20-30分

## 前提条件

- Googleアカウント（同期したいアカウント全て）
- ブラウザ
- ターミナル

---

## ステップ1: NEXTAUTH_SECRETの生成

まずは認証用のシークレットキーを生成します。

```bash
openssl rand -base64 32
```

このコマンドを実行すると、ランダムな文字列が表示されます。これを後でコピーします。

---

## ステップ2: Google Cloud Platformの設定

### 2-1. プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 右上のプロジェクトドロップダウンから「新しいプロジェクト」をクリック
3. プロジェクト名: `calendar-tube`（任意）
4. 「作成」をクリック
5. 作成したプロジェクトを選択

### 2-2. Google Calendar APIの有効化

1. 左メニューから「APIとサービス」→「ライブラリ」
2. 検索ボックスに「Google Calendar API」と入力
3. 「Google Calendar API」をクリック
4. 「有効にする」をクリック

### 2-3. OAuth同意画面の設定

1. 左メニューから「APIとサービス」→「OAuth同意画面」
2. ユーザータイプ: **外部** を選択
3. 「作成」をクリック
4. アプリ情報を入力:
   - アプリ名: `Calendar Tube`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
5. 「保存して次へ」をクリック
6. スコープは設定せず「保存して次へ」
7. テストユーザーに **同期したい全てのGoogleアカウントのメールアドレス** を追加
   - 「ADD USERS」をクリック
   - メールアドレスを1行ずつ入力
   - 「追加」をクリック
8. 「保存して次へ」をクリック

### 2-4. OAuth 2.0 クライアントIDの作成

1. 左メニューから「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「OAuth 2.0 クライアントID」をクリック
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `Calendar Tube Client`
5. 承認済みのリダイレクトURIに以下を追加:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. 「作成」をクリック
7. **クライアントID** と **クライアントシークレット** が表示されるので、**メモしておく**

---

## ステップ3: Supabaseプロジェクトの作成

### 3-1. プロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセスして、Googleアカウントでログイン
2. 「New project」をクリック
3. 以下を入力:
   - Name: `calendar-tube`
   - Database Password: 強力なパスワード（メモしておく）
   - Region: `Northeast Asia (Tokyo)` を推奨
4. 「Create new project」をクリック
5. プロジェクトの作成を待つ（1-2分）

### 3-2. データベースのセットアップ

1. 左メニューから「SQL Editor」をクリック
2. 「New query」をクリック
3. `supabase/migrations/001_initial_schema.sql` の内容を全てコピー
4. エディタに貼り付けて「Run」をクリック
5. 成功メッセージが表示されればOK

### 3-3. APIキーの取得

1. 左メニューから「Settings」→「API」をクリック
2. 以下3つをメモ:
   - **Project URL** (例: https://xxxxx.supabase.co)
   - **anon public** キー
   - **service_role** キー（「Reveal」をクリックで表示）

---

## ステップ4: 環境変数の設定

1. `.env.example` を `.env` にコピー:
   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを開いて、以下のように設定:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<ステップ1で生成したシークレット>

# Google OAuth
GOOGLE_CLIENT_ID=<ステップ2-4で取得したクライアントID>
GOOGLE_CLIENT_SECRET=<ステップ2-4で取得したクライアントシークレット>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<ステップ3-3で取得したProject URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ステップ3-3で取得したanon public キー>
SUPABASE_SERVICE_ROLE_KEY=<ステップ3-3で取得したservice_role キー>

# Webhook (今は空欄でOK)
WEBHOOK_SECRET=
```

3. 環境変数が正しく設定されているか確認:
   ```bash
   node scripts/check-env.js
   ```

---

## ステップ5: アプリケーションの起動

1. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

2. ブラウザで http://localhost:3000 にアクセス

3. 「Googleでログイン」をクリック

4. **最初のGoogleアカウント**（例: 仕事用A）でログイン
   - カレンダーへのアクセスを許可

5. ダッシュボードに移動したら「カレンダーを同期対象に追加」をクリック

6. 「別のGoogleアカウントを追加」をクリック

7. **2番目のGoogleアカウント**（例: 仕事用B）でログイン
   - アカウント選択画面で「別のアカウントを使用」を選択
   - カレンダーへのアクセスを許可

8. 同様に「カレンダーを同期対象に追加」をクリック

9. **3番目のGoogleアカウント**（例: 私用C）も同様に追加

---

## ステップ6: 動作確認

1. いずれかのGoogleカレンダー（Web版）で新しい予定を作成

2. Calendar Tubeのダッシュボードで「今すぐ同期」をクリック

3. 他のGoogleカレンダーを確認して、予定が同期されているか確認

4. ✅ 成功！全てのカレンダーに予定が表示されていればOK

---

## トラブルシューティング

### 「Redirect URI mismatch」エラー

- Google Cloud Consoleの「認証情報」で、リダイレクトURIが正しく設定されているか確認
- `http://localhost:3000/api/auth/callback/google` が登録されているか確認

### 「Access blocked: This app's request is invalid」

- OAuth同意画面の「テストユーザー」に、ログインしようとしているGoogleアカウントが追加されているか確認

### データベースエラー

- Supabaseで SQLマイグレーションが正しく実行されたか確認
- SupabaseのTable Editorで `users`, `google_accounts`, `calendars` テーブルが存在するか確認

### 同期が動作しない

- `sync_logs` テーブルを確認してエラーログを確認
- ブラウザの開発者ツール（F12）→ Consoleでエラーを確認

---

## 次のステップ

### Webhook（リアルタイム同期）を有効化

開発環境でWebhookを動作させるには、ngrokなどのトンネリングツールが必要です。

1. ngrokをインストール: https://ngrok.com/
2. ngrokを起動: `ngrok http 3000`
3. 表示されたHTTPS URLを使用
4. `.env` の `NEXTAUTH_URL` を ngrokのURLに変更
5. Google Cloud Consoleのリダイレクト URIも更新

詳細は別途ガイドを作成します。

---

質問や問題があれば、お気軽にお知らせください！
