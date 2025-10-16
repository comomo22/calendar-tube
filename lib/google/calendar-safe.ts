/**
 * Google Calendar API のエラーハンドリング対応版
 * すべてのAPI呼び出しにリトライロジックを適用
 */

import { GoogleAccount } from "@/lib/types/database";
import {
  listCalendars as _listCalendars,
  listEvents as _listEvents,
  createEvent as _createEvent,
  updateEvent as _updateEvent,
  deleteEvent as _deleteEvent,
} from "./calendar";
import { retryWithBackoff } from "@/lib/utils/error-handler";

/**
 * カレンダー一覧を取得（リトライ付き）
 */
export async function listCalendarsSafe(account: GoogleAccount) {
  return retryWithBackoff(
    () => _listCalendars(account),
    {
      maxAttempts: 3,
      onRetry: (error, attempt) => {
        console.log(
          `[Calendar API] listCalendars retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );
}

/**
 * イベント一覧を取得（リトライ付き）
 */
export async function listEventsSafe(
  account: GoogleAccount,
  calendarId: string,
  options?: {
    syncToken?: string;
    timeMin?: string;
    timeMax?: string;
  }
) {
  return retryWithBackoff(
    () => _listEvents(account, calendarId, options),
    {
      maxAttempts: 3,
      onRetry: (error, attempt) => {
        console.log(
          `[Calendar API] listEvents retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );
}

/**
 * イベントを作成（リトライ付き）
 */
export async function createEventSafe(
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
  return retryWithBackoff(
    () => _createEvent(account, calendarId, event),
    {
      maxAttempts: 3,
      onRetry: (error, attempt) => {
        console.log(
          `[Calendar API] createEvent retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );
}

/**
 * イベントを更新（リトライ付き）
 */
export async function updateEventSafe(
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
  return retryWithBackoff(
    () => _updateEvent(account, calendarId, eventId, event),
    {
      maxAttempts: 3,
      onRetry: (error, attempt) => {
        console.log(
          `[Calendar API] updateEvent retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );
}

/**
 * イベントを削除（リトライ付き）
 */
export async function deleteEventSafe(
  account: GoogleAccount,
  calendarId: string,
  eventId: string
) {
  return retryWithBackoff(
    () => _deleteEvent(account, calendarId, eventId),
    {
      maxAttempts: 3,
      onRetry: (error, attempt) => {
        console.log(
          `[Calendar API] deleteEvent retry attempt ${attempt}: ${error.message}`
        );
      },
    }
  );
}