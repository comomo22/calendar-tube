/**
 * Calendar Tube 同期テストスクリプト
 * このスクリプトで同期機能の動作を確認します
 */

import { supabaseAdmin } from "./lib/supabase/client";
import { listCalendars, listEvents } from "./lib/google/calendar";
import { performInitialSync } from "./lib/sync/engine";

async function testSync() {
  console.log("=== Calendar Tube 同期テスト開始 ===\n");

  try {
    // 1. データベースから情報を取得
    console.log("📊 データベース情報を取得中...");

    // ユーザー一覧
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("*");

    if (userError || !users?.length) {
      console.error("❌ ユーザーが見つかりません:", userError);
      return;
    }

    console.log(`✅ ユーザー数: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });

    // Googleアカウント一覧
    const { data: googleAccounts, error: accountError } = await supabaseAdmin
      .from("google_accounts")
      .select("*");

    if (accountError || !googleAccounts?.length) {
      console.error("❌ Googleアカウントが見つかりません:", accountError);
      return;
    }

    console.log(`\n✅ Googleアカウント数: ${googleAccounts.length}`);
    googleAccounts.forEach(account => {
      console.log(`  - ${account.email} (ID: ${account.id})`);
      console.log(`    refresh_token: ${account.refresh_token ? '✅ あり' : '❌ なし'}`);
      console.log(`    token_expires_at: ${account.token_expires_at}`);
    });

    // カレンダー一覧
    const { data: calendars, error: calendarError } = await supabaseAdmin
      .from("calendars")
      .select("*");

    if (calendarError || !calendars?.length) {
      console.error("❌ カレンダーが見つかりません:", calendarError);
      return;
    }

    console.log(`\n✅ 登録済みカレンダー数: ${calendars.length}`);
    calendars.forEach(calendar => {
      console.log(`  - ${calendar.calendar_name} (ID: ${calendar.id})`);
      console.log(`    Google Account ID: ${calendar.google_account_id}`);
      console.log(`    最終同期: ${calendar.last_sync_at || '未同期'}`);
    });

    // 2. Google Calendar APIのテスト
    console.log("\n🔄 Google Calendar API接続テスト...");

    for (const account of googleAccounts) {
      console.log(`\n  アカウント: ${account.email}`);

      try {
        // カレンダー一覧を取得
        const calendarList = await listCalendars(account);
        console.log(`    ✅ カレンダー一覧取得成功: ${calendarList.length}件`);

        // プライマリカレンダーのイベントを取得
        const primaryCalendar = calendarList.find(cal => cal.primary);
        if (primaryCalendar && primaryCalendar.id) {
          const { events } = await listEvents(account, primaryCalendar.id, {
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1週間後まで
          });
          console.log(`    ✅ 今後1週間のイベント: ${events.length}件`);

          if (events.length > 0) {
            console.log("    最初の3件:");
            events.slice(0, 3).forEach(event => {
              console.log(`      - ${event.summary || '(タイトルなし)'} (${event.start?.dateTime || event.start?.date})`);
            });
          }
        }
      } catch (error) {
        console.error(`    ❌ APIエラー:`, error instanceof Error ? error.message : error);
      }
    }

    // 3. 同期イベントの状態を確認
    console.log("\n📋 同期済みイベントを確認...");

    const { data: syncEvents, error: syncError } = await supabaseAdmin
      .from("sync_events")
      .select("*")
      .limit(10);

    if (syncError) {
      console.error("❌ 同期イベント取得エラー:", syncError);
    } else if (!syncEvents?.length) {
      console.log("  ⚠️ 同期済みイベントはありません");
    } else {
      console.log(`  ✅ 同期済みイベント: ${syncEvents.length}件`);
      syncEvents.forEach(event => {
        console.log(`    - ${event.event_title || '(タイトルなし)'}`);
        console.log(`      ソース: Calendar ${event.source_calendar_id}`);
        console.log(`      ターゲット: Calendar ${event.target_calendar_id}`);
        console.log(`      作成日: ${event.created_at}`);
      });
    }

    // 4. 同期ログを確認
    console.log("\n📝 最近の同期ログ...");

    const { data: syncLogs, error: logError } = await supabaseAdmin
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (logError) {
      console.error("❌ ログ取得エラー:", logError);
    } else if (!syncLogs?.length) {
      console.log("  ⚠️ 同期ログはありません");
    } else {
      console.log(`  最新${syncLogs.length}件のログ:`);
      syncLogs.forEach(log => {
        const emoji = log.event_type === 'error' ? '❌' : '✅';
        console.log(`    ${emoji} [${log.event_type}] ${log.message || '(メッセージなし)'}`);
        if (log.error_details) {
          console.log(`       エラー詳細:`, log.error_details);
        }
      });
    }

    // 5. 手動同期テスト（オプション）
    console.log("\n🚀 手動同期を実行しますか？");
    console.log("  注意: これにより実際にカレンダー間で予定が同期されます。");
    console.log("  実行する場合は、以下のコメントを外してください。");

    /*
    // 同期を実行する場合はコメントを外す
    if (calendars.length > 0 && googleAccounts.length > 0) {
      const targetCalendar = calendars[0];
      const targetAccount = googleAccounts.find(a => a.id === targetCalendar.google_account_id);

      if (targetAccount) {
        console.log(`\n同期実行: ${targetCalendar.calendar_name}`);
        const eventsCount = await performInitialSync(targetCalendar, targetAccount);
        console.log(`✅ ${eventsCount}件のイベントを処理しました`);
      }
    }
    */

  } catch (error) {
    console.error("\n❌ テスト中にエラーが発生しました:", error);
  }

  console.log("\n=== テスト完了 ===");
}

// スクリプトを実行
if (require.main === module) {
  testSync()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { testSync };