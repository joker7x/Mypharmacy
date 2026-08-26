import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, StatTile, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { formatCurrency, usePharmacy } from "@/lib/pharmacy-context";

export default function ExpensesScreen() {
  const { expenses, addExpense } = usePharmacy();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"تشغيل" | "توريد" | "أخرى">("تشغيل");
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);

  const save = () => {
    const value = Number(amount);
    if (!title.trim() || !value || value < 0) return Alert.alert("بيانات ناقصة", "اكتب وصف المصروف وقيمته.");
    addExpense({ title: title.trim(), amount: value, category, paidAmount: value });
    setTitle("");
    setAmount("");
    Alert.alert("تم الحفظ", "أضيف المصروف إلى السجل المحلي.");
  };

  return (
    <AdminShell title="المصروفات" subtitle="سجّل تكلفة التشغيل والتوريد بعيدًا عن مبيعات اليوم">
      <View style={{ flexDirection: "row-reverse", gap: 9, marginBottom: 14 }}><StatTile label="إجمالي المصروفات" value={formatCurrency(total)} accent={COLORS.danger} /><StatTile label="عدد العمليات" value={expenses.length.toLocaleString("ar-EG")} /></View>
      <AdminCard>
        <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 13 }}>إضافة مصروف</Text>
        <AdminField label="وصف المصروف" value={title} onChangeText={setTitle} placeholder="مثال: كهرباء أو نقل" />
        <AdminField label="القيمة" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Text style={adminStyles.label}>التصنيف</Text>
        <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 12 }}>{(["تشغيل", "توريد", "أخرى"] as const).map((item) => <View key={item} style={{ flex: 1 }}><AdminButton title={item} onPress={() => setCategory(item)} secondary={category !== item} /></View>)}</View>
        <AdminButton title="حفظ المصروف" onPress={save} />
      </AdminCard>
      <Text style={adminStyles.sectionHeading}>آخر المصروفات</Text>
      {expenses.length ? expenses.slice(0, 30).map((expense) => <AdminCard key={expense.id} style={{ paddingVertical: 13, marginBottom: 9 }}><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, alignItems: "flex-end" }}><Text style={{ color: COLORS.ink, fontSize: 13, fontWeight: "900" }}>{expense.title}</Text><Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 4 }}>{expense.category} · {new Date(expense.createdAt).toLocaleDateString("ar-EG")}</Text></View><Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: "900" }}>{formatCurrency(expense.amount)}</Text></View></AdminCard>) : <AdminCard><Text style={{ color: COLORS.muted, textAlign: "right", fontSize: 12 }}>سجل المصروفات فارغ حاليًا.</Text></AdminCard>}
    </AdminShell>
  );
}
