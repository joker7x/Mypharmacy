import { useDeferredValue, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { COLORS, PageHeader, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatExpiryMonthYear, getExpiryBatches, getUnitPrice, getUnitsPerPackage, isExpirySoon, Medication, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";
import { useStaffAudit } from "@/hooks/use-staff-audit";
import { trpc } from "@/lib/trpc";

type FormState = Omit<Medication, "id" | "quantity">;
type CatalogProduct = { externalId: string; arabicName: string; name: string; category: string | null; company: string | null; barcode: string | null; currentPrice: string | number; unitsPerPackage: number };
const emptyForm: FormState = { catalogId: undefined, name: "", category: "", sku: "", barcode: "", price: 0, unitsPerPackage: 1, reorderLevel: 5, expiryDate: "" };

export default function MedicineFormScreen() {
  const { id, catalogId: initialCatalogId } = useLocalSearchParams<{ id?: string; catalogId?: string }>();
  const { medications, addMedication, updateMedication, deleteMedication, isReady } = usePharmacy();
  const audit = useStaffAudit();
  const idParam = Array.isArray(id) ? id[0] : id;
  const initialCatalogIdParam = Array.isArray(initialCatalogId) ? initialCatalogId[0] : initialCatalogId;
  const existing = typeof idParam === "string" ? medications.find((item) => item.id === idParam) : undefined;
  const [form, setForm] = useState<FormState>(existing ? { catalogId: existing.catalogId, name: existing.name, category: existing.category, sku: existing.sku, barcode: existing.barcode ?? "", price: existing.price, unitsPerPackage: getUnitsPerPackage(existing), reorderLevel: existing.reorderLevel, expiryDate: existing.expiryDate } : emptyForm);
  const [packages, setPackages] = useState(existing ? Math.ceil(existing.quantity / getUnitsPerPackage(existing)) : 0);
  const [catalogSearch, setCatalogSearch] = useState(typeof initialCatalogIdParam === "string" ? initialCatalogIdParam : "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deferredSearch = useDeferredValue(catalogSearch.trim());
  const catalogQuery = trpc.catalog.search.useQuery({ query: deferredSearch.length >= 2 ? deferredSearch : "xx", limit: 12, offset: 0 }, { enabled: !existing && !form.catalogId && deferredSearch.length >= 2, staleTime: 120_000 });
  const directProductQuery = trpc.catalog.product.useQuery({ externalId: typeof initialCatalogIdParam === "string" ? initialCatalogIdParam : "x" }, { enabled: Boolean(initialCatalogIdParam) && !existing });
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }));
  const sellableUnits = packages * getUnitsPerPackage(form);
  const pricePerUnit = getUnitPrice(form);
  const isLockedCatalogAddition = !existing && Boolean(form.catalogId);

  const selectCatalogProduct = (product: CatalogProduct) => {
    setForm({ catalogId: product.externalId, name: product.arabicName || product.name, category: product.category || "أخرى", sku: product.barcode || product.externalId, barcode: product.barcode || "", price: Number(product.currentPrice) || 0, unitsPerPackage: Math.max(1, product.unitsPerPackage || 1), reorderLevel: 5, expiryDate: nextYearDate() });
    setPackages((current) => Math.max(1, current));
    setCatalogSearch("");
  };

  useEffect(() => {
    if (directProductQuery.data && !form.catalogId) selectCatalogProduct(directProductQuery.data as CatalogProduct);
  }, [directProductQuery.data, form.catalogId]);

  const save = () => {
    if (!isReady) return Alert.alert("جارٍ تجهيز المخزون", "انتظر لحظات حتى يكتمل تحميل بيانات المخزون، ثم أضف الصنف.");
    if (!existing && !form.catalogId) return Alert.alert("اختر صنفًا أولًا", "ابحث عن الدواء ثم اختره من دليل الأدوية قبل الحفظ.");
    if (!form.name.trim() || !form.category.trim() || !form.sku.trim() || !form.expiryDate.trim() || form.price < 0 || form.reorderLevel < 0) return Alert.alert("بيانات الصنف غير مكتملة", "تعذر تجهيز بيانات الصنف. ارجع واختره من الدليل مرة أخرى.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate)) return Alert.alert("تاريخ غير صحيح", "استخدم الصيغة YYYY-MM-DD مثل 2027-05-20.");
    if (!Number.isFinite(packages) || packages < 1) return Alert.alert("أدخل كمية المخزون", "أدخل عبوة واحدة على الأقل قبل إضافة الصنف إلى المخزون.");
    const medication = { ...form, quantity: Math.trunc(packages) * getUnitsPerPackage(form) };
    if (existing) {
      updateMedication(existing.id, medication);
      audit({ action: "inventory.quantity_updated", entityType: "medication", entityId: existing.id, detail: `تم تعديل كمية ${existing.name} إلى ${medication.quantity} وحدة.`, metadata: { quantity: medication.quantity } });
    } else {
      addMedication(medication);
      audit({ action: "inventory.item_added", entityType: "medication", detail: `تمت إضافة ${medication.name} إلى المخزون.`, metadata: { catalogId: medication.catalogId, quantity: medication.quantity } });
    }
    if (existing) router.back(); else router.replace("/(tabs)/inventory");
  };

  const remove = () => {
    if (!existing) return Alert.alert("الصنف غير متاح", "لم يعد هذا الصنف موجودًا في المخزون.", [{ text: "العودة للمخزون", onPress: () => router.replace("/(tabs)/inventory") }]);
    setDeleteOpen(true);
  };

  const confirmRemove = () => {
    if (!existing) return;
    deleteMedication(existing.id);
    audit({ action: "inventory.item_deleted", entityType: "medication", entityId: existing.id, detail: `تم حذف ${existing.name} من المخزون.` });
    setDeleteOpen(false);
    router.replace("/(tabs)/inventory");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}>
          <IconSymbol name="chevron.right" size={20} color={COLORS.ink} />
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <PageHeader title={existing ? "تعديل كمية المخزون" : "إضافة للمخزون"} subtitle={existing ? "بيانات الدواء للقراءة فقط؛ عدّل الكمية المتاحة" : isLockedCatalogAddition ? "بيانات الدواء مؤكدة من الدليل" : "اختر الدواء من دليل الأدوية أولًا"} />

        {!existing && !isLockedCatalogAddition ? (
          <View style={styles.catalogCard}>
            <View style={styles.catalogTitleRow}>
              <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanButton} activeOpacity={0.8}>
                <IconSymbol name="barcode.viewfinder" size={20} color={COLORS.primary} />
                <Text style={styles.scanText}>مسح</Text>
              </TouchableOpacity>
              <View style={styles.catalogTitle}>
                <Text style={styles.catalogHeading}>اختر الدواء من الدليل</Text>
                <Text style={styles.catalogSubheading}>تُجلب البيانات المعتمدة تلقائيًا ولا يمكن تعديلها</Text>
              </View>
            </View>
            <View style={styles.catalogSearch}>
              <IconSymbol name="magnifyingglass" size={19} color={COLORS.muted} />
              <TextInput value={catalogSearch} onChangeText={setCatalogSearch} placeholder="اسم الدواء أو الباركود" placeholderTextColor="#96A5A2" style={styles.catalogSearchInput} returnKeyType="done" />
            </View>
            {catalogQuery.isFetching ? <ActivityIndicator color={COLORS.primary} style={styles.loading} /> : catalogQuery.data?.items.map((product) => (
              <TouchableOpacity key={product.externalId} onPress={() => selectCatalogProduct(product as CatalogProduct)} style={styles.catalogResult} activeOpacity={0.75}>
                <View style={styles.catalogResultText}>
                  <Text style={styles.catalogResultName}>{product.arabicName}</Text>
                  <Text style={styles.catalogResultMeta}>{product.company || "دليل الأدوية"} · {product.unitsPerPackage || 1} وحدة/عبوة · {Number(product.currentPrice).toLocaleString("ar-EG")} ج.م</Text>
                </View>
                <IconSymbol name="plus.circle.fill" size={23} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {isLockedCatalogAddition ? (
          <View style={styles.lockedCatalogCard}>
            <View style={styles.lockedIcon}><IconSymbol name="checkmark.circle.fill" size={21} color={COLORS.primary} /></View>
            <View style={styles.lockedCatalogText}>
              <Text style={styles.lockedTitle} numberOfLines={1}>{form.name}</Text>
              <Text style={styles.lockedMeta} numberOfLines={2}>{form.category} · {formatPrice(form.price)} · {getUnitsPerPackage(form)} وحدة/عبوة</Text>
              <Text style={styles.lockedNote}>هذه البيانات واردة من الدليل ومقفلة عند الإضافة.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.formCard}>
          {existing ? <ReadOnlyMedicationDetails form={form} /> : null}
          {existing ? <ExpiryHistory medication={existing} /> : null}
          <Field label="كمية المخزون (عبوات)" value={String(packages)} onChangeText={(value) => setPackages(Number(value.replace(/[^0-9]/g, "")) || 0)} placeholder="0" keyboardType="number-pad" writingDirection="ltr" />
          {!existing ? <View style={styles.singleField}><Field label="تاريخ الصلاحية" value={form.expiryDate} onChangeText={(value) => setField("expiryDate", value)} placeholder="YYYY-MM-DD" writingDirection="ltr" /></View> : null}
          <View style={styles.unitSummary}>
            <Text style={styles.unitSummaryText}>{sellableUnits.toLocaleString("ar-EG")} وحدة متاحة · سعر الوحدة {pricePerUnit.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م</Text>
          </View>
        </View>

        <TouchableOpacity onPress={save} style={[commonStyles.primaryButton, !isReady && styles.disabledSave]} activeOpacity={0.85} disabled={!isReady}>
          <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" />
          <Text style={commonStyles.primaryButtonText}>{!isReady ? "جارٍ تجهيز المخزون..." : existing ? "حفظ الكمية" : "إضافة إلى المخزون"}</Text>
        </TouchableOpacity>
        {existing ? <TouchableOpacity onPress={remove} style={styles.deleteButton} activeOpacity={0.8}><IconSymbol name="trash" size={18} color={COLORS.danger} /><Text style={styles.deleteText}>حذف الصنف</Text></TouchableOpacity> : null}
      </ScrollView>
      <BarcodeScanner visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={setCatalogSearch} />
      <Modal transparent visible={deleteOpen} animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteSheet}>
            <Text style={styles.deleteSheetTitle}>حذف الصنف نهائيًا؟</Text>
            <Text style={styles.deleteSheetBody}>سيُحذف «{existing?.name}» من المخزون وسجل النواقص المرتبط به.</Text>
            <TouchableOpacity onPress={confirmRemove} style={styles.confirmDeleteButton} activeOpacity={0.84}><Text style={styles.confirmDeleteText}>حذف الصنف</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteOpen(false)} style={styles.cancelDeleteButton} activeOpacity={0.75}><Text style={styles.cancelDeleteText}>إلغاء</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function ReadOnlyMedicationDetails({ form }: { form: FormState }) {
  return <View style={styles.readOnlyDetails}><Text style={styles.readOnlyName} numberOfLines={1}>{form.name}</Text><Text style={styles.readOnlyMeta}>{form.category} · {formatPrice(form.price)} · {getUnitsPerPackage(form)} وحدة/عبوة</Text><Text style={styles.readOnlyNote}>للتعديل على بيانات الدواء، حدّثها من دليل الأدوية المعتمد.</Text></View>;
}

function ExpiryHistory({ medication }: { medication: Medication }) {
  const batches = getExpiryBatches(medication);
  return <View style={styles.expiryHistory}><View style={styles.expiryHeadingRow}><Text style={styles.expiryCount}>{batches.length.toLocaleString("ar-EG")} دفعة</Text><Text style={styles.expiryHeading}>سجل تواريخ الصلاحية</Text></View>{batches.map((batch, index) => { const highlighted = index === 0; const urgent = isExpirySoon(batch.expiryDate); return <View key={batch.id} style={[styles.expiryBatch, highlighted && (urgent ? styles.expiryBatchUrgent : styles.expiryBatchNearest)]}><View style={styles.expiryBatchText}><Text style={[styles.expiryBatchDate, highlighted && (urgent ? styles.expiryBatchDateUrgent : styles.expiryBatchDateNearest)]}>{formatExpiryMonthYear(batch.expiryDate)}</Text><Text style={styles.expiryBatchLabel}>{highlighted ? "الأقرب للصلاحية" : "دفعة لاحقة"}</Text></View><Text style={[styles.expiryBatchQuantity, highlighted && (urgent ? styles.expiryBatchQuantityUrgent : styles.expiryBatchQuantityNearest)]}>المتاح {batch.quantity.toLocaleString("ar-EG")} وحدة</Text></View>; })}</View>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, writingDirection = "rtl" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad" | "number-pad"; writingDirection?: "rtl" | "ltr" }) {
  return <View style={commonStyles.inputGroup}><Text style={commonStyles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A7A3" keyboardType={keyboardType} returnKeyType="done" style={[commonStyles.input, { writingDirection, textAlign: writingDirection === "rtl" ? "right" : "left" }]} /></View>;
}

function formatPrice(price: number) { return `${price.toLocaleString("ar-EG")} ج.م`; }
function nextYearDate() { return new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10); }

const styles = StyleSheet.create({
  back: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 17, padding: 4 },
  backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  catalogCard: { backgroundColor: "#F2FBF8", borderRadius: 20, borderWidth: 1, borderColor: "#CDEAE2", padding: 14, marginBottom: 14 },
  catalogTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  catalogTitle: { flex: 1, alignItems: "flex-end" },
  catalogHeading: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  catalogSubheading: { color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  scanButton: { flexDirection: "row-reverse", alignItems: "center", gap: 3, minHeight: 36, backgroundColor: COLORS.mint, paddingHorizontal: 11, borderRadius: 11 },
  scanText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  catalogSearch: { height: 46, marginTop: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CDEAE2", borderRadius: 13, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  catalogSearchInput: { flex: 1, color: COLORS.ink, fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  loading: { marginTop: 12 },
  catalogResult: { flexDirection: "row-reverse", alignItems: "center", gap: 9, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#CDEAE2" },
  catalogResultText: { flex: 1, alignItems: "flex-end" },
  catalogResultName: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right" },
  catalogResultMeta: { color: COLORS.muted, fontSize: 9, marginTop: 3, textAlign: "right" },
  lockedCatalogCard: { backgroundColor: "#F2FBF8", borderRadius: 18, borderWidth: 1, borderColor: "#CDEAE2", padding: 14, marginBottom: 14, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  lockedIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#DDF4EC", alignItems: "center", justifyContent: "center" },
  lockedCatalogText: { flex: 1, alignItems: "flex-end" },
  lockedTitle: { width: "100%", color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  lockedMeta: { width: "100%", color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  lockedNote: { width: "100%", color: COLORS.primary, fontSize: 10, fontWeight: "800", marginTop: 5, textAlign: "right" },
  formCard: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 18 },
  readOnlyDetails: { backgroundColor: "#F7F7F5", borderRadius: 13, padding: 12, marginBottom: 14, alignItems: "flex-end" },
  readOnlyName: { width: "100%", color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" },
  readOnlyMeta: { width: "100%", color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  readOnlyNote: { width: "100%", color: COLORS.muted, fontSize: 9, marginTop: 7, textAlign: "right" },
  expiryHistory: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, paddingTop: 13, marginTop: 1, marginBottom: 14 },
  expiryHeadingRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  expiryHeading: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  expiryCount: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  expiryBatch: { minHeight: 48, borderRadius: 12, backgroundColor: "#F7F7F5", marginTop: 6, paddingHorizontal: 11, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  expiryBatchNearest: { backgroundColor: "#ECF8F4", borderWidth: 1, borderColor: "#B9E2D5" },
  expiryBatchUrgent: { backgroundColor: "#FFF1E9", borderWidth: 1, borderColor: "#FFD6BD" },
  expiryBatchText: { alignItems: "flex-end" },
  expiryBatchDate: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  expiryBatchDateNearest: { color: COLORS.primary },
  expiryBatchDateUrgent: { color: COLORS.warning },
  expiryBatchLabel: { color: COLORS.muted, fontSize: 9, fontWeight: "800", marginTop: 2 },
  expiryBatchQuantity: { color: COLORS.muted, fontSize: 11, fontWeight: "900" },
  expiryBatchQuantityNearest: { color: COLORS.primary },
  expiryBatchQuantityUrgent: { color: COLORS.warning },
  twoColumns: { flexDirection: "row-reverse", gap: 10 },
  halfField: { flex: 1 },
  singleField: { width: "100%" },
  unitSummary: { padding: 11, backgroundColor: COLORS.mint, borderRadius: 12, marginTop: 2 },
  unitSummaryText: { color: COLORS.primary, fontSize: 11, fontWeight: "900", textAlign: "right" },
  disabledSave: { opacity: 0.55 },
  printLabelButton: { minHeight: 46, flexDirection: "row-reverse", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 13, backgroundColor: "#EAF7F2", borderRadius: 14 },
  printLabelText: { color: COLORS.primary, fontSize: 13, fontWeight: "900" },
  deleteButton: { minHeight: 46, flexDirection: "row-reverse", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 15 },
  deleteText: { color: COLORS.danger, fontSize: 13, fontWeight: "800" },
  deleteOverlay: { flex: 1, backgroundColor: "rgba(11, 29, 24, 0.54)", justifyContent: "flex-end" },
  deleteSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 22, paddingTop: 23, paddingBottom: 30 },
  deleteSheetTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900", textAlign: "right" },
  deleteSheetBody: { color: COLORS.muted, fontSize: 12, lineHeight: 20, textAlign: "right", marginTop: 8, marginBottom: 18 },
  confirmDeleteButton: { minHeight: 52, backgroundColor: COLORS.danger, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  confirmDeleteText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  cancelDeleteButton: { minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 5 },
  cancelDeleteText: { color: COLORS.muted, fontSize: 13, fontWeight: "900" },
});
