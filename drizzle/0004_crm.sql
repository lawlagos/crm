CREATE TABLE contact_relationships (
 contact_id TEXT NOT NULL REFERENCES contacts(id), area_id TEXT NOT NULL REFERENCES business_areas(id),
 role TEXT NOT NULL DEFAULT 'cliente', created_at TEXT NOT NULL, PRIMARY KEY(contact_id, area_id, role)
);
CREATE TABLE opportunities (
 id TEXT PRIMARY KEY, contact_id TEXT NOT NULL REFERENCES contacts(id), area_id TEXT NOT NULL REFERENCES business_areas(id),
 project_id TEXT REFERENCES projects(id), offer_name TEXT NOT NULL, estimated_cents INTEGER,
 source TEXT NOT NULL DEFAULT 'nao_identificado', campaign TEXT, stage TEXT NOT NULL DEFAULT 'novo',
 next_action TEXT, next_action_date TEXT, notes TEXT NOT NULL DEFAULT '', last_interaction_at TEXT,
 closed_at TEXT, loss_reason TEXT, loss_note TEXT, close_version INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX opportunities_filters ON opportunities(area_id, stage, next_action_date);
CREATE TABLE interactions (
 id TEXT PRIMARY KEY, contact_id TEXT NOT NULL REFERENCES contacts(id), opportunity_id TEXT REFERENCES opportunities(id),
 occurred_at TEXT NOT NULL, channel TEXT NOT NULL, type TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL
);
