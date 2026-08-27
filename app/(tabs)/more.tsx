import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, COLORS, PageHeader, PharmacyMark, RoundIcon, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useStaffSession } from "@/lib/staff-session";
import type { StaffPermission } from "@/lib/staff-access";
import { trpc } from "@/lib/trpc";

type Destination = { title: string; subtitle: string; icon: Parameters<typeof RoundIcon>[0]["name"]; path: string; permission?: StaffPermission };

const operations: Destination[] = [
  { title: "دليل الأدوية والأسعار", subtitle: "بحث بالاسم والباركود ومتابعة التغيرات", icon: "books.vertical.fill", path: "/catalog", permission: "inventory.view" },
  { title: "الطلبيات والفواتير", subtitle: "تسجيل توريد الموردين وحفظ الفواتير", icon: "doc.text.fill", path: "/orders", permission: "orders.manage" },
  { title: "الموردون", subtitle: "جهات التوريد وبيانات التواصل", icon: "truck.box.fill", path: "/suppliers", permission: "orders.manage" },
];
const finance: Destination[] = [
  { title: "الورديات", subtitle: "بدء وردية وإغلاقها بمطابقة نقدية", icon: "clock.fill", path: "/shifts", permission: "shifts.manage" },
  { title: "المصروفات", subtitle: "تشغيل وتوريد ومتابعة الإجمالي", icon: "arrow.down.circle.fill", path: "/expenses", permission: "expenses.manage" },
  { title: "حسابات العملاء", subtitle: "الآجل والمدفوع والمتبقي", icon: "person.crop.circle.fill", path: "/debts", permission: "sales.use" },
];
const management: Destination[] = [
  { title: "التقارير التشغيلية", subtitle: "المبيعات وحركة الأصناف", icon: "chart.line.uptrend.xyaxis", path: "/reports", permission: "reports.view" },
  { title: "الطابعة والملصقات", subtitle: "ربط Xprinter وضبط الإيصالات والباركود", icon: "printer.fill", path: "/settings", permission: "inventory.adjust" },
  { title: "إعدادات الصيدلية", subtitle: "إدارة البيانات وإعدادات التطبيق", icon: "gearshape.fill", path: "/settings", permission: "staff.manage" },
];

export default function MoreScreen() {
  const { staff, can, logout } = useStaffSession();
  const inbox = trpc.staff.notifications.useQuery(undefined, { retry: false, refetchInterval: 60_000 });
  const unread = inbox.data?.filter((item) => !item.readAt).length ?? 0;
  const managementItems = [
    ...management,
    { title: unread ? `الإشعارات · ${unread} جديد` : "الإشعارات", subtitle: "رسائل موجهة إليك من إدارة الصيدلية", icon: "bell.fill" as Parameters<typeof RoundIcon>[0]["name"], path: "/notifications" },
    ...(can("staff.manage") ? [{ title: "أفراد الصيدلية", subtitle: "الحسابات والصلاحيات والجلسات وسجل النشاط", icon: "person.3.fill" as Parameters<typeof RoundIcon>[0]["name"], path: "/staff-admin" }] : []),
  ];
  const visible = (items: Destination[]) => items.filter((item) => !item.permission || can(item.permission));
  return <ScreenContainer className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}><PageHeader title="الإدارة" subtitle="أدوات الصيدلية مرتبة حسب المهمة، لا حسب التعقيد" /><View style={styles.identity}><PharmacyMark inverse size="small" /><View style={styles.identityText}><Text style={styles.identityTitle}>{staff?.displayName ?? "صيدليتي"}</Text><Text style={styles.identitySubtitle}>{staff ? `${staff.username} · ${staff.role}` : "تشغيل محلي منظم، سريع، وقابل للمراجعة"}</Text></View><View style={styles.localPill}><Text style={styles.localPillText}>محلي</Text></View></View>{visible(operations).length ? <Section heading="بيانات وتشغيل" items={visible(operations)} /> : null}{visible(finance).length ? <Section heading="الورديات والمال" items={visible(finance)} /> : null}<Section heading="متابعة وإدارة" items={visible(managementItems)} /><TouchableOpacity onPress={() => void logout()} style={styles.logout} activeOpacity={0.8}><IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={COLORS.danger} /><Text style={styles.logoutText}>تسجيل الخروج</Text></TouchableOpacity><Text style={styles.version}>تُحفظ بيانات التشغيل الأساسية على هذا الجهاز</Text></ScrollView></ScreenContainer>;
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
  logout: { minHeight: 48, marginTop: 19, borderRadius: 15, flexDirection: "row-reverse", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1EE" },
  logoutText: { color: COLORS.danger, fontSize: 12, fontWeight: "900" },
});
