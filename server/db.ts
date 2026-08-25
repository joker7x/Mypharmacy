import { count, desc, eq, isNotNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { catalogSyncState, InsertProductCatalog, InsertUser, productCatalog, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const CATALOG_STATE_ID = "dwaprices";

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("قاعدة بيانات دليل الأصناف غير متاحة حاليًا.");
  return db;
}

export async function getCatalogStatus() {
  const db = requireDatabase(await getDb());
  const [summary] = await db.select({ total: count() }).from(productCatalog);
  const [state] = await db.select().from(catalogSyncState).where(eq(catalogSyncState.id, CATALOG_STATE_ID)).limit(1);
  const nextOffset = state?.nextOffset ?? 0;
  return {
    productCount: Number(summary?.total ?? 0),
    nextOffset,
    isComplete: state?.isComplete ?? false,
    progress: state?.isComplete ? 100 : Math.min(100, Math.round((nextOffset / 60_000) * 100)),
    lastFullSyncAt: state?.lastFullSyncAt?.toISOString() ?? null,
    lastLatestSyncAt: state?.lastLatestSyncAt?.toISOString() ?? null,
    lastError: state?.lastError ?? null,
  };
}

export async function upsertCatalogProducts(products: InsertProductCatalog[]) {
  if (!products.length) return;
  const db = requireDatabase(await getDb());
  const syncedAt = new Date();
  await db.insert(productCatalog).values(products.map((product) => ({ ...product, syncedAt }))).onDuplicateKeyUpdate({
    set: {
      name: sql`VALUES(${productCatalog.name})`,
      arabicName: sql`VALUES(${productCatalog.arabicName})`,
      currentPrice: sql`VALUES(${productCatalog.currentPrice})`,
      previousPrice: sql`VALUES(${productCatalog.previousPrice})`,
      soldTimes: sql`VALUES(${productCatalog.soldTimes})`,
      sourceUpdatedAt: sql`VALUES(${productCatalog.sourceUpdatedAt})`,
      syncedAt,
    },
  });
}

export async function saveCatalogSyncState(input: {
  nextOffset: number;
  isComplete: boolean;
  lastFullSyncAt?: Date;
  lastLatestSyncAt?: Date;
  lastError?: string | null;
}) {
  const db = requireDatabase(await getDb());
  const updatedAt = new Date();
  await db.insert(catalogSyncState).values({ id: CATALOG_STATE_ID, ...input, updatedAt }).onDuplicateKeyUpdate({
    set: { ...input, updatedAt },
  });
}

export async function searchCatalogProducts(query: string, limit: number) {
  const db = requireDatabase(await getDb());
  const term = `%${query.trim()}%`;
  return db.select().from(productCatalog).where(or(
    like(productCatalog.arabicName, term),
    like(productCatalog.name, term),
    like(productCatalog.externalId, term),
  )).orderBy(desc(productCatalog.sourceUpdatedAt)).limit(limit);
}

export async function listRecentPriceChanges(limit: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(productCatalog).where(isNotNull(productCatalog.previousPrice)).orderBy(desc(productCatalog.sourceUpdatedAt)).limit(limit);
}
