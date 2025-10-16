#!/bin/bash

# Calendar Tube - Google Cloud自動セットアップスクリプト
# このスクリプトは、Google Cloudの設定を自動化します

set -e  # エラーが発生したら停止

echo "=========================================="
echo "📦 Calendar Tube - Google Cloud Setup"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクト設定
PROJECT_ID="calendar-tube-$(date +%s)"
PROJECT_NAME="Calendar Tube"
REDIRECT_URI="http://localhost:3000/api/auth/callback/google"

# 現在のディレクトリを保存
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${BLUE}📍 プロジェクトディレクトリ: $PROJECT_ROOT${NC}"
echo ""

# ステップ1: gcloud CLIのインストール確認
echo -e "${YELLOW}[1/7] gcloud CLIのインストール確認...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLIがインストールされていません${NC}"
    echo ""
    echo -e "${BLUE}gcloud CLIをインストールします...${NC}"
    echo ""

    # macOSの場合
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "Homebrewを使用してインストール..."
            brew install --cask google-cloud-sdk
        else
            echo -e "${YELLOW}Homebrewがインストールされていません。${NC}"
            echo "以下のURLからgcloud CLIをダウンロードしてください:"
            echo "https://cloud.google.com/sdk/docs/install"
            exit 1
        fi
    else
        echo "以下のURLからgcloud CLIをダウンロードしてください:"
        echo "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
else
    echo -e "${GREEN}✓ gcloud CLIがインストールされています${NC}"
fi
echo ""

# ステップ2: Google Cloud認証
echo -e "${YELLOW}[2/7] Google Cloud認証...${NC}"
echo -e "${BLUE}ブラウザが開きます。Googleアカウントでログインしてください。${NC}"
echo ""
gcloud auth login --no-launch-browser || true
echo -e "${GREEN}✓ 認証完了${NC}"
echo ""

# ステップ3: プロジェクトの作成
echo -e "${YELLOW}[3/7] Google Cloudプロジェクトの作成...${NC}"
echo -e "${BLUE}プロジェクトID: $PROJECT_ID${NC}"
echo ""

# プロジェクトが既に存在するか確認
if gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}プロジェクトは既に存在します${NC}"
else
    gcloud projects create "$PROJECT_ID" --name="$PROJECT_NAME" || {
        echo -e "${RED}✗ プロジェクトの作成に失敗しました${NC}"
        echo -e "${YELLOW}手動で作成してください: https://console.cloud.google.com/projectcreate${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ プロジェクト作成完了${NC}"
fi

# プロジェクトを設定
gcloud config set project "$PROJECT_ID"
echo ""

# ステップ4: 請求先アカウントの確認（必要に応じて）
echo -e "${YELLOW}[4/7] 請求先アカウントの確認...${NC}"
echo -e "${BLUE}※ Google Calendar APIは無料で使用できますが、プロジェクトには請求先の設定が必要な場合があります${NC}"
echo ""

BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" --limit=1)
if [ -z "$BILLING_ACCOUNT" ]; then
    echo -e "${YELLOW}⚠ 請求先アカウントが見つかりません${NC}"
    echo -e "${YELLOW}必要に応じて、以下のURLで請求先を設定してください:${NC}"
    echo "https://console.cloud.google.com/billing"
    echo ""
    echo -e "${BLUE}Enterを押して続行...${NC}"
    read
else
    echo -e "${GREEN}✓ 請求先アカウント: $BILLING_ACCOUNT${NC}"
    # プロジェクトに請求先を関連付け
    gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" 2>/dev/null || true
fi
echo ""

# ステップ5: Google Calendar APIの有効化
echo -e "${YELLOW}[5/7] Google Calendar APIを有効化...${NC}"
gcloud services enable calendar-json.googleapis.com --project="$PROJECT_ID"
echo -e "${GREEN}✓ Google Calendar API有効化完了${NC}"
echo ""

# ステップ6: OAuth同意画面の設定
echo -e "${YELLOW}[6/7] OAuth同意画面の設定...${NC}"
echo -e "${BLUE}OAuth同意画面は手動で設定する必要があります。${NC}"
echo ""
echo -e "${YELLOW}以下のURLを開いて設定してください:${NC}"
echo "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo -e "${BLUE}設定内容:${NC}"
echo "  • User Type: 外部"
echo "  • アプリ名: Calendar Tube"
echo "  • サポートメール: あなたのメールアドレス"
echo "  • スコープ: デフォルトのまま"
echo "  • 「保存して次へ」をクリック"
echo ""
echo -e "${BLUE}設定が完了したらEnterを押してください...${NC}"
read
echo ""

# ステップ7: OAuth 2.0認証情報の作成
echo -e "${YELLOW}[7/7] OAuth 2.0認証情報の作成...${NC}"
echo -e "${BLUE}ブラウザで以下のURLを開いて、OAuth 2.0クライアントIDを作成してください:${NC}"
echo "https://console.cloud.google.com/apis/credentials/oauthclient?project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}設定内容:${NC}"
echo "  • アプリケーションの種類: ウェブアプリケーション"
echo "  • 名前: calendar-tube-web"
echo "  • 承認済みのリダイレクトURI:"
echo "    $REDIRECT_URI"
echo ""
echo -e "${GREEN}作成後、以下の情報をメモしてください:${NC}"
echo "  1. クライアントID"
echo "  2. クライアントシークレット"
echo ""
echo -e "${BLUE}完了したらEnterを押してください...${NC}"
read
echo ""

# クライアントIDとシークレットの入力
echo -e "${YELLOW}=========================================="
echo "📝 認証情報の入力"
echo "==========================================${NC}"
echo ""

echo -e "${BLUE}クライアントID を入力してください:${NC}"
read -r CLIENT_ID

echo -e "${BLUE}クライアントシークレット を入力してください:${NC}"
read -r CLIENT_SECRET

# .envファイルの更新
echo ""
echo -e "${YELLOW}.envファイルを更新中...${NC}"

if [ -f "$ENV_FILE" ]; then
    # バックアップを作成
    cp "$ENV_FILE" "$ENV_FILE.backup"

    # GOOGLE_CLIENT_IDを更新
    if grep -q "^GOOGLE_CLIENT_ID=" "$ENV_FILE"; then
        sed -i.tmp "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$CLIENT_ID|" "$ENV_FILE"
        rm -f "$ENV_FILE.tmp"
    else
        echo "GOOGLE_CLIENT_ID=$CLIENT_ID" >> "$ENV_FILE"
    fi

    # GOOGLE_CLIENT_SECRETを更新
    if grep -q "^GOOGLE_CLIENT_SECRET=" "$ENV_FILE"; then
        sed -i.tmp "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$CLIENT_SECRET|" "$ENV_FILE"
        rm -f "$ENV_FILE.tmp"
    else
        echo "GOOGLE_CLIENT_SECRET=$CLIENT_SECRET" >> "$ENV_FILE"
    fi

    echo -e "${GREEN}✓ .envファイルを更新しました${NC}"
    echo -e "${BLUE}バックアップ: $ENV_FILE.backup${NC}"
else
    echo -e "${RED}✗ .envファイルが見つかりません: $ENV_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Google Cloud セットアップ完了！"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}プロジェクトID:${NC} $PROJECT_ID"
echo -e "${BLUE}Google Calendar API:${NC} 有効化済み"
echo -e "${BLUE}.env:${NC} 更新済み"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  1. Supabaseのセットアップを実行"
echo "  2. npm run dev でアプリを起動"
echo ""
echo -e "${GREEN}🎉 お疲れ様でした！${NC}"
