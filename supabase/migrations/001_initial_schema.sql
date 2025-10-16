-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google accounts (multiple per user)
CREATE TABLE IF NOT EXISTS google_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_google_accounts_user_id ON google_accounts(user_id);
CREATE INDEX idx_google_accounts_google_id ON google_accounts(google_id);

-- Calendars (one per Google account, or specific calendars to sync)
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_account_id UUID NOT NULL REFERENCES google_accounts(id) ON DELETE CASCADE,
  calendar_id TEXT NOT NULL, -- Google Calendar ID
  calendar_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  webhook_channel_id TEXT, -- Google Push Notification Channel ID
  webhook_resource_id TEXT, -- Google Push Notification Resource ID
  webhook_expires_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT, -- For incremental sync
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(google_account_id, calendar_id)
);

CREATE INDEX idx_calendars_google_account_id ON calendars(google_account_id);
CREATE INDEX idx_calendars_calendar_id ON calendars(calendar_id);
CREATE INDEX idx_calendars_webhook_channel_id ON calendars(webhook_channel_id);

-- Synced events (track which events are synced copies)
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  source_event_id TEXT NOT NULL, -- Google Calendar Event ID in source
  target_calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  target_event_id TEXT NOT NULL, -- Google Calendar Event ID in target
  event_title TEXT,
  event_start TIMESTAMP WITH TIME ZONE,
  event_end TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_calendar_id, source_event_id, target_calendar_id)
);

CREATE INDEX idx_sync_events_source ON sync_events(source_calendar_id, source_event_id);
CREATE INDEX idx_sync_events_target ON sync_events(target_calendar_id, target_event_id);
CREATE INDEX idx_sync_events_created_at ON sync_events(created_at);

-- Sync logs (for debugging and monitoring)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'error'
  event_id TEXT,
  message TEXT,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_calendar_id ON sync_logs(calendar_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX idx_sync_logs_event_type ON sync_logs(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_accounts_updated_at BEFORE UPDATE ON google_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendars_updated_at BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_events_updated_at BEFORE UPDATE ON sync_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
