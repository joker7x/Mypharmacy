import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, PharmacyMark, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";

type Destination = { title: string; subtitle: string; icon: Parameters<typeof RoundIcon>[0]["name"]; path: string };

const operations: Destination[] = [
  { title: "دليل الأدوية والأسعار", subtitle: "بحث بالاسم والباركود ومتابعة التغيرات", icon: "books.vertical.fill", path: "/catalog" },
  { title: "الطلبيات والفواتير", subtitle: "تسجيل توريد الموردين وحفظ الفواتير", icon: "doc.text.fill", path: "/orders" },
  { title: "الموردون", subtitle: "جهات التوريد وبيانات التواصل", icon: "truck.box.fill", path: "/suppliers" },
];
const finance: Destination[] = [
  { title: "الورديات", subtitle: "بدء وردية وإغلاقها بمطابقة نقدية", icon: "clock.fill", path: "/shifts" },
  { title: "المصروفات", subtitle: "تشغيل وتوريد ومتابعة الإجمالي", icon: "arrow.down.circle.fill", path: "/expenses" },
  { title: "حسابات العملاء", subtitle: "الآجل والمدفوع والمتبقي", icon: "person.crop.circle.fill", path: "/debts" },
];
const management: Destination[] = [
  { title: "التقارير التشغيلية", subtitle: "المبيعات وحركة الأصناف", icon: "chart.line.uptrend.xyaxis", path: "/reports" },
  { title: "إعدادات الصيدلية", subtitle: "إدارة البيانات وإعدادات التطبيق", icon: "gearshape.fill", path: "/settings" },
];

export default function MoreScreen() {
  return <ScreenContainer className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}><PageHeader title="الإدارة" subtitle="أدوات الصيدلية مرتبة حسب المهمة، لا حسب التعقيد" /><View style={styles.identity}><PharmacyMark inverse size="small" /><View style={styles.identityText}><Text style={styles.identityTitle}>صيدليتي</Text><Text style={styles.identitySubtitle}>تشغيل محلي منظم، سريع، وقابل للمراجعة</Text></View><View style={styles.localPill}><Text style={styles.localPillText}>محلي</Text></View></View><Section heading="بيانات وتشغيل" items={operations} /><Section heading="الورديات والمال" items={finance} /><Section heading="متابعة وإدارة" items={management} /><Text style={styles.version}>تُحفظ بيانات التشغيل الأساسية على هذا الجهاز</Text></ScrollView></ScreenContainer>;
}

function Section({ heading, items }: { heading: string; items: Destination[] }) {
  return <View><Text style={styles.sectionHeading}>{heading}</Text><Card style={styles.menu}>{items.map((item, index) => <TouchableOpacity key={item.title} onPress={() => router.push(item.path as never)} style={[styles.menuItem, index < items.length - 1 && styles.menuBorder]} activeOpacity={0.75}><RoundIcon name={item.icon} /><View style={styles.menuText}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSubtitle}>{item.subtitle}</Text></View><IconSymbol name="chevron.left" size={18} color={COLORS.muted} /></TouchableOpacity>)}</Card></View>;
}

const styles = StyleSheet.create({
  identity: { backgroundColor: COLORS.deep, borderRadius: 19, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 11 },
  identityIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: "#24574F", alignItems: "center", justifyContent: "center" },
  identityText: { flex: 1, alignItems: "flex-end" },
  identityTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  identitySubtitle: { color: "#BDE5D4", fontSize: 10, marginTop: 4, textAlign: "right" },
  localPill: { borderRadius: 8, borderWidth: 1, borderColor: "#477A6D", paddingHorizontal: 7, paddingVertical: 4 },
  localPillText: { color: "#D6F2E7", fontSize: 9, fontWeight: "900" },
  sectionHeading: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right", marginTop: 26, marginBottom: 9 },
  menu: { paddingHorizontal: 14, paddingVertical: 0 },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingVertical: 14 },
  menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  menuText: { flex: 1, alignItems: "flex-end" },
  menuTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" },
  menuSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  version: { color: COLORS.muted, fontSize: 10, textAlign: "center", marginTop: 24 },
});
