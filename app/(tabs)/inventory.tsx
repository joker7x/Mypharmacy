import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Badge, COLORS, PageHeader, RoundIcon } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatCurrency, formatShortDate, isExpirySoon, Medication, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

type Filter = "الكل" | "مخزون منخفض" | "صلاحية قريبة";

export default function InventoryScreen() {
  const { medications } = usePharmacy();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("الكل");
  const visibleItems = useMemo(() => medications.filter((medication) => {
    const matchesSearch = medication.name.includes(search) || medication.category.includes(search) || medication.sku.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "الكل" || (filter === "مخزون منخفض" && medication.quantity <= medication.reorderLevel) || (filter === "صلاحية قريبة" && isExpirySoon(medication.expiryDate));
    return matchesSearch && matchesFilter;
  }), [filter, medications, search]);

  const renderItem = ({ item }: { item: Medication }) => {
    const lowStock = item.quantity <= item.reorderLevel;
    const expirySoon = isExpirySoon(item.expiryDate);
    return <TouchableOpacity onPress={() => router.push({ pathname: "/medicine-form", params: { id: item.id } })} style={styles.item} activeOpacity={0.8}>
      <RoundIcon name="cross.case.fill" />
      <View style={styles.itemBody}><View style={styles.itemTop}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.price}>{formatCurrency(item.price)}</Text></View><View style={styles.itemMeta}><Text style={styles.itemCategory}>{item.category} · {item.sku}</Text><Text style={[styles.quantity, lowStock && { color: COLORS.danger }]}>{item.quantity} عبوة</Text></View><View style={styles.badges}>{lowStock ? <Badge label="مخزون منخفض" tone={item.quantity <= Math.max(2, Math.floor(item.reorderLevel / 2)) ? "danger" : "warning"} /> : <Badge label="متوفر" tone="success" />}{expirySoon ? <Badge label={`ينتهي ${formatShortDate(item.expiryDate)}`} tone="warning" /> : null}</View></View>
      <IconSymbol name="chevron.left" size={19} color={COLORS.muted} />
    </TouchableOpacity>;
  };

  return <ScreenContainer containerClassName="bg-background" className="flex-1"><FlatList data={visibleItems} keyExtractor={(item) => item.id} renderItem={renderItem} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={<View><PageHeader title="المخزون" subtitle={`${medications.length} أصناف مسجلة`} action="إضافة صنف" onActionPress={() => router.push("/medicine-form")} /><View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={20} color={COLORS.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث باسم الدواء أو الكود" placeholderTextColor="#96A5A2" style={styles.searchInput} returnKeyType="done" /></View><View style={styles.filters}>{(["الكل", "مخزون منخفض", "صلاحية قريبة"] as Filter[]).map((option) => <TouchableOpacity key={option} onPress={() => setFilter(option)} style={[styles.filter, filter === option && styles.filterActive]} activeOpacity={0.75}><Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option}</Text></TouchableOpacity>)}</View><Text style={styles.countText}>عرض {visibleItems.length} من {medications.length} أصناف</Text></View>} ListEmptyComponent={<View style={styles.empty}><RoundIcon name="magnifyingglass" color={COLORS.muted} background="#EEF3F1" /><Text style={styles.emptyTitle}>لا توجد نتائج مطابقة</Text><Text style={styles.emptyDescription}>غيّر عبارة البحث أو الفلتر لعرض أصناف أخرى.</Text></View>} /></ScreenContainer>;
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112 }, searchBox: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" }, filters: { flexDirection: "row-reverse", gap: 8, marginTop: 13 }, filter: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }, filterActive: { backgroundColor: COLORS.mint, borderColor: COLORS.mint }, filterText: { color: COLORS.muted, fontSize: 11, fontWeight: "800" }, filterTextActive: { color: COLORS.primary }, countText: { color: COLORS.muted, fontSize: 12, fontWeight: "700", textAlign: "right", marginTop: 17, marginBottom: 10 },
  item: { flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingVertical: 15 }, itemBody: { flex: 1, alignItems: "flex-end" }, itemTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", width: "100%" }, itemName: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right", paddingLeft: 7 }, price: { color: COLORS.primary, fontSize: 13, fontWeight: "900", writingDirection: "ltr" }, itemMeta: { flexDirection: "row-reverse", justifyContent: "space-between", width: "100%", marginTop: 4 }, itemCategory: { color: COLORS.muted, fontSize: 11, textAlign: "right" }, quantity: { color: COLORS.success, fontSize: 11, fontWeight: "800" }, badges: { flexDirection: "row-reverse", gap: 6, marginTop: 8 }, separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border }, empty: { alignItems: "center", paddingTop: 62 }, emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginTop: 12 }, emptyDescription: { color: COLORS.muted, fontSize: 12, marginTop: 5, textAlign: "center" },
});
