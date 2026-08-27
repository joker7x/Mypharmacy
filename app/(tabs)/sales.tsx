import { router } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BarcodeScanner } from "@/components/barcode-scanner";
import { COLORS, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CartItem, calculateCashChange, formatCurrency, getUnitPrice, usePharmacy } from "@/lib/pharmacy-context";
import { printReceipt } from "@/lib/printer-service";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type CatalogProduct = { externalId: string; arabicName: string; name: string; barcode: string | null; company: string | null; currentPrice: string | number; unitsPerPackage: number };
type PaymentMethod = "نقدي" | "بطاقة" | "محفظة";

export default function SalesScreen() {
  const { medications, completeSale, settings } = usePharmacy();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("نقدي");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const catalogQuery = trpc.catalog.search.useQuery({ query: deferredSearch.length >= 2 ? deferredSearch : "xx", limit: 20, offset: 0 }, { enabled: deferredSearch.length >= 2, staleTime: 120_000 });
  const localMatches = useMemo(() => medications.filter((item) => !deferredSearch || [item.name, item.category, item.sku, item.barcode ?? ""].some((value) => value.toLowerCase().includes(deferredSearch.toLowerCase()))).slice(0, 8), [deferredSearch, medications]);
  const catalogMatches = (catalogQuery.data?.items ?? []) as CatalogProduct[];
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const enteredCash = Number(cashReceived.replace(/,/g, "")) || 0;
  const change = calculateCashChange(total, enteredCash);
  const findLocal = (product: CatalogProduct) => medications.find((item) => item.catalogId === product.externalId || (product.barcode && item.barcode === product.barcode) || item.sku === product.externalId);

  const addToCart = (id: string) => {
    const product = medications.find((item) => item.id === id);
    if (!product || product.quantity === 0) return Alert.alert("الصنف غير متاح", "لا توجد وحدات بيع متاحة لإضافتها إلى الفاتورة.");
    const currentQuantity = cart.find((item) => item.medicationId === id)?.quantity ?? 0;
    if (currentQuantity >= product.quantity) return Alert.alert("الكمية غير كافية", "لا يمكن إضافة وحدات أكثر من المتاح في المخزون.");
    const unitPrice = getUnitPrice(product);
    setCart((current) => current.some((item) => item.medicationId === id) ? current.map((item) => item.medicationId === id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { medicationId: product.id, name: product.name, unitPrice, quantity: 1, unitLabel: "وحدة" }]);
  };

  const changeQuantity = (id: string, delta: number) => setCart((current) => current.flatMap((item) => { const available = medications.find((product) => product.id === id)?.quantity ?? 0; const next = Math.min(available, item.quantity + delta); return item.medicationId !== id ? [item] : next > 0 ? [{ ...item, quantity: next }] : []; }));
  const finishSale = async (received?: number) => {
    const succeeded = completeSale(cart, paymentMethod, paymentMethod === "نقدي" ? { cashReceived: received, change: calculateCashChange(total, received ?? 0) } : undefined);
    if (!succeeded) return Alert.alert("تعذّر إتمام البيع", "تحقق من الوحدات المتاحة والمبلغ المدفوع ثم حاول مرة أخرى.");
    const paidChange = calculateCashChange(total, received ?? 0);
    const receipt = { receiptNumber: `S-${Date.now().toString().slice(-6)}`, createdAt: new Date().toISOString(), items: cart.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })), total, paymentMethod, cashReceived: received, change: paidChange };
    setCart([]); setPaymentVisible(false); setCashReceived("");
    if (settings.printer.savedPrinter) {
      try { await printReceipt(settings.printer.savedPrinter, receipt); Alert.alert("تم تسجيل البيع وطباعة الإيصال", "تم حفظ الفاتورة وإرسال الإيصال للطابعة."); return; }
      catch (error) { Alert.alert("تم تسجيل البيع", `حُفظت الفاتورة، لكن تعذرت الطباعة: ${error instanceof Error ? error.message : "خطأ في الاتصال."}`); return; }
    }
    Alert.alert("تم تسجيل البيع", paymentMethod === "نقدي" ? `تم حفظ الفاتورة. الباقي للعميل ${formatCurrency(paidChange)}.` : `تم حفظ الفاتورة بقيمة ${formatCurrency(total)} عبر ${paymentMethod}.`);
  };
  const handleCheckout = () => { if (!cart.length) return; if (paymentMethod === "نقدي") { setCashReceived(String(total)); setPaymentVisible(true); } else void finishSale(); };
  const confirmCash = () => { if (enteredCash < total) return Alert.alert("المبلغ غير كافٍ", `المطلوب ${formatCurrency(total)} والمدفوع ${formatCurrency(enteredCash)}.`); void finishSale(enteredCash); };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.topBar}><TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.75}><IconSymbol name="chevron.right" size={21} color={COLORS.ink} /></TouchableOpacity><View style={styles.cashierHeading}><Text style={styles.eyebrow}>فاتورة جديدة</Text><Text style={styles.cashierTitle}>الكاشير</Text></View><TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.headerScanner} activeOpacity={0.8}><IconSymbol name="barcode.viewfinder" size={22} color="#83E4C3" /></TouchableOpacity></View><View style={styles.searchBox}><TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanButton} activeOpacity={0.8}><IconSymbol name="barcode.viewfinder" size={20} color={COLORS.primary} /></TouchableOpacity><IconSymbol name="magnifyingglass" size={20} color="#969C99" /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث باسم الدواء أو الباركود" placeholderTextColor="#969C99" style={styles.searchInput} returnKeyType="search" /></View>
    {deferredSearch.length >= 2 ? <><Text style={styles.sectionTitle}>نتائج البحث</Text><View style={styles.productsCard}>{catalogQuery.isFetching ? <Text style={styles.noProducts}>جارٍ البحث في دليل الأدوية...</Text> : catalogMatches.map((product, index) => { const stockItem = findLocal(product); return <View key={product.externalId}><View style={styles.productRow}><TouchableOpacity onPress={() => stockItem ? addToCart(stockItem.id) : router.push({ pathname: "/medicine-form", params: { catalogId: product.externalId } })} style={styles.addButton} activeOpacity={0.75}><IconSymbol name={stockItem ? "plus.circle.fill" : "shippingbox.fill"} size={23} color={COLORS.primary} /></TouchableOpacity><View style={styles.productText}><Text style={styles.productName}>{product.arabicName}</Text><Text style={styles.productMeta}>{product.company || "دليل الأدوية"} · {product.unitsPerPackage || 1} وحدة/عبوة · {Number(product.currentPrice).toLocaleString("ar-EG")} ج.م</Text><Text style={styles.stockStatus}>{stockItem ? `متاح للبيع: ${stockItem.quantity} وحدة` : "سجّله بالمخزون أولًا للبيع"}</Text></View><RoundIcon name="cross.case.fill" /></View>{index < catalogMatches.length - 1 ? <View style={commonStyles.rowDivider} /> : null}</View>; })}{!catalogMatches.length && !catalogQuery.isFetching ? <Text style={styles.noProducts}>لا توجد نتائج مطابقة في دليل الأدوية.</Text> : null}</View></> : null}
    <Text style={styles.sectionTitle}>أصناف المخزون الجاهزة للبيع</Text><View style={styles.productsCard}>{localMatches.map((product, index) => <View key={product.id}><View style={styles.productRow}><TouchableOpacity onPress={() => addToCart(product.id)} style={styles.addButton} activeOpacity={0.75}><IconSymbol name="plus.circle.fill" size={23} color={COLORS.primary} /></TouchableOpacity><View style={styles.productText}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>سعر الوحدة {formatCurrency(getUnitPrice(product))} · المتاح {product.quantity} وحدة</Text></View><RoundIcon name="cross.case.fill" /></View>{index < localMatches.length - 1 ? <View style={commonStyles.rowDivider} /> : null}</View>)}{!localMatches.length ? <Text style={styles.noProducts}>لا توجد وحدات متاحة في المخزون.</Text> : null}</View>
    <Text style={styles.sectionTitle}>سلة الفاتورة <Text style={styles.sectionCount}>{cart.length}</Text></Text>{cart.length ? <View>{cart.map((item) => { const product = medications.find((medication) => medication.id === item.medicationId); const critical = (product?.quantity ?? 0) <= (product?.reorderLevel ?? 0); return <CartRow key={item.medicationId} item={item} critical={critical} onIncrease={() => changeQuantity(item.medicationId, 1)} onDecrease={() => changeQuantity(item.medicationId, -1)} />; })}</View> : <View style={styles.emptyCart}><RoundIcon name="cart.fill" color={COLORS.muted} background="#F2F1EE" /><Text style={styles.emptyCartText}>السلة فارغة. أضف صنفًا من نتائج البحث.</Text></View>}
    <TouchableOpacity onPress={() => setSearch("")} style={styles.addAnother} activeOpacity={0.75}><View style={styles.addAnotherIcon}><IconSymbol name="plus" size={22} color={COLORS.muted} /></View><Text style={styles.addAnotherText}>أضف صنفًا آخر للفاتورة</Text></TouchableOpacity>
    <View style={styles.totalCard}><View style={styles.totalHeader}><View style={styles.totalNumber}><Text style={styles.totalNumberValue}>{cart.length}</Text><Text style={styles.totalNumberLabel}>أصناف</Text></View><View style={styles.totalLabelBlock}><Text style={styles.totalLabel}>الإجمالي</Text><Text style={styles.totalValue}>{formatCurrency(total)}</Text></View></View><View style={styles.paymentSelector}>{(["نقدي", "بطاقة", "محفظة"] as const).map((method) => <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.payment, paymentMethod === method && styles.paymentActive]} activeOpacity={0.75}><Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextActive]}>{method}</Text></TouchableOpacity>)}</View><TouchableOpacity disabled={!cart.length} onPress={handleCheckout} style={[styles.confirmButton, !cart.length && styles.checkoutDisabled]} activeOpacity={0.82}><Text style={styles.confirmText}>{paymentMethod === "نقدي" ? "تأكيد البيع" : "إتمام البيع"}</Text><IconSymbol name="checkmark.circle.fill" size={21} color="#FFFFFF" /></TouchableOpacity></View>
  </ScrollView><BarcodeScanner visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={setSearch} /><PaymentModal visible={paymentVisible} total={total} cashReceived={cashReceived} change={change} onChange={setCashReceived} onClose={() => setPaymentVisible(false)} onConfirm={confirmCash} /></ScreenContainer>;
}

