import type { InsertProductCatalog } from "../drizzle/schema";
import * as db from "./db";

const API_URL = "https://dwaprices.com/api_dr88g/serverz.php";
export const PAGE_SIZE = 100;
export const MAX_PAGES = 600;
const MAX_OFFSET = PAGE_SIZE * MAX_PAGES;

type UnknownRecord = Record<string, unknown>;

const asText = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const asNumber = (value: unknown) => {
  const text = asText(value).replace(/,/g, "");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function extractProductList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) if (Array.isArray(value)) return value;
  }
  return [];
}

export function normalizeDwapriceProduct(item: unknown): InsertProductCatalog | null {
  if (!item || typeof item !== "object") return null;
  const record = item as UnknownRecord;
  const externalId = asText(record.id);
  const name = asText(record.name);
  const arabicName = asText(record.arabic);
  const price = asNumber(record.price);
  if (!externalId || (!name && !arabicName) || price === null) return null;
  const oldPrice = asNumber(record.oldprice);
  const soldTimes = asNumber(record.sold_times) ?? 0;
  const sourceTimestamp = asNumber(record.Date_updated);
  return {
    externalId,
    name: name || arabicName,
    arabicName: arabicName || name,
    currentPrice: price.toFixed(2),
    previousPrice: oldPrice === null ? null : oldPrice.toFixed(2),
    soldTimes: Math.max(0, Math.trunc(soldTimes)),
    sourceUpdatedAt: sourceTimestamp && sourceTimestamp > 1_000_000_000 ? Math.trunc(sourceTimestamp * 1000) : Date.now(),
  };
}

export async function fetchDwapricePage(offset: number, timeoutMs = 30_000) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: new URLSearchParams({ lastpricesForFlutter: String(Math.max(0, Math.trunc(offset))) }).toString(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`تعذر الاتصال بمصدر الأسعار (${response.status}).`);
      return extractProductList(await response.json());
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 750);
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError instanceof Error && lastError.name === "AbortError") throw new Error("انتهت مهلة الاتصال بمصدر الأسعار.");
  throw new Error(lastError instanceof Error ? lastError.message : "تعذر الاتصال بمصدر الأسعار.");
}

export async function syncCatalogBatch(maxPages = 20) {
  const status = await db.getCatalogStatus();
  if (status.isComplete) return { ...status, pagesFetched: 0, productsFetched: 0, completedNow: false };
  const pages = Math.min(Math.max(1, Math.trunc(maxPages)), 5);
  let offset = status.nextOffset;
  let productsFetched = 0;
  let pagesFetched = 0;
  let isComplete = false;
  try {
    for (let page = 0; page < pages && offset < MAX_OFFSET; page += 1) {
      const rawProducts = await fetchDwapricePage(offset, 90_000);
      const products = rawProducts.map(normalizeDwapriceProduct).filter((product): product is InsertProductCatalog => Boolean(product));
      await db.upsertCatalogProducts(products);
      pagesFetched += 1;
      productsFetched += products.length;
      offset += PAGE_SIZE;
      if (rawProducts.length < PAGE_SIZE) { isComplete = true; break; }
      await wait(250);
    }
    if (offset >= MAX_OFFSET) isComplete = true;
    await db.saveCatalogSyncState({ nextOffset: offset, isComplete, lastFullSyncAt: isComplete ? new Date() : undefined, lastError: null });
    return { ...(await db.getCatalogStatus()), pagesFetched, productsFetched, completedNow: isComplete };
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر مزامنة دليل الأصناف.";
    await db.saveCatalogSyncState({ nextOffset: offset, isComplete: false, lastError: message });
    throw new Error(message);
  }
}

export async function refreshLatestPrices() {
  const rawProducts = await fetchDwapricePage(0, 30_000);
  const products = rawProducts.map(normalizeDwapriceProduct).filter((product): product is InsertProductCatalog => Boolean(product));
  await db.upsertCatalogProducts(products);
  const current = await db.getCatalogStatus();
  await db.saveCatalogSyncState({ nextOffset: current.nextOffset, isComplete: current.isComplete, lastLatestSyncAt: new Date(), lastError: null });
  return { ...(await db.getCatalogStatus()), productsFetched: products.length };
}
