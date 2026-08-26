import { router } from "expo-router";
import { memo, useDeferredValue, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Badge, COLORS, PageHeader, RoundIcon } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useLatestPriceFeed } from "@/hooks/use-latest-price-feed";
import { trpc } from "@/lib/trpc";

type CatalogProduct = {
  externalId: string;
  name: string;
  arabicName: string;
  currentPrice: string | number;
  previousPrice: string | number | null;
  soldTimes: number;
  activeIngredient: string | null;
  category: string | null;
  company: string | null;
  barcode: string | null;
  sourceUpdatedAt: number;
};

type PriceSort = "latest" | "largest_change" | "best_selling";
const PAGE_SIZE = 100;
const priceFormatter = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
const updateFormatter = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const formatPrice = (value: string | number) => `${priceFormatter.format(Number(value))} ج.م`;
  const formatUpdate = (value: number) => {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? updateFormatter.format(new Date(timestamp)) : "غير محدد";
  };
const sortOptions: { id: PriceSort; label: string; icon: "clock.fill" | "chart.line.uptrend.xyaxis" | "cart.fill" }[] = [
  { id: "latest", label: "الأحدث أولًا", icon: "clock.fill" },
  { id: "largest_change", label: "الأكثر تغيرًا", icon: "chart.line.uptrend.xyaxis" },
  { id: "best_selling", label: "الأكثر مبيعًا", icon: "cart.fill" },
];

export default function CatalogScreen() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PriceSort>("latest");
  const [page, setPage] = useState(0);
  const query = useDeferredValue(search.trim());
  const canSearch = query.length >= 2;
  const offset = page * PAGE_SIZE;
  const statusQuery = trpc.catalog.status.useQuery(undefined, { staleTime: 60_000, refetchOnMount: false });
  const useSourceLatest = !canSearch && sort === "latest";
  const latestFeed = useLatestPriceFeed(page, useSourceLatest);
  const latestQuery = trpc.catalog.latest.useQuery({ limit: PAGE_SIZE, offset, sort }, { enabled: !canSearch && sort !== "latest", staleTime: 60_000, refetchOnMount: false });
  const searchQuery = trpc.catalog.search.useQuery({ query: canSearch ? query : "xx", limit: PAGE_SIZE, offset }, { enabled: canSearch, staleTime: 180_000, refetchOnMount: false });
  const refreshMutation = trpc.catalog.refreshLatest.useMutation();
  const result = canSearch ? searchQuery.data : latestQuery.data;
  const products = (useSourceLatest ? latestFeed.items : result?.items ?? []) as CatalogProduct[];
  const total = useSourceLatest ? latestFeed.cacheCount : result?.total ?? 0;
  const pageCount = useSourceLatest ? Math.max(1, Math.ceil(Math.max(latestFeed.cacheCount, 1) / PAGE_SIZE)) : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const busy = useSourceLatest ? latestFeed.isFetching : canSearch ? searchQuery.isFetching : latestQuery.isFetching;

  useEffect(() => { setPage(0); }, [query, sort]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const refreshLatest = async () => {
    try {
      if (useSourceLatest) {
        await latestFeed.refresh();
        return;
      }
      await refreshMutation.mutateAsync();
      await Promise.all([utils.catalog.latest.invalidate(), utils.catalog.status.invalidate()]);
    } catch (error) {
      Alert.alert("تعذر تحديث الأسعار", error instanceof Error ? error.message : "تحقق من الاتصال ثم حاول مرة أخرى.");
    }
  };

  const caption = canSearch ? `نتائج البحث عن «${query}»` : useSourceLatest ? "أحدث تغييرات الأسعار من المصدر" : "أحدث تغيرات الأسعار";
  const hasNext = useSourceLatest ? latestFeed.hasNext : page < pageCount - 1;
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><FlatList data={products} keyExtractor={(item) => item.externalId} renderItem={({ item, index }) => <ProductCard product={item} rank={offset + index + 1} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={8} updateCellsBatchingPeriod={24} windowSize={7} contentContainerStyle={styles.content} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={<View><TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity><PageHeader title="أحدث الأسعار" subtitle="دليل الأدوية والأسعار المتجددة" /><View style={styles.hero}><View style={styles.heroTop}><RoundIcon name="chart.line.uptrend.xyaxis" color="#FFFFFF" background="rgba(255,255,255,0.18)" /><View style={styles.heroText}><Text style={styles.heroEyebrow}>مراقبة السوق الدوائي</Text><Text style={styles.heroTitle}>أسعار مرتبة ودليل شامل</Text><Text style={styles.heroSub}>{statusQuery.data?.productCount?.toLocaleString("ar-EG") ?? "—"} صنف متاح للبحث</Text></View></View><View style={styles.heroStats}><HeroStat label={useSourceLatest ? "محفوظ محليًا" : "تغيرات سعرية"} value={total.toLocaleString("ar-EG")} /><HeroStat label="الصفحة" value={useSourceLatest ? String(page + 1) : `${page + 1}/${pageCount}`} /><HeroStat label="المعروض" value={products.length.toLocaleString("ar-EG")} /></View></View><View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={20} color={COLORS.muted} /><TextInput value={search} onChangeText={handleSearch} placeholder="ابحث بالاسم أو المادة الفعالة أو الشركة أو الباركود" placeholderTextColor="#96A5A2" style={styles.searchInput} returnKeyType="search" /></View>{!canSearch ? <><View style={styles.sectionHeader}><TouchableOpacity onPress={refreshLatest} disabled={refreshMutation.isPending || (useSourceLatest && !latestFeed.isReady)} style={styles.refresh} activeOpacity={0.75}>{refreshMutation.isPending || (useSourceLatest && latestFeed.isFetching) ? <ActivityIndicator size="small" color={COLORS.primary} /> : <IconSymbol name="arrow.clockwise" size={17} color={COLORS.primary} />}<Text style={styles.refreshText}>تحديث</Text></TouchableOpacity><Text style={styles.sectionTitle}>{useSourceLatest ? "ترتيب المصدر: الأحدث أولًا" : "رتّب أحدث الأسعار"}</Text></View><View style={styles.sortRow}>{sortOptions.map((option) => <TouchableOpacity key={option.id} onPress={() => { setSort(option.id); setPage(0); }} style={[styles.sortChip, sort === option.id && styles.sortChipActive]} activeOpacity={0.8}><IconSymbol name={option.icon} size={15} color={sort === option.id ? "#FFFFFF" : COLORS.muted} /><Text style={[styles.sortText, sort === option.id && styles.sortTextActive]}>{option.label}</Text></TouchableOpacity>)}</View></> : null}<View style={styles.resultRow}><Text style={styles.resultLabel}>{busy ? "جارٍ جلب النتائج..." : caption}</Text><Text style={styles.resultCount}>{total.toLocaleString("ar-EG")} صنف</Text></View></View>} ListEmptyComponent={<CatalogEmpty loading={busy} isSearching={canSearch} />} ListFooterComponent={products.length ? <Pagination page={page} pages={pageCount} hasNext={hasNext} showTotal={!useSourceLatest} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => hasNext ? current + 1 : current)} /> : null} /></ScreenContainer>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.heroStat}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>;
}

