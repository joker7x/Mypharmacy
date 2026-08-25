import { router } from "expo-router";
import { memo, useDeferredValue, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Badge, Card, COLORS, PageHeader, RoundIcon } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type CatalogProduct = {
  externalId: string;
  name: string;
  arabicName: string;
  currentPrice: string | number;
  previousPrice: string | number | null;
  soldTimes: number;
  sourceUpdatedAt: number;
};

const priceFormatter = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
const updateFormatter = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const formatPrice = (value: string | number) => `${priceFormatter.format(Number(value))} ج.م`;
const formatUpdate = (value: number) => updateFormatter.format(new Date(value));

export default function CatalogScreen() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const query = useDeferredValue(search.trim());
  const canSearch = query.length >= 2;
  const statusQuery = trpc.catalog.status.useQuery(undefined, { staleTime: 60_000, refetchOnMount: false });
  const latestQuery = trpc.catalog.latest.useQuery({ limit: 20 }, { staleTime: 60_000, refetchOnMount: false });
  const searchQuery = trpc.catalog.search.useQuery({ query: canSearch ? query : "xx", limit: 30 }, { enabled: canSearch, staleTime: 300_000, refetchOnMount: false });
  const syncMutation = trpc.catalog.syncNextBatch.useMutation();
  const refreshMutation = trpc.catalog.refreshLatest.useMutation();
  const status = statusQuery.data;
  const products = useMemo<CatalogProduct[]>(() => (canSearch ? (searchQuery.data ?? []) : (latestQuery.data ?? [])) as CatalogProduct[], [canSearch, latestQuery.data, searchQuery.data]);

  const refreshQueries = async () => {
    await Promise.all([utils.catalog.status.invalidate(), utils.catalog.latest.invalidate(), utils.catalog.search.invalidate()]);
  };

  const startIndexing = async () => {
    if (status?.isComplete) return;
    setIsIndexing(true);
    setSyncMessage("جارٍ تجهيز دفعة من دليل الأصناف...");
    try {
      let complete = status?.isComplete ?? false;
      while (!complete) {
        const result = await syncMutation.mutateAsync({ maxPages: 20 });
        complete = result.isComplete;
        setSyncMessage(complete ? "اكتملت فهرسة دليل الأصناف." : `تمت فهرسة ${result.productCount.toLocaleString("ar-EG")} صنفًا حتى الآن.`);
        await refreshQueries();
      }
      Alert.alert("اكتملت الفهرسة", "يمكنك الآن البحث في دليل الأصناف الكامل بالاسم العربي أو الإنجليزي أو الكود.");
    } catch (error) {
      Alert.alert("تعذر إكمال الفهرسة", error instanceof Error ? error.message : "تحقق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsIndexing(false);
    }
  };

  const refreshLatest = async () => {
    try {
      await refreshMutation.mutateAsync();
      await refreshQueries();
      setSyncMessage("تم تحديث أحدث تغيرات الأسعار.");
    } catch (error) {
      Alert.alert("تعذر تحديث الأسعار", error instanceof Error ? error.message : "تحقق من الاتصال ثم حاول مرة أخرى.");
    }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><FlatList data={products} keyExtractor={(item) => item.externalId} renderItem={({ item }) => <ProductCard product={item} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={8} updateCellsBatchingPeriod={24} windowSize={7} contentContainerStyle={styles.content} ItemSeparatorComponent={() => <View style={styles.separator} />} ListHeaderComponent={<View><TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity><PageHeader title="دليل الأصناف والأسعار" subtitle="مصدر الأسعار: dwaprices" /><Card style={styles.statusCard}><View style={styles.statusTop}><RoundIcon name="books.vertical.fill" color={COLORS.primary} background={COLORS.mint} /><View style={styles.statusText}><Text style={styles.statusTitle}>{status?.isComplete ? "دليل الأصناف جاهز للبحث" : "فهرسة دليل الأصناف"}</Text><Text style={styles.statusSubtitle}>{status?.productCount ? `${status.productCount.toLocaleString("ar-EG")} صنف محفوظ` : "ابدأ الفهرسة لتمكين البحث الشامل"}</Text></View></View>{!status?.isComplete ? <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, status?.progress ?? 0)}%` }]} /></View><Text style={styles.progressText}>{status?.progress ?? 0}%</Text></View> : <View style={styles.readyState}><IconSymbol name="checkmark.circle.fill" size={17} color={COLORS.success} /><Text style={styles.readyStateText}>الفهرس مكتمل وجاهز للبحث في {status?.productCount.toLocaleString("ar-EG")} صنفًا.</Text></View>}<View style={styles.actionRow}>{!status?.isComplete ? <TouchableOpacity onPress={startIndexing} disabled={isIndexing || syncMutation.isPending} style={[styles.primaryAction, (isIndexing || syncMutation.isPending) && styles.disabled]} activeOpacity={0.85}>{isIndexing || syncMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <IconSymbol name="arrow.triangle.2.circlepath" size={18} color="#FFFFFF" />}<Text style={styles.primaryActionText}>بدء الفهرسة</Text></TouchableOpacity> : null}<TouchableOpacity onPress={refreshLatest} disabled={refreshMutation.isPending} style={[styles.secondaryAction, status?.isComplete && styles.fullWidthAction]} activeOpacity={0.8}>{refreshMutation.isPending ? <ActivityIndicator color={COLORS.primary} /> : <IconSymbol name="arrow.triangle.2.circlepath" size={18} color={COLORS.primary} />}<Text style={styles.secondaryActionText}>تحديث الأسعار</Text></TouchableOpacity></View>{syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}</Card><View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={20} color={COLORS.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث بالاسم العربي أو الإنجليزي أو الكود" placeholderTextColor="#96A5A2" style={styles.searchInput} returnKeyType="search" /></View><Text style={styles.resultLabel}>{canSearch ? (searchQuery.isFetching ? "جارٍ البحث في الدليل..." : `نتائج البحث عن «${query}»`) : "أحدث تغيرات الأسعار"}</Text></View>} ListEmptyComponent={<CatalogEmpty loading={searchQuery.isFetching || latestQuery.isFetching} isSearching={canSearch} isIndexed={Boolean(status?.isComplete)} />} /></ScreenContainer>;
}

const ProductCard = memo(function ProductCard({ product }: { product: CatalogProduct }) {
  const hasPriceChange = product.previousPrice !== null && Number(product.previousPrice) !== Number(product.currentPrice);
  return <Card style={styles.productCard}><View style={styles.productTop}><RoundIcon name="cross.case.fill" color={COLORS.primary} background={COLORS.mint} /><View style={styles.productText}><View style={styles.productTitleRow}><Text style={styles.productArabic}>{product.arabicName}</Text>{hasPriceChange ? <Badge label="سعر متغير" tone="warning" /> : null}</View><Text style={styles.productEnglish}>{product.name}</Text></View></View><View style={styles.productMeta}><View style={styles.priceBlock}><Text style={styles.priceLabel}>السعر الحالي</Text><Text style={styles.currentPrice}>{formatPrice(product.currentPrice)}</Text></View>{hasPriceChange ? <View style={styles.priceBlock}><Text style={styles.priceLabel}>السعر السابق</Text><Text style={styles.previousPrice}>{formatPrice(product.previousPrice as string | number)}</Text></View> : null}<View style={styles.priceBlock}><Text style={styles.priceLabel}>مرات البيع</Text><Text style={styles.salesCount}>{product.soldTimes.toLocaleString("ar-EG")}</Text></View></View><View style={styles.productFooter}><Text style={styles.externalId}>كود المصدر: {product.externalId}</Text><Text style={styles.updatedAt}>تحديث {formatUpdate(product.sourceUpdatedAt)}</Text></View></Card>;
});

function CatalogEmpty({ loading, isSearching, isIndexed }: { loading: boolean; isSearching: boolean; isIndexed: boolean }) {
  if (loading) return <View style={styles.empty}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.emptyTitle}>جارٍ تحميل بيانات الأسعار</Text></View>;
  return <View style={styles.empty}><RoundIcon name={isSearching ? "magnifyingglass" : "books.vertical.fill"} color={COLORS.muted} background="#EEF3F1" /><Text style={styles.emptyTitle}>{isSearching ? "لا توجد نتائج مطابقة" : isIndexed ? "لا توجد تغيرات سعرية حديثة" : "الفهرس لم يبدأ بعد"}</Text><Text style={styles.emptyText}>{isSearching ? "جرّب كتابة جزء أطول من الاسم أو الكود." : isIndexed ? "استخدم زر تحديث الأسعار لجلب أحدث البيانات." : "اضغط «بدء الفهرسة» لتحميل الدليل القابل للبحث."}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112 }, back: { flexDirection: "row-reverse", alignSelf: "flex-end", alignItems: "center", gap: 3, marginBottom: 13, paddingVertical: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, statusCard: { backgroundColor: "#F2FBF8", marginBottom: 16 }, statusTop: { flexDirection: "row-reverse", alignItems: "center", gap: 11 }, statusText: { flex: 1, alignItems: "flex-end" }, statusTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, statusSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, progressRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, marginTop: 14 }, progressTrack: { flex: 1, height: 7, overflow: "hidden", borderRadius: 99, backgroundColor: "#DCECE7" }, progressFill: { height: "100%", borderRadius: 99, backgroundColor: COLORS.primary }, progressText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" }, readyState: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 13 }, readyStateText: { color: COLORS.success, fontSize: 11, fontWeight: "800", textAlign: "right" }, actionRow: { flexDirection: "row-reverse", gap: 9, marginTop: 15 }, primaryAction: { flex: 1, minHeight: 45, borderRadius: 13, backgroundColor: COLORS.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }, primaryActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" }, secondaryAction: { flex: 1, minHeight: 45, borderRadius: 13, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6 }, fullWidthAction: { flex: 1 }, secondaryActionText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" }, disabled: { opacity: 0.65 }, syncMessage: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 10, textAlign: "right" }, searchBox: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" }, resultLabel: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right", marginTop: 21, marginBottom: 10 }, separator: { height: 10 }, productCard: { padding: 14 }, productTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, productText: { flex: 1, alignItems: "flex-end" }, productTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7, width: "100%", justifyContent: "flex-start" }, productArabic: { flex: 1, color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, productEnglish: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3, textAlign: "right", alignSelf: "stretch" }, productMeta: { flexDirection: "row-reverse", gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 13, paddingTop: 12 }, priceBlock: { flex: 1, alignItems: "flex-end" }, priceLabel: { color: COLORS.muted, fontSize: 10, textAlign: "right" }, currentPrice: { color: COLORS.primary, fontSize: 13, fontWeight: "900", marginTop: 3, writingDirection: "ltr" }, previousPrice: { color: COLORS.muted, fontSize: 12, fontWeight: "800", marginTop: 4, textDecorationLine: "line-through", writingDirection: "ltr" }, salesCount: { color: COLORS.ink, fontSize: 13, fontWeight: "900", marginTop: 3 }, productFooter: { flexDirection: "row-reverse", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 10 }, externalId: { color: COLORS.muted, fontSize: 10 }, updatedAt: { color: COLORS.muted, fontSize: 10, textAlign: "right" }, empty: { alignItems: "center", paddingTop: 58 }, emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", marginTop: 13, textAlign: "center" }, emptyText: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 5, textAlign: "center" },
});
