import { supabaseAdmin } from "@/lib/supabase/client";
import { Calendar, GoogleAccount } from "@/lib/types/database";
import {
  listEventsSafe,
  createEventSafe,
  updateEventSafe,
  deleteEventSafe,
} from "@/lib/google/calendar-safe";

const SYNC_MARKER = "calendar-tube-synced";
const SOURCE_CALENDAR_KEY = "source_calendar_id";

export async function syncEvent(
  sourceCalendar: Calendar,
  sourceAccount: GoogleAccount,
  event: any,
  eventType: "created" | "updated" | "deleted"
) {
  console.log(`[SyncEngine] Starting sync for event ${event.id || eventType}`);
  console.log(`[SyncEngine] Source calendar: ${sourceCalendar.calendar_name} (${sourceCalendar.id})`);
  console.log(`[SyncEngine] Event type: ${eventType}`);
  console.log(`[SyncEngine] Event summary: ${event.summary || '(no title)'}`);

  // Check if this event is a synced copy (has our marker)
  const isSyncedCopy =
    event.extendedProperties?.private?.[SYNC_MARKER] === "true";

  if (isSyncedCopy) {
    // This is a synced copy, don't sync it again to prevent loops
    console.log(`[SyncEngine] Skipping synced copy: ${event.id} (has calendar-tube-synced marker)`);
    return;
  }

  console.log(`[SyncEngine] Event is original, proceeding with sync`);

  // Get all calendars for this user except the source
  console.log(`[SyncEngine] Finding target calendars for user ${sourceAccount.user_id}`);
  const { data: userCalendars, error: fetchError } = await supabaseAdmin
    .from("calendars")
    .select("*, google_accounts!inner(*)")
    .eq("google_accounts.user_id", sourceAccount.user_id)
    .eq("is_active", true)
    .neq("id", sourceCalendar.id);

  if (fetchError) {
    console.error(`[SyncEngine] Error fetching target calendars:`, fetchError);
    return;
  }

  if (!userCalendars || userCalendars.length === 0) {
    console.log("[SyncEngine] No target calendars found to sync to");
    console.log(`[SyncEngine] Total calendars for user: checking...`);

    // Debug: Check all calendars for this user
    const { data: allCalendars } = await supabaseAdmin
      .from("calendars")
      .select("*, google_accounts!inner(*)")
      .eq("google_accounts.user_id", sourceAccount.user_id);

    console.log(`[SyncEngine] Total calendars found: ${allCalendars?.length || 0}`);
    allCalendars?.forEach(cal => {
      console.log(`[SyncEngine]   - ${cal.calendar_name} (active: ${cal.is_active}, id: ${cal.id})`);
    });
    return;
  }

  console.log(`[SyncEngine] Found ${userCalendars.length} target calendar(s) to sync to`)

  for (const targetCalendar of userCalendars) {
    try {
      const targetAccount = (targetCalendar as any).google_accounts;

      if (eventType === "deleted") {
        await handleDeletedEvent(
          sourceCalendar,
          event.id,
          targetCalendar,
          targetAccount
        );
      } else if (eventType === "created") {
        await handleCreatedEvent(
          sourceCalendar,
          event,
          targetCalendar,
          targetAccount
        );
      } else if (eventType === "updated") {
        await handleUpdatedEvent(
          sourceCalendar,
          event,
          targetCalendar,
          targetAccount
        );
      }

      // Log success
      await supabaseAdmin.from("sync_logs").insert({
        calendar_id: targetCalendar.id,
        event_type: eventType,
        event_id: event.id,
        message: `Successfully synced event to ${targetCalendar.calendar_name}`,
      });
    } catch (error) {
      console.error(`Error syncing to ${targetCalendar.calendar_name}:`, error);

      // Log error
      await supabaseAdmin.from("sync_logs").insert({
        calendar_id: targetCalendar.id,
        event_type: "error",
        event_id: event.id,
        message: `Failed to sync event`,
        error_details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

async function handleCreatedEvent(
  sourceCalendar: Calendar,
  event: any,
  targetCalendar: Calendar,
  targetAccount: GoogleAccount
) {
  // Check if already synced
  const { data: existingSync } = await supabaseAdmin
    .from("sync_events")
    .select("*")
    .eq("source_calendar_id", sourceCalendar.id)
    .eq("source_event_id", event.id)
    .eq("target_calendar_id", targetCalendar.id)
    .single();

  if (existingSync) {
    console.log("Event already synced, skipping");
    return;
  }

  // Create event in target calendar with sync marker
  const newEvent = await createEventSafe(
    targetAccount,
    targetCalendar.calendar_id,
    {
      summary: event.summary || "予定あり",
      description: event.description,
      start: event.start,
      end: event.end,
      extendedProperties: {
        private: {
          [SYNC_MARKER]: "true",
          [SOURCE_CALENDAR_KEY]: sourceCalendar.id,
          source_event_id: event.id,
        },
      },
    }
  );

  // Record in database
  await supabaseAdmin.from("sync_events").insert({
    source_calendar_id: sourceCalendar.id,
    source_event_id: event.id,
    target_calendar_id: targetCalendar.id,
    target_event_id: newEvent.id!,
    event_title: event.summary,
    event_start: event.start?.dateTime || event.start?.date,
    event_end: event.end?.dateTime || event.end?.date,
  });
}

async function handleUpdatedEvent(
  sourceCalendar: Calendar,
  event: any,
  targetCalendar: Calendar,
  targetAccount: GoogleAccount
) {
  // Find the synced event
  const { data: syncEvent } = await supabaseAdmin
    .from("sync_events")
    .select("*")
    .eq("source_calendar_id", sourceCalendar.id)
    .eq("source_event_id", event.id)
    .eq("target_calendar_id", targetCalendar.id)
    .single();

  if (!syncEvent) {
    // Not synced yet, create it
    await handleCreatedEvent(
      sourceCalendar,
      event,
      targetCalendar,
      targetAccount
    );
    return;
  }

  // Update the event in target calendar
  await updateEventSafe(
    targetAccount,
    targetCalendar.calendar_id,
    syncEvent.target_event_id,
    {
      summary: event.summary || "予定あり",
      description: event.description,
      start: event.start,
      end: event.end,
      extendedProperties: {
        private: {
          [SYNC_MARKER]: "true",
          [SOURCE_CALENDAR_KEY]: sourceCalendar.id,
          source_event_id: event.id,
        },
      },
    }
  );

  // Update database record
  await supabaseAdmin
    .from("sync_events")
    .update({
      event_title: event.summary,
      event_start: event.start?.dateTime || event.start?.date,
      event_end: event.end?.dateTime || event.end?.date,
    })
    .eq("id", syncEvent.id);
}

async function handleDeletedEvent(
  sourceCalendar: Calendar,
  eventId: string,
  targetCalendar: Calendar,
  targetAccount: GoogleAccount
) {
  // Find the synced event
  const { data: syncEvent } = await supabaseAdmin
    .from("sync_events")
    .select("*")
    .eq("source_calendar_id", sourceCalendar.id)
    .eq("source_event_id", eventId)
    .eq("target_calendar_id", targetCalendar.id)
    .single();

  if (!syncEvent) {
    console.log("No synced event found to delete");
    return;
  }

  // Delete from target calendar
  try {
    await deleteEventSafe(
      targetAccount,
      targetCalendar.calendar_id,
      syncEvent.target_event_id
    );
  } catch (error) {
    console.error("Error deleting event:", error);
    // Continue even if delete fails (event might already be deleted)
  }

  // Mark as deleted in database
  await supabaseAdmin
    .from("sync_events")
    .update({ is_deleted: true })
    .eq("id", syncEvent.id);
}

export async function performInitialSync(
  calendar: Calendar,
  account: GoogleAccount
) {
  console.log(`[PerformInitialSync] Starting initial sync for calendar: ${calendar.calendar_name}`);
  console.log(`[PerformInitialSync] Calendar ID: ${calendar.id}`);
  console.log(`[PerformInitialSync] Google Account: ${account.email}`);

  const now = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  console.log(`[PerformInitialSync] Fetching events from ${now.toISOString()} to ${threeMonthsLater.toISOString()}`);

  const { events, nextSyncToken } = await listEventsSafe(account, calendar.calendar_id, {
    timeMin: now.toISOString(),
    timeMax: threeMonthsLater.toISOString(),
  });

  console.log(`[PerformInitialSync] Found ${events.length} events to sync`);

  // Update sync token
  await supabaseAdmin
    .from("calendars")
    .update({
      sync_token: nextSyncToken,
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", calendar.id);

  console.log(`[PerformInitialSync] Updated sync token and last_sync_at`);

  // Sync each event
  let syncedCount = 0;
  for (const event of events) {
    if (event.status !== "cancelled") {
      console.log(`[PerformInitialSync] Processing event ${syncedCount + 1}/${events.length}: ${event.summary || '(no title)'}`);
      await syncEvent(calendar, account, event, "created");
      syncedCount++;
    } else {
      console.log(`[PerformInitialSync] Skipping cancelled event: ${event.id}`);
    }
  }

  console.log(`[PerformInitialSync] Sync complete. Processed ${syncedCount} events`);
  return events.length;
}
