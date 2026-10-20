import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const businessAreas = sqliteTable('business_areas', {
  id: text('id').primaryKey(), name: text('name').notNull(), colorKey: text('color_key').notNull(),
  commercialEnabled: integer('commercial_enabled', { mode: 'boolean' }).notNull(), archivedAt: text('archived_at'),
  version: integer('version').notNull().default(1), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(), valueJson: text('value_json').notNull(), version: integer('version').notNull().default(1),
});
