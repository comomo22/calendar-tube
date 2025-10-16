import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { listEvents } from "@/lib/google/calendar";
import { syncEvent } from "@/lib/sync/engine";

export async function POST(request: NextRequest) {
  try {
    // Get headers from Google Calendar webhook
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const resourceId = request.headers.get("x-goog-resource-id");

    console.log("Webhook received:", {
      channelId,
      resourceState,
      resourceId,
    });

    // Ignore sync messages
    if (resourceState === "sync") {
      return NextResponse.json({ message: "Sync message received" });
    }

    if (!channelId) {
      return NextResponse.json(
        { error: "Missing channel ID" },
        { status: 400 }
      );
    }

    // Find the calendar for this webhook
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from("calendars")
      .select("*, google_accounts!inner(*)")
      .eq("webhook_channel_id", channelId)
      .single();

    if (calendarError || !calendar) {
      console.error("Calendar not found for channel:", channelId);
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 }
      );
    }

    const account = (calendar as any).google_accounts;

    // Fetch updated events using sync token
    const { events, nextSyncToken } = await listEvents(
      account,
      calendar.calendar_id,
      {
        syncToken: calendar.sync_token || undefined,
      }
    );

    // Update sync token
    await supabaseAdmin
      .from("calendars")
      .update({
        sync_token: nextSyncToken,
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", calendar.id);

    // Process each changed event
    for (const event of events) {
      if (event.status === "cancelled") {
        // Event was deleted
        await syncEvent(calendar, account, event, "deleted");
      } else {
        // Check if event exists in our database to determine if created or updated
        const { data: existingEvent } = await supabaseAdmin
          .from("sync_events")
          .select("id")
          .eq("source_calendar_id", calendar.id)
          .eq("source_event_id", event.id!)
          .single();

        if (existingEvent) {
          await syncEvent(calendar, account, event, "updated");
        } else {
          await syncEvent(calendar, account, event, "created");
        }
      }
    }

    return NextResponse.json({
      message: "Webhook processed successfully",
      eventsProcessed: events.length,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
