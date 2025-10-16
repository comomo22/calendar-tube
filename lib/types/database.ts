export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleAccount {
  id: string;
  user_id: string;
  google_id: string;
  email: string;
  name: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  google_account_id: string;
  calendar_id: string;
  calendar_name: string;
  is_active: boolean;
  webhook_channel_id: string | null;
  webhook_resource_id: string | null;
  webhook_expires_at: string | null;
  sync_token: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncEvent {
  id: string;
  source_calendar_id: string;
  source_event_id: string;
  target_calendar_id: string;
  target_event_id: string;
  event_title: string | null;
  event_start: string | null;
  event_end: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  calendar_id: string | null;
  event_type: 'created' | 'updated' | 'deleted' | 'error';
  event_id: string | null;
  message: string | null;
  error_details: Record<string, any> | null;
  created_at: string;
}
