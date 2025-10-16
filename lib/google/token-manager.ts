/**
 * Google OAuth Token Manager
 * ベストプラクティスに基づいたトークン管理システム
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { supabaseAdmin } from "@/lib/supabase/client";
import { GoogleAccount } from "@/lib/types/database";

/**
 * トークンリフレッシュイベントをハンドルするためのマップ
 * アカウントIDごとにOAuth2Clientをキャッシュ
 */
const clientCache = new Map<string, OAuth2Client>();

/**
 * トークンリフレッシュのロック機構
 * 同時に複数のリフレッシュが走らないようにする
 */
const refreshLocks = new Map<string, Promise<void>>();

export class TokenManager {
  private static instance: TokenManager;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * OAuth2Clientを取得（キャッシュあり）
   * トークンリフレッシュを自動的にハンドル
   */
  public async getAuthenticatedClient(account: GoogleAccount): Promise<OAuth2Client> {
    // キャッシュチェック
    if (clientCache.has(account.id)) {
      const cachedClient = clientCache.get(account.id)!;

      // トークンの有効期限をチェック
      const expiryDate = new Date(account.token_expires_at).getTime();
      const now = Date.now();
      const fiveMinutesInMs = 5 * 60 * 1000;

      // 5分前からリフレッシュを開始（安全マージン）
      if (expiryDate - now < fiveMinutesInMs) {
        await this.refreshAccessToken(account, cachedClient);
      }

      return cachedClient;
    }

    // 新しいクライアントを作成
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    // 既存のトークンを設定
    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: new Date(account.token_expires_at).getTime(),
    });

    // トークンリフレッシュイベントのハンドラを設定
    oauth2Client.on('tokens', async (tokens) => {
      console.log(`[TokenManager] New tokens received for account ${account.id}`);

      try {
        const updateData: any = {
          access_token: tokens.access_token!,
          token_expires_at: new Date(tokens.expiry_date!).toISOString(),
          updated_at: new Date().toISOString(),
        };

        // refresh_tokenは初回のみ返される
        if (tokens.refresh_token) {
          updateData.refresh_token = tokens.refresh_token;
        }

        // データベースを更新
        const { error } = await supabaseAdmin
          .from('google_accounts')
          .update(updateData)
          .eq('id', account.id);

        if (error) {
          console.error('[TokenManager] Failed to update tokens in database:', error);
          throw error;
        }

        // アカウントオブジェクトも更新（メモリ内）
        account.access_token = tokens.access_token!;
        if (tokens.refresh_token) {
          account.refresh_token = tokens.refresh_token;
        }
        account.token_expires_at = new Date(tokens.expiry_date!).toISOString();

        console.log(`[TokenManager] Tokens successfully updated for account ${account.id}`);
      } catch (error) {
        console.error('[TokenManager] Error handling token refresh:', error);
        // エラーが発生してもクライアントは使用可能な状態を保つ
      }
    });

    // キャッシュに追加
    clientCache.set(account.id, oauth2Client);

    // 初回チェック：期限が近い場合はリフレッシュ
    const expiryDate = new Date(account.token_expires_at).getTime();
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (expiryDate - now < fiveMinutesInMs) {
      await this.refreshAccessToken(account, oauth2Client);
    }

    return oauth2Client;
  }

  /**
   * 手動でアクセストークンをリフレッシュ
   * 複数の同時リフレッシュを防ぐためのロック機構付き
   */
  private async refreshAccessToken(account: GoogleAccount, client: OAuth2Client): Promise<void> {
    const lockKey = account.id;

    // 既にリフレッシュ中の場合は待機
    if (refreshLocks.has(lockKey)) {
      console.log(`[TokenManager] Waiting for ongoing refresh for account ${account.id}`);
      await refreshLocks.get(lockKey);
      return;
    }

    // リフレッシュを開始
    const refreshPromise = this.doRefreshAccessToken(account, client);
    refreshLocks.set(lockKey, refreshPromise);

    try {
      await refreshPromise;
    } finally {
      refreshLocks.delete(lockKey);
    }
  }

  /**
   * 実際のリフレッシュ処理
   */
  private async doRefreshAccessToken(account: GoogleAccount, client: OAuth2Client): Promise<void> {
    console.log(`[TokenManager] Refreshing access token for account ${account.id}`);

    try {
      // refresh_tokenがない場合はエラー
      if (!account.refresh_token) {
        throw new Error('No refresh token available');
      }

      // Google APIを使用してトークンをリフレッシュ
      const { credentials } = await client.refreshAccessToken();

      // 新しいトークンを設定
      client.setCredentials(credentials);

      // データベースを更新
      const updateData: any = {
        access_token: credentials.access_token!,
        token_expires_at: new Date(credentials.expiry_date!).toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (credentials.refresh_token) {
        updateData.refresh_token = credentials.refresh_token;
      }

      const { error } = await supabaseAdmin
        .from('google_accounts')
        .update(updateData)
        .eq('id', account.id);

      if (error) {
        throw error;
      }

      // アカウントオブジェクトも更新
      account.access_token = credentials.access_token!;
      if (credentials.refresh_token) {
        account.refresh_token = credentials.refresh_token;
      }
      account.token_expires_at = new Date(credentials.expiry_date!).toISOString();

      console.log(`[TokenManager] Access token refreshed successfully for account ${account.id}`);
    } catch (error) {
      console.error(`[TokenManager] Failed to refresh access token for account ${account.id}:`, error);

      // リフレッシュに失敗した場合、キャッシュから削除
      clientCache.delete(account.id);

      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * キャッシュをクリア（メモリ管理用）
   */
  public clearCache(accountId?: string): void {
    if (accountId) {
      clientCache.delete(accountId);
      console.log(`[TokenManager] Cache cleared for account ${accountId}`);
    } else {
      clientCache.clear();
      console.log('[TokenManager] All cache cleared');
    }
  }

  /**
   * アカウントの有効性をチェック
   */
  public async validateAccount(account: GoogleAccount): Promise<boolean> {
    try {
      const client = await this.getAuthenticatedClient(account);

      // テストAPI呼び出し（カレンダーリストを取得）
      const calendar = google.calendar({ version: 'v3', auth: client });
      await calendar.calendarList.list({ maxResults: 1 });

      return true;
    } catch (error) {
      console.error(`[TokenManager] Account validation failed for ${account.id}:`, error);
      return false;
    }
  }

  /**
   * バッチトークンリフレッシュ
   * Cronジョブから定期的に呼び出される
   */
  public async refreshExpiringTokens(): Promise<void> {
    console.log('[TokenManager] Starting batch token refresh check');

    // 30分以内に期限切れになるトークンを取得
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: accounts, error } = await supabaseAdmin
      .from('google_accounts')
      .select('*')
      .lt('token_expires_at', thirtyMinutesFromNow);

    if (error) {
      console.error('[TokenManager] Failed to fetch expiring accounts:', error);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[TokenManager] No expiring tokens found');
      return;
    }

    console.log(`[TokenManager] Found ${accounts.length} expiring tokens`);

    // 並列でリフレッシュ（最大5並列）
    const batchSize = 5;
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (account) => {
          try {
            const client = await this.getAuthenticatedClient(account as GoogleAccount);
            await this.refreshAccessToken(account as GoogleAccount, client);
            console.log(`[TokenManager] Refreshed token for account ${account.id}`);
          } catch (error) {
            console.error(`[TokenManager] Failed to refresh token for account ${account.id}:`, error);
          }
        })
      );
    }

    console.log('[TokenManager] Batch token refresh completed');
  }
}

// シングルトンインスタンスをエクスポート
export const tokenManager = TokenManager.getInstance();