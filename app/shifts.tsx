import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { calculateExpectedShiftCash, formatCurrency, usePharmacy } from "@/lib/pharmacy-context";

export default function ShiftsScreen() {
  const { shifts, sales, expenses, activeShift, startShift, closeShift } = usePharmacy();
  const [pharmacistName, setPharmacistName] = useState("");
  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [note, setNote] = useState("");
  const [isCloseSheetOpen, setIsCloseSheetOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>();

  const shiftSales = useMemo(() => activeShift ? sales.filter((sale) => sale.shiftId === activeShift.id) : [], [activeShift, sales]);
  const shiftExpenses = useMemo(() => activeShift ? expenses.filter((expense) => expense.shiftId === activeShift.id) : [], [activeShift, expenses]);
  const cashSales = shiftSales.filter((sale) => sale.paymentMethod === "نقدي").reduce((sum, sale) => sum + sale.total, 0);
  const expenseTotal = shiftExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expectedCash = activeShift ? calculateExpectedShiftCash(activeShift.openingCash, cashSales, expenseTotal) : 0;
  const actualCashValue = Number(actualCash);
  const hasActualCash = actualCash.trim().length > 0 && Number.isFinite(actualCashValue) && actualCashValue >= 0;
  const difference = hasActualCash ? actualCashValue - expectedCash : null;
  const closedShifts = useMemo(() => shifts.filter((shift) => Boolean(shift.closedAt)), [shifts]);
  const selectedShift = closedShifts.find((shift) => shift.id === selectedShiftId);
  const selectedShiftSales = useMemo(() => selectedShift ? sales.filter((sale) => sale.shiftId === selectedShift.id) : [], [sales, selectedShift]);
  const selectedShiftExpenses = useMemo(() => selectedShift ? expenses.filter((expense) => expense.shiftId === selectedShift.id) : [], [expenses, selectedShift]);
  const selectedCashSales = selectedShiftSales.filter((sale) => sale.paymentMethod === "نقدي").reduce((sum, sale) => sum + sale.total, 0);
  const selectedExpenseTotal = selectedShiftExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const selectedExpectedCash = selectedShift ? calculateExpectedShiftCash(selectedShift.openingCash, selectedCashSales, selectedExpenseTotal) : 0;

  const handleStart = () => {
    const ok = startShift(pharmacistName, Number(openingCash) || 0);
    if (!ok) return Alert.alert("تعذر بدء الشيفت", "أدخل اسم الصيدلي وتأكد من عدم وجود شيفت مفتوح.");
    setPharmacistName("");
    setOpeningCash("0");
  };
  const openCloseSheet = () => {
    setActualCash("");
    setNote("");
    setIsCloseSheetOpen(true);
  };
  const handleClose = () => {
    if (!activeShift || !hasActualCash) return Alert.alert("أدخل النقدية الفعلية", "أدخل قيمة النقدية الموجودة فعليًا في الدرج.");
    closeShift(activeShift.id, actualCashValue, note.trim() || undefined);
    setIsCloseSheetOpen(false);
    setActualCash("");
    setNote("");
    Alert.alert("تم تقفيل الشيفت", `تم حفظ فرق الخزينة: ${formatCurrency(actualCashValue - expectedCash)}.`);
  };

  return (
    <AdminShell title="إدارة الخزينة" subtitle="ملخص الشيفت الحالي ومطابقة الدرج">
      {activeShift ? (
        <AdminCard style={styles.currentCard}>
          <Text style={styles.sectionTitle}>الشيفت الحالي</Text>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={styles.heroName}>{activeShift.pharmacistName}</Text>
              <View style={styles.startedAt}><View style={styles.startedDot} /><Text style={styles.heroTime}>بدأ {new Date(activeShift.startedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</Text></View>
            </View>
            <Text style={styles.heroLabel}>المتوقع في الدرج الآن</Text>
            <Text style={styles.heroValue}>{formatCurrency(expectedCash)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Summary label="نقدية المبيعات" value={formatCurrency(cashSales)} />
            <Summary label="مصروفات الشيفت" value={formatCurrency(expenseTotal)} accent={COLORS.warning} />
          </View>
          <AdminButton title="تقفيل الشيفت" onPress={openCloseSheet} />
        </AdminCard>
      ) : (
        <AdminCard>
          <Text style={styles.sectionTitle}>بدء شيفت جديد</Text>
          <AdminField label="اسم الصيدلي" value={pharmacistName} onChangeText={setPharmacistName} placeholder="مثال: أحمد محمد" />
          <AdminField label="الرصيد الافتتاحي" value={openingCash} onChangeText={setOpeningCash} placeholder="2000" keyboardType="decimal-pad" />
          <AdminButton title="بدء الشيفت" onPress={handleStart} />
        </AdminCard>
      )}

      <View style={styles.historySection}>
        <View style={styles.historyHeading}>
          <Text style={styles.historyCount}>{closedShifts.length.toLocaleString("ar-EG")} شيفت مغلق</Text>
          <Text style={adminStyles.sectionHeading}>سجل الشيفتات السابقة</Text>
        </View>
        {closedShifts.length ? (
          <View style={styles.historyCard}>
            {closedShifts.map((shift, index) => (
              <TouchableOpacity key={shift.id} onPress={() => setSelectedShiftId((current) => current === shift.id ? undefined : shift.id)} activeOpacity={0.72} style={[styles.historyRow, index > 0 && styles.historyDivider]}>
                <View style={styles.historyAmount}><Text style={[styles.historyDifference, { color: (shift.difference ?? 0) < 0 ? COLORS.danger : COLORS.primary }]}>فرق {formatCurrency(shift.difference ?? 0)}</Text><Text style={styles.reviewHint}>{selectedShiftId === shift.id ? "إخفاء التقرير" : "عرض التقرير"}</Text></View>
                <View style={styles.historyText}><Text style={styles.historyName}>{shift.pharmacistName}</Text><Text style={styles.historyMeta}>{new Date(shift.startedAt).toLocaleDateString("ar-EG")} · افتتاحي {formatCurrency(shift.openingCash)}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        ) : <AdminCard><Text style={styles.empty}>لا توجد شيفتات مغلقة بعد.</Text></AdminCard>}

        {selectedShift ? <ClosedShiftReport shift={selectedShift} expectedCash={selectedExpectedCash} cashSales={selectedCashSales} expenseTotal={selectedExpenseTotal} expenses={selectedShiftExpenses} /> : null}
      </View>

      <CloseShiftSheet visible={isCloseSheetOpen} expectedCash={expectedCash} actualCash={actualCash} note={note} hasActualCash={hasActualCash} difference={difference} onActualCashChange={setActualCash} onNoteChange={setNote} onClose={() => setIsCloseSheetOpen(false)} onConfirm={handleClose} />
    </AdminShell>
  );
}

function Summary({ label, value, accent = COLORS.ink }: { label: string; value: string; accent?: string }) {
  return <View style={styles.summaryBox}><Text style={[styles.summaryValue, { color: accent }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function CloseShiftSheet({ visible, expectedCash, actualCash, note, hasActualCash, difference, onActualCashChange, onNoteChange, onClose, onConfirm }: { visible: boolean; expectedCash: number; actualCash: string; note: string; hasActualCash: boolean; difference: number | null; onActualCashChange: (value: string) => void; onNoteChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const differenceColor = difference === null ? COLORS.muted : difference < 0 ? COLORS.danger : difference > 0 ? COLORS.primary : COLORS.success;
  const differenceLabel = difference === null ? "أدخل النقدية الفعلية" : difference === 0 ? "مطابقة كاملة" : difference < 0 ? "عجز في الدرج" : "زيادة في الدرج";
  return <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent><KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}><TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} /><View style={styles.bottomSheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeading}><TouchableOpacity onPress={onClose} style={styles.sheetClose} activeOpacity={0.7}><Text style={styles.sheetCloseText}>×</Text></TouchableOpacity><Text style={styles.sheetTitle}>تقفيل الشيفت</Text></View><View style={styles.expectedRow}><Text style={styles.expectedValue}>{formatCurrency(expectedCash)}</Text><Text style={styles.expectedLabel}>المتوقع في الدرج</Text></View><AdminField label="النقدية الفعلية في الدرج" value={actualCash} onChangeText={onActualCashChange} placeholder="0" keyboardType="decimal-pad" /><View style={[styles.differenceBox, { backgroundColor: difference === null ? "#F2F1EE" : difference < 0 ? "#FFE4D8" : "#DFF5EB" }]}><Text style={[styles.differenceValue, { color: differenceColor }]}>{difference === null ? "—" : formatCurrency(difference)}</Text><Text style={[styles.differenceLabel, { color: differenceColor }]}>{differenceLabel}</Text></View><AdminField label="ملاحظة (اختياري)" value={note} onChangeText={onNoteChange} placeholder="اكتب سبب الفرق إن وُجد" /><AdminButton title="تأكيد وتقفيل الشيفت" onPress={onConfirm} disabled={!hasActualCash} /></View></KeyboardAvoidingView></Modal>;
}

function ClosedShiftReport({ shift, expectedCash, cashSales, expenseTotal, expenses }: { shift: { pharmacistName: string; openingCash: number; actualCash?: number; difference?: number; note?: string; closedAt?: string }; expectedCash: number; cashSales: number; expenseTotal: number; expenses: { id: string; title: string; amount: number }[] }) {
  return <AdminCard style={styles.reportCard}><Text style={styles.reportTitle}>تقرير شيفت {shift.pharmacistName}</Text><Text style={styles.reportDate}>{shift.closedAt ? new Date(shift.closedAt).toLocaleString("ar-EG") : ""}</Text><View style={styles.reportRows}><ReportRow label="نقدية المبيعات" value={formatCurrency(cashSales)} /><ReportRow label="مصروفات الشيفت" value={formatCurrency(expenseTotal)} /><ReportRow label="المتوقع في الدرج" value={formatCurrency(expectedCash)} /><ReportRow label="الفعلي في الدرج" value={formatCurrency(shift.actualCash ?? expectedCash)} /><ReportRow label="الفرق" value={formatCurrency(shift.difference ?? 0)} /></View>{expenses.length ? <View style={styles.reportExpenses}>{expenses.map((expense) => <View style={styles.reportExpenseRow} key={expense.id}><Text style={styles.reportExpenseAmount}>{formatCurrency(expense.amount)}</Text><Text style={styles.reportExpenseName}>{expense.title}</Text></View>)}</View> : null}{shift.note ? <Text style={styles.reportNote}>ملاحظة: {shift.note}</Text> : null}</AdminCard>;
}

function ReportRow({ label, value }: { label: string; value: string }) { return <View style={styles.reportRow}><Text style={styles.reportRowValue}>{value}</Text><Text style={styles.reportRowLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  currentCard: { padding: 18 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 14 },
  hero: { backgroundColor: COLORS.primary, borderRadius: 26, padding: 19, minHeight: 181 },
  heroTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  heroName: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  startedAt: { flexDirection: "row-reverse", gap: 5, alignItems: "center" },
  startedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D5F6E8" },
  heroTime: { color: "#D5F6E8", fontSize: 11, fontWeight: "800" },
  heroLabel: { color: "#D5F6E8", fontSize: 13, fontWeight: "800", textAlign: "right", marginTop: 29 },
  heroValue: { color: "#FFFFFF", fontSize: 35, lineHeight: 44, fontWeight: "900", textAlign: "right", marginTop: 4 },
  summaryRow: { flexDirection: "row-reverse", gap: 9, marginVertical: 14 },
  summaryBox: { flex: 1, minHeight: 76, borderRadius: 20, backgroundColor: "#F2F1EE", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  summaryValue: { fontSize: 15, fontWeight: "900" },
  summaryLabel: { color: COLORS.muted, fontSize: 10, textAlign: "center", marginTop: 5, fontWeight: "800" },
  historySection: { marginTop: 16 },
  historyHeading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  historyCount: { color: COLORS.muted, fontSize: 10, fontWeight: "800", marginTop: 19 },
  historyCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, paddingHorizontal: 16 },
  historyRow: { minHeight: 74, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  historyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  historyText: { flex: 1, alignItems: "flex-end" },
  historyName: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  historyMeta: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  historyAmount: { minWidth: 79, alignItems: "flex-start" },
  historyDifference: { fontSize: 11, fontWeight: "900" },
  reviewHint: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  empty: { color: COLORS.muted, fontSize: 12, textAlign: "right" },
  reportCard: { marginTop: 12 },
  reportTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right" },
  reportDate: { color: COLORS.muted, fontSize: 10, textAlign: "right", marginTop: 4 },
  reportRows: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  reportRow: { minHeight: 39, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  reportRowLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  reportRowValue: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  reportExpenses: { marginTop: 11 },
  reportExpenseRow: { minHeight: 30, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  reportExpenseName: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  reportExpenseAmount: { color: COLORS.warning, fontSize: 10, fontWeight: "900" },
  reportNote: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 10 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(13, 36, 32, 0.46)", justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 11, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: "#D9DEDB", alignSelf: "center", marginBottom: 14 },
  sheetHeading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  sheetTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  sheetClose: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#F2F1EE", alignItems: "center", justifyContent: "center" },
  sheetCloseText: { color: COLORS.muted, fontSize: 25, fontWeight: "300", lineHeight: 29 },
  expectedRow: { backgroundColor: "#F2F1EE", borderRadius: 18, paddingHorizontal: 15, minHeight: 62, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  expectedValue: { color: COLORS.ink, fontSize: 17, fontWeight: "900" },
  expectedLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  differenceBox: { minHeight: 63, borderRadius: 18, paddingHorizontal: 15, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  differenceLabel: { fontSize: 12, fontWeight: "900" },
  differenceValue: { fontSize: 18, fontWeight: "900" },
});
