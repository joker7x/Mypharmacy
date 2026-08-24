import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, RoundIcon, SectionTitle, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatCurrency, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function ReportsScreen() {
  const { sales, medications, alerts } = usePharmacy();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date().toDateString());
  const revenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const units = todaySales.reduce((sum, sale) => sum + sale.items.reduce((subtotal, item) => subtotal + item.quantity, 0), 0);
  const topItems = Object.values(sales.flatMap((sale) => sale.items).reduce<Record<string, { name: string; quantity: number }>>((acc, item) => ({ ...acc, [item.medicationId]: { name: item.name, quantity: (acc[item.medicationId]?.quantity ?? 0) + item.quantity } }), {})).sort((a, b) => b.quantity - a.quantity).slice(0, 3);
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}>
    <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity><PageHeader title="التقارير" subtitle="ملخص تشغيلي مبسط لليوم" />
    <View style={styles.summaryGrid}><Card style={styles.summaryCard}><RoundIcon name="chart.line.uptrend.xyaxis" /><Text style={styles.summaryValue}>{formatCurrency(revenue)}</Text><Text style={styles.summaryLabel}>إجمالي المبيعات</Text></Card><Card style={styles.summaryCard}><RoundIcon name="doc.text.fill" color="#496C9C" background="#E8F0FA" /><Text style={styles.summaryValue}>{todaySales.length}</Text><Text style={styles.summaryLabel}>فواتير اليوم</Text></Card><Card style={styles.summaryCard}><RoundIcon name="cart.fill" color={COLORS.success} background="#E4F6EE" /><Text style={styles.summaryValue}>{units}</Text><Text style={styles.summaryLabel}>وحدات مباعة</Text></Card></View>
    <SectionTitle title="الأصناف الأكثر طلبًا" /><Card>{topItems.map((item, index) => <View key={item.name} style={[styles.topItem, index < topItems.length - 1 && styles.topBorder]}><Text style={styles.topValue}>{item.quantity} وحدات</Text><View style={styles.topText}><Text style={styles.topName}>{item.name}</Text><Text style={styles.topRank}>المركز {index + 1}</Text></View><View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View></View>)}{!topItems.length ? <Text style={styles.empty}>لا توجد مبيعات مسجلة بعد.</Text> : null}</Card>
    <SectionTitle title="صحة المخزون" /><Card><View style={styles.healthRow}><Text style={styles.healthValue}>{medications.length}</Text><Text style={styles.healthLabel}>إجمالي الأصناف النشطة</Text></View><View style={commonStyles.rowDivider} /><View style={styles.healthRow}><Text style={[styles.healthValue, { color: alerts.length ? COLORS.warning : COLORS.success }]}>{alerts.length}</Text><Text style={styles.healthLabel}>تنبيهات تتطلب متابعة</Text></View></Card>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 17, padding: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, summaryGrid: { flexDirection: "row-reverse", gap: 9 }, summaryCard: { flex: 1, padding: 12, alignItems: "flex-end" }, summaryValue: { color: COLORS.ink, fontSize: 17, fontWeight: "900", marginTop: 12 }, summaryLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700", textAlign: "right", marginTop: 3 }, topItem: { flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingVertical: 10 }, topBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }, rank: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.mint, alignItems: "center", justifyContent: "center" }, rankText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" }, topText: { flex: 1, alignItems: "flex-end" }, topName: { color: COLORS.ink, fontSize: 13, fontWeight: "800", textAlign: "right" }, topRank: { color: COLORS.muted, fontSize: 11, marginTop: 3 }, topValue: { color: COLORS.primary, fontSize: 12, fontWeight: "900" }, healthRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, healthValue: { color: COLORS.primary, fontSize: 22, fontWeight: "900" }, healthLabel: { color: COLORS.ink, fontSize: 13, fontWeight: "700" }, empty: { color: COLORS.muted, fontSize: 12, textAlign: "right" },
});
