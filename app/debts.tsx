import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, StatTile, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { formatCurrency, usePharmacy } from "@/lib/pharmacy-context";

export default function DebtsScreen() {
  const { debts, addDebt, settleDebt } = usePharmacy();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");
  const outstanding = useMemo(() => debts.reduce((sum, debt) => sum + Math.max(0, debt.total - debt.paid), 0), [debts]);

  const save = () => {
    const value = Number(total);
    if (!customerName.trim() || !value || value < 0) return Alert.alert("بيانات ناقصة", "اكتب اسم العميل وقيمة الحساب.");
    addDebt({ customerName: customerName.trim(), phone: phone.trim() || undefined, total: value, paid: 0, note: note.trim() || undefined });
    setCustomerName(""); setPhone(""); setTotal(""); setNote("");
    Alert.alert("تم حفظ الحساب", "أضيف الحساب إلى سجل الديون المحلي.");
  };

  const pay = (debtId: string, balance: number) => {
    Alert.prompt?.("تسجيل سداد", "أدخل المبلغ المدفوع", (value) => { const amount = Number(value); if (amount > 0) settleDebt(debtId, Math.min(balance, amount)); }, "plain-text", String(balance));
    if (!Alert.prompt) settleDebt(debtId, balance);
  };

  return (
    <AdminShell title="حسابات العملاء" subtitle="تابع الآجل والمدفوع والمتبقي بدون خلطه بالمبيعات النقدية">
      <View style={{ flexDirection: "row-reverse", gap: 9, marginBottom: 14 }}><StatTile label="إجمالي المتبقي" value={formatCurrency(outstanding)} accent={COLORS.danger} /><StatTile label="حسابات مفتوحة" value={debts.filter((debt) => debt.paid < debt.total).length.toLocaleString("ar-EG")} /></View>
      <AdminCard>
        <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 13 }}>إضافة حساب آجل</Text>
        <AdminField label="اسم العميل" value={customerName} onChangeText={setCustomerName} placeholder="مثال: محمد علي" />
        <AdminField label="رقم الهاتف (اختياري)" value={phone} onChangeText={setPhone} placeholder="01xxxxxxxxx" keyboardType="phone-pad" />
        <AdminField label="قيمة الحساب" value={total} onChangeText={setTotal} placeholder="0.00" keyboardType="decimal-pad" />
        <AdminField label="ملاحظة" value={note} onChangeText={setNote} placeholder="وصف مختصر للحساب" />
        <AdminButton title="حفظ الحساب" onPress={save} />
      </AdminCard>
      <Text style={adminStyles.sectionHeading}>الحسابات المسجلة</Text>
      {debts.length ? debts.map((debt) => { const balance = Math.max(0, debt.total - debt.paid); return <AdminCard key={debt.id} style={{ paddingVertical: 13, marginBottom: 9 }}><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, alignItems: "flex-end" }}><Text style={{ color: COLORS.ink, fontSize: 13, fontWeight: "900" }}>{debt.customerName}</Text><Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 4 }}>{debt.phone || "بدون رقم"} · إجمالي {formatCurrency(debt.total)}</Text></View><Text style={{ color: balance ? COLORS.danger : COLORS.primary, fontSize: 13, fontWeight: "900" }}>{balance ? `متبقي ${formatCurrency(balance)}` : "تم السداد"}</Text></View>{balance ? <AdminButton title="تسجيل سداد" onPress={() => pay(debt.id, balance)} secondary /> : null}</AdminCard>; }) : <AdminCard><Text style={{ color: COLORS.muted, textAlign: "right", fontSize: 12 }}>لا توجد حسابات آجلة مسجلة.</Text></AdminCard>}
    </AdminShell>
  );
}
