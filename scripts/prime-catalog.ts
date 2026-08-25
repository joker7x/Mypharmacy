import { syncCatalogBatch } from "../server/dwaprices";

const pages = Number(process.argv[2] ?? 1);

syncCatalogBatch(Number.isFinite(pages) ? pages : 1)
  .then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
