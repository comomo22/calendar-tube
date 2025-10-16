#!/bin/bash

# Calendar Tube - 完全自動セットアップスクリプト
# Google Cloud + Supabase を一度に設定します

set -e  # エラーが発生したら停止

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}${BOLD}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           📅  CALENDAR TUBE SETUP WIZARD  📅           ║
║                                                        ║
║      Google Calendar 自動同期アプリのセットアップ       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

# 現在のディレクトリを保存
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}このウィザードは以下を自動的にセットアップします:${NC}"
echo ""
echo "  1️⃣  Google Cloud Platform"
echo "     • gcloud CLIのインストール"
echo "     • プロジェクトの作成"
echo "     • Google Calendar APIの有効化"
echo "     • OAuth 2.0認証情報の設定"
echo ""
echo "  2️⃣  Supabase"
echo "     • Supabase CLIのインストール"
echo "     • データベーステーブルの作成"
echo "     • APIキーの設定"
echo ""
echo "  3️⃣  環境変数"
echo "     • .envファイルの自動更新"
echo ""
echo -e "${YELLOW}⏱️  所要時間: 約10〜15分${NC}"
echo ""
echo -e "${GREEN}準備はいいですか？${NC}"
echo -e "${BLUE}Enterを押して開始...${NC}"
read
echo ""

# セットアップ開始
START_TIME=$(date +%s)

# ステップ1: Google Cloud
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BOLD}  STEP 1: Google Cloud Platform${NC}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$SCRIPT_DIR/setup-google-cloud.sh" ]; then
    bash "$SCRIPT_DIR/setup-google-cloud.sh"
else
    echo -e "${RED}✗ setup-google-cloud.sh が見つかりません${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Google Cloud セットアップ完了！${NC}"
echo ""
echo -e "${BLUE}Enterを押して次のステップへ...${NC}"
read
clear

# ステップ2: Supabase
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}${BOLD}  STEP 2: Supabase${NC}"
echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f "$SCRIPT_DIR/setup-supabase.sh" ]; then
    bash "$SCRIPT_DIR/setup-supabase.sh"
else
    echo -e "${RED}✗ setup-supabase.sh が見つかりません${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Supabase セットアップ完了！${NC}"
echo ""

# セットアップ完了
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

clear

echo -e "${GREEN}${BOLD}"
cat << "EOF"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║          🎉  セットアップ完了！  🎉                      ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
echo ""

echo -e "${BLUE}所要時間: ${MINUTES}分${SECONDS}秒${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}  完了したこと${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  ✅ Google Cloud Platform"
echo "     • プロジェクト作成"
echo "     • Calendar API有効化"
echo "     • OAuth認証情報設定"
echo ""
echo "  ✅ Supabase"
echo "     • データベーステーブル作成"
echo "     • APIキー設定"
echo ""
echo "  ✅ 環境変数"
echo "     • .env ファイル完全設定"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}${BOLD}  次のステップ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}1. 開発サーバーを起動:${NC}"
echo "   cd $PROJECT_ROOT"
echo "   npm run dev"
echo ""
echo -e "${CYAN}2. ブラウザでアクセス:${NC}"
echo "   http://localhost:3000"
echo ""
echo -e "${CYAN}3. Googleアカウントでログイン${NC}"
echo "   • 最初のGoogleアカウント（仕事用A）でログイン"
echo "   • 「別のGoogleアカウントを追加」で仕事用B追加"
echo "   • さらに「別のGoogleアカウントを追加」で私用C追加"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}準備完了です！${NC}"
echo -e "${GREEN}${BOLD}🚀 それでは、npm run dev を実行してアプリを起動しましょう！${NC}"
echo ""
