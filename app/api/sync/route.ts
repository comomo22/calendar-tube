import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { performInitialSync } from "@/lib/sync/engine";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { calendarId } = await request.json();

    // Get calendar with account info
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from("calendars")
      .select("*, google_accounts!inner(*)")
      .eq("id", calendarId)
      .single();

    if (calendarError || !calendar) {
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 }
      );
    }

    const account = (calendar as any).google_accounts;

    // Verify user owns this calendar
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (account.user_id !== user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Perform sync
    const eventsCount = await performInitialSync(calendar, account);

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
