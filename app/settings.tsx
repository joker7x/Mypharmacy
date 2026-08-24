import { router } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, PageHeader, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

export default function SettingsScreen() {
  const { restoreDemoData } = usePharmacy();
  const reset = () => Alert.alert("استعادة البيانات التجريبية", "سيتم استبدال البيانات المحلية الحالية ببيانات البداية التجريبية.", [{ text: "إلغاء", style: "cancel" }, { text: "استعادة", style: "destructive", onPress: restoreDemoData }]);
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}>
    <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity><PageHeader title="الإعدادات" subtitle="إدارة بيانات وتفضيلات التطبيق" />
    <View style={styles.infoCard}><RoundIcon name="cross.case.fill" /><View style={styles.infoText}><Text style={styles.infoTitle}>صيدليتي</Text><Text style={styles.infoSubtitle}>إدارة محلية للمخزون والمبيعات</Text></View></View>
    <Text style={styles.section}>البيانات</Text><TouchableOpacity onPress={reset} style={styles.setting} activeOpacity={0.8}><RoundIcon name="arrow.clockwise" color={COLORS.danger} background={COLORS.softDanger} /><View style={styles.settingText}><Text style={styles.settingTitle}>استعادة البيانات التجريبية</Text><Text style={styles.settingSubtitle}>يستبدل المخزون والمبيعات الحالية</Text></View><IconSymbol name="chevron.left" size={20} color={COLORS.muted} /></TouchableOpacity>
    <Text style={styles.note}>تُحفظ البيانات الحالية محليًا على الجهاز. لإتاحة الاستخدام لفريق العمل أو عبر أجهزة متعددة، يمكن إضافة مزامنة سحابية وصلاحيات مستخدمين في المرحلة التالية.</Text>
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 3, marginBottom: 17, padding: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" }, infoCard: { backgroundColor: COLORS.mint, borderRadius: 20, padding: 17, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, infoText: { flex: 1, alignItems: "flex-end" }, infoTitle: { color: COLORS.primary, fontSize: 16, fontWeight: "900" }, infoSubtitle: { color: COLORS.primary, fontSize: 12, marginTop: 4 }, section: { color: COLORS.muted, fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 25, marginBottom: 9 }, setting: { backgroundColor: COLORS.surface, borderRadius: 20, borderColor: COLORS.border, borderWidth: 1, padding: 15, flexDirection: "row-reverse", alignItems: "center", gap: 12 }, settingText: { flex: 1, alignItems: "flex-end" }, settingTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800" }, settingSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, note: { color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 22 },
});
