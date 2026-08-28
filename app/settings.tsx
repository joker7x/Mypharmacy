import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS, PageHeader } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";
import { getStaffDevice, useStaffSession } from "@/lib/staff-session";
import { trpc } from "@/lib/trpc";

type DeviceSummary = Awaited<ReturnType<typeof getStaffDevice>>;

export default function SettingsScreen() {
  const router = useRouter();
  const { staff, can, logout, enablePhoneNotifications } = useStaffSession();
  const [device, setDevice] = useState<DeviceSummary>();
  const pushStatus = trpc.staff.pushStatus.useQuery(undefined, { enabled: Boolean(staff), retry: false });
  useEffect(() => { void getStaffDevice().then(setDevice); }, []);
  const signOut = () => Alert.alert("تسجيل الخروج", "سيُنهى تسجيل الدخول على هذا الهاتف.", [{ text: "إلغاء", style: "cancel" }, { text: "تسجيل الخروج", style: "destructive", onPress: () => void logout() }]);
  const enablePush = async () => {
    try { Alert.alert("إشعارات الهاتف", await enablePhoneNotifications()); }
    catch (error) { Alert.alert("تعذر تفعيل الإشعارات", error instanceof Error ? error.message : "حدث خطأ غير متوقع."); }
  };
  return <ScreenContainer className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <PageHeader title="الإعدادات" subtitle="الحساب والجهاز والإشعارات في مكان واحد" />
    <Text style={styles.section}>الحساب</Text>
    <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{staff?.displayName?.slice(0, 1) ?? "ص"}</Text></View><View style={styles.profileText}><Text style={styles.name}>{staff?.displayName ?? "مستخدم الصيدلية"}</Text><Text style={styles.userName}>@{staff?.username ?? "—"}</Text><Text style={styles.role}>{staff?.role === "owner" ? "مسؤول الصيدلية" : staff?.role === "pharmacist" ? "صيدلي" : staff?.role === "cashier" ? "كاشير" : "عرض فقط"}</Text></View></View>
    <Text style={styles.section}>الجهاز والإشعارات</Text>
    <View style={styles.card}><InfoRow title="الجهاز" detail={device?.deviceName ?? "جارٍ قراءة الجهاز…"} /><InfoRow title="طراز الجهاز" detail={device?.deviceModel ?? "غير متاح"} bordered /><InfoRow title="النظام" detail={`${device?.devicePlatform ?? "—"} ${device?.osVersion ?? ""}`.trim()} bordered /><InfoRow title="إصدار التطبيق" detail={device?.appVersion ?? "—"} bordered /><TouchableOpacity onPress={enablePush} style={styles.actionRow} activeOpacity={0.78}><View style={styles.actionText}><Text style={styles.actionTitle}>إشعارات الهاتف</Text><Text style={styles.actionDetail}>{pushStatus.data?.enabledDevices ? `مفعّلة على ${pushStatus.data.enabledDevices} جهاز/أجهزة` : "فعّل الإذن لاستلام رسائل الأدمن على هاتفك"}</Text></View><Text style={styles.pushPill}>{pushStatus.data?.enabledDevices ? "مفعّلة" : "تفعيل"}</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push("/notifications")} style={[styles.actionRow, styles.border]} activeOpacity={0.78}><View style={styles.actionText}><Text style={styles.actionTitle}>صندوق الإشعارات</Text><Text style={styles.actionDetail}>عرض الرسائل والتنبيهات المستلمة داخل التطبيق</Text></View><Text style={styles.chevron}>‹</Text></TouchableOpacity></View>
    <Text style={styles.section}>إدارة التطبيق</Text>
    <View style={styles.card}><ToolRow icon="⌁" title="بيانات التطبيق" detail="مدة حفظ صور الفواتير وبيانات العرض" onPress={() => router.push("/tools")} />{can("staff.manage") ? <ToolRow icon="◉" title="لوحة المسؤول" detail="الأفراد والصلاحيات والجلسات وسجل النشاط" onPress={() => router.push("/staff-admin")} bordered /> : null}</View>
    <Text style={styles.section}>الأمان</Text>
    <TouchableOpacity onPress={signOut} style={styles.logout} activeOpacity={0.78}><Text style={styles.logoutText}>تسجيل الخروج من هذا الجهاز</Text></TouchableOpacity>
  </ScrollView></ScreenContainer>;
}

function InfoRow({ title, detail, bordered }: { title: string; detail: string; bordered?: boolean }) { return <View style={[styles.infoRow, bordered && styles.border]}><Text style={styles.infoDetail}>{detail}</Text><Text style={styles.infoTitle}>{title}</Text></View>; }
function ToolRow({ icon, title, detail, onPress, bordered }: { icon: string; title: string; detail: string; onPress: () => void; bordered?: boolean }) { return <TouchableOpacity onPress={onPress} style={[styles.actionRow, bordered && styles.border]} activeOpacity={0.78}><Text style={styles.toolIcon}>{icon}</Text><View style={styles.actionText}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionDetail}>{detail}</Text></View><Text style={styles.chevron}>‹</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 42 }, section: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginTop: 24, marginBottom: 9 }, profileCard: { minHeight: 106, padding: 17, borderRadius: 23, backgroundColor: COLORS.deep, flexDirection: "row-reverse", alignItems: "center", gap: 13 }, avatar: { width: 53, height: 53, borderRadius: 27, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" }, avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" }, profileText: { flex: 1, alignItems: "flex-end" }, name: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", textAlign: "right" }, userName: { color: "#BDE5D4", fontSize: 11, marginTop: 3 }, role: { color: "#DDF5EA", fontSize: 10, fontWeight: "800", marginTop: 7, backgroundColor: "#24574F", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 }, card: { backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border }, infoRow: { minHeight: 50, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 18 }, infoTitle: { color: COLORS.ink, fontSize: 11, fontWeight: "900" }, infoDetail: { flex: 1, color: COLORS.muted, fontSize: 10, textAlign: "left" }, border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border }, actionRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: "row-reverse", alignItems: "center", gap: 11 }, toolIcon: { width: 30, height: 30, borderRadius: 9, textAlign: "center", textAlignVertical: "center", overflow: "hidden", color: COLORS.primary, backgroundColor: "#E8F8F1", fontSize: 15, fontWeight: "900" }, actionText: { flex: 1, alignItems: "flex-end" }, actionTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900", textAlign: "right" }, actionDetail: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: "right", marginTop: 3 }, chevron: { color: COLORS.primary, fontSize: 26, lineHeight: 26, transform: [{ rotate: "180deg" }] }, pushPill: { color: COLORS.primary, backgroundColor: "#E8F8F1", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: "900" }, logout: { minHeight: 50, borderRadius: 16, backgroundColor: "#FFF0ED", justifyContent: "center", alignItems: "center" }, logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: "900" } });
