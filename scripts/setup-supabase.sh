#!/bin/bash

# Calendar Tube - Supabase自動セットアップスクリプト
# このスクリプトは、Supabaseの設定を自動化します

set -e  # エラーが発生したら停止

echo "=========================================="
echo "🗄️  Calendar Tube - Supabase Setup"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 現在のディレクトリを保存
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
ENV_FILE="$PROJECT_ROOT/.env"
MIGRATION_FILE="$PROJECT_ROOT/supabase/migrations/001_initial_schema.sql"

echo -e "${BLUE}📍 プロジェクトディレクトリ: $PROJECT_ROOT${NC}"
echo ""

# ステップ1: Supabase CLIのインストール確認
echo -e "${YELLOW}[1/5] Supabase CLIのインストール確認...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLIがインストールされていません${NC}"
    echo ""
    echo -e "${BLUE}Supabase CLIをインストールします...${NC}"

    # macOSの場合
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "Homebrewを使用してインストール..."
            brew install supabase/tap/supabase
            echo -e "${GREEN}✓ Supabase CLIインストール完了${NC}"
        else
            echo -e "${YELLOW}Homebrewがインストールされていません。${NC}"
            echo "以下のコマンドでインストールしてください:"
            echo "npm install -g supabase"
            exit 1
        fi
    else
        echo "以下のコマンドでインストールしてください:"
        echo "npm install -g supabase"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Supabase CLIがインストールされています${NC}"
fi
echo ""

# ステップ2: Supabaseプロジェクト情報の入力
echo -e "${YELLOW}[2/5] Supabaseプロジェクトのセットアップ${NC}"
echo ""
echo -e "${BLUE}まず、Supabaseでプロジェクトを作成してください:${NC}"
echo "1. https://supabase.com/ を開く"
echo "2. 「Start your project」→ GitHubでログイン"
echo "3. 「New Project」をクリック"
echo "   • Project name: calendar-tube"
echo "   • Database Password: 強力なパスワード（メモしておく）"
echo "   • Region: Northeast Asia (Tokyo)"
echo "4. 「Create new project」をクリック（1〜2分待つ）"
echo ""
echo -e "${BLUE}完了したらEnterを押してください...${NC}"
read
echo ""

# ステップ3: Supabase認証情報の入力
echo -e "${YELLOW}[3/5] Supabase認証情報の入力${NC}"
echo ""
echo -e "${BLUE}Supabaseダッシュボードで以下の情報を取得してください:${NC}"
echo "Settings → API → Project URL と API Keys"
echo ""

echo -e "${BLUE}Project URL を入力してください:${NC}"
echo -e "${YELLOW}例: https://xxxxx.supabase.co${NC}"
read -r SUPABASE_URL

echo ""
echo -e "${BLUE}anon public キー を入力してください:${NC}"
echo -e "${YELLOW}（長い文字列）${NC}"
read -r SUPABASE_ANON_KEY

echo ""
echo -e "${BLUE}service_role キー を入力してください:${NC}"
echo -e "${YELLOW}※ 「Reveal」をクリックして表示${NC}"
read -r SUPABASE_SERVICE_KEY

# ステップ4: .envファイルの更新
echo ""
echo -e "${YELLOW}[4/5] .envファイルを更新中...${NC}"

if [ -f "$ENV_FILE" ]; then
    # バックアップを作成
    cp "$ENV_FILE" "$ENV_FILE.backup-supabase"

    # NEXT_PUBLIC_SUPABASE_URLを更新
    if grep -q "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE"; then
        sed -i.tmp "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" "$ENV_FILE"
        rm -f "$ENV_FILE.tmp"
    else
        echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> "$ENV_FILE"
    fi

    # NEXT_PUBLIC_SUPABASE_ANON_KEYを更新
    if grep -q "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENV_FILE"; then
        sed -i.tmp "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$ENV_FILE"
        rm -f "$ENV_FILE.tmp"
    else
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> "$ENV_FILE"
    fi

    # SUPABASE_SERVICE_ROLE_KEYを更新
    if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE"; then
        sed -i.tmp "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" "$ENV_FILE"
        rm -f "$ENV_FILE.tmp"
    else
        echo "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY" >> "$ENV_FILE"
    fi

    echo -e "${GREEN}✓ .envファイルを更新しました${NC}"
    echo -e "${BLUE}バックアップ: $ENV_FILE.backup-supabase${NC}"
else
    echo -e "${RED}✗ .envファイルが見つかりません: $ENV_FILE${NC}"
    exit 1
fi
echo ""

# ステップ5: データベースマイグレーションの実行
echo -e "${YELLOW}[5/5] データベーステーブルの作成...${NC}"
echo ""
echo -e "${BLUE}以下の手順でSQLを実行してください:${NC}"
echo "1. Supabaseダッシュボードを開く"
echo "2. 左メニューの「SQL Editor」をクリック"
echo "3. 「New query」をクリック"
echo "4. 以下のファイルの内容を全てコピー＆ペースト:"
echo "   $MIGRATION_FILE"
echo "5. 「Run」ボタンをクリック"
echo "6. 緑色のチェックマークが出ればOK！"
echo ""
echo -e "${YELLOW}SQLファイルの内容を表示しますか？ (y/n)${NC}"
read -r SHOW_SQL

if [ "$SHOW_SQL" = "y" ] || [ "$SHOW_SQL" = "Y" ]; then
    echo ""
    echo -e "${BLUE}========== SQL ==========${NC}"
    cat "$MIGRATION_FILE"
    echo -e "${BLUE}=========================${NC}"
    echo ""
fi

echo -e "${BLUE}SQLの実行が完了したらEnterを押してください...${NC}"
read
echo ""

# 完了メッセージ
echo -e "${GREEN}=========================================="
echo "✅ Supabase セットアップ完了！"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Supabase URL:${NC} $SUPABASE_URL"
echo -e "${BLUE}.env:${NC} 更新済み"
echo -e "${BLUE}データベース:${NC} テーブル作成済み"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  npm run dev でアプリを起動"
echo ""
echo -e "${GREEN}🎉 お疲れ様でした！${NC}"
