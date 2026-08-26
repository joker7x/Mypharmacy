import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, PharmacyMark, RoundIcon, SectionTitle, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatCurrency, formatShortDate, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function DashboardScreen() {
  const { medications, sales, reorderNeeds, incomingOrders, activeShift, isReady } = usePharmacy();
  const todaysSales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date().toDateString());
  const todayRevenue = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
  const activeReorderNeeds = reorderNeeds.filter((item) => item.status === "needed");
  const recentSales = sales.slice(0, 3);

  return <ScreenContainer className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}><PageHeader title="تشغيل الصيدلية" subtitle={isReady ? "كل ما تحتاجه لإنجاز يومك في مكان واحد" : "جارٍ تجهيز بيانات الصيدلية..."} />
    <View style={styles.revenueCard}><View style={styles.revenueTop}><View style={styles.revenueText}><Text style={styles.revenueLabel}>مبيعات اليوم</Text><Text style={styles.revenueValue}>{formatCurrency(todayRevenue)}</Text><Text style={styles.revenueMeta}>{todaysSales.length.toLocaleString("ar-EG")} فواتير · {activeShift ? `وردية ${activeShift.pharmacistName}` : "لا توجد وردية مفتوحة"}</Text></View><View style={styles.revenueIcon}><PharmacyMark inverse size="small" /></View></View><View style={styles.revenueRule} /><TouchableOpacity onPress={() => router.push("/reports")} style={styles.revenueLink} activeOpacity={0.7}><Text style={styles.revenueLinkText}>فتح التقرير الكامل</Text><IconSymbol name="chevron.left" size={16} color="#BDE5D4" /></TouchableOpacity></View>
    <SectionTitle title="الإجراء الأساسي" />
    <TouchableOpacity onPress={() => router.push("/(tabs)/sales")} style={styles.sellAction} activeOpacity={0.82}><View style={styles.sellIcon}><IconSymbol name="cart.fill" size={22} color="#FFFFFF" /></View><View style={styles.sellText}><Text style={styles.sellTitle}>بدء عملية بيع</Text><Text style={styles.sellSubtitle}>ابحث عن الدواء أو امسح الباركود</Text></View><IconSymbol name="chevron.left" size={20} color="#BDE5D4" /></TouchableOpacity>
    <TouchableOpacity onPress={() => router.push("/medicine-form")} style={styles.stockAction} activeOpacity={0.78}><View style={styles.stockIcon}><IconSymbol name="plus.circle.fill" size={20} color={COLORS.primary} /></View><View style={styles.stockText}><Text style={styles.stockTitle}>إضافة دواء للمخزون</Text><Text style={styles.stockSubtitle}>من الدليل الكامل أو بإدخال يدوي</Text></View><IconSymbol name="chevron.left" size={18} color={COLORS.muted} /></TouchableOpacity>
    <SectionTitle title="مهام اليوم" />
    <Card style={styles.taskCard}><WorkflowRow icon="doc.text.fill" tone="mint" title="استقبال توريد" subtitle={incomingOrders.length ? `${incomingOrders.length} طلبيات محفوظة تحتاج مراجعة` : "سجّل طلب المورد وأرفق صورة الفاتورة"} onPress={() => router.push("/orders")} /><WorkflowRow icon="bell.fill" tone="warning" title="مراجعة النواقص" subtitle={activeReorderNeeds.length ? `${activeReorderNeeds.length} أصناف تحتاج قرار طلب` : "لا توجد أصناف تحتاج طلبًا حاليًا"} onPress={() => router.push("/(tabs)/alerts")} badge={activeReorderNeeds.length || undefined} /><WorkflowRow icon="books.vertical.fill" tone="blue" title="دليل الأدوية" subtitle="ابحث بالاسم أو المادة الفعالة أو الباركود" onPress={() => router.push("/catalog")} last /></Card>
    <SectionTitle title="ملخص سريع" />
    <View style={styles.metricGrid}><Metric icon="shippingbox.fill" color={COLORS.primary} background={COLORS.mint} value={medications.length} label="أصناف بالمخزون" onPress={() => router.push("/(tabs)/inventory")} /><Metric icon="truck.box.fill" color="#557394" background={COLORS.softBlue} value={incomingOrders.length} label="طلبيات واردة" onPress={() => router.push("/orders")} /><Metric icon="bell.fill" color={COLORS.warning} background={COLORS.softWarning} value={activeReorderNeeds.length} label="تحتاج طلب" onPress={() => router.push("/(tabs)/alerts")} /></View>
    <SectionTitle title="آخر عمليات البيع" action="فتح البيع" onActionPress={() => router.push("/(tabs)/sales")} />
    <Card style={styles.salesCard}>{recentSales.map((sale, index) => <View key={sale.id}><View style={styles.saleRow}><View style={styles.saleText}><Text style={styles.saleTitle} numberOfLines={1}>{sale.items.map((item) => item.name).join("، ")}</Text><Text style={styles.saleDetail}>{formatShortDate(sale.createdAt)} · {sale.paymentMethod}</Text></View><Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text></View>{index < recentSales.length - 1 ? <View style={commonStyles.rowDivider} /> : null}</View>)}{!recentSales.length ? <Text style={styles.emptyText}>لم تسجل أي عملية بيع اليوم. ابدأ من زر «بدء عملية بيع».</Text> : null}</Card>
  </ScrollView></ScreenContainer>;
}

