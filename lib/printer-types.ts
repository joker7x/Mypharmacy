export type LabelElement = "name" | "barcode" | "price" | "expiry";

export type SavedPrinter = {
  name: string;
  address: string;
};

export type PrinterSettings = {
  savedPrinter?: SavedPrinter;
  labelWidthMm: number;
  labelHeightMm: number;
  labelPreset: "40x30" | "50x30" | "custom";
  labelElements: LabelElement[];
};

export type ReceiptPrintData = {
  receiptNumber: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentMethod: "نقدي" | "بطاقة" | "محفظة";
  cashReceived?: number;
  change?: number;
};

export type LabelPrintData = {
  name: string;
  barcode: string;
  price: number;
  expiryMonthYear: string;
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  labelWidthMm: 40,
  labelHeightMm: 30,
  labelPreset: "40x30",
  labelElements: ["name", "barcode", "price", "expiry"],
};

export const LABEL_ELEMENT_LABELS: Record<LabelElement, string> = {
  name: "اسم الصنف",
  barcode: "الباركود",
  price: "السعر",
  expiry: "تاريخ الصلاحية",
};
