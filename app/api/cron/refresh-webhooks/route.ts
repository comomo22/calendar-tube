import { NextRequest, NextResponse } from "next/server";
import { webhookManager } from "@/lib/google/webhook-manager";

/**
 * Webhookの定期更新（Vercel Cronから呼び出し）
 * 24時間以内に期限切れになるWebhookを自動的に更新
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

    console.log("[Cron] Starting webhook refresh job");

    // 現在の統計を取得
    const statsBefore = await webhookManager.getWebhookStats();
    console.log("[Cron] Webhook stats before refresh:", statsBefore);

    // Webhookの更新を実行
    const result = await webhookManager.refreshExpiringWebhooks();

    // 更新後の統計を取得
    const statsAfter = await webhookManager.getWebhookStats();
    console.log("[Cron] Webhook stats after refresh:", statsAfter);

    const response = {
      success: true,
      message: "Webhook refresh job completed",
      timestamp: new Date().toISOString(),
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
      result: {
        total: result.total,
        refreshed: result.refreshed,
        failed: result.failed,
      },
    };

    // エラーがあった場合はログ出力
    if (result.failed.length > 0) {
      console.error("[Cron] Some webhooks failed to refresh:", result.failed);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Cron] Webhook refresh job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook refresh job failed",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}