import { useMemo } from "react";
import { Text, View } from "react-native";

import { AdminCard, AdminShell, StatTile, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { formatCurrency, usePharmacy } from "@/lib/pharmacy-context";

export default function ReportsScreen() {
  const { sales, expenses, debts, medications, activeShift } = usePharmacy();
  const salesTotal = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const expensesTotal = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const debtTotal = useMemo(() => debts.reduce((sum, debt) => sum + Math.max(0, debt.total - debt.paid), 0), [debts]);
  const stockUnits = useMemo(() => medications.reduce((sum, medication) => sum + medication.quantity, 0), [medications]);
  const lowStock = medications.filter((medication) => medication.quantity <= medication.reorderLevel).length;

  return (
    <AdminShell title="التقارير" subtitle="صورة سريعة عن حركة الصيدلية والقرارات التي تحتاج متابعة">
      <View style={{ flexDirection: "row-reverse", gap: 9, marginBottom: 9 }}><StatTile label="إجمالي المبيعات" value={formatCurrency(salesTotal)} /><StatTile label="صافي قبل المصروفات" value={formatCurrency(salesTotal - expensesTotal)} accent={COLORS.primary} /></View>
      <View style={{ flexDirection: "row-reverse", gap: 9, marginBottom: 14 }}><StatTile label="وحدات المخزون" value={stockUnits.toLocaleString("ar-EG")} accent={COLORS.warning} /><StatTile label="أصناف تحتاج متابعة" value={lowStock.toLocaleString("ar-EG")} accent={lowStock ? COLORS.danger : COLORS.primary} /></View>
      <Text style={adminStyles.sectionHeading}>ملخص مالي</Text>
      <AdminCard><ReportRow label="عدد الفواتير" value={sales.length.toLocaleString("ar-EG")} /><ReportRow label="مبيعات نقدية" value={formatCurrency(sales.filter((sale) => sale.paymentMethod === "نقدي").reduce((sum, sale) => sum + sale.total, 0))} /><ReportRow label="مبيعات بطاقة ومحفظة" value={formatCurrency(sales.filter((sale) => sale.paymentMethod !== "نقدي").reduce((sum, sale) => sum + sale.total, 0))} /><ReportRow label="المصروفات" value={formatCurrency(expensesTotal)} danger /><ReportRow label="ديون العملاء المتبقية" value={formatCurrency(debtTotal)} danger /></AdminCard>
      <Text style={adminStyles.sectionHeading}>حالة التشغيل</Text>
      <AdminCard style={{ backgroundColor: activeShift ? "#ECF8F4" : "#FFF8E9", borderColor: activeShift ? "#B9E2D5" : "#F0D99D" }}><Text style={{ color: activeShift ? COLORS.primary : COLORS.warning, fontSize: 14, fontWeight: "900", textAlign: "right" }}>{activeShift ? `وردية مفتوحة · ${activeShift.pharmacistName}` : "لا توجد وردية مفتوحة"}</Text><Text style={{ color: COLORS.ink, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 }}>{activeShift ? "المبيعات الجديدة تُربط بالوردية الحالية وتظهر في تقرير الإغلاق." : "ابدأ وردية من قسم الإدارة قبل تسجيل مبيعات جديدة."}</Text></AdminCard>
    </AdminShell>
  );
}

function ReportRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border }}><Text style={{ color: COLORS.ink, fontSize: 12, fontWeight: "700" }}>{label}</Text><Text style={{ color: danger ? COLORS.danger : COLORS.primary, fontSize: 13, fontWeight: "900" }}>{value}</Text></View>;
}
