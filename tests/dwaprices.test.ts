import { describe, expect, it } from "vitest";

import { extractProductList, normalizeDwapriceProduct } from "../server/dwaprices";

describe("تطبيع بيانات dwaprices", () => {
  it("يستخرج قائمة أصناف سواء وصلت مباشرة أو داخل كائن", () => {
    expect(extractProductList([{ id: "1" }])).toEqual([{ id: "1" }]);
    expect(extractProductList({ products: [{ id: "2" }] })).toEqual([{ id: "2" }]);
  });

  it("يحوّل بيانات الصنف إلى نموذج الفهرس مع السعر القديم والجديد", () => {
    expect(normalizeDwapriceProduct({ id: "42", name: "sample", arabic: "صنف تجريبي", price: "120", oldprice: "99", sold_times: "8", Date_updated: "1787601957" })).toEqual(expect.objectContaining({ externalId: "42", arabicName: "صنف تجريبي", currentPrice: "120.00", previousPrice: "99.00", soldTimes: 8, sourceUpdatedAt: 1787601957000 }));
  });

  it("يرفض السجل الناقص الذي لا يمكن عرضه أو تسعيره", () => {
    expect(normalizeDwapriceProduct({ id: "", name: "", price: "" })).toBeNull();
  });

  it("يتعامل مع السعر السابق الفارغ بوصفه غير متاح لا صفرًا", () => {
    expect(normalizeDwapriceProduct({ id: "7", name: "sample", arabic: "صنف", price: "120", oldprice: "", sold_times: "1", Date_updated: "1787601957" })).toEqual(expect.objectContaining({ previousPrice: null }));
  });
});
