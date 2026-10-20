CREATE TABLE business_areas (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, color_key TEXT NOT NULL,
  commercial_enabled INTEGER NOT NULL CHECK(commercial_enabled IN (0,1)), archived_at TEXT,
  version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
INSERT INTO business_areas (id,name,color_key,commercial_enabled,created_at,updated_at) VALUES
('11111111-1111-4111-8111-111111111111','Jiu-jítsu','jiu',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('22222222-2222-4222-8222-222222222222','Agência','agency',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('33333333-3333-4333-8333-333333333333','Cursos','courses',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('44444444-4444-4444-8444-444444444444','Fórum','forum',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
INSERT INTO settings (key,value_json) VALUES
('locale','"pt-BR"'),('timeZone','"America/Sao_Paulo"'),('wipLimit','3'),
('forumHours','{"weekdays":[1,2,3,4,5],"start":"09:00","end":"17:00"}'),
('availabilityWindows','[{"weekdays":[1,2,3,4,5],"start":"18:30","end":"20:30"},{"weekdays":[6],"start":"09:00","end":"12:00"}]');
