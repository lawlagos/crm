CREATE TABLE recurrence_series (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('task','event','receivable')), title TEXT NOT NULL,
 area_id TEXT NOT NULL REFERENCES business_areas(id), anchor_date TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT,
 weekday INTEGER, day_of_month INTEGER, time TEXT NOT NULL DEFAULT '09:00', duration_minutes INTEGER NOT NULL DEFAULT 30,
 payload TEXT NOT NULL DEFAULT '{}', active INTEGER NOT NULL DEFAULT 1, cursor INTEGER NOT NULL DEFAULT -1,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE weekly_reviews (
 id TEXT PRIMARY KEY, week TEXT NOT NULL UNIQUE, checklist TEXT NOT NULL DEFAULT '{}',
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
