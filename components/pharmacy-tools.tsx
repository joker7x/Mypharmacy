import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "@/components/app-ui";
import { AdminButton, AdminCard, AdminField, AdminShell, adminStyles } from "@/components/local-admin-ui";
import { usePharmacy } from "@/lib/pharmacy-context";
import { isBluetoothPrintingAvailable, pairAndConnectPrinter, printBarcodeLabel, scanBluetoothPrinters } from "@/lib/printer-service";
import { LABEL_ELEMENT_LABELS, type LabelElement, type PrinterSettings, type SavedPrinter } from "@/lib/printer-types";

const ELEMENTS: LabelElement[] = ["name", "barcode", "price", "expiry"];
const BAR_WIDTHS = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1];

export function PharmacyTools() {
  const { settings, updateSettings, restoreDemoData } = usePharmacy();
  const [retention, setRetention] = useState(String(settings.imageRetentionDays));
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string>();
  const printer = settings.printer;
  const previewStyle = { aspectRatio: Math.max(0.7, Math.min(2, printer.labelWidthMm / printer.labelHeightMm)) };
  const displayElements = [...printer.labelElements, ...ELEMENTS.filter((element) => !printer.labelElements.includes(element))];
  const updatePrinter = (patch: Partial<PrinterSettings>) => updateSettings({ printer: { ...printer, ...patch } });

  const saveRetention = () => {
    const days = Number(retention);
    if (!Number.isInteger(days) || days < 1 || days > 3650) return Alert.alert("قيمة غير صحيحة", "اختر مدة بين يوم واحد و3650 يومًا.");
    updateSettings({ imageRetentionDays: days });
    Alert.alert("تم الحفظ", `سيحتفظ التطبيق بصور الفواتير لمدة ${days} يومًا.`);
  };
  const scan = async () => {
    setScanning(true);
    try { setPrinters(await scanBluetoothPrinters()); }
    catch (error) { Alert.alert("تعذر البحث عن الطابعة", errorMessage(error)); }
    finally { setScanning(false); }
  };
  const connect = async (candidate: SavedPrinter) => {
    setConnectingAddress(candidate.address);
    try {
      const savedPrinter = await pairAndConnectPrinter(candidate);
      updatePrinter({ savedPrinter });
      Alert.alert("تم ربط الطابعة", `سيُعاد الاتصال بـ ${savedPrinter.name} تلقائيًا عند الطباعة.`);
    } catch (error) { Alert.alert("تعذر ربط الطابعة", errorMessage(error)); }
    finally { setConnectingAddress(undefined); }
  };
  const applyPreset = (preset: "40x30" | "50x30" | "custom") => updatePrinter(preset === "40x30" ? { labelPreset: preset, labelWidthMm: 40, labelHeightMm: 30 } : preset === "50x30" ? { labelPreset: preset, labelWidthMm: 50, labelHeightMm: 30 } : { labelPreset: preset });
  const toggleElement = (element: LabelElement) => updatePrinter({ labelElements: printer.labelElements.includes(element) ? printer.labelElements.filter((item) => item !== element) : [...printer.labelElements, element] });
  const moveElement = (element: LabelElement, direction: -1 | 1) => {
    const index = printer.labelElements.indexOf(element); const target = index + direction;
    if (index < 0 || target < 0 || target >= printer.labelElements.length) return;
    const next = [...printer.labelElements]; [next[index], next[target]] = [next[target], next[index]]; updatePrinter({ labelElements: next });
  };
  const printTest = async () => {
    if (!printer.savedPrinter) return Alert.alert("اربط الطابعة أولًا", "اختر طابعة Bluetooth واحفظها قبل طباعة ملصق تجريبي.");
    try { await printBarcodeLabel(printer.savedPrinter, printer, { name: "Panadol 500mg", barcode: "6221234567890", price: 72, expiryMonthYear: "8/2029" }); Alert.alert("تم إرسال الملصق", "تحقق من مقاسه واتجاهه على الطابعة قبل الاستخدام اليومي."); }
    catch (error) { Alert.alert("تعذرت الطباعة", errorMessage(error)); }
  };

  return <AdminShell title="أدوات الصيدلية" subtitle="الطابعة والملصقات والبيانات المحلية في مكان واحد">
    <Text style={adminStyles.sectionHeading}>الطابعة الحرارية</Text>
    <AdminCard>
      <View style={styles.printerStatus}><View style={[styles.statusDot, printer.savedPrinter ? styles.statusConnected : styles.statusIdle]} /><View style={styles.printerStatusText}><Text style={styles.printerName}>{printer.savedPrinter?.name ?? "لا توجد طابعة محفوظة"}</Text><Text style={styles.printerAddress}>{printer.savedPrinter ? printer.savedPrinter.address : "ابحث عن Xprinter XP-233B ثم اربطها مرة واحدة"}</Text></View></View>
      {!isBluetoothPrintingAvailable ? <Text style={styles.nativeNote}>Bluetooth غير متاح من معاينة الويب. استخدم بناء تطوير Android مثبتًا على الهاتف.</Text> : null}
      <AdminButton title={scanning ? "جارٍ البحث…" : "البحث عن طابعة Bluetooth"} onPress={scan} disabled={scanning} />
      {printers.map((candidate) => <TouchableOpacity key={candidate.address} onPress={() => connect(candidate)} style={styles.printerRow} activeOpacity={0.76}><View style={styles.printerRowText}><Text style={styles.deviceName}>{candidate.name}</Text><Text style={styles.deviceAddress}>{candidate.address}</Text></View><Text style={styles.connectText}>{connectingAddress === candidate.address ? "جارٍ الربط…" : printer.savedPrinter?.address === candidate.address ? "مربوطة" : "ربط"}</Text></TouchableOpacity>)}
    </AdminCard>

    <Text style={adminStyles.sectionHeading}>مقاس ملصق الباركود</Text>
    <AdminCard><View style={styles.presetRow}>{(["40x30", "50x30", "custom"] as const).map((preset) => <TouchableOpacity key={preset} onPress={() => applyPreset(preset)} style={[styles.preset, printer.labelPreset === preset && styles.presetActive]} activeOpacity={0.75}><Text style={[styles.presetText, printer.labelPreset === preset && styles.presetTextActive]}>{preset === "custom" ? "مقاس مخصص" : `${preset.replace("x", "×")} مم`}</Text></TouchableOpacity>)}</View>{printer.labelPreset === "custom" ? <View style={styles.sizeFields}><View style={styles.sizeField}><AdminField label="الارتفاع (مم)" value={String(printer.labelHeightMm)} onChangeText={(value) => updatePrinter({ labelHeightMm: Math.max(15, Number(value.replace(/[^0-9]/g, "")) || 15) })} placeholder="30" keyboardType="number-pad" /></View><View style={styles.sizeField}><AdminField label="العرض (مم)" value={String(printer.labelWidthMm)} onChangeText={(value) => updatePrinter({ labelWidthMm: Math.max(20, Number(value.replace(/[^0-9]/g, "")) || 20) })} placeholder="40" keyboardType="number-pad" /></View></View> : null}</AdminCard>

    <Text style={adminStyles.sectionHeading}>تصميم الملصق</Text>
    <AdminCard>{displayElements.map((element, index) => { const selectedIndex = printer.labelElements.indexOf(element); const enabled = selectedIndex >= 0; return <View key={element} style={[styles.elementRow, index < displayElements.length - 1 && styles.elementBorder]}><View style={styles.reorder}><TouchableOpacity disabled={!enabled || selectedIndex === 0} onPress={() => moveElement(element, -1)} style={styles.orderButton}><Text style={[styles.orderButtonText, (!enabled || selectedIndex === 0) && styles.orderDisabled]}>↑</Text></TouchableOpacity><TouchableOpacity disabled={!enabled || selectedIndex === printer.labelElements.length - 1} onPress={() => moveElement(element, 1)} style={styles.orderButton}><Text style={[styles.orderButtonText, (!enabled || selectedIndex === printer.labelElements.length - 1) && styles.orderDisabled]}>↓</Text></TouchableOpacity></View><Text style={[styles.elementLabel, !enabled && styles.elementDisabled]}>{LABEL_ELEMENT_LABELS[element]}</Text><Switch value={enabled} onValueChange={() => toggleElement(element)} trackColor={{ false: "#DDE2DF", true: COLORS.primary }} thumbColor="#FFFFFF" /></View>; })}</AdminCard>

    <Text style={adminStyles.sectionHeading}>معاينة الملصق</Text>
    <AdminCard style={styles.previewCard}><View style={[styles.labelPreview, previewStyle]}>{printer.labelElements.map((element) => element === "name" ? <Text key={element} style={styles.previewName} numberOfLines={1}>Panadol 500mg</Text> : element === "barcode" ? <View key={element} style={styles.barcode}><View style={styles.barcodeBars}>{BAR_WIDTHS.map((width, index) => <View key={`${width}-${index}`} style={[styles.barcodeBar, { width }]} />)}</View><Text style={styles.previewBarcodeText}>6221234567890</Text></View> : element === "price" ? <Text key={element} style={styles.previewPrice}>72 ج.م</Text> : <Text key={element} style={styles.previewExpiry}>صالح حتى 8/2029</Text>)}</View><Text style={styles.previewCaption}>معاينة بنسبة أبعاد {printer.labelWidthMm}×{printer.labelHeightMm} مم. قد تختلف الدقة الفعلية بحسب إعدادات الطابعة والورق.</Text><AdminButton title="طباعة ملصق تجريبي" onPress={printTest} secondary /></AdminCard>

    <Text style={adminStyles.sectionHeading}>البيانات المحلية</Text>
    <AdminCard><Text style={styles.bodyText}>تُحفظ المبيعات والمخزون والشيفتات والطلبيات والمصروفات والطابعة المختارة على هذا الجهاز داخل قاعدة SQLite المحلية.</Text><View style={styles.retentionRow}><View style={styles.retentionField}><AdminField label="الاحتفاظ بصور الفواتير (يوم)" value={retention} onChangeText={setRetention} placeholder="30" keyboardType="number-pad" /></View><Text style={styles.retentionMark}>⌁</Text></View><AdminButton title="حفظ إعدادات البيانات" onPress={saveRetention} /></AdminCard>
    <Text style={adminStyles.sectionHeading}>إدارة بيانات العرض</Text>
    <AdminCard><Text style={styles.bodyText}>استخدم هذا الخيار فقط لإرجاع أمثلة العرض. لن تحتاجه في الاستخدام اليومي.</Text><AdminButton title="إعادة بيانات العرض" onPress={() => Alert.alert("إعادة بيانات العرض", "سيتم استبدال البيانات المحلية الحالية ببيانات العرض. هل تريد المتابعة؟", [{ text: "إلغاء", style: "cancel" }, { text: "إعادة", style: "destructive", onPress: restoreDemoData }])} secondary /></AdminCard>
  </AdminShell>;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "حدث خطأ غير متوقع. أعد المحاولة."; }

