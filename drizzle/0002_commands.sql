CREATE TABLE mutation_receipts (
  operation_id TEXT PRIMARY KEY, command_name TEXT NOT NULL, request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  action TEXT NOT NULL, version INTEGER, occurred_at TEXT NOT NULL
);