function WorkflowRow({ icon, tone, title, subtitle, onPress, badge, last = false }: { icon: Parameters<typeof RoundIcon>[0]["name"]; tone: "mint" | "warning" | "blue"; title: string; subtitle: string; onPress: () => void; badge?: number; last?: boolean }) {
  const color = tone === "warning" ? COLORS.warning : tone === "blue" ? "#557394" : COLORS.primary;
  const background = tone === "warning" ? COLORS.softWarning : tone === "blue" ? COLORS.softBlue : COLORS.mint;
  return <TouchableOpacity onPress={onPress} style={[styles.workflowRow, last && styles.workflowLast]} activeOpacity={0.75}><RoundIcon name={icon} color={color} background={background} /><View style={styles.workflowText}><Text style={styles.workflowTitle}>{title}</Text><Text style={styles.workflowSubtitle} numberOfLines={1}>{subtitle}</Text></View>{badge ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{badge}</Text></View> : null}<IconSymbol name="chevron.left" size={18} color={COLORS.muted} /></TouchableOpacity>;
}

function Metric({ icon, color, background, value, label, onPress }: { icon: Parameters<typeof RoundIcon>[0]["name"]; color: string; background: string; value: number; label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.metricCard} activeOpacity={0.75}><RoundIcon name={icon} color={color} background={background} /><Text style={styles.metricValue}>{value.toLocaleString("ar-EG")}</Text><Text style={styles.metricLabel}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  revenueCard: { backgroundColor: COLORS.deep, borderRadius: 20, padding: 19, marginBottom: 1 },
  revenueTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" },
  revenueText: { flex: 1, alignItems: "flex-end" },
  revenueLabel: { color: "#BDE5D4", fontSize: 12, fontWeight: "800" },
  revenueValue: { color: "#FFFFFF", fontSize: 29, lineHeight: 38, fontWeight: "900", marginTop: 4 },
  revenueMeta: { color: "#A3C8B9", fontSize: 10, marginTop: 2, textAlign: "right" },
  revenueIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#24574F", alignItems: "center", justifyContent: "center" },
  revenueRule: { height: 1, backgroundColor: "#2B6258", marginVertical: 16 },
  revenueLink: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 4 },
  revenueLinkText: { color: "#D6F2E7", fontSize: 11, fontWeight: "800" },
  sellAction: { minHeight: 72, borderRadius: 17, padding: 14, backgroundColor: COLORS.primary, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  sellIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#2A7D6D", alignItems: "center", justifyContent: "center" },
  sellText: { flex: 1, alignItems: "flex-end" },
  sellTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "right" },
  sellSubtitle: { color: "#CBEDE1", fontSize: 10, marginTop: 4, textAlign: "right" },
  stockAction: { minHeight: 62, borderRadius: 17, padding: 12, marginTop: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  stockIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.mint, alignItems: "center", justifyContent: "center" },
  stockText: { flex: 1, alignItems: "flex-end" },
  stockTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" },
  stockSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  taskCard: { paddingHorizontal: 14, paddingVertical: 0 },
  workflowRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, minHeight: 70, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  workflowLast: { borderBottomWidth: 0 },
  workflowText: { flex: 1, alignItems: "flex-end" },
  workflowTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" },
  workflowSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3, textAlign: "right" },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.softWarning, alignItems: "center", justifyContent: "center" },
  countBadgeText: { color: COLORS.warning, fontSize: 10, fontWeight: "900" },
  metricGrid: { flexDirection: "row-reverse", gap: 9 },
  metricCard: { flex: 1, minHeight: 106, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12, alignItems: "flex-end", justifyContent: "space-between" },
  metricValue: { color: COLORS.ink, fontSize: 21, fontWeight: "900" },
  metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", textAlign: "right" },
  salesCard: { paddingVertical: 13 },
  saleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  saleText: { flex: 1, alignItems: "flex-end", paddingLeft: 10 },
  saleTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "800", textAlign: "right" },
  saleDetail: { color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  saleAmount: { color: COLORS.primary, fontSize: 12, fontWeight: "900", writingDirection: "ltr" },
  emptyText: { color: COLORS.muted, fontSize: 12, textAlign: "right", lineHeight: 18 },
});
