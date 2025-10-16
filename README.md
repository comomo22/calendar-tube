# Calendar Tube

複数のGoogleカレンダーアカウントを自動同期するWebアプリケーションです。

## 機能

- 🔄 **双方向自動同期**: 複数のGoogleカレンダー間で予定を自動的に同期
- ⚡ **リアルタイム検知**: Webhook経由でイベントの作成・更新・削除を即座に検知
- 🔒 **同期ループ防止**: `extendedProperties`を使用した賢い重複防止機構
- 📅 **初回同期**: 今日から3ヶ月先の予定を一括同期
- 🎯 **手動同期**: 必要に応じて「今すぐ同期」ボタンで即座に同期
- 🌐 **複数アカウント対応**: 3つ以上のアカウントも管理可能

## 技術スタック

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js v5 (Google OAuth)
- **External API**: Google Calendar API v3
- **Deployment**: Vercel

## セットアップ手順

### 1. リポジトリのクローン

\`\`\`bash
git clone <repository-url>
cd calendar-tube
npm install
\`\`\`

### 2. Google Cloud Platform での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. **API とサービス > 認証情報** に移動
4. **OAuth 2.0 クライアント ID** を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクト URI:
     - `http://localhost:3000/api/auth/callback/google` (開発用)
     - `https://your-domain.com/api/auth/callback/google` (本番用)
5. **API とサービス > ライブラリ** から以下を有効化:
   - Google Calendar API

### 3. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. **SQL Editor** で `supabase/migrations/001_initial_schema.sql` を実行
3. **Settings > API** から以下を取得:
   - Project URL
   - anon/public key
   - service_role key

### 4. 環境変数の設定

\`.env.example\` を \`.env\` にコピーして、以下の値を設定:

\`\`\`bash
cp .env.example .env
\`\`\`

\`.env\` ファイル:

\`\`\`env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32 で生成>

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Console から取得>
GOOGLE_CLIENT_SECRET=<Google Cloud Console から取得>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>

# Webhook (本番環境で設定)
WEBHOOK_SECRET=<任意の文字列>
\`\`\`

### 5. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

http://localhost:3000 にアクセス

### 6. 本番環境へのデプロイ (Vercel)

1. Vercelにプロジェクトをインポート
2. 環境変数を設定（上記の`.env`の内容）
3. **NEXTAUTH_URL** を本番URLに変更
4. デプロイ

デプロイ後、Google Cloud Consoleで承認済みリダイレクトURIに本番URLを追加してください。

## 使い方

### 初回セットアップ

1. アプリにアクセスして「Googleでログイン」
2. Googleアカウント（仕事用A）でログイン
3. 「別のGoogleアカウントを追加」をクリック
4. Googleアカウント（仕事用B）でログイン
5. 再度「別のGoogleアカウントを追加」をクリック
6. Googleアカウント（私用C）でログイン
7. 各アカウントで「カレンダーを同期対象に追加」をクリック

### 同期の仕組み

- **自動同期**: カレンダーに予定が作成・更新・削除されると、他のカレンダーに自動的に反映されます
- **手動同期**: 「今すぐ同期」ボタンで即座に同期を実行できます
- **初回同期**: カレンダー追加時に、今日から3ヶ月先の予定を自動的に同期します

### 同期ループの防止

同期されたイベントには `extendedProperties.private` に以下のマーカーが付与されます:

\`\`\`json
{
  "calendar-tube-synced": "true",
  "source_calendar_id": "<元のカレンダーのID>",
  "source_event_id": "<元のイベントのID>"
}
\`\`\`

このマーカーにより、同期済みのイベントが再度同期されることを防ぎます。

## プロジェクト構造

\`\`\`
calendar-tube/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── calendars/      # Calendar management
│   │   ├── sync/           # Manual sync
│   │   └── webhook/        # Google Calendar webhooks
│   ├── auth/               # Authentication pages
│   ├── dashboard/          # Main dashboard
│   └── page.tsx            # Home page (redirect)
├── components/              # React components
│   ├── AddCalendarButton.tsx
│   └── SyncButton.tsx
├── lib/                     # Utility libraries
│   ├── google/             # Google Calendar API helpers
│   ├── supabase/           # Supabase client
│   ├── sync/               # Sync logic
│   └── types/              # TypeScript types
├── supabase/               # Database
│   └── migrations/         # SQL migrations
├── auth.ts                  # NextAuth configuration
└── middleware.ts            # Next.js middleware

\`\`\`

## トラブルシューティング

### Webhook が動作しない

- Google Cloud Console で Google Calendar API が有効になっているか確認
- Webhook URL が HTTPS であることを確認（ngrok等を使用）
- Vercel のログで webhook エンドポイントが呼ばれているか確認

### 同期が遅い

- Webhook の有効期限（7日）が切れていないか確認
- Supabase の `sync_logs` テーブルでエラーを確認

### トークンエラー

- Google OAuth の refresh token が正しく保存されているか確認
- `google_accounts` テーブルの `token_expires_at` を確認

## ライセンス

MIT

## 作者

こもも
