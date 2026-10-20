CREATE TABLE deal_closures (
 id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES opportunities(id), close_version INTEGER NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), closed_date TEXT NOT NULL,
 project_id TEXT REFERENCES projects(id), reversed_at TEXT, created_at TEXT NOT NULL,
 UNIQUE(opportunity_id, close_version)
);
CREATE TABLE receivables (
 id TEXT PRIMARY KEY, area_id TEXT NOT NULL REFERENCES business_areas(id), description TEXT NOT NULL,
 contact_id TEXT REFERENCES contacts(id), project_id TEXT REFERENCES projects(id), opportunity_id TEXT REFERENCES opportunities(id),
 closure_id TEXT REFERENCES deal_closures(id), amount_cents INTEGER NOT NULL CHECK(amount_cents BETWEEN 1 AND 9999999999), due_date TEXT NOT NULL,
 cancelled_at TEXT, series_id TEXT, occurrence_key INTEGER, is_exception INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(series_id, occurrence_key)
);
CREATE INDEX receivables_filters ON receivables(area_id, due_date);
CREATE TABLE payments (
 id TEXT PRIMARY KEY, receivable_id TEXT NOT NULL REFERENCES receivables(id), amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
 effective_date TEXT NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX payments_receivable ON payments(receivable_id);
CREATE TABLE payment_reversals (
 id TEXT PRIMARY KEY, payment_id TEXT NOT NULL REFERENCES payments(id), amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
 effective_date TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX reversals_payment ON payment_reversals(payment_id);
CREATE TRIGGER immutable_payments_update BEFORE UPDATE ON payments BEGIN SELECT RAISE(ABORT,'Extrato imutavel'); END;
CREATE TRIGGER immutable_payments_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'Extrato imutavel'); END;
CREATE TRIGGER immutable_reversals_update BEFORE UPDATE ON payment_reversals BEGIN SELECT RAISE(ABORT,'Extrato imutavel'); END;
CREATE TRIGGER immutable_reversals_delete BEFORE DELETE ON payment_reversals BEGIN SELECT RAISE(ABORT,'Extrato imutavel'); END;
