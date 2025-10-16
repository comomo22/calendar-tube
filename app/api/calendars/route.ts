import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { listCalendars } from "@/lib/google/calendar";
import { webhookManager } from "@/lib/google/webhook-manager";
import { GoogleAccount, Calendar } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's Google accounts with their calendars
    const { data: accounts } = await supabaseAdmin
      .from("google_accounts")
      .select("*, calendars(*)")
      .eq("user_id", user.id);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching calendars:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { googleAccountId } = await request.json();

    // Get the Google account
    const { data: account } = await supabaseAdmin
      .from("google_accounts")
      .select("*")
      .eq("id", googleAccountId)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "Google account not found" },
        { status: 404 }
      );
    }

    // Get primary calendar from Google
    const calendars = await listCalendars(account);
    const primaryCalendar = calendars.find((cal) => cal.primary);

    if (!primaryCalendar) {
      return NextResponse.json(
        { error: "Primary calendar not found" },
        { status: 404 }
      );
    }

    // Check if calendar already exists
    const { data: existingCalendar } = await supabaseAdmin
      .from("calendars")
      .select("id")
      .eq("google_account_id", googleAccountId)
      .eq("calendar_id", primaryCalendar.id!)
      .single();

    if (existingCalendar) {
      return NextResponse.json(
        { error: "Calendar already added" },
        { status: 400 }
      );
    }

    // Create calendar record first
    const { data: calendar, error } = await supabaseAdmin
      .from("calendars")
      .insert({
        google_account_id: googleAccountId,
        calendar_id: primaryCalendar.id!,
        calendar_name: primaryCalendar.summary || "Primary Calendar",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating calendar:", error);
      return NextResponse.json(
        { error: "Failed to create calendar" },
        { status: 500 }
      );
    }

    // Setup webhook using the new WebhookManager
    try {
      const webhookInfo = await webhookManager.setupWebhook(
        account as GoogleAccount,
        calendar as Calendar
      );

      console.log(`Webhook setup successful for calendar ${calendar.id}`, webhookInfo);
    } catch (webhookError) {
      // Webhookの設定に失敗してもカレンダーの作成は成功とする
      console.error("Failed to setup webhook, but calendar was created:", webhookError);
    }

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error("Error adding calendar:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