const ProductCard = memo(function ProductCard({ product, rank }: { product: CatalogProduct; rank: number }) {
  const hasPriceChange = product.previousPrice !== null && Number(product.previousPrice) !== Number(product.currentPrice);
  const difference = hasPriceChange ? Number(product.currentPrice) - Number(product.previousPrice) : 0;
  const direction = difference > 0 ? "زيادة" : difference < 0 ? "انخفاض" : "ثابت";
  const badgeTone = difference > 0 ? "warning" : difference < 0 ? "success" : "neutral";
  return <View style={styles.productCard}><View style={styles.productTop}><View style={styles.rank}><Text style={styles.rankText}>{rank.toLocaleString("ar-EG")}</Text></View><View style={styles.productText}><View style={styles.productTitleRow}><Text style={styles.productArabic} numberOfLines={2}>{product.arabicName}</Text>{hasPriceChange ? <Badge label={direction} tone={badgeTone} /> : null}</View><Text style={styles.productEnglish} numberOfLines={1}>{product.name}</Text>{product.company || product.category ? <Text style={styles.productDetail} numberOfLines={1}>{[product.company, product.category].filter(Boolean).join(" · ")}</Text> : null}</View></View><View style={styles.priceStrip}><View style={styles.priceBlock}><Text style={styles.priceLabel}>السعر الحالي</Text><Text style={styles.currentPrice}>{formatPrice(product.currentPrice)}</Text></View>{hasPriceChange ? <View style={styles.priceBlock}><Text style={styles.priceLabel}>السعر السابق</Text><Text style={styles.previousPrice}>{formatPrice(product.previousPrice as string | number)}</Text></View> : null}<View style={styles.priceBlock}><Text style={styles.priceLabel}>فرق السعر</Text><Text style={[styles.difference, difference > 0 ? styles.differenceUp : difference < 0 ? styles.differenceDown : null]}>{hasPriceChange ? `${difference > 0 ? "+" : ""}${formatPrice(difference)}` : "—"}</Text></View></View><View style={styles.productFooter}><Text style={styles.externalId}>{product.barcode ? `باركود ${product.barcode}` : `كود ${product.externalId}`}</Text><Text style={styles.updatedAt}>تحديث {formatUpdate(product.sourceUpdatedAt)}</Text></View></View>;
});

