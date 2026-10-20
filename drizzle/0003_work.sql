CREATE TABLE contacts (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'pessoa', phone TEXT, email TEXT,
 responsible_name TEXT, notes TEXT NOT NULL DEFAULT '', archived_at TEXT,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX contacts_phone ON contacts(phone);
CREATE INDEX contacts_email ON contacts(email);
CREATE TABLE projects (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, area_id TEXT NOT NULL REFERENCES business_areas(id),
 contact_id TEXT REFERENCES contacts(id), goal TEXT NOT NULL DEFAULT '', target_date TEXT,
 status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','pausado','concluido','arquivado')),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE tasks (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', area_id TEXT REFERENCES business_areas(id),
 project_id TEXT REFERENCES projects(id), priority TEXT NOT NULL DEFAULT 'normal',
 status TEXT NOT NULL DEFAULT 'entrada' CHECK(status IN ('entrada','a_fazer','em_andamento','aguardando','concluida','cancelada')),
 due_date TEXT, estimate_minutes INTEGER, review_date TEXT, waiting_reason TEXT,
 checklist TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]', started_at TEXT, completed_at TEXT,
 focus_date TEXT, series_id TEXT, occurrence_key INTEGER, is_exception INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(series_id, occurrence_key)
);
CREATE INDEX tasks_filters ON tasks(area_id, status, project_id, due_date);
CREATE INDEX projects_filters ON projects(area_id, status);
