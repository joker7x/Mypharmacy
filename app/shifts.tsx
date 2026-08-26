import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, StatTile, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { formatCurrency, usePharmacy } from "@/lib/pharmacy-context";

export default function ShiftsScreen() {
  const { shifts, sales, activeShift, startShift, closeShift } = usePharmacy();
  const [pharmacistName, setPharmacistName] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [note, setNote] = useState("");
  const shiftSales = useMemo(() => activeShift ? sales.filter((sale) => sale.shiftId === activeShift.id) : [], [activeShift, sales]);
  const expectedCash = (activeShift?.openingCash ?? 0) + shiftSales.filter((sale) => sale.paymentMethod === "نقدي").reduce((sum, sale) => sum + sale.total, 0);

  const handleStart = () => {
    const ok = startShift(pharmacistName, Number(openingCash) || 0);
    if (!ok) return Alert.alert("تعذر بدء الوردية", "أدخل اسم الصيدلي وتأكد من عدم وجود وردية مفتوحة.");
    setPharmacistName("");
    setOpeningCash("0");
    Alert.alert("تم بدء الوردية", "أصبحت المبيعات الجديدة مرتبطة بهذه الوردية.");
  };

  const handleClose = () => {
    const cash = Number(actualCash);
    if (!activeShift || Number.isNaN(cash) || cash < 0) return Alert.alert("بيانات غير مكتملة", "أدخل النقدية الفعلية عند إغلاق الوردية.");
    closeShift(activeShift.id, cash, note.trim() || undefined);
    setActualCash("");
    setNote("");
    Alert.alert("تم إغلاق الوردية", "تم حفظ المطابقة النقدية ضمن سجل الورديات.");
  };

  return (
    <AdminShell title="الورديات" subtitle="ابدأ وردية واضحة، ثم أغلقها بمطابقة نقدية بسيطة">
      {activeShift ? (
        <>
          <AdminCard style={{ backgroundColor: "#ECF8F4", borderColor: "#B9E2D5" }}>
            <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: "900", textAlign: "right" }}>وردية مفتوحة الآن</Text>
            <Text style={{ color: COLORS.ink, fontSize: 13, textAlign: "right", marginTop: 6 }}>{activeShift.pharmacistName} · بدأت {new Date(activeShift.startedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</Text>
            <View style={{ flexDirection: "row-reverse", gap: 9, marginTop: 14 }}>
              <StatTile label="مبيعات الوردية" value={formatCurrency(shiftSales.reduce((sum, sale) => sum + sale.total, 0))} />
              <StatTile label="المتوقع نقدًا" value={formatCurrency(expectedCash)} accent={COLORS.warning} />
            </View>
          </AdminCard>
          <AdminCard>
            <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 13 }}>إغلاق الوردية</Text>
            <AdminField label="النقدية الفعلية في الدرج" value={actualCash} onChangeText={setActualCash} placeholder="0.00" keyboardType="decimal-pad" />
            <AdminField label="ملاحظة اختيارية" value={note} onChangeText={setNote} placeholder="أي فرق أو ملاحظة للصيدلي التالي" />
            <AdminButton title="إغلاق وحفظ المطابقة" onPress={handleClose} />
          </AdminCard>
        </>
      ) : (
        <AdminCard>
          <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 13 }}>بدء وردية جديدة</Text>
          <AdminField label="اسم الصيدلي" value={pharmacistName} onChangeText={setPharmacistName} placeholder="مثال: أحمد محمد" />
          <AdminField label="الرصيد الافتتاحي" value={openingCash} onChangeText={setOpeningCash} placeholder="0.00" keyboardType="decimal-pad" />
          <AdminButton title="بدء الوردية" onPress={handleStart} />
        </AdminCard>
      )}
      <Text style={adminStyles.sectionHeading}>سجل الورديات</Text>
      {shifts.length ? shifts.map((shift) => <AdminCard key={shift.id} style={{ marginBottom: 9 }}><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}><View style={{ flex: 1, alignItems: "flex-end" }}><Text style={{ color: COLORS.ink, fontSize: 13, fontWeight: "900" }}>{shift.pharmacistName}</Text><Text style={{ color: COLORS.muted, fontSize: 10, marginTop: 4 }}>{new Date(shift.startedAt).toLocaleDateString("ar-EG")} · افتتاحي {formatCurrency(shift.openingCash)}</Text></View><Text style={{ color: shift.closedAt ? COLORS.primary : COLORS.warning, fontSize: 11, fontWeight: "900" }}>{shift.closedAt ? `فرق ${formatCurrency(shift.difference ?? 0)}` : "مفتوحة"}</Text></View></AdminCard>) : <AdminCard><Text style={{ color: COLORS.muted, textAlign: "right", fontSize: 12 }}>لا توجد ورديات محفوظة بعد.</Text></AdminCard>}
    </AdminShell>
  );
}
