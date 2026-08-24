import { router } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Badge, COLORS, PageHeader, RoundIcon } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PharmacyAlert, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function AlertsScreen() {
  const { alerts } = usePharmacy();
  return <ScreenContainer containerClassName="bg-background" className="flex-1"><FlatList data={alerts} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={<PageHeader title="التنبيهات" subtitle={alerts.length ? `${alerts.length} تنبيهات تحتاج مراجعة` : "حالة المخزون مستقرة"} />} renderItem={({ item }: { item: PharmacyAlert }) => <TouchableOpacity onPress={() => router.push({ pathname: "/medicine-form", params: { id: item.medicationId } })} style={styles.alertItem} activeOpacity={0.8}><RoundIcon name={item.kind === "stock" ? "shippingbox.fill" : "clock.fill"} color={item.severity === "high" ? COLORS.danger : COLORS.warning} background={item.severity === "high" ? COLORS.softDanger : COLORS.softWarning} /><View style={styles.itemText}><View style={styles.itemTitleRow}><Text style={styles.itemTitle}>{item.title}</Text><Badge label={item.severity === "high" ? "عاجل" : "للمتابعة"} tone={item.severity === "high" ? "danger" : "warning"} /></View><Text style={styles.itemDetail}>{item.detail}</Text></View><IconSymbol name="chevron.left" size={19} color={COLORS.muted} /></TouchableOpacity>} ListEmptyComponent={<View style={styles.empty}><RoundIcon name="checkmark.circle.fill" color={COLORS.success} background="#E4F6EE" /><Text style={styles.emptyTitle}>كل شيء تحت السيطرة</Text><Text style={styles.emptyDetail}>لا توجد أصناف منخفضة أو قريبة الصلاحية الآن.</Text></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112, flexGrow: 1 }, alertItem: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 16 }, itemText: { flex: 1, alignItems: "flex-end" }, itemTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, width: "100%", justifyContent: "flex-start" }, itemTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, itemDetail: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: "right", alignSelf: "stretch" }, separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border }, empty: { alignItems: "center", justifyContent: "center", flex: 1, paddingBottom: 90 }, emptyTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800", marginTop: 13 }, emptyDetail: { color: COLORS.muted, fontSize: 12, marginTop: 5, textAlign: "center" },
});
