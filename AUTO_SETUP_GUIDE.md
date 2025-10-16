# 🤖 Calendar Tube - 自動セットアップガイド

こももさん、コマンド1つでセットアップできるようになりました！

---

## 🚀 超簡単！ワンコマンドセットアップ

### たった1つのコマンドで全部完了：

```bash
./scripts/setup-all.sh
```

このスクリプトが自動的に以下を実行します：
- ✅ gcloud CLIのインストール（必要な場合）
- ✅ Google Cloudプロジェクトの作成
- ✅ Google Calendar APIの有効化
- ✅ OAuth 2.0認証情報の設定
- ✅ Supabase CLIのインストール（必要な場合）
- ✅ データベーステーブルの作成
- ✅ .envファイルの自動更新

**所要時間: 10〜15分**

---

## 📝 実行手順（詳細版）

### ステップ1: ターミナルを開く

1. Finderで「calendar-tube」フォルダを開く
2. 右クリック → 「フォルダで新規ターミナルを開く」
   または
3. ターミナルを開いて以下を実行:
   ```bash
   cd ~/develop/calendar-tube
   ```

### ステップ2: セットアップスクリプトを実行

```bash
./scripts/setup-all.sh
```

### ステップ3: 画面の指示に従う

スクリプトが以下のように進みます：

#### 🟦 Google Cloud部分
1. **gcloud CLI認証**
   - ブラウザが開きます
   - Googleアカウントでログイン
   - 「許可」をクリック

2. **OAuth同意画面の設定**
   - ブラウザでURLが開きます
   - 「User Type: 外部」を選択
   - アプリ名: `Calendar Tube`
   - サポートメール: あなたのメールアドレス
   - 「保存して次へ」

3. **OAuth 2.0認証情報の作成**
   - ブラウザでURLが開きます
   - アプリケーションの種類: `ウェブアプリケーション`
   - 名前: `calendar-tube-web`
   - リダイレクトURI: `http://localhost:3000/api/auth/callback/google`
   - 「作成」をクリック
   - **クライアントID** と **クライアントシークレット** をコピー
   - ターミナルに貼り付け

#### 🟩 Supabase部分
1. **Supabaseプロジェクトの作成**
   - https://supabase.com/ を開く
   - 「Start your project」→ GitHubでログイン
   - 「New Project」をクリック
   - Project name: `calendar-tube`
   - Database Password: 強力なパスワード（メモしておく）
   - Region: `Northeast Asia (Tokyo)`
   - 「Create new project」（1〜2分待つ）

2. **Supabase認証情報の入力**
   - Settings → API
   - **Project URL**, **anon public key**, **service_role key** をコピー
   - ターミナルに貼り付け

3. **SQLの実行**
   - Supabaseダッシュボード → SQL Editor
   - 「New query」をクリック
   - `supabase/migrations/001_initial_schema.sql` の内容を全てコピー＆ペースト
   - 「Run」をクリック

### ステップ4: 完了！

スクリプトが完了すると、.envファイルが完全に設定されています。

---

## ✨ セットアップ完了後

### アプリを起動:

```bash
npm run dev
```

### ブラウザでアクセス:

```
http://localhost:3000
```

### 初回ログイン:
1. 「Googleでログイン」をクリック
2. 1つ目のGoogleアカウント（仕事用A）でログイン
3. 「別のGoogleアカウントを追加」をクリック
4. 2つ目のGoogleアカウント（仕事用B）でログイン
5. さらに「別のGoogleアカウントを追加」をクリック
6. 3つ目のGoogleアカウント（私用C）でログイン

これで、3つのカレンダーが自動同期されます！🎉

---

## 🔧 個別セットアップ（必要に応じて）

全自動がうまくいかない場合、個別に実行できます：

### Google Cloudのみ:
```bash
./scripts/setup-google-cloud.sh
```

### Supabaseのみ:
```bash
./scripts/setup-supabase.sh
```

---

## 🆘 トラブルシューティング

### エラー: "gcloud: command not found"
→ スクリプトがHomebrewを使って自動インストールします
→ それでも失敗する場合: https://cloud.google.com/sdk/docs/install

### エラー: "supabase: command not found"
→ スクリプトがHomebrewを使って自動インストールします
→ それでも失敗する場合: `npm install -g supabase`

### その他のエラー
→ 私（AI）に「〇〇というエラーが出た」とメッセージしてください！
→ ログを見せてもらえれば、すぐに解決します。

---

## 📁 作成されたファイル

| ファイル | 説明 |
|---------|------|
| `scripts/setup-all.sh` | 👈 **これを実行！全自動セットアップ** |
| `scripts/setup-google-cloud.sh` | Google Cloudのみセットアップ |
| `scripts/setup-supabase.sh` | Supabaseのみセットアップ |
| `.env` | 環境変数（自動更新される） |
| `.env.backup` | バックアップ（念のため） |

---

## 🎯 クイックスタート（まとめ）

```bash
# 1. セットアップ（1回だけ）
./scripts/setup-all.sh

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザでアクセス
# http://localhost:3000
```

**準備完了です！困ったことがあれば、いつでも私に聞いてくださいね！** 🚀
