import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}));

import { calculateOrderTotal, getUnitPrice, getUnitsPerPackage, normalizePharmacyState, type CartItem, type IncomingOrder } from "./pharmacy-context";

describe("إدارة بيانات الطلبيات المحلية", () => {
  it("تضيف قائمة طلبيات فارغة للبيانات المحفوظة من الإصدارات السابقة", () => {
    const state = normalizePharmacyState({ medications: [], sales: [], suppliers: [] });
    expect(state.incomingOrders).toEqual([]);
  });

  it("تحافظ على بيانات طلب وارد وفاتورته عند استرجاع الحالة", () => {
    const order: IncomingOrder = {
      id: "order-test",
      supplierName: "شركة الدواء",
      sourceType: "شركة",
      referenceNumber: "INV-42",
      total: 1250,
      invoiceUri: "file:///invoices/invoice-42.jpg",
      createdAt: "2026-08-24T12:00:00.000Z",
    };
    const state = normalizePharmacyState({ medications: [], sales: [], suppliers: [], incomingOrders: [order] });
    expect(state.incomingOrders).toEqual([order]);
  });

  it("يحسب إجمالي عناصر الطلب بدقة", () => {
    const items: CartItem[] = [
      { medicationId: "med-1", name: "صنف أول", unitPrice: 75, quantity: 2 },
      { medicationId: "med-2", name: "صنف ثان", unitPrice: 40, quantity: 3 },
    ];
    expect(calculateOrderTotal(items)).toBe(270);
  });

  it("يحسب سعر وحدة البيع من سعر العبوة وعدد وحداتها", () => {
    expect(getUnitsPerPackage({ unitsPerPackage: 2 })).toBe(2);
    expect(getUnitPrice({ price: 96, unitsPerPackage: 2 })).toBe(48);
  });
});