function CartRow({ item, critical, onIncrease, onDecrease }: { item: CartItem; critical: boolean; onIncrease: () => void; onDecrease: () => void }) {
  return <View style={[styles.cartRow, critical ? styles.cartRowCritical : styles.cartRowAvailable]}><View style={[styles.cartIcon, critical ? styles.cartIconCritical : styles.cartIconAvailable]}><IconSymbol name={critical ? "exclamationmark.triangle.fill" : "cross.case.fill"} size={24} color="#FFFFFF" /></View><View style={styles.cartInfo}><Text style={styles.cartName} numberOfLines={1}>{item.name}</Text><Text style={[styles.cartPrice, critical && styles.cartPriceCritical]}>{formatCurrency(item.unitPrice)} · متبقي {item.quantity}</Text></View><View style={styles.quantityControl}><TouchableOpacity onPress={onIncrease} style={[styles.quantityButton, critical && styles.quantityButtonCritical]} activeOpacity={0.7}><Text style={styles.quantityButtonText}>+</Text></TouchableOpacity><Text style={styles.quantityNumber}>{item.quantity}</Text><TouchableOpacity onPress={onDecrease} style={styles.quantityButtonMinus} activeOpacity={0.7}><Text style={styles.quantityMinusText}>−</Text></TouchableOpacity></View></View>;
}

