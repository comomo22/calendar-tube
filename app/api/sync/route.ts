import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { performInitialSync } from "@/lib/sync/engine";

export async function POST(request: NextRequest) {
  try {
    console.log("[Sync API] Sync request received");

    const session = await auth();

    if (!session?.user?.email) {
      console.log("[Sync API] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Sync API] User: ${session.user.email}`);

    const { calendarId } = await request.json();
    console.log(`[Sync API] Calendar ID: ${calendarId}`);

    // Get calendar with account info
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from("calendars")
      .select("*, google_accounts!inner(*)")
      .eq("id", calendarId)
      .single();

    if (calendarError || !calendar) {
      console.error("[Sync API] Calendar not found:", calendarError);
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 }
      );
    }

    const account = (calendar as any).google_accounts;
    console.log(`[Sync API] Calendar: ${calendar.calendar_name}`);
    console.log(`[Sync API] Google Account: ${account.email}`);

    // Verify user owns this calendar
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (account.user_id !== user?.id) {
      console.error("[Sync API] User does not own this calendar");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log(`[Sync API] Starting sync process...`);

    // Perform sync
    const eventsCount = await performInitialSync(calendar, account);

    console.log(`[Sync API] Sync completed. Events processed: ${eventsCount}`);

    return NextResponse.json({
      message: "Sync completed successfully",
      eventsProcessed: eventsCount,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
