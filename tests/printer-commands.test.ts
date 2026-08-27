import { describe, expect, it } from "vitest";

import { buildEscPosReceipt, buildTsplLabel } from "../lib/printer-commands";
import { DEFAULT_PRINTER_SETTINGS } from "../lib/printer-types";

describe("أوامر الطابعة الحرارية", () => {
  it("ينشئ إيصال ESC/POS يشمل الإجمالي وطريقة الدفع", () => {
    const command = buildEscPosReceipt({ receiptNumber: "42", createdAt: "2026-08-27T09:00:00.000Z", items: [{ name: "Panadol", quantity: 2, unitPrice: 20 }], total: 40, paymentMethod: "نقدي", cashReceived: 50, change: 10 });
    expect(command).toContain("TOTAL: 40 EGP");
    expect(command).toContain("CHANGE: 10 EGP");
    expect(command).toContain("\u001b@");
  });

  it("ينشئ ملصق TSPL بالمقاس والعناصر المحددة فقط", () => {
    const command = buildTsplLabel({ ...DEFAULT_PRINTER_SETTINGS, labelWidthMm: 50, labelHeightMm: 30, labelElements: ["name", "barcode", "expiry"] }, { name: "Panadol", barcode: "6221234567890", price: 30, expiryMonthYear: "8/2029" });
    expect(command).toContain("SIZE 50 mm,30 mm");
    expect(command).toContain("BARCODE");
    expect(command).toContain("EXP 8/2029");
    expect(command).not.toContain("30 EGP");
  });
});
