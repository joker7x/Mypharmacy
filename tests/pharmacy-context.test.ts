import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

import { buildAlerts, calculateOrderTotal, type Medication } from "../lib/pharmacy-context";

const medication = (overrides: Partial<Medication> = {}): Medication => ({
  id: "med-1",
  name: "دواء تجريبي",
  category: "اختبار",
  sku: "TEST-1",
  price: 50,
  quantity: 20,
  reorderLevel: 5,
  expiryDate: "2030-01-01",
  ...overrides,
});

describe("حسابات الصيدلية", () => {
  it("يجمع إجمالي الفاتورة وفق الكمية وسعر الوحدة", () => {
    expect(calculateOrderTotal([
      { medicationId: "a", name: "أ", unitPrice: 50, quantity: 2 },
      { medicationId: "b", name: "ب", unitPrice: 15, quantity: 3 },
    ])).toBe(145);
  });

  it("ينشئ تنبيهًا عالي الأولوية عندما يهبط المخزون إلى مستوى حرج", () => {
    const alerts = buildAlerts([medication({ quantity: 2, reorderLevel: 8 })]);
    expect(alerts).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "stock", severity: "high" })]));
  });

  it("ينشئ تنبيهًا للصلاحية القريبة", () => {
    const nearExpiry = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const alerts = buildAlerts([medication({ expiryDate: nearExpiry })]);
    expect(alerts).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "expiry", severity: "high" })]));
  });
});