function Pagination({ page, pages, hasNext, showTotal, onPrevious, onNext }: { page: number; pages: number; hasNext: boolean; showTotal: boolean; onPrevious: () => void; onNext: () => void }) {
  if (pages <= 1 && !hasNext) return null;
  return <View style={styles.pagination}><TouchableOpacity onPress={onNext} disabled={!hasNext} style={[styles.pageButton, !hasNext && styles.pageDisabled]} activeOpacity={0.75}><Text style={styles.pageButtonText}>التالي</Text><IconSymbol name="chevron.left" size={18} color={COLORS.primary} /></TouchableOpacity><Text style={styles.pageLabel}>صفحة {page + 1}{showTotal && pages > 1 ? ` من ${pages}` : ""}</Text><TouchableOpacity onPress={onPrevious} disabled={page === 0} style={[styles.pageButton, page === 0 && styles.pageDisabled]} activeOpacity={0.75}><IconSymbol name="chevron.right" size={18} color={COLORS.primary} /><Text style={styles.pageButtonText}>السابق</Text></TouchableOpacity></View>;
}

function CatalogEmpty({ loading, isSearching }: { loading: boolean; isSearching: boolean }) {
  if (loading) return <View style={styles.empty}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.emptyTitle}>جارٍ تحميل البيانات</Text></View>;
  return <View style={styles.empty}><RoundIcon name={isSearching ? "magnifyingglass" : "chart.line.uptrend.xyaxis"} color={COLORS.muted} background="#EEF3F1" /><Text style={styles.emptyTitle}>{isSearching ? "لا توجد نتائج مطابقة" : "لا توجد تغيرات سعرية حديثة"}</Text><Text style={styles.emptyText}>{isSearching ? "جرّب جزءًا آخر من الاسم أو المادة الفعالة أو اسم الشركة." : "اضغط تحديث لجلب أحدث تغيرات الأسعار."}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112 }, back: { flexDirection: "row-reverse", alignSelf: "flex-end", alignItems: "center", gap: 3, marginBottom: 13, paddingVertical: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, hero: { borderRadius: 24, padding: 17, backgroundColor: "#096E69", marginBottom: 16, shadowColor: "#075E5A", shadowOpacity: 0.2, shadowRadius: 14, elevation: 3 }, heroTop: { flexDirection: "row-reverse", alignItems: "center", gap: 12 }, heroText: { flex: 1, alignItems: "flex-end" }, heroEyebrow: { color: "#BDEBE5", fontSize: 10, fontWeight: "800" }, heroTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", marginTop: 3, textAlign: "right" }, heroSub: { color: "#D7F5F0", fontSize: 11, marginTop: 4, textAlign: "right" }, heroStats: { flexDirection: "row-reverse", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.25)", marginTop: 15, paddingTop: 12 }, heroStat: { flex: 1, alignItems: "flex-end", borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(255,255,255,0.2)", paddingLeft: 8 }, heroStatValue: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }, heroStatLabel: { color: "#BDEBE5", fontSize: 9, marginTop: 3 }, searchBox: { height: 54, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" }, sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 18 }, sectionTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, refresh: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingVertical: 4 }, refreshText: { color: COLORS.primary, fontSize: 12, fontWeight: "800" }, sortRow: { flexDirection: "row-reverse", gap: 7, marginTop: 10 }, sortChip: { flex: 1, minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4 }, sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, sortText: { color: COLORS.muted, fontSize: 10, fontWeight: "800" }, sortTextActive: { color: "#FFFFFF" }, resultRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 19, marginBottom: 10 }, resultLabel: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right", flex: 1 }, resultCount: { color: COLORS.primary, fontSize: 11, fontWeight: "900", marginRight: 9 }, separator: { height: 10 }, productCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, padding: 14 }, productTop: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 }, rank: { minWidth: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.mint, alignItems: "center", justifyContent: "center" }, rankText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" }, productText: { flex: 1, alignItems: "flex-end" }, productTitleRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 7, width: "100%" }, productArabic: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: "900", lineHeight: 20, textAlign: "right" }, productEnglish: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3, textAlign: "right", alignSelf: "stretch" }, productDetail: { color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: "right", alignSelf: "stretch" }, priceStrip: { flexDirection: "row-reverse", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 11 }, priceBlock: { flex: 1, alignItems: "flex-end" }, priceLabel: { color: COLORS.muted, fontSize: 9, textAlign: "right" }, currentPrice: { color: COLORS.primary, fontSize: 13, fontWeight: "900", marginTop: 3, writingDirection: "ltr" }, previousPrice: { color: COLORS.muted, fontSize: 11, fontWeight: "800", marginTop: 4, textDecorationLine: "line-through", writingDirection: "ltr" }, difference: { color: COLORS.muted, fontSize: 11, fontWeight: "900", marginTop: 4, writingDirection: "ltr" }, differenceUp: { color: COLORS.warning }, differenceDown: { color: COLORS.success }, productFooter: { flexDirection: "row-reverse", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 11, paddingTop: 9 }, externalId: { color: COLORS.muted, fontSize: 9, maxWidth: "48%" }, updatedAt: { color: COLORS.muted, fontSize: 9, textAlign: "right" }, pagination: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border }, pageButton: { minWidth: 80, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.mint }, pageButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" }, pageDisabled: { opacity: 0.38 }, pageLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800" }, empty: { alignItems: "center", paddingTop: 58 }, emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", marginTop: 13, textAlign: "center" }, emptyText: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 5, textAlign: "center" },
});
