import { bigint, boolean, decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const productCatalog = mysqlTable("product_catalog", {
  externalId: varchar("externalId", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 512 }).notNull(),
  arabicName: varchar("arabicName", { length: 512 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 12, scale: 2 }).notNull(),
  previousPrice: decimal("previousPrice", { precision: 12, scale: 2 }),
  soldTimes: int("soldTimes").notNull().default(0),
  activeIngredient: text("activeIngredient"),
  imagePath: varchar("imagePath", { length: 512 }),
  category: varchar("category", { length: 255 }),
  company: varchar("company", { length: 255 }),
  dosageForm: varchar("dosageForm", { length: 128 }),
  barcode: varchar("barcode", { length: 128 }),
  administrationRoute: varchar("administrationRoute", { length: 128 }),
  description: text("description"),
  sourceUpdatedAt: bigint("sourceUpdatedAt", { mode: "number" }).notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
}, (table) => [
  index("product_catalog_name_idx").on(table.name),
  index("product_catalog_arabic_name_idx").on(table.arabicName),
  index("product_catalog_barcode_idx").on(table.barcode),
  index("product_catalog_company_idx").on(table.company),
  index("product_catalog_updated_idx").on(table.sourceUpdatedAt),
]);

export const catalogSyncState = mysqlTable("catalog_sync_state", {
  id: varchar("id", { length: 40 }).primaryKey(),
  nextOffset: int("nextOffset").notNull().default(0),
  isComplete: boolean("isComplete").notNull().default(false),
  lastFullSyncAt: timestamp("lastFullSyncAt"),
  lastLatestSyncAt: timestamp("lastLatestSyncAt"),
  lastError: varchar("lastError", { length: 512 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCatalog = typeof productCatalog.$inferSelect;
export type InsertProductCatalog = typeof productCatalog.$inferInsert;
