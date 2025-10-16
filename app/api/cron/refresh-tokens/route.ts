import { NextRequest, NextResponse } from "next/server";
import { tokenManager } from "@/lib/google/token-manager";

/**
 * トークンの定期リフレッシュ（Vercel Cronから呼び出し）
 * 30分以内に期限切れになるトークンを自動的にリフレッシュ
 */
export async function GET(request: NextRequest) {
  try {
    // Cronジョブのセキュリティ: Bearer tokenで保護
    const authHeader = request.headers.get("authorization");

    // Vercel Cronは CRON_SECRET を使用
    const expectedToken = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting token refresh job");

    // トークン管理システムのバッチリフレッシュを実行
    await tokenManager.refreshExpiringTokens();

    return NextResponse.json({
      success: true,
      message: "Token refresh job completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Token refresh job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Token refresh job failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}