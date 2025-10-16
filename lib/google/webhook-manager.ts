/**
 * Google Calendar Webhook Manager
 * ベストプラクティスに基づいたWebhook管理システム
 */

import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "@/lib/supabase/client";
import { Calendar, GoogleAccount } from "@/lib/types/database";
import { setupWebhook, stopWebhook } from "./calendar";

export class WebhookManager {
  private static instance: WebhookManager;

  /**
   * Webhookの最大有効期限（7日間のミリ秒）
   */
  private static readonly MAX_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

  /**
   * 更新の閾値（期限の24時間前）
   */
  private static readonly REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

  private constructor() {}

  public static getInstance(): WebhookManager {
    if (!WebhookManager.instance) {
      WebhookManager.instance = new WebhookManager();
    }
    return WebhookManager.instance;
  }

  /**
   * Webhookを設定（新規または更新）
   */
  public async setupWebhook(
    account: GoogleAccount,
    calendar: Calendar
  ): Promise<{
    channelId: string;
    resourceId: string;
    expiration: Date;
  }> {
    console.log(`[WebhookManager] Setting up webhook for calendar ${calendar.id}`);

    // 本番環境チェック
    if (!this.isProductionEnvironment()) {
      console.log("[WebhookManager] Skipping webhook setup in non-production environment");
      return {
        channelId: "dev-channel-" + uuidv4(),
        resourceId: "dev-resource-" + uuidv4(),
        expiration: new Date(Date.now() + WebhookManager.MAX_EXPIRATION_MS),
      };
    }

    try {
      // 既存のWebhookがあれば停止
      if (calendar.webhook_channel_id && calendar.webhook_resource_id) {
        await this.stopWebhookSafely(account, calendar);
      }

      // 新しいチャンネルIDを生成
      const channelId = `cal-${calendar.id}-${Date.now()}`;
      const webhookUrl = this.getWebhookUrl();

      // WebhookをGoogle Calendar APIに登録
      const response = await setupWebhook(
        account,
        calendar.calendar_id,
        channelId,
        webhookUrl
      );

      if (!response.resourceId || !response.expiration) {
        throw new Error("Invalid webhook response from Google API");
      }

      const expiration = new Date(parseInt(response.expiration));

      // データベースを更新
      const { error } = await supabaseAdmin
        .from("calendars")
        .update({
          webhook_channel_id: channelId,
          webhook_resource_id: response.resourceId,
          webhook_expires_at: expiration.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", calendar.id);

      if (error) {
        throw error;
      }

      console.log(
        `[WebhookManager] Webhook setup successful for calendar ${calendar.id}, expires at ${expiration.toISOString()}`
      );

      return {
        channelId,
        resourceId: response.resourceId,
        expiration,
      };
    } catch (error) {
      console.error(`[WebhookManager] Failed to setup webhook for calendar ${calendar.id}:`, error);
      throw error;
    }
  }

  /**
   * Webhookを安全に停止（エラーを無視）
   */
  private async stopWebhookSafely(
    account: GoogleAccount,
    calendar: Calendar
  ): Promise<void> {
    if (!calendar.webhook_channel_id || !calendar.webhook_resource_id) {
      return;
    }

    try {
      console.log(`[WebhookManager] Stopping existing webhook for calendar ${calendar.id}`);
      await stopWebhook(
        account,
        calendar.webhook_channel_id,
        calendar.webhook_resource_id
      );
    } catch (error) {
      // 既に期限切れの可能性があるため、エラーは無視
      console.warn(
        `[WebhookManager] Failed to stop webhook for calendar ${calendar.id}, continuing anyway:`,
        error
      );
    }
  }

  /**
   * 期限切れ間近のWebhookを更新
   */
  public async refreshExpiringWebhooks(): Promise<{
    total: number;
    refreshed: number;
    failed: Array<{ calendarId: string; error: string }>;
  }> {
    console.log("[WebhookManager] Starting webhook refresh check");

    const threshold = new Date(
      Date.now() + WebhookManager.REFRESH_THRESHOLD_MS
    );

    // 期限が近いWebhookを取得
    const { data: calendars, error } = await supabaseAdmin
      .from("calendars")
      .select("*, google_accounts!inner(*)")
      .eq("is_active", true)
      .not("webhook_expires_at", "is", null)
      .lt("webhook_expires_at", threshold.toISOString());

    if (error) {
      console.error("[WebhookManager] Failed to fetch expiring webhooks:", error);
      throw error;
    }

    if (!calendars || calendars.length === 0) {
      console.log("[WebhookManager] No expiring webhooks found");
      return { total: 0, refreshed: 0, failed: [] };
    }

    console.log(`[WebhookManager] Found ${calendars.length} expiring webhooks`);

    let refreshed = 0;
    const failed: Array<{ calendarId: string; error: string }> = [];

    // 並列処理（最大5並列）
    const batchSize = 5;
    for (let i = 0; i < calendars.length; i += batchSize) {
      const batch = calendars.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (calendar) => {
          const account = (calendar as any).google_accounts as GoogleAccount;

          try {
            await this.setupWebhook(account, calendar as Calendar);
            refreshed++;
            console.log(`[WebhookManager] Refreshed webhook for calendar ${calendar.id}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            failed.push({
              calendarId: calendar.id,
              error: errorMessage,
            });
            console.error(
              `[WebhookManager] Failed to refresh webhook for calendar ${calendar.id}:`,
              error
            );
          }
        })
      );

      // 少し待機（レート制限対策）
      if (i + batchSize < calendars.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `[WebhookManager] Webhook refresh completed: ${refreshed}/${calendars.length} successful`
    );

    return {
      total: calendars.length,
      refreshed,
      failed,
    };
  }

  /**
   * すべてのアクティブなWebhookを確認
   */
  public async validateAllWebhooks(): Promise<{
    total: number;
    valid: number;
    invalid: Array<{ calendarId: string; reason: string }>;
  }> {
    const { data: calendars, error } = await supabaseAdmin
      .from("calendars")
      .select("*")
      .eq("is_active", true)
      .not("webhook_channel_id", "is", null);

    if (error) {
      throw error;
    }

    const results = {
      total: calendars?.length || 0,
      valid: 0,
      invalid: [] as Array<{ calendarId: string; reason: string }>,
    };

    if (!calendars) {
      return results;
    }

    for (const calendar of calendars) {
      if (!calendar.webhook_expires_at) {
        results.invalid.push({
          calendarId: calendar.id,
          reason: "No expiration date",
        });
        continue;
      }

      const expiration = new Date(calendar.webhook_expires_at);
      const now = new Date();

      if (expiration < now) {
        results.invalid.push({
          calendarId: calendar.id,
          reason: `Expired at ${expiration.toISOString()}`,
        });
      } else {
        results.valid++;
      }
    }

    return results;
  }

  /**
   * 特定のカレンダーのWebhookを削除
   */
  public async removeWebhook(
    account: GoogleAccount,
    calendar: Calendar
  ): Promise<void> {
    console.log(`[WebhookManager] Removing webhook for calendar ${calendar.id}`);

    await this.stopWebhookSafely(account, calendar);

    // データベースをクリア
    const { error } = await supabaseAdmin
      .from("calendars")
      .update({
        webhook_channel_id: null,
        webhook_resource_id: null,
        webhook_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", calendar.id);

    if (error) {
      throw error;
    }

    console.log(`[WebhookManager] Webhook removed for calendar ${calendar.id}`);
  }

  /**
   * WebhookのURLを取得
   */
  private getWebhookUrl(): string {
    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new Error("NEXTAUTH_URL is not configured");
    }

    // URLの正規化
    const url = new URL(baseUrl);
    return `${url.origin}/api/webhook/calendar`;
  }

  /**
   * 本番環境かどうかをチェック
   */
  private isProductionEnvironment(): boolean {
    const url = process.env.NEXTAUTH_URL;
    if (!url) {
      return false;
    }

    // localhost, 127.0.0.1, [::1] を除外
    const isLocal =
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("[::1]") ||
      url.includes("192.168.") ||
      url.includes("10.0.") ||
      url.includes(".local");

    return !isLocal;
  }

  /**
   * Webhookの統計情報を取得
   */
  public async getWebhookStats(): Promise<{
    total: number;
    active: number;
    expiring: number;
    expired: number;
  }> {
    const now = new Date();
    const threshold = new Date(now.getTime() + WebhookManager.REFRESH_THRESHOLD_MS);

    const { data: calendars, error } = await supabaseAdmin
      .from("calendars")
      .select("webhook_expires_at")
      .eq("is_active", true)
      .not("webhook_channel_id", "is", null);

    if (error || !calendars) {
      return { total: 0, active: 0, expiring: 0, expired: 0 };
    }

    let active = 0;
    let expiring = 0;
    let expired = 0;

    for (const calendar of calendars) {
      if (!calendar.webhook_expires_at) {
        continue;
      }

      const expiration = new Date(calendar.webhook_expires_at);

      if (expiration < now) {
        expired++;
      } else if (expiration < threshold) {
        expiring++;
      } else {
        active++;
      }
    }

    return {
      total: calendars.length,
      active,
      expiring,
      expired,
    };
  }
}

// シングルトンインスタンスをエクスポート
export const webhookManager = WebhookManager.getInstance();