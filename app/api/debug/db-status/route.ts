import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single();

    // Get Google accounts
    const { data: googleAccounts } = await supabaseAdmin
      .from("google_accounts")
      .select("*")
      .eq("user_id", user?.id || "");

    // Get calendars
    const { data: calendars } = await supabaseAdmin
      .from("calendars")
      .select("*");

    // Get sync events for debugging
    const { data: syncEvents } = await supabaseAdmin
      .from("sync_events")
      .select("*")
      .limit(10);

    return NextResponse.json({
      user,
      googleAccounts,
      calendars,
      syncEvents,
      debug: {
        hasUser: !!user,
        hasGoogleAccounts: (googleAccounts?.length || 0) > 0,
        hasCalendars: (calendars?.length || 0) > 0,
        hasSyncEvents: (syncEvents?.length || 0) > 0,
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({
      error: "Failed to get debug info",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}