import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // ユーザー一覧
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*")
      .order("created_at");

    if (usersError) throw usersError;

    // Googleアカウント一覧
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from("google_accounts")
      .select("id, user_id, email, name, created_at")
      .order("created_at");

    if (accountsError) throw accountsError;

    // カレンダー一覧
    const { data: calendars, error: calendarsError } = await supabaseAdmin
      .from("calendars")
      .select("id, google_account_id, calendar_name, is_active, created_at")
      .order("created_at");

    if (calendarsError) throw calendarsError;

    // 同期イベント数
    const { count: syncEventsCount, error: syncEventsError } = await supabaseAdmin
      .from("sync_events")
      .select("*", { count: "exact", head: true });

    if (syncEventsError) throw syncEventsError;

    return NextResponse.json({
      users: users || [],
      googleAccounts: accounts || [],
      calendars: calendars || [],
      syncEventsCount: syncEventsCount || 0,
    });
  } catch (error: any) {
    console.error("Error fetching debug data:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