const styles = StyleSheet.create({
  printerStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 14 }, statusDot: { width: 11, height: 11, borderRadius: 6 }, statusConnected: { backgroundColor: COLORS.success }, statusIdle: { backgroundColor: COLORS.muted }, printerStatusText: { flex: 1, alignItems: "flex-end" }, printerName: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, printerAddress: { color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" }, nativeNote: { color: COLORS.warning, backgroundColor: "#FFF8E9", fontSize: 10, fontWeight: "700", lineHeight: 16, textAlign: "right", padding: 10, borderRadius: 10, marginBottom: 10 }, printerRow: { minHeight: 57, paddingVertical: 9, flexDirection: "row-reverse", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border }, printerRowText: { flex: 1, alignItems: "flex-end" }, deviceName: { color: COLORS.ink, fontSize: 12, fontWeight: "900" }, deviceAddress: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, connectText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" }, presetRow: { flexDirection: "row-reverse", gap: 7 }, preset: { flex: 1, minHeight: 40, borderRadius: 13, backgroundColor: "#F3F2EF", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, presetActive: { backgroundColor: COLORS.primary }, presetText: { color: COLORS.muted, fontSize: 10, fontWeight: "900" }, presetTextActive: { color: "#FFFFFF" }, sizeFields: { flexDirection: "row-reverse", gap: 9, marginTop: 12 }, sizeField: { flex: 1 }, elementRow: { minHeight: 54, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, elementBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }, elementLabel: { flex: 1, color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right" }, elementDisabled: { color: COLORS.muted }, reorder: { flexDirection: "row-reverse", gap: 3 }, orderButton: { width: 24, height: 28, alignItems: "center", justifyContent: "center" }, orderButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: "900" }, orderDisabled: { color: "#CFD6D2" }, previewCard: { alignItems: "center", backgroundColor: "#F7F6F2" }, labelPreview: { width: "82%", maxHeight: 210, minHeight: 110, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#C9D2CD", borderRadius: 13, alignItems: "center", justifyContent: "center", padding: 12, gap: 5 }, previewName: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "center" }, barcode: { alignItems: "center", gap: 3, width: "86%" }, barcodeBars: { height: 38, width: "100%", flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", transform: [{ scaleX: 0.92 }] }, barcodeBar: { height: "100%", backgroundColor: COLORS.deep }, previewBarcodeText: { color: COLORS.ink, fontSize: 9, writingDirection: "ltr" }, previewPrice: { color: COLORS.primary, fontSize: 14, fontWeight: "900" }, previewExpiry: { color: COLORS.muted, fontSize: 10, fontWeight: "800" }, previewCaption: { color: COLORS.muted, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 12, marginBottom: 7 }, bodyText: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginBottom: 12 }, retentionRow: { flexDirection: "row-reverse", gap: 8, alignItems: "center" }, retentionField: { flex: 1 }, retentionMark: { color: COLORS.primary, fontSize: 24, fontWeight: "900", marginTop: 17 },
});
