import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { COLORS, PageHeader, RoundIcon } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatCurrency, formatShortDate, getNearestExpiryDate, isExpirySoon, Medication, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

type Filter = "الكل" | "مخزون منخفض" | "صلاحية قريبة";
const filterOptions: Filter[] = ["الكل", "مخزون منخفض", "صلاحية قريبة"];

export default function InventoryScreen() {
  const { medications } = usePharmacy();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("الكل");
  const deferredSearch = useDeferredValue(search.trim());

  const lowCount = useMemo(
    () => medications.filter((item) => item.quantity <= item.reorderLevel).length,
    [medications],
  );
  const visibleItems = useMemo(
    () => medications.filter((medication) => {
      const query = deferredSearch.toLowerCase();
      const matchesSearch = !query || [medication.name, medication.category, medication.sku, medication.barcode ?? ""]
        .some((value) => value.toLowerCase().includes(query));
      const matchesFilter = filter === "الكل"
        || (filter === "مخزون منخفض" && medication.quantity <= medication.reorderLevel)
        || (filter === "صلاحية قريبة" && isExpirySoon(getNearestExpiryDate(medication)));
      return matchesSearch && matchesFilter;
    }),
    [deferredSearch, filter, medications],
  );
  const renderItem = useCallback(({ item }: { item: Medication }) => <InventoryRow item={item} />, []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <ScreenContainer className="flex-1" containerClassName="bg-background">
      <View style={styles.screen}>
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={12}
          windowSize={9}
          removeClippedSubviews
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={
            <View style={styles.header}>
              <PageHeader
                title="المخزون"
                subtitle={`${medications.length.toLocaleString("ar-EG")} أصناف · ${lowCount.toLocaleString("ar-EG")} تحتاج متابعة`}
              />
              <TouchableOpacity onPress={() => router.push("/catalog")} style={styles.catalogLink} activeOpacity={0.72}>
                <IconSymbol name="books.vertical.fill" size={17} color={COLORS.primary} />
                <Text style={styles.catalogLinkText}>دليل الأصناف والأسعار</Text>
                <IconSymbol name="chevron.left" size={16} color={COLORS.muted} />
              </TouchableOpacity>
              <View style={styles.searchBox}>
                <IconSymbol name="magnifyingglass" size={19} color={COLORS.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="ابحث باسم الدواء أو الكود أو الباركود"
                  placeholderTextColor="#8B9792"
                  style={styles.searchInput}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.filters}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setFilter(option)}
                    style={[styles.filter, filter === option && styles.filterActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterText, filter === option && styles.filterTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.countText}>
                عرض {visibleItems.length.toLocaleString("ar-EG")} من {medications.length.toLocaleString("ar-EG")} أصناف
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <RoundIcon name="magnifyingglass" color={COLORS.muted} background={COLORS.mint} />
              <Text style={styles.emptyTitle}>لا توجد نتائج مطابقة</Text>
              <Text style={styles.emptyDescription}>غيّر عبارة البحث أو الفلتر لعرض أصناف أخرى.</Text>
            </View>
          }
        />
        <TouchableOpacity
          onPress={() => router.push("/medicine-form")}
          style={styles.floatingAdd}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="إضافة صنف للمخزون"
        >
          <IconSymbol name="plus.circle.fill" size={22} color="#FFFFFF" />
          <Text style={styles.floatingAddText}>إضافة صنف</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const InventoryRow = memo(function InventoryRow({ item }: { item: Medication }) {
  const nearestExpiry = getNearestExpiryDate(item);
  const lowStock = item.quantity <= item.reorderLevel;
  const expirySoon = !lowStock && isExpirySoon(nearestExpiry);
  const packages = Math.ceil(item.quantity / Math.max(1, item.unitsPerPackage ?? 1));
  const statusColor = lowStock ? COLORS.danger : expirySoon ? "#E7B52E" : COLORS.success;
  const supportingText = expirySoon
    ? `الأقرب ${formatShortDate(nearestExpiry)} · ${packages.toLocaleString("ar-EG")} عبوة`
    : `${item.category || "أخرى"} · ${packages.toLocaleString("ar-EG")} عبوة`;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/medicine-form", params: { id: item.id } })}
      style={styles.row}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`تفاصيل ${item.name}`}
    >
      <View style={[styles.statusRail, { backgroundColor: statusColor }]} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.rowSupporting, expirySoon && styles.rowSupportingExpiry]} numberOfLines={1}>{supportingText}</Text>
      </View>
      <View style={styles.rowValue}>
        <Text style={styles.rowPrice}>{formatCurrency(item.price)}</Text>
        <Text style={[styles.rowQuantity, { color: statusColor }]}>{lowStock ? "منخفض" : expirySoon ? "صلاحية قريبة" : "متوفر"}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingTop: 10, paddingBottom: 104 },
  header: { paddingHorizontal: 20 },
  catalogLink: { minHeight: 42, marginBottom: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  catalogLinkText: { flex: 1, color: COLORS.primary, fontSize: 11, fontWeight: "900", textAlign: "right" },
  searchBox: { height: 50, backgroundColor: "#F2F1EE", borderWidth: 1, borderColor: "#F2F1EE", borderRadius: 17, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" },
  filters: { flexDirection: "row-reverse", gap: 7, marginTop: 10 },
  filter: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: COLORS.deep, borderColor: COLORS.deep },
  filterText: { color: COLORS.muted, fontSize: 10, fontWeight: "900" },
  filterTextActive: { color: "#FFFFFF" },
  countText: { color: COLORS.muted, fontSize: 11, fontWeight: "800", textAlign: "right", marginTop: 13, marginBottom: 5 },
  row: { minHeight: 68, paddingVertical: 10, paddingHorizontal: 20, paddingRight: 27, backgroundColor: "#FFFFFF", flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  statusRail: { position: "absolute", right: 16, top: 12, bottom: 12, width: 4, borderRadius: 4 },
  rowText: { flex: 1, alignItems: "flex-end", minWidth: 0 },
  rowName: { width: "100%", color: COLORS.ink, fontSize: 13, fontWeight: "900", lineHeight: 19, textAlign: "right" },
  rowSupporting: { width: "100%", color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: "right", marginTop: 2 },
  rowSupportingExpiry: { color: "#A37B16", fontWeight: "800" },
  rowValue: { width: 70, alignItems: "flex-start" },
  rowPrice: { color: COLORS.ink, fontSize: 13, fontWeight: "900", writingDirection: "ltr" },
  rowQuantity: { fontSize: 10, fontWeight: "800", marginTop: 4, writingDirection: "rtl" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: 20 },
  floatingAdd: { position: "absolute", left: 20, bottom: 20, minHeight: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: COLORS.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, shadowColor: "#08382D", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  floatingAddText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  empty: { alignItems: "center", paddingTop: 62, paddingHorizontal: 20 },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", marginTop: 12 },
  emptyDescription: { color: COLORS.muted, fontSize: 12, marginTop: 5, textAlign: "center" },
});
