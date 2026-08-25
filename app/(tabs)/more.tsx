import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, PageHeader, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";

type Destination = { title: string; subtitle: string; icon: Parameters<typeof RoundIcon>[0]["name"]; path: string };

const operations: Destination[] = [
  { title: "دليل الأدوية والأسعار", subtitle: "بحث بالاسم والباركود ومتابعة التغيرات", icon: "books.vertical.fill" as const, path: "/catalog" },
  { title: "الطلبيات والفواتير", subtitle: "تسجيل توريد الموردين وحفظ الفواتير", icon: "doc.text.fill" as const, path: "/orders" },
  { title: "الموردون", subtitle: "جهات التوريد وبيانات التواصل", icon: "truck.box.fill" as const, path: "/suppliers" },
];
const management: Destination[] = [
  { title: "التقارير التشغيلية", subtitle: "المبيعات وحركة الأصناف", icon: "chart.line.uptrend.xyaxis" as const, path: "/reports" },
  { title: "إعدادات الصيدلية", subtitle: "إدارة البيانات وإعدادات التطبيق", icon: "gearshape.fill" as const, path: "/settings" },
];

export default function MoreScreen() { return <ScreenContainer containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}><PageHeader title="الإدارة" subtitle="الأدوات الثانوية وإعدادات التشغيل" /><View style={styles.brandCard}><View style={styles.brandIcon}><IconSymbol name="cross.case.fill" size={30} color="#FFFFFF" /></View><View style={styles.brandText}><Text style={styles.brandName}>صيدليتي</Text><Text style={styles.brandSubtitle}>كل ما لا تحتاجه أثناء البيع اليومي في مكان واحد</Text></View></View><Section heading="بيانات وتشغيل" items={operations} /><Section heading="متابعة وإدارة" items={management} /><Text style={styles.version}>بيانات التشغيل الأساسية محفوظة محليًا على هذا الجهاز</Text></ScrollView></ScreenContainer>; }

function Section({ heading, items }: { heading: string; items: Destination[] }) { return <View><Text style={styles.sectionHeading}>{heading}</Text><View style={styles.menu}>{items.map((item, index) => <TouchableOpacity key={item.title} onPress={() => router.push(item.path as never)} style={[styles.menuItem, index < items.length - 1 && styles.menuBorder]} activeOpacity={0.8}><RoundIcon name={item.icon} /><View style={styles.menuText}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSubtitle}>{item.subtitle}</Text></View><IconSymbol name="chevron.left" size={20} color={COLORS.muted} /></TouchableOpacity>)}</View></View>; }

const styles = StyleSheet.create({ brandCard: { backgroundColor: COLORS.primary, borderRadius: 22, padding: 18, flexDirection: "row-reverse", alignItems: "center", gap: 13 }, brandIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", justifyContent: "center", alignItems: "center" }, brandText: { flex: 1, alignItems: "flex-end" }, brandName: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" }, brandSubtitle: { color: "#D7F3EE", fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: "right" }, sectionHeading: { color: COLORS.primary, fontSize: 12, fontWeight: "900", textAlign: "right", marginTop: 24, marginBottom: 9 }, menu: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 15 }, menuItem: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 16 }, menuBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }, menuText: { flex: 1, alignItems: "flex-end" }, menuTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "right" }, menuSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, version: { color: COLORS.muted, fontSize: 11, textAlign: "center", marginTop: 25 } });
