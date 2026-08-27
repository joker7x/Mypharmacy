import type { LabelPrintData, PrinterSettings, ReceiptPrintData } from "./printer-types";

const ESC = "\u001b";
const GS = "\u001d";
const dot = (millimeters: number) => Math.max(1, Math.round(millimeters * 8));
const money = (value: number) => `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;
const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/** Builds a 58 mm ESC/POS receipt payload. Arabic glyph support depends on the printer code page. */
export function buildEscPosReceipt(data: ReceiptPrintData) {
  const divider = "--------------------------------";
  const lines = [
    `${ESC}@`,
    `${ESC}a\u0001`,
    "SAYDALYATI",
    "SALES RECEIPT",
    `${ESC}a\u0000`,
    divider,
    `No. ${data.receiptNumber}`,
    new Date(data.createdAt).toLocaleString("en-GB"),
    divider,
    ...data.items.flatMap((item) => [clean(item.name), `${item.quantity} x ${money(item.unitPrice)} = ${money(item.quantity * item.unitPrice)}`]),
    divider,
    `${ESC}a\u0002`,
    `TOTAL: ${money(data.total)}`,
    `PAYMENT: ${data.paymentMethod}`,
    data.paymentMethod === "نقدي" ? `RECEIVED: ${money(data.cashReceived ?? data.total)}` : "",
    data.paymentMethod === "نقدي" ? `CHANGE: ${money(data.change ?? 0)}` : "",
    `${ESC}a\u0001`,
    "Thank you",
    "\n\n\n",
    `${GS}V\u0000`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Builds a TSPL label payload. Coordinates are derived from the stored label dimensions. */
export function buildTsplLabel(settings: PrinterSettings, data: LabelPrintData) {
  const width = Math.max(20, settings.labelWidthMm);
  const height = Math.max(15, settings.labelHeightMm);
  const margin = dot(2);
  const printableWidth = dot(width - 4);
  const rowGap = dot(3.7);
  let y = margin;
  const commands = [
    `SIZE ${width} mm,${height} mm`,
    "GAP 2 mm,0 mm",
    "DIRECTION 1",
    "CLS",
  ];
  settings.labelElements.forEach((element) => {
    if (element === "name") {
      commands.push(`TEXT ${margin},${y},"0",0,1,1,"${escapeTspl(data.name)}"`);
      y += rowGap;
    }
    if (element === "barcode") {
      commands.push(`BARCODE ${margin},${y},"128",${Math.min(dot(11), dot(height / 2))},1,0,2,2,"${escapeTspl(data.barcode)}"`);
      y += dot(14);
    }
    if (element === "price") {
      commands.push(`TEXT ${margin},${y},"0",0,1,1,"${escapeTspl(money(data.price))}"`);
      y += rowGap;
    }
    if (element === "expiry") {
      commands.push(`TEXT ${margin},${y},"0",0,1,1,"EXP ${escapeTspl(data.expiryMonthYear)}"`);
      y += rowGap;
    }
  });
  commands.push(`TEXT ${Math.max(margin, printableWidth - dot(10))},${Math.max(margin, dot(height) - dot(4))},"0",0,1,1,""`);
  commands.push("PRINT 1,1");
  return commands.join("\r\n");
}

function escapeTspl(value: string) {
  return clean(value).replace(/["\\]/g, " ");
}
