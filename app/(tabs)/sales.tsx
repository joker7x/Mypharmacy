import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, RoundIcon, SectionTitle, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CartItem, formatCurrency, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function SalesScreen() {
  const { medications, completeSale } = usePharmacy();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"نقدي" | "بطاقة" | "محفظة">("نقدي");
  const visibleProducts = useMemo(() => medications.filter((item) => item.name.includes(search) || item.category.includes(search)).slice(0, 5), [medications, search]);
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const addToCart = (id: string) => {
    const product = medications.find((item) => item.id === id);
    if (!product || product.quantity === 0) return Alert.alert("الصنف غير متاح", "لا توجد كمية متاحة لإضافتها إلى البيع.");
    const currentQuantity = cart.find((item) => item.medicationId === id)?.quantity ?? 0;
    if (currentQuantity >= product.quantity) return Alert.alert("الكمية غير كافية", "لا يمكن إضافة كمية أكبر من المتاح في المخزون.");
    setCart((current) => current.some((item) => item.medicationId === id) ? current.map((item) => item.medicationId === id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { medicationId: product.id, name: product.name, unitPrice: product.price, quantity: 1 }]);
  };

  const changeQuantity = (id: string, delta: number) => setCart((current) => current.flatMap((item) => {
    if (item.medicationId !== id) return [item];
    const available = medications.find((product) => product.id === id)?.quantity ?? 0;
    const next = Math.min(available, item.quantity + delta);
    return next > 0 ? [{ ...item, quantity: next }] : [];
  }));

  const handleCheckout = () => {
    const succeeded = completeSale(cart, paymentMethod);
    if (!succeeded) return Alert.alert("تعذّر إتمام البيع", "تحقق من العناصر والكميات المتاحة ثم حاول مرة أخرى.");
    setCart([]);
    Alert.alert("تم تسجيل البيع", `تمت إضافة فاتورة بقيمة ${formatCurrency(total)} وخصم الكميات من المخزون.`);
  };

  return <ScreenContainer containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}>
    <PageHeader title="نقطة البيع" subtitle="أضف الأصناف ثم أتمم الفاتورة" />
    <View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={20} color={COLORS.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="ابحث عن دواء لإضافته" placeholderTextColor="#96A5A2" style={styles.searchInput} returnKeyType="done" /></View>
    <SectionTitle title="الأصناف المتاحة" />
    <Card style={styles.productsCard}>{visibleProducts.map((product, index) => <View key={product.id}><View style={styles.productRow}><TouchableOpacity onPress={() => addToCart(product.id)} style={styles.addButton} activeOpacity={0.75}><IconSymbol name="plus.circle.fill" size={22} color={COLORS.primary} /></TouchableOpacity><View style={styles.productText}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{formatCurrency(product.price)} · المتاح {product.quantity}</Text></View><RoundIcon name="cross.case.fill" /></View>{index < visibleProducts.length - 1 ? <View style={commonStyles.rowDivider} /> : null}</View>)}{!visibleProducts.length ? <Text style={styles.noProducts}>لا توجد أصناف مطابقة للبحث.</Text> : null}</Card>
    <SectionTitle title={`سلة البيع${cart.length ? ` (${cart.length})` : ""}`} />
    <Card style={styles.cartCard}>{!cart.length ? <View style={styles.emptyCart}><RoundIcon name="cart.fill" color={COLORS.muted} background="#EEF3F1" /><Text style={styles.emptyCartText}>السلة فارغة. أضف صنفًا لبدء الفاتورة.</Text></View> : cart.map((item, index) => <View key={item.medicationId}><View style={styles.cartRow}><View style={styles.cartNameBlock}><Text style={styles.cartName}>{item.name}</Text><Text style={styles.cartPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text></View><View style={styles.quantityControl}><TouchableOpacity onPress={() => changeQuantity(item.medicationId, 1)} activeOpacity={0.7}><IconSymbol name="plus.circle.fill" size={23} color={COLORS.primary} /></TouchableOpacity><Text style={styles.quantityNumber}>{item.quantity}</Text><TouchableOpacity onPress={() => changeQuantity(item.medicationId, -1)} activeOpacity={0.7}><IconSymbol name="minus.circle.fill" size={23} color={COLORS.muted} /></TouchableOpacity></View></View>{index < cart.length - 1 ? <View style={commonStyles.rowDivider} /> : null}</View>)}</Card>
    <SectionTitle title="طريقة الدفع" /><View style={styles.payments}>{(["نقدي", "بطاقة", "محفظة"] as const).map((method) => <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} style={[styles.payment, paymentMethod === method && styles.paymentActive]} activeOpacity={0.75}><Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextActive]}>{method}</Text></TouchableOpacity>)}</View>
    <View style={styles.totalBox}><Text style={styles.totalLabel}>إجمالي الفاتورة</Text><Text style={styles.totalValue}>{formatCurrency(total)}</Text></View>
    <TouchableOpacity disabled={!cart.length} onPress={handleCheckout} style={[commonStyles.primaryButton, !cart.length && styles.checkoutDisabled]} activeOpacity={0.85}><IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" /><Text style={commonStyles.primaryButtonText}>إتمام البيع</Text></TouchableOpacity>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  searchBox: { height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" }, productsCard: { paddingVertical: 14 }, productRow: { flexDirection: "row-reverse", alignItems: "center", gap: 11 }, productText: { flex: 1, alignItems: "flex-end" }, productName: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, productMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 }, addButton: { width: 34, height: 34, justifyContent: "center", alignItems: "center" }, noProducts: { color: COLORS.muted, textAlign: "right", fontSize: 13 },
  cartCard: { paddingVertical: 14 }, emptyCart: { alignItems: "center", gap: 9, paddingVertical: 14 }, emptyCartText: { color: COLORS.muted, fontSize: 12, textAlign: "center" }, cartRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, cartNameBlock: { flex: 1, alignItems: "flex-end", paddingLeft: 12 }, cartName: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, cartPrice: { color: COLORS.primary, fontSize: 12, fontWeight: "800", marginTop: 4 }, quantityControl: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, quantityNumber: { color: COLORS.ink, fontSize: 15, fontWeight: "800", minWidth: 18, textAlign: "center" }, payments: { flexDirection: "row-reverse", gap: 9 }, payment: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }, paymentActive: { backgroundColor: COLORS.mint, borderColor: COLORS.primary }, paymentText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" }, paymentTextActive: { color: COLORS.primary }, totalBox: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 25, marginBottom: 13, paddingHorizontal: 3 }, totalLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "800" }, totalValue: { color: COLORS.primary, fontSize: 23, fontWeight: "900" }, checkoutDisabled: { opacity: 0.45 },
});
