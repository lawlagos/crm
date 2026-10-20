CREATE TABLE calendar_events (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, area_id TEXT NOT NULL REFERENCES business_areas(id),
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, time_zone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
 location TEXT, contact_id TEXT REFERENCES contacts(id), project_id TEXT REFERENCES projects(id), task_id TEXT REFERENCES tasks(id),
 status TEXT NOT NULL DEFAULT 'agendado', series_id TEXT, occurrence_key INTEGER, is_exception INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(series_id, occurrence_key)
);
CREATE INDEX calendar_interval ON calendar_events(starts_at,ends_at,status);

