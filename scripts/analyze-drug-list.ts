import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const inputPath = "/home/ubuntu/upload/druglist.csv";
const stats = { rows: 0, empty: 0, minColumns: Number.MAX_SAFE_INTEGER, maxColumns: 0, validIds: 0, timestamps: 0 };
const samples: Array<{ columns: number; id: string; englishName: string; arabicName: string; oldPrice: string; price: string; timestamp: string }> = [];

async function analyze() {
  const rl = createInterface({ input: createReadStream(inputPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, "").trim();
    if (!line) { stats.empty += 1; continue; }
    const fields = line.split(",");
    stats.rows += 1;
    stats.minColumns = Math.min(stats.minColumns, fields.length);
    stats.maxColumns = Math.max(stats.maxColumns, fields.length);
    if (/^\d+$/.test(fields[0]?.trim() ?? "")) stats.validIds += 1;
    const timestamp = fields.find((value, index) => index >= 13 && /^1\d{9}$/.test(value.trim()))?.trim() ?? "";
    if (timestamp) stats.timestamps += 1;
    if (samples.length < 5) samples.push({ columns: fields.length, id: fields[0]?.trim() ?? "", englishName: fields[1]?.trim() ?? "", arabicName: fields[2]?.trim() ?? "", oldPrice: fields[3]?.trim() ?? "", price: fields[4]?.trim() ?? "", timestamp });
  }
  console.log(JSON.stringify({ ...stats, samples }, null, 2));
}

analyze().catch((error) => {
  console.error(error);
  process.exit(1);
});
