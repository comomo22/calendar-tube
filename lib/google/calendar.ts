import { google } from "googleapis";
import { GoogleAccount } from "@/lib/types/database";
import { tokenManager } from "./token-manager";

export async function getCalendarClient(account: GoogleAccount) {
  // 新しいトークン管理システムを使用
  const oauth2Client = await tokenManager.getAuthenticatedClient(account);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function listCalendars(account: GoogleAccount) {
  const calendar = await getCalendarClient(account);
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

export async function setupWebhook(
  account: GoogleAccount,
  calendarId: string,
  channelId: string,
  webhookUrl: string
) {
  const calendar = await getCalendarClient(account);

  const response = await calendar.events.watch({
    calendarId: calendarId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      // Expires in 7 days (max allowed)
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return response.data;
}

export async function stopWebhook(
  account: GoogleAccount,
  channelId: string,
  resourceId: string
) {
  const calendar = await getCalendarClient(account);

  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId: resourceId,
    },
  });
}

export async function listEvents(
  account: GoogleAccount,
  calendarId: string,
  options?: {
    syncToken?: string;
    timeMin?: string;
    timeMax?: string;
  }
) {
  const calendar = await getCalendarClient(account);

  const params: any = {
    calendarId: calendarId,
    singleEvents: true,
    orderBy: "startTime" as const,
  };

  if (options?.syncToken) {
    params.syncToken = options.syncToken;
  } else {
    if (options?.timeMin) {
      params.timeMin = options.timeMin;
    }
    if (options?.timeMax) {
      params.timeMax = options.timeMax;
    }
  }

  const response = await calendar.events.list(params);

  return {
    events: response.data.items || [],
    nextSyncToken: response.data.nextSyncToken,
  };
}

export async function createEvent(
  account: GoogleAccount,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    extendedProperties?: {
      private?: Record<string, string>;
    };
  }
) {
  const calendar = await getCalendarClient(account);

  const response = await calendar.events.insert({
    calendarId: calendarId,
    requestBody: event,
  });

  return response.data;
}

export async function updateEvent(
  account: GoogleAccount,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: { dateTime: string; timeZone?: string };
    end?: { dateTime: string; timeZone?: string };
    extendedProperties?: {
      private?: Record<string, string>;
    };
  }
) {
  const calendar = await getCalendarClient(account);

  const response = await calendar.events.patch({
    calendarId: calendarId,
    eventId: eventId,
    requestBody: event,
  });

  return response.data;
}

export async function deleteEvent(
  account: GoogleAccount,
  calendarId: string,
  eventId: string
) {
  const calendar = await getCalendarClient(account);

  await calendar.events.delete({
    calendarId: calendarId,
    eventId: eventId,
  });
}
