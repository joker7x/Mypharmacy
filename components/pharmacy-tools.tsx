import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { usePharmacy, formatExpiryMonthYear, getNearestExpiryDate } from "@/lib/pharmacy-context";
import { type LabelElement, type LabelQueueItem, type PrinterSettings, type SavedUsbPrinter } from "@/lib/printer-types";
import { isUsbPrintingAvailable, listUsbPrinters, printLabelUsb, requestUsbPermission } from "@/lib/printer-service";
import { trpc } from "@/lib/trpc";

const initialSearch = "xx";

export function PharmacyTools() {
  const { settings, updateSettings, medications } = usePharmacy();
  const printer = settings.printer;
  const [printers, setPrinters] = useState<SavedUsbPrinter[]>([]);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [printing, setPrinting] = useState(false);
  const catalogQuery = trpc.catalog.search.useQuery({ query: search.trim().length >= 2 ? search.trim() : initialSearch, limit: 12, offset: 0 }, { enabled: search.trim().length >= 2, staleTime: 120_000 });
  const localMatches = useMemo(() => { const term = search.trim().toLowerCase(); return term ? medications.filter((item) => [item.name, item.sku, item.barcode ?? ""].some((value) => value.toLowerCase().includes(term))).slice(0, 8) : []; }, [medications, search]);
  const updatePrinter = (patch: Omit<Partial<PrinterSettings>, "labelPositions"> & { labelPositions?: Partial<PrinterSettings["labelPositions"]> }) => updateSettings({ printer: { ...printer, ...patch, labelPositions: { ...printer.labelPositions, ...(patch.labelPositions ?? {}) } } });
  const updateQueue = (labelQueue: LabelQueueItem[]) => updateSettings({ labelQueue });

  useEffect(() => {
    if (!isUsbPrintingAvailable) return;
    let cancelled = false;
    const refresh = async () => { try { const found = await listUsbPrinters(); if (!cancelled) setPrinters(found); } catch { /* USB may be disconnected while the screen is open. */ } };
    void refresh();
    const interval = setInterval(() => void refresh(), 1500);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const scan = async () => {
    setScanning(true);
    try { setPrinters(await listUsbPrinters()); }
    catch (error) { Alert.alert("تعذر اكتشاف USB", error instanceof Error ? error.message : "وصّل الطابعة بكابل OTG ثم أعد المحاولة."); }
    finally { setScanning(false); }
  };
  const connect = async (candidate: SavedUsbPrinter) => {
    try {
      const permissionGranted = await requestUsbPermission(candidate);
      updatePrinter({ savedPrinter: candidate });
      Alert.alert(permissionGranted ? "تم اعتماد الطابعة" : "تم طلب إذن USB" , permissionGranted ? "يمكنك الآن طباعة الإيصالات والملصقات." : "وافق على نافذة Android ثم اضغط اعتماد مرة أخرى.");
    } catch (error) { Alert.alert("تعذر الاتصال", error instanceof Error ? error.message : "تحقق من كابل OTG والطابعة."); }
  };
  const addQueueItem = (item: LabelQueueItem) => {
    const existing = settings.labelQueue.find((entry) => entry.medicationId === item.medicationId);
    updateQueue(existing ? settings.labelQueue.map((entry) => entry.medicationId === item.medicationId ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...settings.labelQueue, item]);
    setSearch("");
  };
  const changeQueueQuantity = (id: string, delta: number) => updateQueue(settings.labelQueue.flatMap((item) => item.id !== id ? [item] : item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []));
  const printQueue = async () => {
    if (!printer.savedPrinter) return Alert.alert("اختر الطابعة أولًا", "ابحث عن الطابعة عبر USB ثم اضغط اعتماد.");
    if (!settings.labelQueue.length) return Alert.alert("الحافظة فارغة", "أضف صنفًا واحدًا على الأقل إلى حافظة الملصقات.");
    setPrinting(true);
    try {
      for (const item of settings.labelQueue) for (let index = 0; index < item.quantity; index += 1) await printLabelUsb(printer.savedPrinter, printer, item);
      Alert.alert("تمت الطباعة", `تم إرسال ${settings.labelQueue.reduce((sum, item) => sum + item.quantity, 0)} ملصق.`);
    } catch (error) { Alert.alert("توقفت الطباعة", error instanceof Error ? error.message : "تعذر إرسال البيانات للطابعة."); }
    finally { setPrinting(false); }
  };

  return <AdminShell title="الطابعة وحافظة الملصقات" subtitle="USB مباشر عبر كابل OTG — Android Dev Client">
    <Text style={adminStyles.sectionHeading}>اتصال USB</Text>
    <AdminCard>
      <View style={styles.statusRow}><View style={[styles.statusDot, printer.savedPrinter ? styles.statusConnected : styles.statusIdle]} /><View style={styles.statusText}><Text style={styles.printerName}>{printer.savedPrinter?.deviceName ?? "لا توجد طابعة معتمدة"}</Text><Text style={styles.muted}>{printer.savedPrinter?.devicePath ?? "وصّل Xprinter XP-233B بكابل OTG ثم ابحث"}</Text></View></View>
      {!isUsbPrintingAvailable ? <Text style={styles.webNote}>USB المباشر غير متاح في معاينة الويب. استخدم Android Dev Client على هاتف يدعم USB Host.</Text> : null}
      <AdminButton title={scanning ? "جارٍ اكتشاف أجهزة USB…" : "اكتشاف طابعة USB"} onPress={scan} disabled={scanning} />
      {printers.map((candidate) => <TouchableOpacity key={candidate.devicePath} onPress={() => void connect(candidate)} style={styles.deviceRow} activeOpacity={0.78}><View style={styles.deviceText}><Text style={styles.deviceName}>{candidate.deviceName}</Text><Text style={styles.muted}>{candidate.devicePath}</Text></View><Text style={styles.link}>{printer.savedPrinter?.devicePath === candidate.devicePath ? "معتمدة" : "اعتماد"}</Text></TouchableOpacity>)}
      <View style={styles.inlineField}><AdminField label="سرعة الاتصال" value={String(printer.baudRate)} onChangeText={(value) => updatePrinter({ baudRate: Number(value.replace(/[^0-9]/g, "")) || 9600 })} keyboardType="number-pad" placeholder="9600" /></View>
    </AdminCard>

    <Text style={adminStyles.sectionHeading}>تصميم الملصق</Text>
    <AdminCard>
      <View style={styles.presetRow}>{(["40x30", "50x30", "custom"] as const).map((preset) => <TouchableOpacity key={preset} onPress={() => updatePrinter(preset === "40x30" ? { labelPreset: preset, labelWidthMm: 40, labelHeightMm: 30 } : preset === "50x30" ? { labelPreset: preset, labelWidthMm: 50, labelHeightMm: 30 } : { labelPreset: preset })} style={[styles.preset, printer.labelPreset === preset && styles.presetActive]} activeOpacity={0.75}><Text style={[styles.presetText, printer.labelPreset === preset && styles.presetTextActive]}>{preset === "custom" ? "مخصص" : `${preset.replace("x", "×")} مم`}</Text></TouchableOpacity>)}</View>
      {printer.labelPreset === "custom" ? <View style={styles.sizeRow}><View style={styles.sizeField}><AdminField label="العرض مم" value={String(printer.labelWidthMm)} onChangeText={(value) => updatePrinter({ labelWidthMm: Math.max(20, Number(value.replace(/[^0-9]/g, "")) || 20) })} keyboardType="number-pad" /></View><View style={styles.sizeField}><AdminField label="الارتفاع مم" value={String(printer.labelHeightMm)} onChangeText={(value) => updatePrinter({ labelHeightMm: Math.max(15, Number(value.replace(/[^0-9]/g, "")) || 15) })} keyboardType="number-pad" /></View></View> : null}
      <Text style={styles.editorHint}>اسحب أي عنصر داخل المعاينة. الموضع يُحفظ تلقائيًا كقالب افتراضي.</Text>
      <View style={[styles.preview, { aspectRatio: Math.max(0.72, Math.min(2, printer.labelWidthMm / printer.labelHeightMm)) }]}>{printer.labelElements.map((element) => <DraggableElement key={element} element={element} position={printer.labelPositions[element]} onMove={(position) => updatePrinter({ labelPositions: { [element]: position } })}>{element === "name" ? "باراسيتامول" : element === "barcode" ? "||||||||||||" : element === "price" ? "15 ج.م" : "8/2029"}</DraggableElement>)}</View>
      <Text style={styles.previewCaption}>معاينة {printer.labelWidthMm}×{printer.labelHeightMm} مم — ESC/POS خام</Text>
    </AdminCard>

    <Text style={adminStyles.sectionHeading}>حافظة الملصقات <Text style={styles.count}>{settings.labelQueue.reduce((sum, item) => sum + item.quantity, 0)} ملصق</Text></Text>
    <AdminCard>
      <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن صنف لإضافته" placeholderTextColor="#96A5A2" style={styles.searchInput} returnKeyType="search" /></View>
      {search.trim().length >= 2 ? <View style={styles.results}>{catalogQuery.isFetching ? <Text style={styles.muted}>جارٍ البحث…</Text> : (catalogQuery.data?.items ?? []).map((product) => <TouchableOpacity key={product.externalId} onPress={() => addQueueItem({ id: `queue-${product.externalId}`, medicationId: product.externalId, name: product.arabicName || product.name, barcode: product.barcode || product.externalId, price: Number(product.currentPrice) || 0, expiryMonthYear: "—", quantity: 1 })} style={styles.resultRow}><Text style={styles.link}>إضافة</Text><Text style={styles.deviceText}>{product.arabicName || product.name}</Text></TouchableOpacity>)}</View> : null}
      {localMatches.map((item) => <QueueRow key={item.id} item={settings.labelQueue.find((entry) => entry.medicationId === item.id) ?? { id: `queue-${item.id}`, medicationId: item.id, name: item.name, barcode: item.barcode || item.sku, price: item.price, expiryMonthYear: formatExpiryMonthYear(getNearestExpiryDate(item)), quantity: 1 }} onAdd={() => addQueueItem({ id: `queue-${item.id}`, medicationId: item.id, name: item.name, barcode: item.barcode || item.sku, price: item.price, expiryMonthYear: formatExpiryMonthYear(getNearestExpiryDate(item)), quantity: 1 })} onChange={(delta) => changeQueueQuantity(`queue-${item.id}`, delta)} />)}
      {settings.labelQueue.length ? <View style={styles.queue}><Text style={styles.queueTitle}>الأصناف المضافة</Text>{settings.labelQueue.map((item) => <QueueRow key={item.id} item={item} onAdd={() => changeQueueQuantity(item.id, 1)} onChange={(delta) => changeQueueQuantity(item.id, delta)} />)}</View> : <Text style={styles.empty}>لم تُضف أصناف إلى الحافظة بعد.</Text>}
      <AdminButton title={printing ? "جارٍ إرسال الملصقات…" : `طباعة ${settings.labelQueue.reduce((sum, item) => sum + item.quantity, 0)} ملصق`} onPress={() => void printQueue()} disabled={printing} />
    </AdminCard>
  </AdminShell>;
}

function DraggableElement({ element, position, onMove, children }: { element: LabelElement; position: { x: number; y: number }; onMove: (position: { x: number; y: number }) => void; children: string }) {
  const start = useRef(position);
  const responder = useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onPanResponderGrant: () => { start.current = position; }, onPanResponderMove: (_, gesture) => onMove({ x: Math.max(5, Math.min(95, start.current.x + gesture.dx / 2)), y: Math.max(5, Math.min(95, start.current.y + gesture.dy / 2)) }) }), [onMove, position]);
  return <View {...responder.panHandlers} style={[styles.dragItem, { left: `${position.x}%`, top: `${position.y}%` }, element === "barcode" && styles.barcodeItem]}><Text style={styles.dragText}>{children}</Text></View>;
}

