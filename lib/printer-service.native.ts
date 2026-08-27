import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic, { type BluetoothDevice } from "react-native-bluetooth-classic";

import { buildEscPosReceipt, buildTsplLabel } from "./printer-commands";
import type { LabelPrintData, PrinterSettings, ReceiptPrintData, SavedPrinter } from "./printer-types";

const CONNECTION_OPTIONS = { connectorType: "rfcomm", delimiter: "", charset: "utf-8" };

async function requestBluetoothAccess() {
  if (Platform.OS !== "android") return;
  const permissions = Platform.Version >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const result = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.some((permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED);
  if (denied) throw new Error("يلزم السماح بالوصول إلى Bluetooth للبحث عن الطابعة والاتصال بها.");
}

const toSavedPrinter = (device: Pick<BluetoothDevice, "name" | "address">): SavedPrinter => ({ name: device.name || "طابعة Bluetooth", address: device.address });

export async function scanBluetoothPrinters(): Promise<SavedPrinter[]> {
  await requestBluetoothAccess();
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    const turnedOn = await RNBluetoothClassic.requestBluetoothEnabled();
    if (!turnedOn) throw new Error("فعّل Bluetooth ثم أعد البحث عن الطابعة.");
  }
  const [paired, discovered] = await Promise.all([RNBluetoothClassic.getBondedDevices(), RNBluetoothClassic.startDiscovery().catch(() => [])]);
  const unique = new Map<string, SavedPrinter>();
  [...paired, ...discovered].forEach((device) => unique.set(device.address, toSavedPrinter(device)));
  return [...unique.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function getDevice(address: string) {
  await requestBluetoothAccess();
  let device = (await RNBluetoothClassic.getBondedDevices()).find((candidate) => candidate.address === address);
  if (!device) {
    await RNBluetoothClassic.pairDevice(address);
    device = (await RNBluetoothClassic.getBondedDevices()).find((candidate) => candidate.address === address);
  }
  if (!device) throw new Error("تعذر إتمام اقتران الطابعة. تأكد أنها في وضع الاقتران ثم حاول ثانية.");
  if (!(await device.isConnected())) {
    const connected = await device.connect(CONNECTION_OPTIONS);
    if (!connected) throw new Error("تعذر فتح اتصال بالطابعة. تأكد من تشغيلها وقربها من الهاتف.");
  }
  return device;
}

export async function pairAndConnectPrinter(printer: SavedPrinter) {
  const device = await getDevice(printer.address);
  return toSavedPrinter(device);
}

async function printRaw(printer: SavedPrinter, payload: string) {
  const device = await getDevice(printer.address);
  const completed = await device.write(payload, "utf-8");
  if (!completed) throw new Error("لم تؤكد الطابعة استلام أمر الطباعة.");
}

export async function printReceipt(printer: SavedPrinter, data: ReceiptPrintData) {
  await printRaw(printer, buildEscPosReceipt(data));
}

export async function printBarcodeLabel(printer: SavedPrinter, settings: PrinterSettings, data: LabelPrintData) {
  await printRaw(printer, buildTsplLabel(settings, data));
}

export const isBluetoothPrintingAvailable = true;
