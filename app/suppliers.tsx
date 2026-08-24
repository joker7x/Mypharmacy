import { router } from "expo-router";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function SuppliersScreen() {
  const { suppliers, addSupplier } = usePharmacy();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const add = () => { if (!name.trim() || !company.trim() || !phone.trim()) return; addSupplier({ name, company, phone }); setName(""); setCompany(""); setPhone(""); setVisible(false); };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}>
    <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity><PageHeader title="الموردون" subtitle={`${suppliers.length} جهات توريد مسجلة`} action="إضافة" onActionPress={() => setVisible(true)} />
    {suppliers.map((supplier) => <Card key={supplier.id} style={styles.supplierCard}><View style={styles.supplierRow}><RoundIcon name="truck.box.fill" /><View style={styles.supplierText}><Text style={styles.supplierName}>{supplier.name}</Text><Text style={styles.company}>{supplier.company}</Text></View></View><View style={commonStyles.rowDivider} /><View style={styles.supplierFooter}><Text style={styles.orderText}>{supplier.lastOrder}</Text><Text style={styles.phone}>{supplier.phone}</Text></View></Card>)}
  </ScrollView><Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.modalShade}><View style={styles.modal}><Text style={styles.modalTitle}>إضافة مورد</Text><TextInput value={name} onChangeText={setName} placeholder="اسم المسؤول" placeholderTextColor="#98A7A3" style={commonStyles.input} /><TextInput value={company} onChangeText={setCompany} placeholder="اسم الشركة" placeholderTextColor="#98A7A3" style={[commonStyles.input, styles.modalInput]} /><TextInput value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" placeholderTextColor="#98A7A3" keyboardType="phone-pad" style={[commonStyles.input, styles.modalInput]} /><TouchableOpacity onPress={add} style={commonStyles.primaryButton} activeOpacity={0.85}><Text style={commonStyles.primaryButtonText}>حفظ المورد</Text></TouchableOpacity><TouchableOpacity onPress={() => setVisible(false)} style={styles.cancel}><Text style={styles.cancelText}>إلغاء</Text></TouchableOpacity></View></View></Modal></ScreenContainer>;
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 17, padding: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, supplierCard: { marginBottom: 12 }, supplierRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 }, supplierText: { alignItems: "flex-end", flex: 1 }, supplierName: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, company: { color: COLORS.muted, fontSize: 12, marginTop: 4 }, supplierFooter: { flexDirection: "row-reverse", justifyContent: "space-between" }, orderText: { color: COLORS.muted, fontSize: 11 }, phone: { color: COLORS.primary, fontSize: 12, fontWeight: "800", writingDirection: "ltr" }, modalShade: { flex: 1, backgroundColor: "rgba(16,42,42,0.38)", justifyContent: "flex-end" }, modal: { backgroundColor: COLORS.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 }, modalTitle: { color: COLORS.ink, fontSize: 19, fontWeight: "900", textAlign: "right", marginBottom: 18 }, modalInput: { marginTop: 10 }, cancel: { alignItems: "center", paddingTop: 17 }, cancelText: { color: COLORS.muted, fontWeight: "800", fontSize: 13 },
});