function PaymentModal({ visible, total, cashReceived, change, onChange, onClose, onConfirm }: { visible: boolean; total: number; cashReceived: string; change: number; onChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.paymentSheet}><View style={styles.modalHandle} /><View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.modalClose} activeOpacity={0.75}><IconSymbol name="xmark" size={18} color={COLORS.ink} /></TouchableOpacity><View style={styles.modalHeaderText}><Text style={styles.modalTitle}>تأكيد الدفع النقدي</Text><Text style={styles.modalSubtitle}>راجع المبلغ قبل حفظ الفاتورة</Text></View></View><View style={styles.paymentSummary}><Text style={styles.summaryLabel}>المطلوب من العميل</Text><Text style={styles.summaryValue}>{formatCurrency(total)}</Text></View><Text style={styles.fieldLabel}>المبلغ المستلم</Text><TextInput value={cashReceived} onChangeText={onChange} keyboardType="decimal-pad" style={styles.cashInput} selectTextOnFocus placeholder="0.00" placeholderTextColor="#969C99" /><View style={styles.changeRow}><Text style={styles.changeValue}>{formatCurrency(change)}</Text><Text style={styles.changeLabel}>الباقي للعميل</Text></View><TouchableOpacity onPress={onConfirm} style={styles.modalConfirm} activeOpacity={0.82}><Text style={styles.confirmText}>تأكيد وحفظ البيع</Text><IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" /></TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  topBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#F2F1EE", alignItems: "center", justifyContent: "center" },
  cashierHeading: { flex: 1, alignItems: "flex-end", paddingRight: 13 },
  eyebrow: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  cashierTitle: { color: COLORS.ink, fontSize: 29, lineHeight: 36, fontWeight: "900", marginTop: 1 },
  headerScanner: { width: 46, height: 46, borderRadius: 16, backgroundColor: COLORS.deep, alignItems: "center", justifyContent: "center" },
  searchBox: { height: 57, backgroundColor: "#F2F1EE", borderRadius: 22, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 11, gap: 9 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" },
  scanButton: { width: 37, height: 37, borderRadius: 12, backgroundColor: COLORS.mint, justifyContent: "center", alignItems: "center" },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900", textAlign: "right", marginTop: 27, marginBottom: 11 },
  sectionCount: { color: COLORS.primary, fontSize: 14 },
  productsCard: { backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15, paddingVertical: 11 },
  productRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, minHeight: 63 },
  productText: { flex: 1, alignItems: "flex-end" },
  productName: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" },
  productMeta: { color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: "right" },
  stockStatus: { color: COLORS.primary, fontSize: 10, fontWeight: "800", marginTop: 3 },
  addButton: { width: 35, height: 35, alignItems: "center", justifyContent: "center" },
  noProducts: { color: COLORS.muted, textAlign: "right", fontSize: 12, paddingVertical: 8 },
  emptyCart: { minHeight: 125, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyCartText: { color: COLORS.muted, fontSize: 12, textAlign: "center" },
  cartRow: { minHeight: 96, borderRadius: 26, padding: 13, marginBottom: 10, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  cartRowAvailable: { backgroundColor: COLORS.mint },
  cartRowCritical: { backgroundColor: COLORS.softWarning },
  cartIcon: { width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  cartIconAvailable: { backgroundColor: COLORS.primary },
  cartIconCritical: { backgroundColor: COLORS.warning },
  cartInfo: { flex: 1, alignItems: "flex-end" },
  cartName: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right" },
  cartPrice: { color: COLORS.muted, fontSize: 11, marginTop: 5, textAlign: "right" },
  cartPriceCritical: { color: "#8E462C" },
  quantityControl: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  quantityButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  quantityButtonCritical: { backgroundColor: COLORS.warning },
  quantityButtonText: { color: "#FFFFFF", fontSize: 24, lineHeight: 27, fontWeight: "500" },
  quantityNumber: { color: COLORS.ink, minWidth: 19, textAlign: "center", fontSize: 18, fontWeight: "900" },
  quantityButtonMinus: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  quantityMinusText: { color: COLORS.ink, fontSize: 23, lineHeight: 25, fontWeight: "500" },
  addAnother: { minHeight: 78, borderRadius: 24, borderWidth: 2, borderStyle: "dashed", borderColor: "#D6D7D2", backgroundColor: "#FAFAF8", marginTop: 2, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10 },
  addAnotherIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  addAnotherText: { color: COLORS.muted, fontSize: 13, fontWeight: "800" },
  totalCard: { backgroundColor: COLORS.deep, borderRadius: 31, padding: 20, marginTop: 15 },
  totalHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 17 },
  totalNumber: { alignItems: "flex-end" },
  totalNumberValue: { color: "#B6C4BC", fontSize: 17, fontWeight: "500" },
  totalNumberLabel: { color: "#9EAEA7", fontSize: 11, marginTop: 2 },
  totalLabelBlock: { alignItems: "flex-end" },
  totalLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  totalValue: { color: "#80E2BD", fontSize: 30, lineHeight: 38, fontWeight: "900", marginTop: 4 },
  paymentSelector: { flexDirection: "row-reverse", gap: 7, marginBottom: 14 },
  payment: { flex: 1, minHeight: 35, borderRadius: 11, borderWidth: 1, borderColor: "#31534A", alignItems: "center", justifyContent: "center" },
  paymentActive: { backgroundColor: "#24574F", borderColor: "#6FCFA8" },
  paymentText: { color: "#A7B9B1", fontSize: 10, fontWeight: "800" },
  paymentTextActive: { color: "#FFFFFF" },
  confirmButton: { minHeight: 58, borderRadius: 22, backgroundColor: COLORS.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9 },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  checkoutDisabled: { opacity: 0.42 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(13,36,32,0.48)", justifyContent: "flex-end" },
  paymentSheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 31, borderTopRightRadius: 31, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: COLORS.border },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: "#D4D8D4", alignSelf: "center", marginBottom: 19 },
  modalHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  modalClose: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#F2F1EE", alignItems: "center", justifyContent: "center" },
  modalHeaderText: { flex: 1, alignItems: "flex-end" },
  modalTitle: { color: COLORS.ink, fontSize: 21, fontWeight: "900", textAlign: "right" },
  modalSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: "right" },
  paymentSummary: { backgroundColor: COLORS.mint, borderRadius: 22, padding: 17, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  summaryLabel: { color: COLORS.primary, fontSize: 12, fontWeight: "800" },
  summaryValue: { color: COLORS.primary, fontSize: 23, fontWeight: "900" },
  fieldLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right", marginBottom: 7 },
  cashInput: { minHeight: 56, borderRadius: 19, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface, color: COLORS.ink, paddingHorizontal: 14, fontSize: 22, fontWeight: "900", textAlign: "right" },
  changeRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 15 },
  changeLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  changeValue: { color: COLORS.primary, fontSize: 19, fontWeight: "900" },
  modalConfirm: { minHeight: 56, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9 },
});
