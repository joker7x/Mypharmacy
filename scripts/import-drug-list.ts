import { createReadStream } from "node:fs";
import { parse } from "csv-parse";

import type { InsertProductCatalog } from "../drizzle/schema";
import { updateCatalogPackageUnits, upsertCatalogProducts } from "../server/db";
import { normalizeDrugListRecord } from "../server/druglist";

const inputPath = "/home/ubuntu/upload/druglist.csv";
const BATCH_SIZE = 40;

async function importDrugList() {
  const report = { rows: 0, imported: 0, skipped: 0, batches: 0 };
  let batch: InsertProductCatalog[] = [];
  const flush = async () => {
    if (!batch.length) return;
    await upsertCatalogProducts(batch);
    await updateCatalogPackageUnits(batch.map((product) => ({ externalId: product.externalId, unitsPerPackage: product.unitsPerPackage })));
    report.imported += batch.length;
    report.batches += 1;
    batch = [];
  };
  const parser = createReadStream(inputPath, { encoding: "utf8" }).pipe(parse({ bom: true, relax_column_count: true, skip_empty_lines: true, relax_quotes: true, trim: true }));
  for await (const record of parser as AsyncIterable<string[]>) {
    report.rows += 1;
    const product = normalizeDrugListRecord(record);
    if (!product) { report.skipped += 1; continue; }
    batch.push(product);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();
  console.log(JSON.stringify(report));
}

importDrugList().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