function QueueRow({ item, onAdd, onChange }: { item: LabelQueueItem; onAdd: () => void; onChange: (delta: number) => void }) {
  return <View style={styles.queueRow}><TouchableOpacity onPress={() => onChange(-1)} style={styles.qtyButton}><Text>−</Text></TouchableOpacity><Text style={styles.qty}>{item.quantity}</Text><TouchableOpacity onPress={onAdd} style={[styles.qtyButton, styles.qtyPlus]}><Text style={styles.plusText}>+</Text></TouchableOpacity><View style={styles.deviceText}><Text style={styles.queueName}>{item.name}</Text><Text style={styles.muted}>{item.barcode}</Text></View></View>;
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 12 }, statusDot: { width: 11, height: 11, borderRadius: 8 }, statusConnected: { backgroundColor: COLORS.success }, statusIdle: { backgroundColor: COLORS.muted }, statusText: { flex: 1, alignItems: "flex-end" }, printerName: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, muted: { color: COLORS.muted, fontSize: 10, textAlign: "right", marginTop: 3 }, webNote: { color: COLORS.warning, backgroundColor: "#FFF8E9", padding: 10, borderRadius: 10, fontSize: 10, lineHeight: 16, textAlign: "right", marginBottom: 10 }, deviceRow: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, gap: 10 }, deviceText: { flex: 1, alignItems: "flex-end" }, deviceName: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right" }, link: { color: COLORS.primary, fontSize: 11, fontWeight: "900" }, inlineField: { marginTop: 10 }, presetRow: { flexDirection: "row-reverse", gap: 7 }, preset: { flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: "#F3F2EF", alignItems: "center", justifyContent: "center" }, presetActive: { backgroundColor: COLORS.primary }, presetText: { color: COLORS.muted, fontSize: 11, fontWeight: "900" }, presetTextActive: { color: "#FFFFFF" }, sizeRow: { flexDirection: "row-reverse", gap: 8, marginTop: 10 }, sizeField: { flex: 1 }, editorHint: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: "right", marginTop: 14, marginBottom: 8 }, preview: { width: "100%", maxHeight: 260, minHeight: 140, backgroundColor: "#FAFAF7", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B8C7C0", borderRadius: 12, position: "relative", overflow: "hidden" }, dragItem: { position: "absolute", transform: [{ translateX: -30 }, { translateY: -12 }], minWidth: 40, minHeight: 24, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 7, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, barcodeItem: { minWidth: 120, backgroundColor: "#153C35" }, dragText: { color: COLORS.ink, fontSize: 10, fontWeight: "800" }, previewCaption: { color: COLORS.muted, fontSize: 9, textAlign: "center", marginTop: 8 }, count: { color: COLORS.primary, fontSize: 10 }, searchBox: { height: 48, backgroundColor: "#F3F2EF", borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 12, gap: 8 }, searchIcon: { color: COLORS.muted, fontSize: 20 }, searchInput: { flex: 1, color: COLORS.ink, textAlign: "right", fontSize: 12 }, results: { marginTop: 8 }, resultRow: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: 10 }, queue: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border }, queueTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right", paddingTop: 12 }, queueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }, qtyButton: { width: 30, height: 30, borderRadius: 9, backgroundColor: "#F0F2EF", alignItems: "center", justifyContent: "center" }, qtyPlus: { backgroundColor: COLORS.primary }, plusText: { color: "#FFFFFF", fontWeight: "900" }, qty: { color: COLORS.ink, fontSize: 13, fontWeight: "900", minWidth: 18, textAlign: "center" }, queueName: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right" }, empty: { color: COLORS.muted, textAlign: "right", fontSize: 11, paddingVertical: 14 },
});
