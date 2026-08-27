import type { LabelPrintData, PrinterSettings, ReceiptPrintData, SavedPrinter } from "./printer-types";

const unsupported = () => { throw new Error("طباعة Bluetooth تتطلب بناء تطوير Android مثبتًا على الهاتف، ولا تعمل من معاينة الويب أو Expo Go."); };
export const isBluetoothPrintingAvailable = false;
export async function scanBluetoothPrinters(): Promise<SavedPrinter[]> { return unsupported(); }
export async function pairAndConnectPrinter(_printer: SavedPrinter): Promise<SavedPrinter> { return unsupported(); }
export async function printReceipt(_printer: SavedPrinter, _data: ReceiptPrintData) { return unsupported(); }
export async function printBarcodeLabel(_printer: SavedPrinter, _settings: PrinterSettings, _data: LabelPrintData) { return unsupported(); }
