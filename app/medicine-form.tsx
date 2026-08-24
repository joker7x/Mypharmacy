import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { COLORS, PageHeader, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Medication, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

type FormState = Omit<Medication, "id">;
const emptyForm: FormState = { name: "", category: "", sku: "", price: 0, quantity: 0, reorderLevel: 5, expiryDate: "" };

export default function MedicineFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, addMedication, updateMedication, deleteMedication } = usePharmacy();
  const existing = typeof id === "string" ? medications.find((item) => item.id === id) : undefined;
  const [form, setForm] = useState<FormState>(existing ? { name: existing.name, category: existing.category, sku: existing.sku, price: existing.price, quantity: existing.quantity, reorderLevel: existing.reorderLevel, expiryDate: existing.expiryDate } : emptyForm);
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }));

  const save = () => {
    if (!form.name.trim() || !form.category.trim() || !form.sku.trim() || !form.expiryDate.trim() || form.price < 0 || form.quantity < 0 || form.reorderLevel < 0) return Alert.alert("بيانات غير مكتملة", "أدخل اسم الدواء والفئة والكود وتاريخ الصلاحية مع قيم صحيحة.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate)) return Alert.alert("تاريخ غير صحيح", "استخدم الصيغة YYYY-MM-DD مثل 2027-05-20.");
    if (existing) updateMedication(existing.id, form); else addMedication(form);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert("حذف الصنف", `هل تريد حذف «${existing.name}» من المخزون؟`, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => { deleteMedication(existing.id); router.back(); } }]);
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity>
    <PageHeader title={existing ? "تعديل صنف" : "إضافة صنف"} subtitle={existing ? "حدّث بيانات المخزون بدقة" : "سجل دواءً جديدًا في المخزون"} />
    <View style={styles.formCard}><Field label="اسم الدواء" value={form.name} onChangeText={(value) => setField("name", value)} placeholder="مثال: بانادول إكسترا" /><Field label="الفئة" value={form.category} onChangeText={(value) => setField("category", value)} placeholder="مثال: مسكنات" /><Field label="كود الصنف" value={form.sku} onChangeText={(value) => setField("sku", value.toUpperCase())} placeholder="مثال: PAN-500" writingDirection="ltr" /><View style={styles.twoColumns}><View style={styles.halfField}><Field label="سعر البيع" value={String(form.price || "")} onChangeText={(value) => setField("price", Number(value.replace(/[^0-9.]/g, "")) || 0)} placeholder="0" keyboardType="decimal-pad" writingDirection="ltr" /></View><View style={styles.halfField}><Field label="الكمية" value={String(form.quantity || "")} onChangeText={(value) => setField("quantity", Number(value.replace(/[^0-9]/g, "")) || 0)} placeholder="0" keyboardType="number-pad" writingDirection="ltr" /></View></View><View style={styles.twoColumns}><View style={styles.halfField}><Field label="حد إعادة الطلب" value={String(form.reorderLevel || "")} onChangeText={(value) => setField("reorderLevel", Number(value.replace(/[^0-9]/g, "")) || 0)} placeholder="5" keyboardType="number-pad" writingDirection="ltr" /></View><View style={styles.halfField}><Field label="تاريخ الانتهاء" value={form.expiryDate} onChangeText={(value) => setField("expiryDate", value)} placeholder="YYYY-MM-DD" writingDirection="ltr" /></View></View></View>
    <TouchableOpacity onPress={save} style={commonStyles.primaryButton} activeOpacity={0.85}><IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" /><Text style={commonStyles.primaryButtonText}>{existing ? "حفظ التعديلات" : "إضافة إلى المخزون"}</Text></TouchableOpacity>
    {existing ? <TouchableOpacity onPress={remove} style={styles.deleteButton} activeOpacity={0.8}><IconSymbol name="trash" size={18} color={COLORS.danger} /><Text style={styles.deleteText}>حذف الصنف</Text></TouchableOpacity> : null}
  </ScrollView></ScreenContainer>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, writingDirection = "rtl" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad" | "number-pad"; writingDirection?: "rtl" | "ltr" }) {
  return <View style={commonStyles.inputGroup}><Text style={commonStyles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A7A3" keyboardType={keyboardType} returnKeyType="done" style={[commonStyles.input, { writingDirection, textAlign: writingDirection === "rtl" ? "right" : "left" }]} /></View>;
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 17, padding: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, formCard: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 18 }, twoColumns: { flexDirection: "row-reverse", gap: 10 }, halfField: { flex: 1 }, deleteButton: { minHeight: 46, flexDirection: "row-reverse", gap: 7, alignItems: "center", justifyContent: "center", marginTop: 15 }, deleteText: { color: COLORS.danger, fontSize: 13, fontWeight: "800" },
});
