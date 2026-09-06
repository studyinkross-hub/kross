import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable(
  'records',
  {
    session: text('session').notNull(),
    id: text('id').notNull(),
    kind: text('kind').notNull(),
    payload: text('payload').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.session, t.id] })],
);
